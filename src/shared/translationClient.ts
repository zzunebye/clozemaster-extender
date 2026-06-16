export type TranslationClientInput = {
  readonly apiKey: string
  readonly sourceLanguage?: string | undefined
  readonly text: string
  readonly targetLanguage: string
}

export type FetchTranslate = (url: string, init: RequestInit) => Promise<Response>
