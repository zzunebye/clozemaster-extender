import type {
  ExtensionSettings,
  TranslateMeaningRequest,
  TranslateMeaningResponse,
  TranslationProvider,
} from "../shared/types.ts"
import type { TranslationClientInput } from "../shared/translationClient.ts"

export type TranslationDependencies = {
  readonly getSettings: () => Promise<ExtensionSettings>
  readonly getCache: (key: string) => Promise<string | null>
  readonly setCache: (key: string, value: string) => Promise<void>
  readonly translateWithDeepL: (input: TranslationClientInput) => Promise<string>
  readonly translateWithGoogle: (input: TranslationClientInput) => Promise<string>
}

export async function handleTranslateMeaning(
  message: TranslateMeaningRequest,
  dependencies: TranslationDependencies,
): Promise<TranslateMeaningResponse> {
  const settings = await dependencies.getSettings()
  const provider = settings.translationProvider
  const providerApiKeys = {
    deepl: settings.deeplApiKey,
    google: settings.googleApiKey,
  } satisfies Record<TranslationProvider, string>
  const apiKey = providerApiKeys[provider]

  if (apiKey.trim() === "") {
    const missingApiKeyMessages = {
      deepl: "DeepL API key is not set.",
      google: "Google API key is not set.",
    } satisfies Record<TranslationProvider, string>

    return { error: missingApiKeyMessages[provider] }
  }

  const targetLanguage = message.payload.targetLanguage || settings.targetLanguage
  const cacheKey = makeCacheKey({
    meaning: message.payload.meaning,
    provider,
    sourceLanguage: message.payload.sourceLanguage,
    targetLanguage,
    word: message.payload.word,
  })

  const cachedTranslation = await dependencies.getCache(cacheKey)

  if (cachedTranslation !== null) {
    return { translatedText: cachedTranslation }
  }

  const translators = {
    deepl: dependencies.translateWithDeepL,
    google: dependencies.translateWithGoogle,
  } satisfies Record<TranslationProvider, (input: TranslationClientInput) => Promise<string>>
  const translatedText = await translators[provider]({
    apiKey,
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
  readonly provider: TranslationProvider
  readonly sourceLanguage?: string | undefined
  readonly targetLanguage: string
}): string {
  const word = input.word?.trim() || "unknown-word"
  const sourceLanguage = input.sourceLanguage ?? "auto"

  return ["meaning", input.provider, sourceLanguage, input.targetLanguage, word, input.meaning].join(
    ":",
  )
}
