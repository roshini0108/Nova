require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors({
    origin: 'https://nova-4v9y.onrender.com'
}));

const PORT = process.env.PORT || 5000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

app.use(express.static(path.join(__dirname)));
app.use(express.json({ limit: '1mb' }));

if (!GEMINI_API_KEY) {
    console.warn('Warning: GEMINI_API_KEY is not set. Set the environment variable before starting the server.');
}

function toGeminiContents(messages = []) {
    return messages
        .filter(item => item?.message?.trim())
        .map(item => ({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.message }]
        }));
}

function sendSse(res, payload) {
    if (payload === '[DONE]') {
        res.write('data: [DONE]\n\n');
        return;
    }

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function extractText(payload) {
    return payload?.candidates
        ?.flatMap(candidate => candidate?.content?.parts || [])
        ?.map(part => part?.text || '')
        ?.join('') || '';
}

function parseSseEvents(buffer) {
    const normalized = buffer.replace(/\r\n/g, '\n');
    const parts = normalized.split('\n\n');
    return {
        events: parts.slice(0, -1),
        rest: parts.at(-1) || ''
    };
}

function parseEventData(event) {
    return event
        .split('\n')
        .filter(line => line.startsWith('data:'))
        .map(line => line.replace(/^data:\s*/, '').trim())
        .filter(Boolean);
}

app.get('/api/health', (_req, res) => {
    res.json({
        ok: Boolean(GEMINI_API_KEY),
        model: GEMINI_MODEL,
        port: PORT
    });
});

app.post('/api/chat/stream', async (req, res) => {
    if (!GEMINI_API_KEY) {
        res.status(500).json({ message: 'Missing GEMINI_API_KEY in the server environment.' });
        return;
    }

    const contents = toGeminiContents(req.body.messages);
    if (!contents.length) {
        res.status(400).json({ message: 'At least one message is required.' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
        const upstream = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            sendSse(res, { type: 'error', message: errorBody?.error?.message || `Gemini API failed with HTTP ${upstream.status}` });
            sendSse(res, '[DONE]');
            res.end();
            return;
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) {
                const dataLines = parseEventData(buffer.replace(/\r\n/g, '\n'));
                for (const payload of dataLines) {
                    if (payload === '[DONE]') continue;
                    const parsed = JSON.parse(payload);
                    const token = extractText(parsed);
                    if (token) sendSse(res, { type: 'token', text: token });
                }
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            const parsedBuffer = parseSseEvents(buffer);
            buffer = parsedBuffer.rest;

            for (const event of parsedBuffer.events) {
                const dataLines = parseEventData(event);

                for (const payload of dataLines) {
                    if (payload === '[DONE]') {
                        sendSse(res, '[DONE]');
                        res.end();
                        return;
                    }
                    const parsed = JSON.parse(payload);
                    const token = extractText(parsed);
                    if (token) {
                        sendSse(res, { type: 'token', text: token });
                    }
                }
            }
        }

        sendSse(res, '[DONE]');
        res.end();
    } catch (error) {
        sendSse(res, { type: 'error', message: error.message });
        sendSse(res, '[DONE]');
        res.end();
    }
});

const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. The app is probably already running at http://localhost:${PORT}`);
        console.error('Stop the existing Node process or set a different PORT in .env.');
        process.exit(1);
    }

    throw error;
});
