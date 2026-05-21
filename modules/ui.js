import { SAMPLE_PROMPTS, activeChat, state } from "./sessions.js";

export const els = {
    app: document.getElementById("app"),
    authScreen: document.getElementById("authScreen"),
    shell: document.getElementById("shell"),
    sidebar: document.getElementById("sidebar"),
    sidebarBackdrop: document.getElementById("sidebarBackdrop"),
    sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
    closeSidebarBtn: document.getElementById("closeSidebarBtn"),
    chatList: document.getElementById("chatList"),
    newChatBtn: document.getElementById("newChatBtn"),
    activeTitle: document.getElementById("activeTitle"),
    messages: document.getElementById("messages"),
    chatForm: document.getElementById("chatForm"),
    promptInput: document.getElementById("promptInput"),
    sendBtn: document.getElementById("sendBtn"),
    micBtn: document.getElementById("micBtn"),
    connectionStatus: document.getElementById("connectionStatus"),
    googleLoginBtn: document.getElementById("googleLoginBtn"),
    authStatus: document.getElementById("authStatus"),
    userAvatar: document.getElementById("userAvatar"),
    userName: document.getElementById("userName"),
    userEmail: document.getElementById("userEmail"),
    logoutBtn: document.getElementById("logoutBtn")
};

export function configureMarkdown() {
    marked.setOptions({
        breaks: true,
        gfm: true,
        highlight(code, lang) {
            const language = Prism.languages[lang] ? lang : "markup";
            return Prism.highlight(code, Prism.languages[language], language);
        }
    });
}

export function renderMarkdown(raw = "") {
    const html = marked.parse(raw);
    return DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target", "rel", "class"]
    });
}

export function showAuthScreen(label = "Checking auth...") {
    els.authScreen.hidden = false;
    els.shell.hidden = true;
    els.app.classList.remove("is-authed");
    setAuthLoading(label, false);
    clearMessages();
}

export function showChatApp(user) {
    els.authScreen.hidden = true;
    els.shell.hidden = false;
    els.app.classList.add("is-authed");
    renderUser(user);
    els.promptInput.focus();
}

export function setAuthLoading(label, busy = true) {
    els.authStatus.textContent = label;
    els.googleLoginBtn.disabled = busy;
    els.googleLoginBtn.classList.toggle("is-loading", busy);
}

export function renderUser(user) {
    els.userName.textContent = user.displayName || "Nova user";
    els.userEmail.textContent = user.email || "";
    if (user.photoURL) {
        els.userAvatar.innerHTML = `<img src="${DOMPurify.sanitize(user.photoURL)}" alt="" />`;
    } else {
        els.userAvatar.textContent = (user.displayName || user.email || "N").slice(0, 1).toUpperCase();
    }
}

export function renderChats() {
    els.chatList.innerHTML = "";

    if (!state.chats.length) {
        const empty = document.createElement("p");
        empty.className = "sidebar-empty";
        empty.textContent = "No chats yet.";
        els.chatList.appendChild(empty);
        return;
    }

    state.chats.forEach(chat => {
        const row = document.createElement("button");
        row.className = `chat-row${chat.id === state.activeChatId ? " active" : ""}`;
        row.type = "button";
        row.dataset.chatId = chat.id;
        row.setAttribute("aria-current", chat.id === state.activeChatId ? "page" : "false");
        row.innerHTML = `
            <span class="chat-title">${DOMPurify.sanitize(chat.title || "New chat")}</span>
            <span class="chat-actions" aria-label="Chat actions">
                <span class="action-btn rename-chat" role="button" tabindex="0" title="Rename chat">Rename</span>
                <span class="action-btn delete-chat" role="button" tabindex="0" title="Delete chat">Delete</span>
            </span>
        `;
        els.chatList.appendChild(row);
    });
}

export function renderMessages() {
    const chat = activeChat();
    els.activeTitle.textContent = chat?.title || "New chat";
    els.messages.innerHTML = "";
    const visibleMessages = state.messages.filter(isVisibleMessage);

    if (!chat || visibleMessages.length === 0) {
        els.messages.appendChild(createWelcome());
        return;
    }

    visibleMessages.forEach(message => els.messages.appendChild(createMessage(message)));
    enhanceCodeBlocks(els.messages);
    Prism.highlightAllUnder(els.messages);
    scrollToBottom(false);
}

export function clearMessages() {
    els.messages.innerHTML = "";
    els.activeTitle.textContent = "New chat";
}

export function createWelcome() {
    const welcome = document.createElement("div");
    welcome.className = "welcome";
    welcome.innerHTML = `
        <div class="welcome-mark" aria-hidden="true">N</div>
        <h2>What should we build, untangle, or imagine?</h2>
        <p>Ask Nova Chat for code, writing, planning, analysis, or a careful second pass on an idea.</p>
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
}

export function createMessage(entry) {
    const message = document.createElement("article");
    message.className = `message ${entry.role}`;
    message.dataset.messageId = entry.id;

    const isUser = entry.role === "user";
    const label = isUser ? "You" : "Nova";
    const avatar = isUser ? userInitial() : "N";
    const actions = isUser ? "" : `
        <div class="message-actions">
            <button class="action-btn copy-message" type="button" title="Copy response" aria-label="Copy response">Copy</button>
            <button class="action-btn speak-message" type="button" title="Read aloud" aria-label="Read response aloud">Play</button>
            <button class="action-btn regenerate-message" type="button" title="Regenerate" aria-label="Regenerate response">Redo</button>
        </div>
    `;

    message.innerHTML = `
        <div class="avatar" aria-hidden="true">${DOMPurify.sanitize(avatar)}</div>
        <div class="message-body">
            <div class="message-head">
                <span>${label}</span>
                ${actions}
            </div>
            <div class="bubble">${isUser ? DOMPurify.sanitize(entry.message || "") : renderMarkdown(entry.message || "")}</div>
        </div>
    `;

    enhanceCodeBlocks(message);
    return message;
}

export function appendTypingMessage() {
    document.querySelector(".typing-message")?.remove();
    const wrapper = document.createElement("article");
    wrapper.className = "message assistant typing-message";
    wrapper.innerHTML = `
        <div class="avatar" aria-hidden="true">N</div>
        <div class="message-body">
            <div class="message-head"><span>Nova</span></div>
            <div class="bubble typing-bubble">
                <div class="typing-dots" aria-label="Nova is typing">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
    `;
    els.messages.querySelector(".welcome")?.remove();
    els.messages.appendChild(wrapper);
    scrollToBottom();
}

export function upsertStreamingMessage(entry, content) {
    document.querySelector(".typing-message")?.remove();
    let message = els.messages.querySelector(`[data-message-id="${entry.id}"]`);
    if (!message) {
        els.messages.querySelector(".welcome")?.remove();
        message = createMessage({ ...entry, message: content });
        els.messages.appendChild(message);
    }

    const bubble = message.querySelector(".bubble");
    bubble.classList.add("streaming");
    bubble.innerHTML = renderMarkdown(content);
    enhanceCodeBlocks(bubble);
    Prism.highlightAllUnder(bubble);
    scrollToBottom();
}

export function stopStreamingMessage(messageId) {
    const message = els.messages.querySelector(`[data-message-id="${messageId}"]`);
    message?.querySelector(".bubble")?.classList.remove("streaming");
}

export function setStatus(label, busy = false) {
    els.connectionStatus.querySelector("strong").textContent = label;
    els.connectionStatus.classList.toggle("is-busy", busy);
}

export function toast(message) {
    document.querySelector(".toast")?.remove();
    const toastNode = document.createElement("div");
    toastNode.className = "toast";
    toastNode.textContent = message;
    document.body.appendChild(toastNode);
    setTimeout(() => toastNode.remove(), 2400);
}

export function openSidebar() {
    els.shell.classList.add("sidebar-open");
    els.sidebarBackdrop.hidden = false;
}

export function closeSidebar() {
    els.shell.classList.remove("sidebar-open");
    els.sidebarBackdrop.hidden = true;
}

export function autoGrow() {
    els.promptInput.style.height = "auto";
    els.promptInput.style.height = `${Math.min(els.promptInput.scrollHeight, 168)}px`;
}

export function scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
        els.messages.scrollTo({
            top: els.messages.scrollHeight,
            behavior: smooth ? "smooth" : "auto"
        });
    });
}

export function enhanceCodeBlocks(root) {
    root.querySelectorAll("pre").forEach(pre => {
        if (pre.querySelector(".copy-code")) return;
        const button = document.createElement("button");
        button.className = "copy-code";
        button.type = "button";
        button.textContent = "Copy";
        pre.appendChild(button);
    });
}

function userInitial() {
    return (state.user?.displayName || state.user?.email || "U").slice(0, 1).toUpperCase();
}

function isVisibleMessage(message) {
    return message.role !== "assistant" || Boolean(message.message?.trim());
}
