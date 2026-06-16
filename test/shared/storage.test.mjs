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
    explanationTranslationDisplayMode: "unsupported-mode",
    googleApiKey: "api-key",
    targetLanguage: "ja",
  })

  globalThis.chrome = { storage: { local: storage } }

  const settings = await getSettings()

  assert.deepEqual(settings, {
    explanationTranslationDisplayMode: "replace",
    googleApiKey: "api-key",
    targetLanguage: "ja",
  })
})

test("saveSettings writes explanation translation display mode", async () => {
  const writes = []
  const storage = createChromeStorage({}, writes)

  globalThis.chrome = { storage: { local: storage } }

  await saveSettings({
    explanationTranslationDisplayMode: "separate",
    googleApiKey: "api-key",
    targetLanguage: "ko",
  })

  assert.deepEqual(writes, [
    {
      explanationTranslationDisplayMode: "separate",
      googleApiKey: "api-key",
      targetLanguage: "ko",
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
