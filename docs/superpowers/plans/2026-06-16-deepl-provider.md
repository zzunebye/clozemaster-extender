# DeepL Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add DeepL as a selectable translation provider while preserving the existing Google Cloud Translation provider.

**Architecture:** Keep content scripts provider-agnostic: content sends the same `TRANSLATE_MEANING` message, and the background service worker chooses a translation client from stored settings. Shared modules own provider settings, API adapters, response parsing, and cache key construction. The popup stores BYOK credentials for both providers and lets the user choose which provider is active.

**Tech Stack:** Vite, TypeScript, Chrome Extension Manifest V3, Chrome storage APIs, Node built-in test runner, Google Cloud Translation v2, DeepL Translate API v2.

---

## External API Notes

- DeepL translate endpoint is `POST /v2/translate`.
- DeepL Free base URL is `https://api-free.deepl.com`; DeepL Pro base URL is `https://api.deepl.com`.
- DeepL authentication must be sent as `Authorization: DeepL-Auth-Key <key>`.
- DeepL JSON request body uses `text: string[]`, `target_lang: string`, and optional `source_lang: string`.
- DeepL JSON response uses `translations[0].text`.
- DeepL browser-page JavaScript is blocked by CORS, but this extension already routes API calls through the MV3 background service worker. Add DeepL hosts to `host_permissions`.

Reference docs:
- https://developers.deepl.com/docs/getting-started/auth
- https://developers.deepl.com/api-reference/translate/request-translation
- https://developers.deepl.com/docs/best-practices/cors-requests
- https://developer.chrome.com/docs/extensions/develop/concepts/network-requests

## File Structure

- Create: `src/shared/translationClient.ts`
  - Owns provider-neutral translation input and injectable fetch type.
  - Exports `TranslationClientInput` and `FetchTranslate`.
- Create: `src/shared/deeplTranslate.ts`
  - Owns DeepL endpoint selection, request construction, HTTP error conversion, and response parsing.
  - Does not import Chrome APIs.
- Create: `test/shared/deeplTranslate.test.mjs`
  - Unit tests for DeepL request construction, endpoint selection, source language forwarding, HTTP errors, and malformed response errors.
- Modify: `src/shared/types.ts`
  - Add `TRANSLATION_PROVIDERS`, `TranslationProvider`, and `isTranslationProvider`.
  - Add `translationProvider` and `deeplApiKey` to `ExtensionSettings`.
- Modify: `src/shared/storage.ts`
  - Default provider to Google for backward compatibility.
  - Persist both provider API keys.
- Modify: `test/shared/storage.test.mjs`
  - Cover provider defaults, invalid provider fallback, DeepL key loading, and save shape.
- Modify: `src/shared/googleTranslate.ts`
  - Reuse provider-neutral input and fetch types from `translationClient.ts`.
  - Keep the existing exported `TranslateWithGoogleInput` alias if needed by tests.
- Modify: `src/background/translate.ts`
  - Select provider based on settings.
  - Validate the active provider's key before cache lookup.
  - Include provider in cache keys.
- Modify: `src/background/index.ts`
  - Import and pass both Google and DeepL clients.
- Modify: `test/background/translate.test.mjs`
  - Update existing Google expectations for provider-aware settings and cache keys.
  - Add DeepL dispatch and missing DeepL key coverage.
- Modify: `popup.html`
  - Add provider selector and DeepL API key input.
- Modify: `src/popup/popup.ts`
  - Load and save provider selector plus both keys.
- Modify: `test/popup/popup.test.mjs`
  - Assert provider selector and DeepL key field exist and popup source loads/saves them.
- Modify: `public/manifest.json`
  - Add DeepL Free and Pro host permissions.
- Modify: `src/content/clozemaster.ts`
  - Add `translationProvider` to the small local settings reader only if needed for storage-change reset.
  - Reset visible explanation translation when `translationProvider` changes.

Keep each edited TypeScript file under 250 pure LOC. `src/content/clozemaster.ts` starts near the warning band, so do not grow it with provider logic beyond a minimal storage-change check.

### Task 1: Provider-Neutral Translation Types

**Files:**
- Create: `src/shared/translationClient.ts`
- Modify: `src/shared/googleTranslate.ts`
- Test: `test/shared/googleTranslate.test.mjs`

- [ ] **Step 1: Write the failing type-level expectation**

Update `src/shared/googleTranslate.ts` imports first in a minimal way that references the missing module:

```typescript
import type { FetchTranslate, TranslationClientInput } from "./translationClient.ts"

export type TranslateWithGoogleInput = TranslationClientInput
```

- [ ] **Step 2: Run typecheck to verify it fails**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run typecheck
```

Expected: FAIL because `src/shared/translationClient.ts` does not exist.

- [ ] **Step 3: Implement provider-neutral types**

Create `src/shared/translationClient.ts`:

```typescript
export type TranslationClientInput = {
  readonly apiKey: string
  readonly sourceLanguage?: string | undefined
  readonly text: string
  readonly targetLanguage: string
}

export type FetchTranslate = (url: string, init: RequestInit) => Promise<Response>
```

Then remove the duplicate `TranslateWithGoogleInput` and `FetchTranslate` definitions from `src/shared/googleTranslate.ts`.

- [ ] **Step 4: Run Google adapter tests**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/shared/googleTranslate.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/translationClient.ts src/shared/googleTranslate.ts test/shared/googleTranslate.test.mjs
git commit -m "refactor: share translation client types"
```

### Task 2: DeepL Translation Adapter

**Files:**
- Create: `src/shared/deeplTranslate.ts`
- Create: `test/shared/deeplTranslate.test.mjs`

- [ ] **Step 1: Write failing tests for DeepL request construction**

Create `test/shared/deeplTranslate.test.mjs` with tests in Given / When / Then shape:

```javascript
import assert from "node:assert/strict"
import test from "node:test"

import { translateWithDeepLV2 } from "../../src/shared/deeplTranslate.ts"

test("translateWithDeepLV2 posts JSON to the Free endpoint when the key is Free", async () => {
  // Given
  const calls = []
  const fetchTranslate = async (url, init) => {
    calls.push({ url: String(url), init })

    return Response.json({
      translations: [{ detected_source_language: "EN", text: "안녕하세요" }],
    })
  }

  // When
  const translatedText = await translateWithDeepLV2(
    {
      apiKey: "test-key:fx",
      text: "hello",
      targetLanguage: "ko",
    },
    fetchTranslate,
  )

  // Then
  assert.equal(translatedText, "안녕하세요")
  assert.equal(calls[0].url, "https://api-free.deepl.com/v2/translate")
  assert.equal(calls[0].init.method, "POST")
  assert.equal(calls[0].init.headers["Authorization"], "DeepL-Auth-Key test-key:fx")
  assert.equal(calls[0].init.headers["Content-Type"], "application/json")
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    text: ["hello"],
    target_lang: "KO",
  })
})
```

Add separate tests for:
- Pro endpoint when key does not end with `:fx`.
- Optional `source_lang` included and uppercased when `sourceLanguage` is provided.
- Non-2xx response throws `{ name: "DeepLTranslateHttpError" }`.
- Missing `translations[0].text` throws `{ name: "DeepLTranslateResponseError" }`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/shared/deeplTranslate.test.mjs
```

Expected: FAIL because `src/shared/deeplTranslate.ts` does not exist.

- [ ] **Step 3: Implement DeepL adapter**

Create `src/shared/deeplTranslate.ts`:

```typescript
import type { FetchTranslate, TranslationClientInput } from "./translationClient.ts"
import { isRecord } from "./types.ts"

const DEEPL_FREE_ENDPOINT = "https://api-free.deepl.com/v2/translate"
const DEEPL_PRO_ENDPOINT = "https://api.deepl.com/v2/translate"

type DeepLTranslateRequestBody = {
  readonly text: readonly [string]
  readonly source_lang?: string
  readonly target_lang: string
}

export type TranslateWithDeepLInput = TranslationClientInput

export class DeepLTranslateHttpError extends Error {
  readonly name = "DeepLTranslateHttpError"
  readonly status: number
  readonly body: string

  constructor(status: number, body: string) {
    super(`DeepL Translate failed with status ${status}: ${body}`)
    this.status = status
    this.body = body
  }
}

export class DeepLTranslateResponseError extends Error {
  readonly name = "DeepLTranslateResponseError"

  constructor() {
    super("DeepL Translate response did not include translated text.")
  }
}

export async function translateWithDeepLV2(
  input: TranslateWithDeepLInput,
  fetchTranslate: FetchTranslate = fetch,
): Promise<string> {
  const response = await fetchTranslate(getEndpoint(input.apiKey), {
    body: JSON.stringify(makeRequestBody(input)),
    headers: {
      Authorization: `DeepL-Auth-Key ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new DeepLTranslateHttpError(response.status, await response.text())
  }

  return parseTranslatedText(await response.json())
}

function getEndpoint(apiKey: string): string {
  return apiKey.endsWith(":fx") ? DEEPL_FREE_ENDPOINT : DEEPL_PRO_ENDPOINT
}

function makeRequestBody(input: TranslateWithDeepLInput): DeepLTranslateRequestBody {
  if (input.sourceLanguage === undefined) {
    return {
      text: [input.text],
      target_lang: normalizeLanguageCode(input.targetLanguage),
    }
  }

  return {
    text: [input.text],
    source_lang: normalizeLanguageCode(input.sourceLanguage),
    target_lang: normalizeLanguageCode(input.targetLanguage),
  }
}

function normalizeLanguageCode(languageCode: string): string {
  return languageCode.toUpperCase()
}

function parseTranslatedText(payload: unknown): string {
  if (!isRecord(payload)) {
    throw new DeepLTranslateResponseError()
  }

  const translations = payload["translations"]

  if (!Array.isArray(translations)) {
    throw new DeepLTranslateResponseError()
  }

  const firstTranslation = translations[0]

  if (!isRecord(firstTranslation)) {
    throw new DeepLTranslateResponseError()
  }

  const translatedText = firstTranslation["text"]

  if (typeof translatedText !== "string") {
    throw new DeepLTranslateResponseError()
  }

  return translatedText
}
```

- [ ] **Step 4: Run DeepL adapter tests**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/shared/deeplTranslate.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/deeplTranslate.ts test/shared/deeplTranslate.test.mjs
git commit -m "feat: add DeepL translation adapter"
```

### Task 3: Provider Settings And Storage

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/storage.ts`
- Modify: `test/shared/storage.test.mjs`

- [ ] **Step 1: Write failing storage tests**

Add tests to `test/shared/storage.test.mjs`:

```javascript
test("getSettings defaults translation provider to google when missing", async () => {
  // Given
  const storage = createChromeStorage({})
  globalThis.chrome = { storage: { local: storage } }

  // When
  const settings = await getSettings()

  // Then
  assert.equal(settings.translationProvider, "google")
  assert.equal(settings.deeplApiKey, "")
})

test("getSettings falls back to google when translation provider is invalid", async () => {
  // Given
  const storage = createChromeStorage({
    explanationTranslationDisplayMode: "replace",
    googleApiKey: "google-key",
    deeplApiKey: "deepl-key",
    targetLanguage: "ja",
    translationProvider: "unsupported-provider",
  })
  globalThis.chrome = { storage: { local: storage } }

  // When
  const settings = await getSettings()

  // Then
  assert.deepEqual(settings, {
    explanationTranslationDisplayMode: "replace",
    googleApiKey: "google-key",
    deeplApiKey: "deepl-key",
    targetLanguage: "ja",
    translationProvider: "google",
  })
})
```

Update the existing `saveSettings` test expected write shape to include `translationProvider` and `deeplApiKey`.

- [ ] **Step 2: Run storage tests to verify they fail**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/shared/storage.test.mjs
```

Expected: FAIL because provider fields do not exist yet.

- [ ] **Step 3: Implement provider types**

Add to `src/shared/types.ts`:

```typescript
export const TRANSLATION_PROVIDERS = {
  deepl: "deepl",
  google: "google",
} as const

export type TranslationProvider =
  (typeof TRANSLATION_PROVIDERS)[keyof typeof TRANSLATION_PROVIDERS]
```

Add fields to `ExtensionSettings`:

```typescript
export type ExtensionSettings = {
  readonly explanationTranslationDisplayMode: ExplanationTranslationDisplayMode
  readonly deeplApiKey: string
  readonly googleApiKey: string
  readonly targetLanguage: string
  readonly translationProvider: TranslationProvider
}
```

Add parser:

```typescript
export function isTranslationProvider(value: unknown): value is TranslationProvider {
  return value === TRANSLATION_PROVIDERS.deepl || value === TRANSLATION_PROVIDERS.google
}
```

- [ ] **Step 4: Implement storage defaults and save shape**

Update `src/shared/storage.ts`:

```typescript
const DEFAULT_SETTINGS: ExtensionSettings = {
  explanationTranslationDisplayMode: "replace",
  deeplApiKey: "",
  googleApiKey: "",
  targetLanguage: "ko",
  translationProvider: "google",
}
```

Parse and save `deeplApiKey` and `translationProvider` with the same pattern as existing settings.

- [ ] **Step 5: Run storage tests**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/shared/storage.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/types.ts src/shared/storage.ts test/shared/storage.test.mjs
git commit -m "feat: store translation provider settings"
```

### Task 4: Background Provider Dispatch And Cache Isolation

**Files:**
- Modify: `src/background/translate.ts`
- Modify: `src/background/index.ts`
- Modify: `test/background/translate.test.mjs`

- [ ] **Step 1: Update existing background tests for provider-aware settings**

In every `getSettings` fixture, include:

```javascript
{
  explanationTranslationDisplayMode: "replace",
  deeplApiKey: "",
  googleApiKey: "api-key",
  targetLanguage: "ko",
  translationProvider: "google",
}
```

Update cache key expectations to include provider:

```javascript
"meaning:google:en:ko:何でも:anything"
```

- [ ] **Step 2: Add failing DeepL dispatch tests**

Add tests:

```javascript
test("handleTranslateMeaning returns an error when DeepL API key is missing", async () => {
  // Given
  let deeplCalls = 0

  // When
  const response = await handleTranslateMeaning(
    {
      type: "TRANSLATE_MEANING",
      payload: {
        meaning: "anything",
        targetLanguage: "ko",
      },
    },
    {
      getSettings: async () => ({
        explanationTranslationDisplayMode: "replace",
        deeplApiKey: "",
        googleApiKey: "google-key",
        targetLanguage: "ko",
        translationProvider: "deepl",
      }),
      getCache: async () => null,
      setCache: async () => {},
      translateWithDeepL: async () => {
        deeplCalls += 1
        return "무엇이든"
      },
      translateWithGoogle: async () => "network",
    },
  )

  // Then
  assert.deepEqual(response, { error: "DeepL API key is not set." })
  assert.equal(deeplCalls, 0)
})
```

Add another test proving DeepL receives `apiKey: "deepl-key"` and Google is not called.

- [ ] **Step 3: Run background tests to verify they fail**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/background/translate.test.mjs
```

Expected: FAIL because handler dependencies and settings are still Google-only.

- [ ] **Step 4: Implement provider dispatch**

Update dependency type in `src/background/translate.ts`:

```typescript
import type { TranslationClientInput } from "../shared/translationClient.ts"

export type TranslationDependencies = {
  readonly getSettings: () => Promise<ExtensionSettings>
  readonly getCache: (key: string) => Promise<string | null>
  readonly setCache: (key: string, value: string) => Promise<void>
  readonly translateWithDeepL: (input: TranslationClientInput) => Promise<string>
  readonly translateWithGoogle: (input: TranslationClientInput) => Promise<string>
}
```

Use a `switch` on `settings.translationProvider`:

```typescript
const provider = settings.translationProvider
const apiKey = getProviderApiKey(settings)

if (apiKey.trim() === "") {
  return { error: getMissingApiKeyMessage(provider) }
}
```

Provider helpers:

```typescript
function getProviderApiKey(settings: ExtensionSettings): string {
  switch (settings.translationProvider) {
    case "deepl":
      return settings.deeplApiKey
    case "google":
      return settings.googleApiKey
  }
}

function getMissingApiKeyMessage(provider: TranslationProvider): string {
  switch (provider) {
    case "deepl":
      return "DeepL API key is not set."
    case "google":
      return "Google API key is not set."
  }
}
```

Update `makeCacheKey` input to include provider:

```typescript
export function makeCacheKey(input: {
  readonly meaning: string
  readonly provider: TranslationProvider
  readonly sourceLanguage?: string | undefined
  readonly targetLanguage: string
  readonly word?: string | undefined
}): string {
  const word = input.word?.trim() || "unknown-word"
  const sourceLanguage = input.sourceLanguage ?? "auto"

  return ["meaning", input.provider, sourceLanguage, input.targetLanguage, word, input.meaning].join(":")
}
```

Dispatch:

```typescript
const translateInput = {
  apiKey,
  sourceLanguage: message.payload.sourceLanguage,
  text: message.payload.meaning,
  targetLanguage,
}

const translatedText =
  provider === "deepl"
    ? await dependencies.translateWithDeepL(translateInput)
    : await dependencies.translateWithGoogle(translateInput)
```

- [ ] **Step 5: Update background service worker**

Update `src/background/index.ts`:

```typescript
import { translateWithDeepLV2 } from "../shared/deeplTranslate.ts"
import { translateWithGoogleV2 } from "../shared/googleTranslate.ts"
```

Pass:

```typescript
translateWithDeepL: translateWithDeepLV2,
translateWithGoogle: translateWithGoogleV2,
```

- [ ] **Step 6: Run background tests**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/background/translate.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/background/translate.ts src/background/index.ts test/background/translate.test.mjs
git commit -m "feat: dispatch translations by provider"
```

### Task 5: Popup Provider Controls

**Files:**
- Modify: `popup.html`
- Modify: `src/popup/popup.ts`
- Modify: `test/popup/popup.test.mjs`

- [ ] **Step 1: Write failing popup tests**

Add to `test/popup/popup.test.mjs`:

```javascript
test("popup offers translation provider and DeepL key settings", async () => {
  // Given / When
  const html = await readFile(new URL("../../popup.html", import.meta.url), "utf8")

  // Then
  assert.equal(html.includes('id="translationProvider"'), true)
  assert.equal(html.includes('value="google"'), true)
  assert.equal(html.includes('value="deepl"'), true)
  assert.equal(html.includes('id="deeplApiKey"'), true)
})
```

Update the existing popup source test to assert:

```javascript
assert.equal(source.includes("translationProviderSelect"), true)
assert.equal(source.includes("settings.translationProvider"), true)
assert.equal(source.includes("deeplApiKeyInput"), true)
assert.equal(source.includes("settings.deeplApiKey"), true)
```

- [ ] **Step 2: Run popup tests to verify they fail**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/popup/popup.test.mjs
```

Expected: FAIL because popup controls do not exist.

- [ ] **Step 3: Update popup markup**

Add above the API key fields in `popup.html`:

```html
<label>
  Translation provider
  <select id="translationProvider">
    <option value="google">Google Cloud Translation</option>
    <option value="deepl">DeepL</option>
  </select>
</label>
```

Keep the existing Google key field and add:

```html
<label>
  DeepL API Key
  <input id="deeplApiKey" type="password" placeholder="...:fx" autocomplete="off" />
</label>
```

- [ ] **Step 4: Update popup script**

In `src/popup/popup.ts`:

```typescript
import { isExplanationTranslationDisplayMode, isTranslationProvider } from "../shared/types.ts"
import type { ExplanationTranslationDisplayMode, TranslationProvider } from "../shared/types.ts"
```

Extend `PopupElements`:

```typescript
readonly deeplApiKeyInput: HTMLInputElement
readonly translationProviderSelect: HTMLSelectElement
```

Load settings:

```typescript
elements.deeplApiKeyInput.value = settings.deeplApiKey
elements.translationProviderSelect.value = settings.translationProvider
```

Save settings:

```typescript
deeplApiKey: elements.deeplApiKeyInput.value.trim(),
translationProvider: getSelectedTranslationProvider(elements),
```

Add parser:

```typescript
function getSelectedTranslationProvider(elements: PopupElements): TranslationProvider {
  const value = elements.translationProviderSelect.value

  return isTranslationProvider(value) ? value : "google"
}
```

Find elements:

```typescript
deeplApiKeyInput: getRequiredElement("deeplApiKey", HTMLInputElement),
translationProviderSelect: getRequiredElement("translationProvider", HTMLSelectElement),
```

- [ ] **Step 5: Run popup tests**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/popup/popup.test.mjs
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add popup.html src/popup/popup.ts test/popup/popup.test.mjs
git commit -m "feat: add provider settings to popup"
```

### Task 6: Manifest Host Permissions And Content Reset

**Files:**
- Modify: `public/manifest.json`
- Modify: `src/content/clozemaster.ts`
- Modify: `test/content/clozemaster.test.mjs`
- Test: `test/build/contentBundle.test.mjs`

- [ ] **Step 1: Add failing manifest/source tests**

Add or extend a test that reads `public/manifest.json` and asserts:

```javascript
assert.equal(manifest.host_permissions.includes("https://api.deepl.com/*"), true)
assert.equal(manifest.host_permissions.includes("https://api-free.deepl.com/*"), true)
```

Extend the existing storage-change source test in `test/content/clozemaster.test.mjs`:

```javascript
assert.equal(source.includes('changes["translationProvider"]'), true)
```

- [ ] **Step 2: Run targeted tests to verify they fail**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/content/clozemaster.test.mjs test/build/contentBundle.test.mjs
```

Expected: FAIL because DeepL hosts and provider reset are missing.

- [ ] **Step 3: Add DeepL host permissions**

Update `public/manifest.json`:

```json
"host_permissions": [
  "https://www.clozemaster.com/*",
  "https://translation.googleapis.com/*",
  "https://api.deepl.com/*",
  "https://api-free.deepl.com/*"
]
```

- [ ] **Step 4: Reset translated content when provider changes**

In `src/content/clozemaster.ts`, update `handleStorageChanged` condition:

```typescript
if (
  areaName !== "local" ||
  (changes["targetLanguage"] === undefined &&
    changes["translationProvider"] === undefined &&
    changes["explanationTranslationDisplayMode"] === undefined)
) {
  return
}
```

Do not add API-key-specific behavior to the content script.

- [ ] **Step 5: Build before bundle tests**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run build
```

Expected: PASS and `dist/content.js` exists.

- [ ] **Step 6: Run targeted tests**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node --test --experimental-strip-types test/content/clozemaster.test.mjs test/build/contentBundle.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add public/manifest.json src/content/clozemaster.ts test/content/clozemaster.test.mjs test/build/contentBundle.test.mjs
git commit -m "feat: permit DeepL background requests"
```

### Task 7: Full Regression And Size Review

**Files:**
- Modify: any files needed after verification.

- [ ] **Step 1: Run typecheck**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run typecheck
```

Expected: PASS.

- [ ] **Step 2: Run production build**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run build
```

Expected: PASS and Vite emits `dist/background.js`, `dist/content.js`, `dist/popup.js`, and `dist/popup.html`.

- [ ] **Step 3: Run full tests after build**

Run:

```bash
PATH=/Users/june_macbook_pro/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test
```

Expected: PASS with all tests green. Run this after build because `test/build/contentBundle.test.mjs` reads `dist/content.js`.

- [ ] **Step 4: Measure pure LOC for changed TypeScript files**

Run:

```bash
for file in \
  src/shared/translationClient.ts \
  src/shared/deeplTranslate.ts \
  src/shared/googleTranslate.ts \
  src/shared/types.ts \
  src/shared/storage.ts \
  src/background/translate.ts \
  src/background/index.ts \
  src/popup/popup.ts \
  src/content/clozemaster.ts
do
  printf "%s " "$file"
  awk '!/^[[:space:]]*$/ && !/^[[:space:]]*(\/\/|#|--)/' "$file" | wc -l
done
```

Expected: every file stays under 250 pure LOC. If `src/content/clozemaster.ts` grows beyond 250 pure LOC, stop and split storage/settings reading out of the content script before proceeding.

- [ ] **Step 5: Optional manual smoke test with real keys**

In Chrome:

1. Load `dist/` as an unpacked extension.
2. Open the popup.
3. Select `DeepL`.
4. Enter a DeepL Free key ending in `:fx`.
5. Visit a Clozemaster page with an explanation modal.
6. Confirm translation succeeds.
7. Switch back to `Google Cloud Translation`.
8. Confirm translation still succeeds with the Google key.

Expected: background requests go to `api-free.deepl.com` for Free keys and `translation.googleapis.com` for Google.

- [ ] **Step 6: Commit final verification notes if docs changed**

Only commit if verification required a plan/doc update:

```bash
git add docs/superpowers/plans/2026-06-16-deepl-provider.md
git commit -m "docs: plan DeepL provider implementation"
```

## Execution Notes

- Prefer `superpowers:subagent-driven-development` if executing this plan later.
- Use TDD order for every task: failing test, verify red, implementation, verify green, commit.
- Do not use the DeepL official Node SDK in the extension bundle. The existing project pattern is a small fetch adapter with injectable fetch for tests.
- Do not send DeepL credentials in query parameters. Use the `Authorization` header.
- Do not let the content script request arbitrary URLs. All provider dispatch must remain in the background service worker.
