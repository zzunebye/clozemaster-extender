import assert from "node:assert/strict"
import test from "node:test"

import { handleTranslateMeaning, makeCacheKey } from "../../src/background/translate.ts"

test("handleTranslateMeaning returns an error when API key is missing", async () => {
  let googleCalls = 0

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
        deeplApiKey: "",
        explanationTranslationDisplayMode: "replace",
        googleApiKey: "",
        targetLanguage: "ko",
        translationProvider: "google",
      }),
      getCache: async () => null,
      setCache: async () => {},
      translateWithDeepL: async () => "network",
      translateWithGoogle: async () => {
        googleCalls += 1
        return "무엇이든"
      },
    },
  )

  assert.deepEqual(response, { error: "Google API key is not set." })
  assert.equal(googleCalls, 0)
})

test("handleTranslateMeaning returns cached translation when present", async () => {
  let googleCalls = 0

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
      getSettings: async () => ({
        deeplApiKey: "",
        explanationTranslationDisplayMode: "replace",
        googleApiKey: "api-key",
        targetLanguage: "ko",
        translationProvider: "google",
      }),
      getCache: async () => "무엇이든",
      setCache: async () => {},
      translateWithDeepL: async () => "network",
      translateWithGoogle: async () => {
        googleCalls += 1
        return "network"
      },
    },
  )

  assert.deepEqual(response, { translatedText: "무엇이든" })
  assert.equal(googleCalls, 0)
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
      getSettings: async () => ({
        deeplApiKey: "",
        explanationTranslationDisplayMode: "replace",
        googleApiKey: "api-key",
        targetLanguage: "ko",
        translationProvider: "google",
      }),
      getCache: async () => null,
      setCache: async (key, value) => {
        cacheWrites.push({ key, value })
      },
      translateWithDeepL: async () => "network",
      translateWithGoogle: async (input) => {
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
      key: "meaning:google:en:ko:何でも:anything",
      value: "무엇이든",
    },
  ])
})

test("handleTranslateMeaning returns an error when DeepL API key is missing", async () => {
  let deeplCalls = 0

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
        deeplApiKey: "",
        explanationTranslationDisplayMode: "replace",
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

  assert.deepEqual(response, { error: "DeepL API key is not set." })
  assert.equal(deeplCalls, 0)
})

test("handleTranslateMeaning translates with DeepL when DeepL is selected", async () => {
  let googleCalls = 0

  const response = await handleTranslateMeaning(
    {
      type: "TRANSLATE_MEANING",
      payload: {
        meaning: "anything",
        sourceLanguage: "en",
        targetLanguage: "ko",
      },
    },
    {
      getSettings: async () => ({
        deeplApiKey: "deepl-key",
        explanationTranslationDisplayMode: "replace",
        googleApiKey: "google-key",
        targetLanguage: "ko",
        translationProvider: "deepl",
      }),
      getCache: async () => null,
      setCache: async () => {},
      translateWithDeepL: async (input) => {
        assert.deepEqual(input, {
          apiKey: "deepl-key",
          sourceLanguage: "en",
          text: "anything",
          targetLanguage: "ko",
        })
        return "무엇이든"
      },
      translateWithGoogle: async () => {
        googleCalls += 1
        return "network"
      },
    },
  )

  assert.deepEqual(response, { translatedText: "무엇이든" })
  assert.equal(googleCalls, 0)
})

test("makeCacheKey uses a stable unknown-word fallback", () => {
  assert.equal(
    makeCacheKey({
      meaning: "anything",
      provider: "google",
      targetLanguage: "ko",
    }),
    "meaning:google:auto:ko:unknown-word:anything",
  )
})

test("makeCacheKey separates source languages", () => {
  assert.equal(
    makeCacheKey({
      meaning: "anything",
      provider: "google",
      sourceLanguage: "en",
      targetLanguage: "ko",
    }),
    "meaning:google:en:ko:unknown-word:anything",
  )
})
