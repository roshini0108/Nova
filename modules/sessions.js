export const state = {
    user: null,
    chats: [],
    messages: [],
    activeChatId: null,
    isGenerating: false,
    authReady: false,
    chatUnsubscribe: null,
    messageUnsubscribe: null,
    recognition: null
};

export const SAMPLE_PROMPTS = [
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

export function activeChat() {
    return state.chats.find(chat => chat.id === state.activeChatId) || null;
}

export function setActiveChat(chatId) {
    state.activeChatId = chatId;
}

export function stopChatListener() {
    state.chatUnsubscribe?.();
    state.chatUnsubscribe = null;
}

export function stopMessageListener() {
    state.messageUnsubscribe?.();
    state.messageUnsubscribe = null;
}

export function resetState() {
    stopChatListener();
    stopMessageListener();
    state.user = null;
    state.chats = [];
    state.messages = [];
    state.activeChatId = null;
    state.isGenerating = false;
}

export function truncate(text = "", max = 52) {
    const normalized = text.replace(/\s+/g, " ").trim();
    return normalized.length > max ? `${normalized.slice(0, max - 3)}...` : normalized;
}

export function messageHistoryForApi() {
    return state.messages
        .filter(item => item.message?.trim())
        .map(item => ({
            role: item.role,
            message: item.message
        }));
}
