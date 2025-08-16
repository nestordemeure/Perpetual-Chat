# Step-by-Step Implementation Plan

## 1) Repo Setup

* Create GitHub Pages repo with structure:

  ```
  index.html
  css/style.css
  js/main.js api.js chat.js storage.js ui.js
  parameters.json
  ```
* User will Configure GitHub Pages to serve from root.

---

## 2) parameters.json

* Add defaults:

  ```json
  { "model": "gpt-4o", "maxMessagesForAPI": 50, "dailySavePeriodHours": 24 }
  ```
* `main.js` loads on startup → global `window.__PARAMS__`.

---

## 3) index.html

* Contains both views:

  * `#view-landing`: API key + prompt inputs, start & load buttons.
  * `#view-chat`: messages panel, composer, new chat button.
* Views toggled with CSS classes or `data-view` attribute on `<body>`.

---

## 4) style.css

* Dark background `#121212`, white text.
* User messages: `#1f2a44` bubble.
* Assistant messages: `#1b1b1b` bubble.
* Typing indicator: three-dot CSS animation.

---

## 5) storage.js

* Define `AppState` type:

  ```js
  { apiKey, systemPrompt, messages: [], lastSaveTimestamp }
  ```
* Functions:

  * `loadState()`, `saveState(state)`
  * `shouldTriggerPeriodicSave(now, hours, lastSave)`
  * `markSavedNow(state)`
  * `exportStateToDownload(state)` (Blob → `<a download>` → auto click)
  * `importStateFromFile(file)` (JSON.parse, validate → return AppState)

---

## 6) api.js

* Function `streamChatCompletion({ apiKey, model, messages, onDelta, onDone, onError })`

  * Calls Chat Completions endpoint with `stream: true`.
  * Parses SSE stream:

    * Extracts `choices[0].delta.content`.
    * Calls `onDelta(token)` for each token.
    * Calls `onDone()` on `[DONE]`.

---

## 7) chat.js

* **buildPayloadMessages()**:

  1. Include system prompt if provided.
  2. Slice last N messages.
  3. Ensure first is assistant; drop leading messages until it is.
  4. Insert pseudo-user `{ role: "user", content: "[Conversation truncated]" }` before that assistant.
* **sendMessage(text)**:

  * Append user message to state, save, render.
  * Run periodic save check → trigger download if elapsed.
  * Prepare payload via `buildPayloadMessages`.
  * Append placeholder assistant message.
  * Call `streamChatCompletion`:

    * On `onDelta`, append token to placeholder + update UI.
    * On `onDone`, save state.

---

## 8) ui.js

* Functions:

  * `renderMessages(messages)`
  * `appendAssistantToken(token)`
  * `showTyping()` / `hideTyping()`
  * `scrollToBottom()`
  * `showError(msg)`
* Event wiring:

  * `#startChat` → validates, seeds state, switches view.
  * `#send` → calls `sendMessage`.
  * `#composer` → Enter sends, Shift+Enter newline.
  * `#newChat` → goes to landing with key/prompt prefilled.
  * `#loadFromFile` → triggers hidden file input → calls `importStateFromFile`.

---

## 9) main.js

* On load:

  * Fetch parameters.json.
  * Load state from localStorage.
  * If messages exist → go to chat view, render, scroll bottom.
  * Else → show landing view with fields prefilled.

---

## 10) Testing Checklist

1. Start → enter key, send → streaming works.
2. Autoscroll to bottom confirmed.
3. Truncation rule inserts `"[Conversation truncated]"` correctly.
4. Daily save triggers export at interval.
5. Import JSON restores state and key.
6. New Chat resets messages, keeps key/prompt.
7. Works on iPhone Safari (keyboard, scrolling, file downloads).
