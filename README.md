# Grammer2
Goal:
Create a Manifest V3 Chrome Extension that detects text input fields on any webpage and provides real-time or on-demand inline suggestions for:

Rephrasing

Grammar correction

Typo / spelling correction

The extension must allow users to configure their own LLM provider templates and should have a premium, minimalistic Material Design UI with stats, API testing, and multiple modes.

Core Features:

Text Field Detection

Detect all <input type="text">, <textarea>, and contenteditable elements when extension is ON.

Attach listeners for typing and changes.

Maintain a list of detected fields.

LLM Template Management

Multiple named templates, each with:

LLM provider (OpenAI, Claude, Gemini, Custom)

API endpoint URL

API key

Secure storage using chrome.storage.sync.

Instant template switching.

Modes of Operation

On-Demand: Show a small floating button inside the bottom-right corner of each text field.

When clicked → small pop-up appears asking "Check text?" → user confirms → text sent to LLM → inline suggestions appear.

Automatic: Check text every 500ms on changes.

Inline Suggestions & UI Behavior

Words/phrases are underlined based on the issue type:

Red underline → Grammar issues

Blue underline → Typos/spelling

Green underline → Rephrasing suggestions

Hovering over underlined text shows a tooltip with the suggestion.

User can Accept (replace text) or Reject (keep original) suggestion.

Multiple corrections can be applied in one pass.

Suggestions Source

Text from fields is sent to the selected LLM provider’s API.

API response should specify corrections and their positions.

Replace text in-place when suggestions are accepted.

Popup UI Requirements (Material Design, Tabbed Layout):

Tab 1: Home

Toggle extension ON/OFF

Mode switch (On-Demand / Automatic)

Template dropdown selector

Tab 2: Templates

Add/Edit/Delete templates

Input for provider name, endpoint, API key

Securely save

Tab 3: Test API

Select template → click "Test API Connection"

Show success/failure message

Show detailed error (e.g., "Invalid API Key")

Tab 4: Stats

Total API hits

Estimated cost (if provider pricing API available)

Word count corrected

Grammar issues fixed

Rephrasings applied

Bar chart or pie chart visualizing correction types

Technical Implementation:

Manifest V3

Background service worker for API calls & caching

Content scripts for DOM detection & suggestion rendering

Inline overlay styling via injected CSS

Popup & options pages using React + Material UI

Tooltips with hover events for corrections

Floating button in text field with absolute positioning

Debounce API calls for performance

Secure API key handling (never in plain JS, always from storage)

Deliverables:

Fully working Chrome Extension with:

manifest.json (MV3)

Background script

Content scripts for inline detection & UI

React-based popup & options pages

CSS styles for material design tooltips & underlines

Floating button + accept/reject pop-up for on-demand mode

Integration with at least one LLM API (OpenAI GPT API) as example

Clean, modular, commented code

Special Notes:

UI should feel premium and non-intrusive.

Inline highlights must not break the user’s existing styles.

Tooltip & floating button should work in any website layout.

