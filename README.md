# Nova Chat

Nova Chat is a vanilla JavaScript Gemini chatbot with Google Authentication, Firestore user-wise chat history, markdown rendering, syntax highlighting, voice input, and streaming AI responses.

## Stack

- HTML, CSS, vanilla JavaScript ES modules
- Node.js and Express for local development
- Netlify Functions for production deployment
- Firebase Authentication and Firestore
- Gemini API

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=5000
```

Run locally:

```bash
npm start
```

Open:

```text
http://localhost:5000
```

## Netlify Deployment

This repo includes `netlify.toml` and a streaming function at `netlify/functions/chat-stream.js`.

In Netlify, set these environment variables:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Build settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

The frontend calls `/api/chat/stream`, and Netlify rewrites it to the serverless function.

## Firebase Rules

Deploy the included Firestore rules:

```bash
firebase deploy --only firestore:rules
```

Or paste `firestore.rules` into Firebase Console.

## Security

- Do not commit `.env`.
- The Gemini API key must live only in local `.env` or Netlify environment variables.
- Firebase web config in `firebase.js` is public client configuration; protect data with Firestore rules.
- If `.env` was ever committed to Git history, rotate the Gemini API key.
