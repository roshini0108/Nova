# Gemini Chatbot

This is a static client with a small Express backend proxy that keeps your Gemini API key hidden on the server.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file from the example:

```bash
copy .env.example .env
```

3. Add your API key to `.env`:

```text
GEMINI_API_KEY=YOUR_API_KEY_HERE
```

4. Start the server:

```bash
npm start
```

5. Open:

```text
http://localhost:5000
```

## Deploy securely

1. Push this repository to GitHub.
2. Use a hosting provider that supports Node.js apps, such as Vercel, Render, Railway, or Heroku.
3. Set the environment variable `GEMINI_API_KEY` in the deployment settings.

> Do not commit your API key to GitHub. Keep it in deployment environment variables only.
