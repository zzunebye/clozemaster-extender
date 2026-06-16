import { isExplanationTranslationDisplayMode, isTranslationProvider } from "./types.ts"
import type { ExtensionSettings } from "./types.ts"

const DEFAULT_SETTINGS: ExtensionSettings = {
  deeplApiKey: "",
  explanationTranslationDisplayMode: "replace",
  googleApiKey: "",
  targetLanguage: "ko",
  translationProvider: "google",
}

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await getLocal(DEFAULT_SETTINGS)
  const deeplApiKey = result["deeplApiKey"]
  const explanationTranslationDisplayMode = result["explanationTranslationDisplayMode"]
  const googleApiKey = result["googleApiKey"]
  const targetLanguage = result["targetLanguage"]
  const translationProvider = result["translationProvider"]

  return {
    deeplApiKey: typeof deeplApiKey === "string" ? deeplApiKey : DEFAULT_SETTINGS.deeplApiKey,
    explanationTranslationDisplayMode: isExplanationTranslationDisplayMode(
      explanationTranslationDisplayMode,
    )
      ? explanationTranslationDisplayMode
      : DEFAULT_SETTINGS.explanationTranslationDisplayMode,
    googleApiKey: typeof googleApiKey === "string" ? googleApiKey : DEFAULT_SETTINGS.googleApiKey,
    targetLanguage:
      typeof targetLanguage === "string" ? targetLanguage : DEFAULT_SETTINGS.targetLanguage,
    translationProvider: isTranslationProvider(translationProvider)
      ? translationProvider
      : DEFAULT_SETTINGS.translationProvider,
  }
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await setLocal({
    deeplApiKey: settings.deeplApiKey,
    explanationTranslationDisplayMode: settings.explanationTranslationDisplayMode,
    googleApiKey: settings.googleApiKey,
    targetLanguage: settings.targetLanguage,
    translationProvider: settings.translationProvider,
  })
}

export async function getCache(key: string): Promise<string | null> {
  const result = await getLocal(key)
  const cached = result[key]

  return typeof cached === "string" ? cached : null
}

export async function setCache(key: string, value: string): Promise<void> {
  await setLocal({ [key]: value })
}

function getLocal(keys: string | string[] | Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (items) => {
      resolve(items)
    })
  })
}

function setLocal(items: Record<string, unknown>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      resolve()
    })
  })
}
