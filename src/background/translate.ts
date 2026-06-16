import type {
  ExtensionSettings,
  TranslateMeaningRequest,
  TranslateMeaningResponse,
} from "../shared/types.ts"
import type { TranslateWithGoogleInput } from "../shared/googleTranslate.ts"

export type TranslationDependencies = {
  readonly getSettings: () => Promise<ExtensionSettings>
  readonly getCache: (key: string) => Promise<string | null>
  readonly setCache: (key: string, value: string) => Promise<void>
  readonly translate: (input: TranslateWithGoogleInput) => Promise<string>
}

export async function handleTranslateMeaning(
  message: TranslateMeaningRequest,
  dependencies: TranslationDependencies,
): Promise<TranslateMeaningResponse> {
  const settings = await dependencies.getSettings()

  if (settings.googleApiKey.trim() === "") {
    return { error: "Google API key is not set." }
  }

  const targetLanguage = message.payload.targetLanguage || settings.targetLanguage
  const cacheKey = makeCacheKey({
    meaning: message.payload.meaning,
    sourceLanguage: message.payload.sourceLanguage,
    targetLanguage,
    word: message.payload.word,
  })

  const cachedTranslation = await dependencies.getCache(cacheKey)

  if (cachedTranslation !== null) {
    return { translatedText: cachedTranslation }
  }

  const translatedText = await dependencies.translate({
    apiKey: settings.googleApiKey,
    sourceLanguage: message.payload.sourceLanguage,
    text: message.payload.meaning,
    targetLanguage,
  })

  await dependencies.setCache(cacheKey, translatedText)

  return { translatedText }
}

export function makeCacheKey(input: {
  readonly word?: string | undefined
  readonly meaning: string
  readonly sourceLanguage?: string | undefined
  readonly targetLanguage: string
}): string {
  const word = input.word?.trim() || "unknown-word"
  const sourceLanguage = input.sourceLanguage ?? "auto"

  return ["meaning", sourceLanguage, input.targetLanguage, word, input.meaning].join(":")
}
