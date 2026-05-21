const { stream } = require("@netlify/functions");

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function toGeminiContents(messages = []) {
    return messages
        .filter(item => item?.message?.trim())
        .map(item => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.message }]
        }));
}

function extractText(payload) {
    return payload?.candidates
        ?.flatMap(candidate => candidate?.content?.parts || [])
        ?.map(part => part?.text || "")
        ?.join("") || "";
}

function parseSseEvents(buffer) {
    const normalized = buffer.replace(/\r\n/g, "\n");
    const parts = normalized.split("\n\n");
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

function encodeSse(payload) {
    if (payload === "[DONE]") return "data: [DONE]\n\n";
    return `data: ${JSON.stringify(payload)}\n\n`;
}

async function writeGeminiStream(controller, encoder, contents, apiKey) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;
    const upstream = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents,
            generationConfig: {
                temperature: 0.75,
                topP: 0.95,
                maxOutputTokens: 4096
            }
        })
    });

    if (!upstream.ok) {
        const errorBody = await upstream.json().catch(() => ({}));
        controller.enqueue(encoder.encode(encodeSse({
            type: "error",
            message: errorBody?.error?.message || `Gemini API failed with HTTP ${upstream.status}`
        })));
        return;
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) {
            const dataLines = parseEventData(buffer.replace(/\r\n/g, "\n"));
            for (const payload of dataLines) {
                if (payload === "[DONE]") continue;
                const token = extractText(JSON.parse(payload));
                if (token) controller.enqueue(encoder.encode(encodeSse({ type: "token", text: token })));
            }
            return;
        }

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseEvents(buffer);
        buffer = parsed.rest;

        for (const event of parsed.events) {
            const dataLines = parseEventData(event);
            for (const payload of dataLines) {
                if (payload === "[DONE]") return;
                const token = extractText(JSON.parse(payload));
                if (token) controller.enqueue(encoder.encode(encodeSse({ type: "token", text: token })));
            }
        }
    }
}

exports.handler = stream(async event => {
    const encoder = new TextEncoder();
    const apiKey = process.env.GEMINI_API_KEY;

    const body = new ReadableStream({
        async start(controller) {
            try {
                if (event.httpMethod !== "POST") {
                    controller.enqueue(encoder.encode(encodeSse({
                        type: "error",
                        message: "Method not allowed."
                    })));
                    return;
                }

                if (!apiKey) {
                    controller.enqueue(encoder.encode(encodeSse({
                        type: "error",
                        message: "Missing GEMINI_API_KEY in the Netlify environment."
                    })));
                    return;
                }

                const requestBody = JSON.parse(event.body || "{}");
                const contents = toGeminiContents(requestBody.messages);

                if (!contents.length) {
                    controller.enqueue(encoder.encode(encodeSse({
                        type: "error",
                        message: "At least one message is required."
                    })));
                    return;
                }

                await writeGeminiStream(controller, encoder, contents, apiKey);
            } catch (error) {
                controller.enqueue(encoder.encode(encodeSse({
                    type: "error",
                    message: error.message
                })));
            } finally {
                controller.enqueue(encoder.encode(encodeSse("[DONE]")));
                controller.close();
            }
        }
    });

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive"
        },
        body
    };
});
