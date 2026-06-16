import { isRecord } from "./types.ts"
import type { FetchTranslate, TranslationClientInput } from "./translationClient.ts"

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
