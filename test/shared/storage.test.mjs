import assert from "node:assert/strict"
import test from "node:test"

import { getSettings, saveSettings } from "../../src/shared/storage.ts"

test("getSettings defaults explanation translation display mode to replace when missing", async () => {
  const storage = createChromeStorage({})

  globalThis.chrome = { storage: { local: storage } }

  const settings = await getSettings()

  assert.equal(settings.explanationTranslationDisplayMode, "replace")
})

test("getSettings defaults explanation translation display mode to replace when invalid", async () => {
  const storage = createChromeStorage({
    deeplApiKey: "deepl-key",
    explanationTranslationDisplayMode: "unsupported-mode",
    googleApiKey: "api-key",
    targetLanguage: "ja",
    translationProvider: "google",
  })

  globalThis.chrome = { storage: { local: storage } }

  const settings = await getSettings()

  assert.deepEqual(settings, {
    deeplApiKey: "deepl-key",
    explanationTranslationDisplayMode: "replace",
    googleApiKey: "api-key",
    targetLanguage: "ja",
    translationProvider: "google",
  })
})

test("getSettings defaults translation provider to google when missing", async () => {
  const storage = createChromeStorage({})

  globalThis.chrome = { storage: { local: storage } }

  const settings = await getSettings()

  assert.equal(settings.translationProvider, "google")
  assert.equal(settings.deeplApiKey, "")
})

test("getSettings falls back to google when translation provider is invalid", async () => {
  const storage = createChromeStorage({
    deeplApiKey: "deepl-key",
    explanationTranslationDisplayMode: "replace",
    googleApiKey: "google-key",
    targetLanguage: "ja",
    translationProvider: "unsupported-provider",
  })

  globalThis.chrome = { storage: { local: storage } }

  const settings = await getSettings()

  assert.deepEqual(settings, {
    deeplApiKey: "deepl-key",
    explanationTranslationDisplayMode: "replace",
    googleApiKey: "google-key",
    targetLanguage: "ja",
    translationProvider: "google",
  })
})

test("saveSettings writes explanation translation display mode", async () => {
  const writes = []
  const storage = createChromeStorage({}, writes)

  globalThis.chrome = { storage: { local: storage } }

  await saveSettings({
    deeplApiKey: "deepl-key",
    explanationTranslationDisplayMode: "separate",
    googleApiKey: "api-key",
    targetLanguage: "ko",
    translationProvider: "deepl",
  })

  assert.deepEqual(writes, [
    {
      deeplApiKey: "deepl-key",
      explanationTranslationDisplayMode: "separate",
      googleApiKey: "api-key",
      targetLanguage: "ko",
      translationProvider: "deepl",
    },
  ])
})

function createChromeStorage(seed, writes = []) {
  const storedItems = { ...seed }

  return {
    get(keys, callback) {
      callback(readStoredItems(storedItems, keys))
    },
    set(items, callback) {
      writes.push({ ...items })
      Object.assign(storedItems, items)
      callback()
    },
  }
}

function readStoredItems(storedItems, keys) {
  if (typeof keys === "string") {
    return { [keys]: storedItems[keys] }
  }

  if (Array.isArray(keys)) {
    return Object.fromEntries(keys.map((key) => [key, storedItems[key]]))
  }

  return { ...keys, ...storedItems }
}
