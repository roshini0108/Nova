export async function streamChat(messages, callbacks = {}) {
    const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
            streamError = new Error(parsed.message || "The server returned a streaming error.");
        }
    };

    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            parseEventData(buffer.replace(/\r\n/g, "\n")).forEach(handlePayload);
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseEvents(buffer);
        buffer = parsed.rest;
        parsed.events.forEach(event => parseEventData(event).forEach(handlePayload));

        if (streamError) throw streamError;
    }

    if (streamError) throw streamError;
}

function parseSseEvents(buffer) {
    const parts = buffer.replace(/\r\n/g, "\n").split("\n\n");
    return {
        events: parts.slice(0, -1),
        rest: parts.at(-1) || ""
    };
}

function parseEventData(event) {
    return event
        .split("\n")
        .filter(line => line.startsWith("data:"))
        .map(line => line.replace(/^data:\s*/, "").trim())
        .filter(Boolean);
}
