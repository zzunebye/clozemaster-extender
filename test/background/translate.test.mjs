import assert from "node:assert/strict"
import test from "node:test"

import { handleTranslateMeaning, makeCacheKey } from "../../src/background/translate.ts"

test("handleTranslateMeaning returns an error when API key is missing", async () => {
  let translateCalls = 0

  const response = await handleTranslateMeaning(
    {
      type: "TRANSLATE_MEANING",
      payload: {
        meaning: "anything",
        targetLanguage: "ko",
      },
    },
    {
      getSettings: async () => ({ googleApiKey: "", targetLanguage: "ko" }),
      getCache: async () => null,
      setCache: async () => {},
      translate: async () => {
        translateCalls += 1
        return "무엇이든"
      },
    },
  )

  assert.deepEqual(response, { error: "Google API key is not set." })
  assert.equal(translateCalls, 0)
})

test("handleTranslateMeaning returns cached translation when present", async () => {
  let translateCalls = 0

  const response = await handleTranslateMeaning(
    {
      type: "TRANSLATE_MEANING",
      payload: {
        word: "何でも",
        meaning: "anything",
        sourceLanguage: "en",
        targetLanguage: "ko",
      },
    },
    {
      getSettings: async () => ({ googleApiKey: "api-key", targetLanguage: "ko" }),
      getCache: async () => "무엇이든",
      setCache: async () => {},
      translate: async () => {
        translateCalls += 1
        return "network"
      },
    },
  )

  assert.deepEqual(response, { translatedText: "무엇이든" })
  assert.equal(translateCalls, 0)
})

test("handleTranslateMeaning translates and caches a missing translation", async () => {
  const cacheWrites = []

  const response = await handleTranslateMeaning(
    {
      type: "TRANSLATE_MEANING",
      payload: {
        word: "何でも",
        meaning: "anything",
        sourceLanguage: "en",
        targetLanguage: "ko",
      },
    },
    {
      getSettings: async () => ({ googleApiKey: "api-key", targetLanguage: "ko" }),
      getCache: async () => null,
      setCache: async (key, value) => {
        cacheWrites.push({ key, value })
      },
      translate: async (input) => {
        assert.deepEqual(input, {
          apiKey: "api-key",
          sourceLanguage: "en",
          text: "anything",
          targetLanguage: "ko",
        })
        return "무엇이든"
      },
    },
  )

  assert.deepEqual(response, { translatedText: "무엇이든" })
  assert.deepEqual(cacheWrites, [
    {
      key: "meaning:en:ko:何でも:anything",
      value: "무엇이든",
    },
  ])
})

test("makeCacheKey uses a stable unknown-word fallback", () => {
  assert.equal(
    makeCacheKey({
      meaning: "anything",
      targetLanguage: "ko",
    }),
    "meaning:auto:ko:unknown-word:anything",
  )
})

test("makeCacheKey separates source languages", () => {
  assert.equal(
    makeCacheKey({
      meaning: "anything",
      sourceLanguage: "en",
      targetLanguage: "ko",
    }),
    "meaning:en:ko:unknown-word:anything",
  )
})
