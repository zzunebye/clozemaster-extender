# Clozemaster MV3 Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Scaffold a small Vite + TypeScript + Manifest V3 Chrome extension that translates Clozemaster meanings into a configured native language.

**Architecture:** The extension has three runtime entries: a content script that detects Clozemaster meaning text and renders a panel, a background service worker that handles translation requests and cache lookup, and a popup that stores BYOK settings. Shared modules own typed messages, storage access, and Google Translate response parsing.

**Tech Stack:** Vite, TypeScript, Chrome Extension Manifest V3, Chrome storage APIs, Node built-in test runner for TypeScript tests.

---

### Issue 1: MV3 Build And Manifest

**Files:**
- Create: `public/manifest.json`
- Create: `vite.config.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Delete: `index.html`, `src/main.ts`, `src/counter.ts`, `src/style.css`

- [x] **Step 1: Write failing build expectation**

Run: `PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/tsc --noEmit`

Expected: FAIL until extension entries exist.

- [x] **Step 2: Implement fixed-output Vite config and manifest**

Expected output after build: `dist/manifest.json`, `dist/background.js`, `dist/content.js`, `dist/popup.html`, and `dist/popup.js`.

- [x] **Step 3: Run build**

Run: `PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/tsc --noEmit && PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/vite build`

Expected: PASS.

### Issue 2: Shared Settings, Cache, And Translation Helper

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/storage.ts`
- Create: `src/shared/googleTranslate.ts`
- Create: `test/shared/googleTranslate.test.mjs`

- [x] **Step 1: Write failing tests**

Tests cover Google Translate URL/body construction, response parsing, and HTTP error conversion.

- [x] **Step 2: Verify red**

Run: `PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/shared/googleTranslate.test.mjs`

Expected: FAIL because `translateWithGoogleV2` does not exist.

- [x] **Step 3: Implement minimal shared modules**

Use typed settings, typed runtime messages, cache key helpers, and an injectable fetch function for unit tests.

- [x] **Step 4: Verify green**

Run the same test command.

Expected: PASS.

### Issue 3: Background Translation Handler

**Files:**
- Create: `src/background/translate.ts`
- Create: `test/background/translate.test.mjs`
- Create: `src/background/index.ts`

- [x] **Step 1: Write failing tests**

Tests cover missing API key, cached translation, uncached translation, and cache write.

- [x] **Step 2: Verify red**

Run: `PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/background/translate.test.mjs`

Expected: FAIL because handler does not exist.

- [x] **Step 3: Implement handler and service worker listener**

Keep the listener thin and unit test the pure handler with injected dependencies.

- [x] **Step 4: Verify green**

Run the same test command.

Expected: PASS.

### Issue 4: Content Script DOM Detection And Panel Rendering

**Files:**
- Create: `src/content/clozemaster.ts`
- Create: `test/content/clozemaster.test.mjs`

- [x] **Step 1: Write failing tests**

Tests cover Wiktionary iframe detection, word extraction, meaning extraction, and safe panel rendering.

- [x] **Step 2: Verify red**

Run: `PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/content/clozemaster.test.mjs`

Expected: FAIL because content helpers do not exist.

- [x] **Step 3: Implement content helpers and runtime loop**

Use `textContent`, not `innerHTML`, for translated or page-derived text.

- [x] **Step 4: Verify green**

Run the same test command.

Expected: PASS.

### Issue 5: Popup Settings UI

**Files:**
- Create: `popup.html`
- Create: `src/popup/popup.ts`

- [x] **Step 1: Write type-level implementation check**

Run: `PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/tsc --noEmit`

Expected: FAIL until popup entry exists.

- [x] **Step 2: Implement popup markup and script**

Load existing settings, save trimmed API key and selected language, and render status text.

- [x] **Step 3: Verify typecheck**

Run the same typecheck command.

Expected: PASS.

### Issue 6: Final Verification

**Files:**
- Modify: any files needed after verification.

- [x] **Step 1: Run unit tests**

Run: `PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/**/*.test.mjs`

Expected: PASS.

- [x] **Step 2: Run typecheck and production build**

Run: `PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/tsc --noEmit && PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH ./node_modules/.bin/vite build`

Expected: PASS.

- [x] **Step 3: Measure pure LOC**

Run pure LOC checks for changed TypeScript files.

Expected: every hand-written source file is under 200 pure LOC.
