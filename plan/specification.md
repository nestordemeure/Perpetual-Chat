# Specification

## 1. Overview

A static website hosted on **GitHub Pages**, running entirely client-side in the browser.
Users supply their **own OpenAI API key** and optionally a **system prompt**.
The site implements a perpetual, streaming chat using the **Chat Completions API** (`gpt-4o` by default).
Chat history persists in localStorage, and once per day is saved to a downloadable JSON file.
The UI is dark-mode only and deliberately simple.

---

## 2. Functional Requirements

### 2.1 Landing Page

* Fields:

  * **API Key** (required)
  * **System Prompt** (optional)
* Buttons:

  * **Start Chat**
  * **Load Chat from File**
* Behavior:

  * `Start Chat` → enters chat view.
  * `Load Chat from File` → imports API key, system prompt, and full chat history from JSON.

### 2.2 Chat Page

* Layout:

  * **Message history panel** (scrollable).
  * **Composer** textarea + send button at bottom.
  * **Top bar** with `New Chat` button (returns to landing view with API key/prompt prefilled).
* Features:

  * Full history shown; auto-scrolls to bottom on new messages.
  * Messages stream in token by token.
  * Typing indicator shows three animated dots during streaming.
  * Errors shown inline above input.
* Behavior:

  * On sending a message, conversation is updated locally and streamed to OpenAI.
  * For API calls, only the **last N messages** (default 50) are sent, with special truncation handling (see §2.3).
  * Daily save check triggers export of JSON file when enough hours have passed since last save.

### 2.3 Truncation Rule

* Keep all messages for **display**.
* For API requests:

  1. Include system prompt if set (as first message).
  2. Slice the non-system history down to the last N.
  3. Ensure the first message in this slice is an **assistant** message:

     * If not, drop messages from the front until it is.
  4. Insert a pseudo-user message **before that assistant**:

     ```
     role: "user", content: "[Conversation truncated]"
     ```
* Resulting payload order:
  `[system?] → pseudo-user notice → assistant → user → assistant …`

### 2.4 Persistence & Export

* **localStorage**: stores API key, system prompt, full message history, lastSaveTimestamp.
* **Daily export**:

  * If more than N hours passed since last save (default 24h), trigger download of file:

    * Filename: `perpetual_chat_backup.json`
    * JSON format:

      ```json
      {
        "meta": { "model": "gpt-4o", "createdAt": "...", "systemPrompt": "..." },
        "apiKey": "sk-...",
        "messages": [ { "role": "user", "content": "..." }, ... ]
      }
      ```

### 2.5 Parameters File

* `/parameters.json`

  ```json
  {
    "model": "gpt-4o",
    "maxMessagesForAPI": 50,
    "dailySavePeriodHours": 24
  }
  ```

---

## 3. Technical Architecture

### File Structure

```
index.html
/css/style.css
/js/main.js
/js/api.js
/js/chat.js
/js/storage.js
/js/ui.js
/parameters.json
```

### Module Responsibilities

* **main.js** — app bootstrap, routing between views.
* **api.js** — OpenAI streaming call implementation.
* **chat.js** — orchestration: message flow, truncation, streaming glue.
* **storage.js** — localStorage persistence, periodic save, import/export.
* **ui.js** — DOM rendering & event wiring.
* **style.css** — dark mode styles.

### API Integration

* Endpoint: `POST https://api.openai.com/v1/chat/completions`
* Payload:

  ```json
  {
    "model": "gpt-4o",
    "messages": [...],
    "stream": true
  }
  ```
* Stream parsing: read `data:` SSE events, stop on `[DONE]`.

---

## 4. UX Specification

* **Dark theme only.**
* **Messages:** user = tinted bubble, assistant = darker bubble.
* **Composer:** Enter sends, Shift+Enter for newline.
* **Typing indicator:** animated dots.
* **Error state:** red banner above composer.

---

## 5. Non-Functional Requirements

* Concise, functional design.
* No JS in HTML; modularized code.
* Works on desktop + iOS Safari (with file download fallback).
* Simple and robust; edge cases intentionally minimized.