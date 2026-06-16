import { getSettings, saveSettings } from "../shared/storage.ts"
import { isExplanationTranslationDisplayMode } from "../shared/types.ts"
import type { ExplanationTranslationDisplayMode } from "../shared/types.ts"

class MissingPopupElementError extends Error {
  readonly name = "MissingPopupElementError"
  readonly elementId: string

  constructor(elementId: string) {
    super(`Missing popup element: ${elementId}`)
    this.elementId = elementId
  }
}

type PopupElements = {
  readonly apiKeyInput: HTMLInputElement
  readonly explanationTranslationDisplayModeSelect: HTMLSelectElement
  readonly targetLanguageSelect: HTMLSelectElement
  readonly saveButton: HTMLButtonElement
  readonly statusElement: HTMLDivElement
}

init().catch(logPopupError)

async function init(): Promise<void> {
  const elements = getPopupElements()
  const settings = await getSettings()

  elements.apiKeyInput.value = settings.googleApiKey
  elements.explanationTranslationDisplayModeSelect.value =
    settings.explanationTranslationDisplayMode
  elements.targetLanguageSelect.value = settings.targetLanguage

  elements.saveButton.addEventListener("click", () => {
    savePopupSettings(elements).catch(logPopupError)
  })
}

async function savePopupSettings(elements: PopupElements): Promise<void> {
  await saveSettings({
    explanationTranslationDisplayMode: getSelectedExplanationTranslationDisplayMode(elements),
    googleApiKey: elements.apiKeyInput.value.trim(),
    targetLanguage: elements.targetLanguageSelect.value,
  })

  elements.statusElement.textContent = "Saved."
}

function getSelectedExplanationTranslationDisplayMode(
  elements: PopupElements,
): ExplanationTranslationDisplayMode {
  const value = elements.explanationTranslationDisplayModeSelect.value

  return isExplanationTranslationDisplayMode(value) ? value : "replace"
}

function getPopupElements(): PopupElements {
  return {
    apiKeyInput: getRequiredElement("googleApiKey", HTMLInputElement),
    explanationTranslationDisplayModeSelect: getRequiredElement(
      "explanationTranslationDisplayMode",
      HTMLSelectElement,
    ),
    saveButton: getRequiredElement("save", HTMLButtonElement),
    statusElement: getRequiredElement("status", HTMLDivElement),
    targetLanguageSelect: getRequiredElement("targetLanguage", HTMLSelectElement),
  }
}

function getRequiredElement<TElement extends HTMLElement>(
  elementId: string,
  elementConstructor: { new (): TElement },
): TElement {
  const element = document.getElementById(elementId)

  if (element instanceof elementConstructor) {
    return element
  }

  throw new MissingPopupElementError(elementId)
}

function logPopupError(error: unknown): void {
  if (error instanceof Error) {
    console.error(error.message)
    return
  }

  console.error("Unknown popup error.")
}
