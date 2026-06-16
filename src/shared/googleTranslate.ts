import { isRecord } from "./types.ts"

export type TranslateWithGoogleInput = {
  readonly apiKey: string
  readonly sourceLanguage?: string | undefined
  readonly text: string
  readonly targetLanguage: string
}

export type FetchTranslate = (url: string, init: RequestInit) => Promise<Response>

type GoogleTranslateRequestBody = {
  readonly q: string
  readonly source?: string
  readonly target: string
  readonly format: "text"
}

export class GoogleTranslateHttpError extends Error {
  readonly name = "GoogleTranslateHttpError"
  readonly status: number
  readonly body: string

  constructor(status: number, body: string) {
    super(`Google Translate failed with status ${status}: ${body}`)
    this.status = status
    this.body = body
  }
}

export class GoogleTranslateResponseError extends Error {
  readonly name = "GoogleTranslateResponseError"

  constructor() {
    super("Google Translate response did not include translated text.")
  }
}

export async function translateWithGoogleV2(
  input: TranslateWithGoogleInput,
  fetchTranslate: FetchTranslate = fetch,
): Promise<string> {
  const url = new URL("https://translation.googleapis.com/language/translate/v2")
  url.searchParams.set("key", input.apiKey)
  const body = makeRequestBody(input)

  const response = await fetchTranslate(url.toString(), {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  if (!response.ok) {
    throw new GoogleTranslateHttpError(response.status, await response.text())
  }

  return parseTranslatedText(await response.json())
}

function makeRequestBody(input: TranslateWithGoogleInput): GoogleTranslateRequestBody {
  if (input.sourceLanguage === undefined) {
    return {
      q: input.text,
      target: input.targetLanguage,
      format: "text",
    }
  }

  return {
    q: input.text,
    source: input.sourceLanguage,
    target: input.targetLanguage,
    format: "text",
  }
}

function parseTranslatedText(payload: unknown): string {
  if (!isRecord(payload)) {
    throw new GoogleTranslateResponseError()
  }

  const data = payload["data"]

  if (!isRecord(data)) {
    throw new GoogleTranslateResponseError()
  }

  const translations = data["translations"]

  if (!Array.isArray(translations)) {
    throw new GoogleTranslateResponseError()
  }

  const firstTranslation = translations[0]

  if (!isRecord(firstTranslation)) {
    throw new GoogleTranslateResponseError()
  }

  const translatedText = firstTranslation["translatedText"]

  if (typeof translatedText !== "string") {
    throw new GoogleTranslateResponseError()
  }

  return translatedText
}
