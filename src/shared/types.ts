export const EXPLANATION_TRANSLATION_DISPLAY_MODES = {
  replace: "replace",
  separate: "separate",
} as const

export type ExplanationTranslationDisplayMode =
  (typeof EXPLANATION_TRANSLATION_DISPLAY_MODES)[keyof typeof EXPLANATION_TRANSLATION_DISPLAY_MODES]

export type ExtensionSettings = {
  readonly explanationTranslationDisplayMode: ExplanationTranslationDisplayMode
  readonly googleApiKey: string
  readonly targetLanguage: string
}

export type TranslateMeaningPayload = {
  readonly word?: string | undefined
  readonly meaning: string
  readonly sourceLanguage?: string | undefined
  readonly targetLanguage: string
}

export type TranslateMeaningRequest = {
  readonly type: "TRANSLATE_MEANING"
  readonly payload: TranslateMeaningPayload
}

export type TranslateMeaningResponse = {
  readonly translatedText?: string
  readonly error?: string
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function isExplanationTranslationDisplayMode(
  value: unknown,
): value is ExplanationTranslationDisplayMode {
  return (
    value === EXPLANATION_TRANSLATION_DISPLAY_MODES.replace ||
    value === EXPLANATION_TRANSLATION_DISPLAY_MODES.separate
  )
}

export function isTranslateMeaningRequest(value: unknown): value is TranslateMeaningRequest {
  if (!isRecord(value) || value["type"] !== "TRANSLATE_MEANING") {
    return false
  }

  const payload = value["payload"]

  if (!isRecord(payload)) {
    return false
  }

  const word = payload["word"]

  return (
    typeof payload["meaning"] === "string" &&
    (payload["sourceLanguage"] === undefined || typeof payload["sourceLanguage"] === "string") &&
    typeof payload["targetLanguage"] === "string" &&
    (word === undefined || typeof word === "string")
  )
}

export function isTranslateMeaningResponse(value: unknown): value is TranslateMeaningResponse {
  if (!isRecord(value)) {
    return false
  }

  const translatedText = value["translatedText"]
  const error = value["error"]

  return (
    (translatedText === undefined || typeof translatedText === "string") &&
    (error === undefined || typeof error === "string")
  )
}
