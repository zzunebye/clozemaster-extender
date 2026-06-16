# GitHub Issue Breakdown

## Issue 1: Scaffold MV3 build output

Create `public/manifest.json`, fixed-name Vite build entries, and strict TypeScript config for an unpacked Chrome extension.

Acceptance criteria:
- `dist/manifest.json` is copied from `public/manifest.json`.
- `background.js`, `content.js`, and `popup.html` are emitted without hashed entry names.
- Vite starter files are removed.

## Issue 2: Add shared extension modules

Add typed settings, runtime messages, Chrome storage helpers, cache helpers, and a Google Translate v2 helper.

Acceptance criteria:
- Missing settings default to empty API key and `ko`.
- Translation requests post to Google Translate v2 with text format.
- HTTP and malformed API responses are returned as typed errors.

## Issue 3: Add background translation flow

Implement the background service worker listener and a testable translation handler.

Acceptance criteria:
- Missing API key returns a user-facing error without calling Google.
- Cached translations avoid network calls.
- New translations are written back to cache.

## Issue 4: Add Clozemaster content script

Detect the Wiktionary iframe, extract the displayed meaning, request translation, and render a native meaning panel.

Acceptance criteria:
- The content script avoids duplicate requests for unchanged meanings.
- Rendered page-derived text is inserted with text nodes, not HTML strings.
- Panel renders translated text or error state near the iframe.

## Issue 5: Add popup settings UI

Create a small popup for Google API key and target-language settings.

Acceptance criteria:
- Popup loads stored settings.
- Save trims the API key and persists target language.
- User gets a saved status message.

## Issue 6: Verify MVP scaffold

Run tests, typecheck, build, and pure LOC checks.

Acceptance criteria:
- Unit tests pass.
- TypeScript typecheck passes.
- Vite build emits the extension bundle.
- Source files stay below the 250 pure LOC ceiling.
