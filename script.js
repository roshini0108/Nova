const MODEL = 'gemini-2.5-flash';

const STORAGE_KEYS = {
    sessions: "gemini.assistant.sessions.v1",
    activeSession: "gemini.assistant.activeSession.v1",
    theme: "gemini.assistant.theme.v1"
};

const SAMPLE_PROMPTS = [
    {
        title: "Plan a launch",
        text: "Create a crisp product launch checklist for a small SaaS team."
    },
    {
        title: "Explain code",
        text: "Explain this JavaScript concept with a short example: closures."
    },
    {
        title: "Write better",
        text: "Rewrite this paragraph to sound clearer, warmer, and more concise."
    },
    {
        title: "Think with me",
        text: "Help me compare three approaches for building a personal knowledge base."
    }
];

const state = {
    sessions: [],
    activeSessionId: null,
    isGenerating: false,
    recognition: null
};

const els = {
    shell: document.getElementById("shell"),
    sidebar: document.getElementById("sidebar"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),
    sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
    closeSidebarBtn: document.getElementById("closeSidebarBtn"),
    sessionList: document.getElementById("sessionList"),
    newChatBtn: document.getElementById("newChatBtn"),
    activeTitle: document.getElementById("activeTitle"),
    messages: document.getElementById("messages"),
    chatForm: document.getElementById("chatForm"),
    promptInput: document.getElementById("promptInput"),
    sendBtn: document.getElementById("sendBtn"),
    micBtn: document.getElementById("micBtn"),
    themeToggle: document.getElementById("themeToggle"),
    connectionStatus: document.getElementById("connectionStatus")
};

const storage = {
    loadSessions() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.sessions)) || [];
        } catch {
            return [];
        }
    },
    saveSessions() {
        localStorage.setItem(STORAGE_KEYS.sessions, JSON.stringify(state.sessions));
    },
    loadActiveSessionId() {
        return localStorage.getItem(STORAGE_KEYS.activeSession);
    },
    saveActiveSessionId() {
        localStorage.setItem(STORAGE_KEYS.activeSession, state.activeSessionId);
    },
    loadTheme() {
        return localStorage.getItem(STORAGE_KEYS.theme);
    },
    saveTheme(theme) {
        localStorage.setItem(STORAGE_KEYS.theme, theme);
    }
};

const utils = {
    id(prefix = "id") {
        return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    },
    now() {
        return new Date().toISOString();
    },
    get activeSession() {
        return state.sessions.find(session => session.id === state.activeSessionId);
    },
    truncate(text, max = 44) {
        const normalized = text.replace(/\s+/g, " ").trim();
        return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized;
    },
    scrollToBottom() {
        requestAnimationFrame(() => {
            els.messages.scrollTo({ top: els.messages.scrollHeight, behavior: "smooth" });
        });
    },
    setStatus(label, busy = false) {
        els.connectionStatus.lastChild.textContent = ` ${label}`;
        els.connectionStatus.classList.toggle("is-busy", busy);
    },
    toast(message) {
        document.querySelector(".toast")?.remove();
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2200);
    }
};

const markdown = {
    configure() {
        marked.setOptions({
            breaks: true,
            gfm: true,
            highlight(code, lang) {
                const language = Prism.languages[lang] ? lang : "markup";
                return Prism.highlight(code, Prism.languages[language], language);
            }
        });
    },
    render(raw) {
        const html = marked.parse(raw || "");
        return DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true },
            ADD_ATTR: ["target", "rel"]
        });
    }
};

const sessions = {
    create(title = "New chat") {
        const session = {
            id: utils.id("chat"),
            title,
            createdAt: utils.now(),
            updatedAt: utils.now(),
            messages: []
        };
        state.sessions.unshift(session);
        state.activeSessionId = session.id;
        this.persist();
        ui.renderAll();
        return session;
    },
    delete(id) {
        const session = state.sessions.find(item => item.id === id);
        if (!session) return;

        const confirmed = window.confirm(`Delete "${session.title}"?`);
        if (!confirmed) return;

        state.sessions = state.sessions.filter(item => item.id !== id);
        if (!state.sessions.length) {
            this.create();
            return;
        }
        if (state.activeSessionId === id) {
            state.activeSessionId = state.sessions[0].id;
        }
        this.persist();
        ui.renderAll();
    },
    rename(id) {
        const session = state.sessions.find(item => item.id === id);
        if (!session) return;

        const nextTitle = window.prompt("Rename chat", session.title)?.trim();
        if (!nextTitle) return;
        session.title = utils.truncate(nextTitle, 64);
        session.updatedAt = utils.now();
        this.persist();
        ui.renderAll();
    },
    activate(id) {
        if (state.activeSessionId === id) return;
        state.activeSessionId = id;
        this.persist();
        ui.renderAll();
        ui.closeSidebar();
    },
    addMessage(role, message) {
        const session = utils.activeSession || this.create();
        const entry = {
            id: utils.id("msg"),
            role,
            message,
            createdAt: utils.now()
        };
        session.messages.push(entry);
        session.updatedAt = utils.now();

        if (role === "user" && session.messages.filter(item => item.role === "user").length === 1) {
            session.title = utils.truncate(message, 52) || "New chat";
            els.activeTitle.textContent = session.title;
        }

        this.persist();
        return entry;
    },
    updateMessage(id, message) {
        const session = utils.activeSession;
        const entry = session?.messages.find(item => item.id === id);
        if (!entry) return;
        entry.message = message;
        session.updatedAt = utils.now();
        this.persist();
    },
    removeMessage(id) {
        const session = utils.activeSession;
        if (!session) return;
        session.messages = session.messages.filter(item => item.id !== id);
        session.updatedAt = utils.now();
        this.persist();
    },
    persist() {
        storage.saveSessions();
        storage.saveActiveSessionId();
    }
};

const ui = {
    renderAll() {
        this.renderSessions();
        this.renderMessages();
    },
    renderSessions() {
        els.sessionList.innerHTML = "";
        state.sessions.forEach(session => {
            const row = document.createElement("button");
            row.className = `session-row${session.id === state.activeSessionId ? " active" : ""}`;
            row.type = "button";
            row.dataset.sessionId = session.id;
            row.setAttribute("aria-current", session.id === state.activeSessionId ? "page" : "false");
            row.innerHTML = `
                    <span class="session-title">${DOMPurify.sanitize(session.title)}</span>
                    <span class="session-actions" aria-label="Chat actions">
                    <span class="action-btn rename-session" role="button" tabindex="0" title="Rename">Edit</span>
                    <span class="action-btn delete-session" role="button" tabindex="0" title="Delete">Del</span>
                </span>
            `;
            els.sessionList.appendChild(row);
        });
    },
    renderMessages() {
        const session = utils.activeSession;
        els.activeTitle.textContent = session?.title || "New chat";
        els.messages.innerHTML = "";

        if (!session || session.messages.length === 0) {
            els.messages.appendChild(this.createWelcome());
            return;
        }

        session.messages.forEach(message => {
            els.messages.appendChild(this.createMessage(message));
        });
        Prism.highlightAllUnder(els.messages);
        utils.scrollToBottom();
    },
    createWelcome() {
        const welcome = document.createElement("div");
        welcome.className = "welcome";
        welcome.innerHTML = `
            <div class="welcome-mark" aria-hidden="true">G</div>
            <h2>How can I help today?</h2>
            <p>Ask for strategy, code, writing, research, planning, or a second brain for a half-formed idea.</p>
            <div class="prompt-grid">
                ${SAMPLE_PROMPTS.map(prompt => `
                    <button class="prompt-card" type="button" data-prompt="${DOMPurify.sanitize(prompt.text)}">
                        <strong>${DOMPurify.sanitize(prompt.title)}</strong>
                        <span>${DOMPurify.sanitize(prompt.text)}</span>
                    </button>
                `).join("")}
            </div>
        `;
        return welcome;
    },
    createMessage(entry) {
        const message = document.createElement("article");
        message.className = `message ${entry.role}`;
        message.dataset.messageId = entry.id;

        const isUser = entry.role === "user";
        const label = isUser ? "You" : "Gemini";
        const actions = isUser ? "" : `
            <div class="message-actions">
                <button class="action-btn copy-message" type="button" title="Copy response" aria-label="Copy response">Copy</button>
                <button class="action-btn speak-message" type="button" title="Read aloud" aria-label="Read response aloud">Play</button>
                <button class="action-btn regenerate-message" type="button" title="Regenerate" aria-label="Regenerate response">Redo</button>
            </div>
        `;

        message.innerHTML = `
            <div class="avatar" aria-hidden="true">${isUser ? "U" : "G"}</div>
            <div class="message-body">
                <div class="message-head">
                    <span>${label}</span>
                    ${actions}
                </div>
                <div class="bubble">${isUser ? DOMPurify.sanitize(entry.message) : markdown.render(entry.message)}</div>
            </div>
        `;
        return message;
    },
    createTypingMessage() {
        const wrapper = document.createElement("article");
        wrapper.className = "message assistant typing-message";
        wrapper.innerHTML = `
            <div class="avatar" aria-hidden="true">G</div>
            <div class="message-body">
                <div class="message-head"><span>Gemini</span></div>
                <div class="bubble typing-bubble">
                    <div class="typing-dots" aria-label="Gemini is typing">
                        <span></span><span></span><span></span>
                    </div>
                    <div class="skeleton" aria-hidden="true">
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                        <div class="skeleton-line"></div>
                    </div>
                </div>
            </div>
        `;
        return wrapper;
    },
    replaceTypingWithStream(entry) {
        document.querySelector(".typing-message")?.remove();
        const message = this.createMessage(entry);
        const bubble = message.querySelector(".bubble");
        bubble.classList.add("streaming");
        els.messages.appendChild(message);
        utils.scrollToBottom();
        return bubble;
    },
    openSidebar() {
        els.shell.classList.add("sidebar-open");
        els.sidebarBackdrop.hidden = false;
    },
    closeSidebar() {
        els.shell.classList.remove("sidebar-open");
        els.sidebarBackdrop.hidden = true;
    },
    setTheme(theme) {
        document.documentElement.dataset.theme = theme;
        els.themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
        storage.saveTheme(theme);
    },
    autoGrow() {
        els.promptInput.style.height = "auto";
        els.promptInput.style.height = `${Math.min(els.promptInput.scrollHeight, 168)}px`;
    }
};

const api = {
    parseSseEvents(buffer) {
        const normalized = buffer.replace(/\r\n/g, "\n");
        const parts = normalized.split("\n\n");
        return {
            events: parts.slice(0, -1),
            rest: parts.at(-1) || ""
        };
    },
    parseEventData(event) {
        return event
            .split("\n")
            .filter(line => line.startsWith("data:"))
            .map(line => line.replace(/^data:\s*/, "").trim())
            .filter(Boolean);
    },
    async streamChat(messages, callbacks) {
        const response = await fetch('https://nova-hgai.onrender.com/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Request failed with HTTP ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamError = null;

        const handlePayload = payload => {
            if (payload === "[DONE]") {
                callbacks.onDone?.();
                return;
            }

            const parsed = JSON.parse(payload);
            if (parsed.type === "token") callbacks.onToken?.(parsed.text);
            if (parsed.type === "error") {
                streamError = new Error(parsed.message || "The server returned an unknown streaming error.");
            }
        };

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                api.parseEventData(buffer.replace(/\r\n/g, "\n")).forEach(handlePayload);
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const parsedBuffer = api.parseSseEvents(buffer);
            buffer = parsedBuffer.rest;

            parsedBuffer.events.forEach(event => {
                api.parseEventData(event).forEach(handlePayload);
            });

            if (streamError) throw streamError;
        }

        if (streamError) throw streamError;
    }
};

const chat = {
    async send(text) {
        const prompt = text.trim();
        if (!prompt || state.isGenerating) return;

        state.isGenerating = true;
        els.sendBtn.disabled = true;
        utils.setStatus("Thinking", true);

        const userEntry = sessions.addMessage("user", prompt);
        els.messages.querySelector(".welcome")?.remove();
        els.messages.appendChild(ui.createMessage(userEntry));
        els.messages.appendChild(ui.createTypingMessage());
        ui.renderSessions();
        utils.scrollToBottom();

        els.promptInput.value = "";
        ui.autoGrow();

        const assistantEntry = sessions.addMessage("assistant", "");
        let reply = "";
        let bubble = null;

        try {
            await api.streamChat(utils.activeSession.messages.filter(item => item.id !== assistantEntry.id), {
                onToken: token => {
                    if (!bubble) bubble = ui.replaceTypingWithStream(assistantEntry);
                    reply += token;
                    sessions.updateMessage(assistantEntry.id, reply);
                    bubble.innerHTML = markdown.render(reply);
                    Prism.highlightAllUnder(bubble);
                    utils.scrollToBottom();
                },
                onError: message => {
                    throw new Error(message);
                }
            });

            if (!reply.trim()) throw new Error("Gemini returned an empty response.");
            bubble?.classList.remove("streaming");
        } catch (error) {
            sessions.removeMessage(assistantEntry.id);
            document.querySelector(".typing-message")?.remove();
            this.showError(error.message);
        } finally {
            state.isGenerating = false;
            els.sendBtn.disabled = false;
            utils.setStatus("Ready", false);
            ui.renderSessions();
            els.promptInput.focus();
        }
    },
    async regenerate(messageId) {
        const session = utils.activeSession;
        const index = session?.messages.findIndex(item => item.id === messageId);
        if (!session || index < 0 || state.isGenerating) return;

        const previousUser = [...session.messages.slice(0, index)].reverse().find(item => item.role === "user");
        if (!previousUser) return;

        session.messages = session.messages.slice(0, index);
        sessions.persist();
        ui.renderMessages();
        const assistantEntry = sessions.addMessage("assistant", "");
        let reply = "";
        let bubble = null;

        state.isGenerating = true;
        els.sendBtn.disabled = true;
        utils.setStatus("Thinking", true);
        els.messages.appendChild(ui.createTypingMessage());
        utils.scrollToBottom();

        try {
            await api.streamChat(session.messages.filter(item => item.id !== assistantEntry.id), {
                onToken: token => {
                    if (!bubble) bubble = ui.replaceTypingWithStream(assistantEntry);
                    reply += token;
                    sessions.updateMessage(assistantEntry.id, reply);
                    bubble.innerHTML = markdown.render(reply);
                    Prism.highlightAllUnder(bubble);
                    utils.scrollToBottom();
                },
                onError: message => {
                    throw new Error(message);
                }
            });

            if (!reply.trim()) throw new Error("Gemini returned an empty response.");
            bubble?.classList.remove("streaming");
        } catch (error) {
            sessions.removeMessage(assistantEntry.id);
            document.querySelector(".typing-message")?.remove();
            this.showError(error.message);
        } finally {
            state.isGenerating = false;
            els.sendBtn.disabled = false;
            utils.setStatus("Ready", false);
            ui.renderSessions();
            els.promptInput.focus();
        }
    },
    showError(message) {
        const entry = {
            id: utils.id("err"),
            role: "assistant",
            message: `**Something went wrong.**\n\n${message}`
        };
        els.messages.appendChild(ui.createMessage(entry));
        utils.toast(message);
        utils.scrollToBottom();
    }
};

const speech = {
    setup() {
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
            utils.setStatus("Listening", true);
        };
        state.recognition.onend = () => {
            els.micBtn.classList.remove("is-listening");
            if (!state.isGenerating) utils.setStatus("Ready", false);
        };
        state.recognition.onresult = event => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join("");
            els.promptInput.value = transcript;
            ui.autoGrow();
        };
        state.recognition.onerror = event => {
            utils.toast(`Voice input stopped: ${event.error}`);
        };
    },
    toggle() {
        if (!state.recognition) return;
        if (els.micBtn.classList.contains("is-listening")) {
            state.recognition.stop();
            return;
        }
        state.recognition.start();
    },
    speak(text) {
        if (!("speechSynthesis" in window)) {
            utils.toast("Text-to-speech is not supported in this browser.");
            return;
        }
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.96;
        speechSynthesis.speak(utterance);
    }
};

function bindEvents() {
    els.chatForm.addEventListener("submit", event => {
        event.preventDefault();
        chat.send(els.promptInput.value);
    });

    els.promptInput.addEventListener("input", ui.autoGrow);
    els.promptInput.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            chat.send(els.promptInput.value);
        }
    });

    els.newChatBtn.addEventListener("click", () => sessions.create());
    els.sidebarToggleBtn.addEventListener("click", ui.openSidebar);
    els.closeSidebarBtn.addEventListener("click", ui.closeSidebar);
    els.sidebarBackdrop.addEventListener("click", ui.closeSidebar);

    els.themeToggle.addEventListener("click", () => {
        const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        ui.setTheme(nextTheme);
    });

    els.micBtn.addEventListener("click", speech.toggle);

    els.sessionList.addEventListener("click", event => {
        const row = event.target.closest(".session-row");
        if (!row) return;
        const id = row.dataset.sessionId;
        if (event.target.closest(".rename-session")) {
            sessions.rename(id);
            return;
        }
        if (event.target.closest(".delete-session")) {
            sessions.delete(id);
            return;
        }
        sessions.activate(id);
    });

    els.messages.addEventListener("click", async event => {
        const promptCard = event.target.closest(".prompt-card");
        if (promptCard) {
            els.promptInput.value = promptCard.dataset.prompt;
            ui.autoGrow();
            els.promptInput.focus();
            return;
        }

        const message = event.target.closest(".message");
        if (!message) return;

        const id = message.dataset.messageId;
        const entry = utils.activeSession?.messages.find(item => item.id === id);
        if (!entry) return;

        if (event.target.closest(".copy-message")) {
            await navigator.clipboard.writeText(entry.message);
            utils.toast("Response copied");
        }
        if (event.target.closest(".speak-message")) {
            speech.speak(entry.message);
        }
        if (event.target.closest(".regenerate-message")) {
            chat.regenerate(id);
        }
    });

    window.addEventListener("resize", ui.autoGrow);
}

function boot() {
    markdown.configure();

    const preferredTheme = storage.loadTheme()
        || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    ui.setTheme(preferredTheme);

    state.sessions = storage.loadSessions();
    const activeId = storage.loadActiveSessionId();
    state.activeSessionId = state.sessions.some(session => session.id === activeId)
        ? activeId
        : state.sessions[0]?.id;

    if (!state.sessions.length) sessions.create();
    ui.renderAll();
    speech.setup();
    bindEvents();
    ui.autoGrow();
}

boot();
