import assert from "node:assert/strict"
import test from "node:test"

import { translateWithDeepLV2 } from "../../src/shared/deeplTranslate.ts"

test("translateWithDeepLV2 posts JSON to the Free endpoint when the key is Free", async () => {
  const calls = []
  const fetchTranslate = async (url, init) => {
    calls.push({ url: String(url), init })

    return Response.json({
      translations: [{ detected_source_language: "EN", text: "안녕하세요" }],
    })
  }

  const translatedText = await translateWithDeepLV2(
    {
      apiKey: "test-key:fx",
      text: "hello",
      targetLanguage: "ko",
    },
    fetchTranslate,
  )

  assert.equal(translatedText, "안녕하세요")
  assert.equal(calls.length, 1)
  assert.equal(calls[0].url, "https://api-free.deepl.com/v2/translate")
  assert.equal(calls[0].init.method, "POST")
  assert.equal(calls[0].init.headers["Authorization"], "DeepL-Auth-Key test-key:fx")
  assert.equal(calls[0].init.headers["Content-Type"], "application/json")
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    text: ["hello"],
    target_lang: "KO",
  })
})

test("translateWithDeepLV2 posts JSON to the Pro endpoint when the key is Pro", async () => {
  const calls = []
  const fetchTranslate = async (url, init) => {
    calls.push({ url: String(url), init })

    return Response.json({
      translations: [{ detected_source_language: "EN", text: "안녕하세요" }],
    })
  }

  await translateWithDeepLV2(
    {
      apiKey: "test-key",
      text: "hello",
      targetLanguage: "ko",
    },
    fetchTranslate,
  )

  assert.equal(calls[0].url, "https://api.deepl.com/v2/translate")
})

test("translateWithDeepLV2 includes source language when provided", async () => {
  const calls = []
  const fetchTranslate = async (url, init) => {
    calls.push({ url: String(url), init })

    return Response.json({
      translations: [{ detected_source_language: "EN", text: "안녕하세요" }],
    })
  }

  await translateWithDeepLV2(
    {
      apiKey: "test-key:fx",
      sourceLanguage: "en",
      text: "hello",
      targetLanguage: "ko",
    },
    fetchTranslate,
  )

  assert.deepEqual(JSON.parse(calls[0].init.body), {
    text: ["hello"],
    source_lang: "EN",
    target_lang: "KO",
  })
})

test("translateWithDeepLV2 throws a typed HTTP error when DeepL rejects the request", async () => {
  const fetchTranslate = async () =>
    new Response("quota exceeded", {
      status: 403,
    })

  await assert.rejects(
    () =>
      translateWithDeepLV2(
        {
          apiKey: "bad-key",
          text: "hello",
          targetLanguage: "ko",
        },
        fetchTranslate,
      ),
    {
      name: "DeepLTranslateHttpError",
      message: "DeepL Translate failed with status 403: quota exceeded",
    },
  )
})

test("translateWithDeepLV2 throws a typed response error for malformed DeepL JSON", async () => {
  const fetchTranslate = async () => Response.json({ translations: [] })

  await assert.rejects(
    () =>
      translateWithDeepLV2(
        {
          apiKey: "test-key:fx",
          text: "hello",
          targetLanguage: "ko",
        },
        fetchTranslate,
      ),
    {
      name: "DeepLTranslateResponseError",
      message: "DeepL Translate response did not include translated text.",
    },
  )
})
