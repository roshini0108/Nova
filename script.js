import { completeRedirectSignIn, logout, signInWithGoogle, watchAuth } from "./modules/auth.js";
import { streamChat } from "./modules/chat.js";
import {
    createChat,
    deleteChat,
    loadChats,
    loadMessages,
    renameChat,
    saveMessage,
    updateMessage
} from "./modules/firestore.js";
import {
    activeChat,
    messageHistoryForApi,
    resetState,
    setActiveChat,
    state,
    stopChatListener,
    stopMessageListener,
    truncate
} from "./modules/sessions.js";
import {
    appendTypingMessage,
    autoGrow,
    clearMessages,
    closeSidebar,
    configureMarkdown,
    els,
    openSidebar,
    renderChats,
    renderMessages,
    setAuthLoading,
    setStatus,
    showAuthScreen,
    showChatApp,
    stopStreamingMessage,
    toast,
    upsertStreamingMessage
} from "./modules/ui.js";

const STREAM_SAVE_INTERVAL = 1200; // Save the streaming response to Firestore every 12 seconds

async function startChatForUser(user) {
    stopChatListener();
    stopMessageListener();
    state.user = user;
    showChatApp(user);
    setStatus("Syncing", true);

    state.chatUnsubscribe = loadChats(user.uid, async chats => {
        state.chats = chats;

        if (!state.chats.length) {
            try {
                const chatId = await createChat(user.uid);
                setActiveChat(chatId);
                subscribeToMessages(chatId);
            } catch (error) {
                handleFirestoreError(error);
                renderChats();
                if (!state.isGenerating) if (!state.isGenerating) {
                    renderMessages();
                }
            }
            return;
        }

        if (!state.activeChatId || !state.chats.some(chat => chat.id === state.activeChatId)) {
            setActiveChat(state.chats[0].id);
            subscribeToMessages(state.activeChatId);
        }

        renderChats();
        setStatus("Ready", false);
    }, error => {
        handleFirestoreError(error);
        renderChats();
        renderMessages()
        if (!state.isGenerating) {
            renderMessages();
        }
        setStatus("Offline", false);
    });
}

function subscribeToMessages(chatId) {
    stopMessageListener();
    state.messages = [];
    clearMessages();

    if (!state.user || !chatId) return;

    state.messageUnsubscribe = loadMessages(state.user.uid, chatId, messages => {
        state.messages = messages;
        if (!state.isGenerating) {
            renderMessages();
        }
    }, error => {
        handleFirestoreError(error);
    });
}

async function createNewChat() {
    if (!state.user || state.isGenerating) return;
    try {
        const chatId = await createChat(state.user.uid);
        setActiveChat(chatId);
        subscribeToMessages(chatId);
        closeSidebar();
    } catch (error) {
        handleFirestoreError(error);
    }
}

async function sendPrompt(text) {
    const prompt = text.trim();
    if (!prompt || state.isGenerating) return;
    if (!state.user) {
        toast("Please sign in first.");
        return;
    }

    state.isGenerating = true;
    els.sendBtn.disabled = true;
    setStatus("Thinking", true);

    let reply = "";
    let lastSavedAt = 0;
    let pendingSave = Promise.resolve();
    let assistantMessageId = null;
    let chatId = state.activeChatId;

    try {
        if (!chatId) {
            chatId = await createChat(state.user.uid);
            setActiveChat(chatId);
            subscribeToMessages(chatId);
        }

        els.promptInput.value = "";
        autoGrow();

        const historyBeforeSend = messageHistoryForApi();
        const isFirstUserMessage = state.messages.filter(message => message.role === "user").length === 0;
        await saveMessage(state.user.uid, chatId, { role: "user", message: prompt });

        if (isFirstUserMessage) {
            await renameChat(state.user.uid, chatId, truncate(prompt, 54));
        }

        assistantMessageId = await saveMessage(state.user.uid, chatId, { role: "assistant", message: "" });
        const assistantEntry = { id: assistantMessageId, role: "assistant", message: "" };
        appendTypingMessage();

        const history = [...historyBeforeSend, { role: "user", message: prompt }];
        await streamChat(history, {
            onToken: token => {
                reply += token;
                upsertStreamingMessage(assistantEntry, reply);

                const now = Date.now();
                if (now - lastSavedAt > STREAM_SAVE_INTERVAL) {
                    lastSavedAt = now;
                    const snapshot = reply;
                    pendingSave = pendingSave.then(() => (
                        updateMessage(state.user.uid, chatId, assistantMessageId, { message: snapshot })
                    )).catch(error => {
                        console.warn("Unable to persist streaming chunk", error);
                    });
                }
            }
        });
        if (!reply.trim()) throw new Error("Gemini returned an empty response.");
        await pendingSave;
        await updateMessage(state.user.uid, chatId, assistantMessageId, { message: reply });
        stopStreamingMessage(assistantMessageId);
    } catch (error) {
        if (assistantMessageId) {
            await updateMessage(state.user.uid, chatId, assistantMessageId, {
                message: `**Something went wrong.**\n\n${error.message}`
            }).catch(() => { });
        }
        handleFirestoreError(error);
    } finally {
        state.isGenerating = false;
        els.sendBtn.disabled = false;
        setStatus("Ready", false);
        els.promptInput.focus();
    }
}

async function regenerate(messageId) {
    if (!state.user || !state.activeChatId || state.isGenerating) return;
    const index = state.messages.findIndex(message => message.id === messageId);
    if (index < 0) return;

    const previousMessages = state.messages.slice(0, index);
    const lastUser = [...previousMessages].reverse().find(message => message.role === "user");
    if (!lastUser) return;

    state.isGenerating = true;
    els.sendBtn.disabled = true;
    setStatus("Regenerating", true);

    let assistantMessageId = null;

    let reply = "";
    try {
        assistantMessageId = await saveMessage(state.user.uid, state.activeChatId, {
            role: "assistant",
            message: ""
        });
        const assistantEntry = { id: assistantMessageId, role: "assistant", message: "" };
        appendTypingMessage();

        await streamChat(previousMessages.map(({ role, message }) => ({ role, message })), {
            onToken: async token => {
                reply += token;
                upsertStreamingMessage(assistantEntry, reply);
            }
        });
        await updateMessage(state.user.uid, state.activeChatId, assistantMessageId, { message: reply });
        stopStreamingMessage(assistantMessageId);
    } catch (error) {
        if (assistantMessageId) {
            await updateMessage(state.user.uid, state.activeChatId, assistantMessageId, {
                message: `**Something went wrong.**\n\n${error.message}`
            }).catch(() => { });
        }
        handleFirestoreError(error);
    } finally {
        state.isGenerating = false;
        els.sendBtn.disabled = false;
        setStatus("Ready", false);
    }
}

function setupSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        els.micBtn.disabled = true;
        els.micBtn.title = "Speech recognition is not supported in this browser";
        return;
    }

    state.recognition = new SpeechRecognition();
    state.recognition.continuous = false;
    state.recognition.interimResults = true;
    state.recognition.lang = navigator.language || "en-US";

    state.recognition.onstart = () => {
        els.micBtn.classList.add("is-listening");
        setStatus("Listening", true);
    };
    state.recognition.onend = () => {
        els.micBtn.classList.remove("is-listening");
        if (!state.isGenerating) setStatus("Ready", false);
    };
    state.recognition.onresult = event => {
        els.promptInput.value = Array.from(event.results)
            .map(result => result[0].transcript)
            .join("");
        autoGrow();
    };
    state.recognition.onerror = event => toast(`Voice input stopped: ${event.error}`);
}

function toggleSpeech() {
    if (!state.recognition) return;
    if (els.micBtn.classList.contains("is-listening")) {
        state.recognition.stop();
        return;
    }
    state.recognition.start();
}

function speak(text) {
    if (!("speechSynthesis" in window)) {
        toast("Text-to-speech is not supported in this browser.");
        return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.96;
    speechSynthesis.speak(utterance);
}

function bindEvents() {
    els.googleLoginBtn.addEventListener("click", async () => {
        try {
            setAuthLoading("Signing in...", true);
            const user = await signInWithGoogle();
            if (!user) setAuthLoading("Redirecting to Google...", true);
        } catch (error) {
            console.error("Google sign-in failed", error);
            const message = friendlyAuthError(error);
            setAuthLoading(message, false);
            toast(message);
        }
    });

    els.logoutBtn.addEventListener("click", async () => {
        try {
            els.logoutBtn.disabled = true;
            setStatus("Logging out", true);
            await logout();
        } catch (error) {
            toast(error.message);
        } finally {
            els.logoutBtn.disabled = false;
        }
    });

    els.chatForm.addEventListener("submit", event => {
        event.preventDefault();
        sendPrompt(els.promptInput.value);
    });

    els.promptInput.addEventListener("input", autoGrow);
    els.promptInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendPrompt(els.promptInput.value);
        }
    });

    els.newChatBtn.addEventListener("click", createNewChat);
    els.sidebarToggleBtn.addEventListener("click", openSidebar);
    els.closeSidebarBtn.addEventListener("click", closeSidebar);
    els.sidebarBackdrop.addEventListener("click", closeSidebar);
    els.micBtn.addEventListener("click", toggleSpeech);

    els.chatList.addEventListener("click", async event => {
        const row = event.target.closest(".chat-row");
        if (!row || !state.user) return;
        const chatId = row.dataset.chatId;

        if (event.target.closest(".rename-chat")) {
            const chat = state.chats.find(item => item.id === chatId);
            const title = window.prompt("Rename chat", chat?.title || "New chat")?.trim();
            if (title) {
                await renameChat(state.user.uid, chatId, truncate(title, 72)).catch(handleFirestoreError);
            }
            return;
        }

        if (event.target.closest(".delete-chat")) {
            const chat = state.chats.find(item => item.id === chatId);
            if (window.confirm(`Delete "${chat?.title || "this chat"}"?`)) {
                await deleteChat(state.user.uid, chatId).catch(handleFirestoreError);
            }
            return;
        }

        setActiveChat(chatId);
        renderChats();
        subscribeToMessages(chatId);
        closeSidebar();
    });

    els.messages.addEventListener("click", async event => {
        const promptCard = event.target.closest(".prompt-card");
        if (promptCard) {
            els.promptInput.value = promptCard.dataset.prompt;
            autoGrow();
            els.promptInput.focus();
            return;
        }

        const copyCode = event.target.closest(".copy-code");
        if (copyCode) {
            const code = copyCode.closest("pre")?.querySelector("code")?.innerText || "";
            await navigator.clipboard.writeText(code);
            copyCode.textContent = "Copied";
            setTimeout(() => { copyCode.textContent = "Copy"; }, 1200);
            return;
        }

        const messageNode = event.target.closest(".message");
        if (!messageNode) return;
        const entry = state.messages.find(message => message.id === messageNode.dataset.messageId);
        if (!entry) return;

        if (event.target.closest(".copy-message")) {
            await navigator.clipboard.writeText(entry.message);
            toast("Response copied");
        }
        if (event.target.closest(".speak-message")) speak(entry.message);
        if (event.target.closest(".regenerate-message")) regenerate(entry.id);
    });

    window.addEventListener("resize", autoGrow);
}

function handleFirestoreError(error) {
    console.error("Firestore operation failed", error);
    const message = isPermissionError(error)
        ? "Firestore rules are blocking this user. Deploy the included firestore.rules file."
        : error?.message || "Something went wrong.";
    toast(message);
    setStatus(isPermissionError(error) ? "Rules blocked" : "Offline", false);
}

function isPermissionError(error) {
    return error?.code === "permission-denied" || /insufficient permissions/i.test(error?.message || "");
}

function friendlyAuthError(error) {
    const code = error?.code || "";
    if (code === "auth/unauthorized-domain") {
        return "Add localhost to Firebase authorized domains.";
    }
    if (code === "auth/popup-blocked") {
        return "Popup was blocked. Allow popups and try again.";
    }
    if (code === "auth/popup-closed-by-user") {
        return "Google sign-in was closed before finishing.";
    }
    if (code === "auth/operation-not-allowed") {
        return "Enable Google sign-in in Firebase Authentication.";
    }
    return error?.message || "Sign-in failed. Try again.";
}

async function boot() {
    configureMarkdown();
    bindEvents();
    setupSpeech();
    showAuthScreen("Checking auth...");

    try {
        await completeRedirectSignIn();
    } catch (error) {
        console.error("Redirect sign-in failed", error);
        setAuthLoading(friendlyAuthError(error), false);
    }

    watchAuth(user => {
        state.authReady = true;
        if (!user) {
            resetState();
            renderChats();
            showAuthScreen("Ready when you are.");
            return;
        }
        startChatForUser(user);
    });
}

boot();
