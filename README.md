# Nova AI Chatbot

A modern Gemini-style AI assistant built with HTML, CSS, vanilla JavaScript, Node.js, Express, and the Gemini API. The app includes streaming responses, markdown rendering, syntax-highlighted code blocks, persistent chat sessions, dark mode, voice input, text-to-speech, and a polished responsive interface.

## Live Demo

[Open the deployed app](https://gemini-chatbot-ugzt.onrender.com/)

## Features

- Streaming AI responses with a typing cursor
- Markdown rendering for headings, lists, bold, italics, and code blocks
- Syntax highlighting with Prism.js
- Light and dark mode with localStorage persistence
- Multiple chat sessions with create, rename, delete, and active-state UI
- Chat history saved in localStorage
- Copy, regenerate, and text-to-speech actions for assistant messages
- Voice input with the Web Speech API
- Smooth animations, skeleton loading, typing dots, and auto-scroll
- Responsive desktop, tablet, and mobile layout
- Express backend proxy to keep the Gemini API key out of browser code

## Tech Stack

- HTML5
- CSS3
- JavaScript
- Node.js
- Express.js
- Gemini API
- Fetch API
- localStorage

## Project Structure

```text
Gemini Chatbot/
|-- index.html        # App markup and CDN libraries
|-- style.css         # Responsive UI, themes, and animations
|-- script.js         # Chat UI, sessions, streaming, storage, voice, actions
|-- server.js         # Express backend proxy for Gemini API
|-- package.json      # Node scripts and dependencies
|-- .env.example      # Environment variable template
|-- .gitignore
`-- README.md
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
copy .env.example .env
```

On macOS or Linux:

```bash
cp .env.example .env
```

3. Add your Gemini API key to `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=5000
```

4. Start the server:

```bash
npm start
```

5. Open the app:

```text
http://localhost:5000
```


## Future Improvements

- Add Netlify Functions or serverless deployment for the backend
- Add file uploads and multimodal Gemini prompts
- Add conversation export and import
- Add user authentication
- Store chats in a database
- Add prompt templates and pinned chats
- Add image generation or vision support
- Add rate limiting and usage analytics

