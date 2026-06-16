import assert from "node:assert/strict"
import test from "node:test"

import { translateWithGoogleV2 } from "../../src/shared/googleTranslate.ts"

test("translateWithGoogleV2 posts text format request when called", async () => {
  const calls = []
  const fetchTranslate = async (url, init) => {
    calls.push({ url: String(url), init })

    return Response.json({
      data: {
        translations: [{ translatedText: "안녕하세요" }],
      },
    })
  }

  const translatedText = await translateWithGoogleV2(
    {
      apiKey: "test-api-key",
      text: "hello",
      targetLanguage: "ko",
    },
    fetchTranslate,
  )

  assert.equal(translatedText, "안녕하세요")
  assert.equal(calls.length, 1)
  assert.equal(
    calls[0].url,
    "https://translation.googleapis.com/language/translate/v2?key=test-api-key",
  )
  assert.equal(calls[0].init.method, "POST")
  assert.equal(calls[0].init.headers["Content-Type"], "application/json")
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    q: "hello",
    target: "ko",
    format: "text",
  })
})

test("translateWithGoogleV2 includes source language when provided", async () => {
  const calls = []
  const fetchTranslate = async (url, init) => {
    calls.push({ url: String(url), init })

    return Response.json({
      data: {
        translations: [{ translatedText: "안녕하세요" }],
      },
    })
  }

  await translateWithGoogleV2(
    {
      apiKey: "test-api-key",
      sourceLanguage: "en",
      text: "hello",
      targetLanguage: "ko",
    },
    fetchTranslate,
  )

  assert.deepEqual(JSON.parse(calls[0].init.body), {
    q: "hello",
    source: "en",
    target: "ko",
    format: "text",
  })
})

test("translateWithGoogleV2 throws a typed HTTP error when Google rejects the request", async () => {
  const fetchTranslate = async () =>
    new Response("quota exceeded", {
      status: 403,
    })

  await assert.rejects(
    () =>
      translateWithGoogleV2(
        {
          apiKey: "bad-key",
          text: "hello",
          targetLanguage: "ko",
        },
        fetchTranslate,
      ),
    {
      name: "GoogleTranslateHttpError",
      message: "Google Translate failed with status 403: quota exceeded",
    },
  )
})

test("translateWithGoogleV2 throws a typed response error for malformed Google JSON", async () => {
  const fetchTranslate = async () => Response.json({ data: { translations: [] } })

  await assert.rejects(
    () =>
      translateWithGoogleV2(
        {
          apiKey: "test-api-key",
          text: "hello",
          targetLanguage: "ko",
        },
        fetchTranslate,
      ),
    {
      name: "GoogleTranslateResponseError",
      message: "Google Translate response did not include translated text.",
    },
  )
})
