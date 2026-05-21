# 🌌 Nova Chat — AI-Powered Conversational Platform

<div align="center">

![Nova Chat Banner](https://img.shields.io/badge/Nova%20Chat-AI%20Powered-blueviolet?style=for-the-badge&logo=googlechrome&logoColor=white)
![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**A full-stack, real-time AI chatbot platform with Google Authentication, persistent chat history, and streaming responses — inspired by modern conversational AI experiences.**

[Live Demo](#) · [Report Bug](#) · [Request Feature](#)

</div>

---

## ✨ Features

- 🤖 **AI-Powered Conversations** — Integrated with the Gemini API for intelligent, context-aware responses
- ⚡ **Streaming Responses** — Real-time AI output via Server-Sent Events (SSE) for a smooth, typewriter-style experience
- 🔐 **Secure Google Authentication** — Firebase Auth with per-user isolated chat sessions
- ☁️ **Cloud-Persistent Chat History** — Firestore-backed storage synced across all devices and sessions
- 🔄 **Real-Time Sync** — Live Firestore listeners keep conversations up to date instantly
- 🎤 **Voice Input** — Speak your message using the built-in Web Speech API integration
- 🖥️ **Markdown & Code Rendering** — Full markdown support with syntax-highlighted code blocks
- 📱 **Responsive Design** — Mobile-first, fully responsive UI that works seamlessly on any screen
- 🪟 **Glassmorphism UI** — Modern, frosted-glass aesthetic with clean, immersive design
- 🚀 **Serverless Deployment** — Hosted on Netlify with serverless functions and secured environment variables

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **AI Model** | Google Gemini API |
| **Authentication** | Firebase Authentication (Google OAuth) |
| **Database** | Cloud Firestore (NoSQL, real-time) |
| **Streaming** | Server-Sent Events (SSE) |
| **Deployment** | Netlify (Serverless Functions) |
| **Config** | Netlify Environment Variables |

---

## 📁 Project Structure

```
nova-chat/
├── netlify/
│   └── functions/
│       └── chat.js            # Serverless function — Gemini API + SSE streaming
├── public/
│   ├── index.html             # Main application shell
│   ├── style.css              # Glassmorphism UI styles
│   ├── app.js                 # Core frontend logic
│   ├── auth.js                # Firebase Authentication
│   └── firestore.js           # Chat history CRUD & real-time listeners
├── .env                       # Local environment variables (not committed)
├── netlify.toml               # Netlify configuration & redirects
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- A [Firebase project](https://console.firebase.google.com/) with Authentication and Firestore enabled
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)
- A [Netlify account](https://netlify.com/) for deployment

### 1. Clone the Repository

```bash
git clone https://github.com/roshini0108/nova-chat.git
cd nova-chat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

### 4. Run Locally with Netlify Dev

```bash
npm install -g netlify-cli
netlify dev
```

The app will be available at `http://localhost:5000`.

---

## ☁️ Deployment (Netlify)

1. Push your repository to GitHub.
2. Connect the repo to your Netlify account.
3. Add all environment variables under **Site Settings → Environment Variables**.
4. Deploy — Netlify will auto-detect the `netlify.toml` config and handle serverless functions.

```toml
# netlify.toml
[build]
  functions = "netlify/functions"
  publish = "public"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

---

## 🔒 Security

- API keys and Firebase credentials are **never exposed to the client** — all sensitive calls are handled through Netlify serverless functions.
- Each user's chat sessions are stored under their unique Firebase UID in Firestore, ensuring **complete data isolation**.
- Google OAuth is handled entirely through Firebase Authentication with no custom credential storage.

---

## 🗺️ Roadmap

- [ ] 🧠 AI Memory — persistent context across sessions
- [ ] 🖼️ Image Upload & Vision support
- [ ] 🔊 Voice Assistant mode (TTS responses)
- [ ] 🌐 Multi-language support
- [ ] 📤 Export chat history (PDF / Markdown)
- [ ] 🤝 Shared/collaborative chat sessions

---

## 🙌 Acknowledgements

- [Google Gemini API](https://ai.google.dev/)
- [Firebase](https://firebase.google.com/)
- [Netlify](https://www.netlify.com/)
- [Marked.js](https://marked.js.org/) — Markdown rendering
- [Highlight.js](https://highlightjs.org/) — Syntax highlighting

---

<div align="center">

⭐ Star this repo if you found it helpful!

</div>