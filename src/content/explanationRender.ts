import type { ExplanationTranslationDisplayMode } from "../shared/types.ts"
import { EXPLANATION_TRANSLATION_ID } from "./explanationConstants.ts"
import {
  removeExplanationToggleButton,
  renderExplanationToggleButton,
  replaceOriginalExplanationText,
  restoreOriginalExplanationText,
} from "./explanationToggle.ts"

type ExplanationSettings = {
  readonly explanationTranslationDisplayMode: ExplanationTranslationDisplayMode
  readonly targetLanguage: string
}

class UnexpectedExplanationDisplayModeError extends Error {
  readonly name = "UnexpectedExplanationDisplayModeError"

  constructor(value: never) {
    super(`Unexpected explanation display mode: ${String(value)}`)
  }
}

export function resetExplanationTranslation(modal: HTMLElement): void {
  restoreOriginalExplanationText(modal)
  clearTranslationMetadata(modal)
  document.getElementById(EXPLANATION_TRANSLATION_ID)?.remove()
}

export function renderExplanationTranslation(
  modal: HTMLElement,
  sourceText: string,
  translatedText: string,
  settings: ExplanationSettings,
): void {
  switch (settings.explanationTranslationDisplayMode) {
    case "replace":
      replaceExplanationContent(modal, sourceText, translatedText, settings)
      return
    case "separate":
      renderSeparateExplanationTranslation(modal, sourceText, translatedText, settings)
      return
    default:
      throw new UnexpectedExplanationDisplayModeError(settings.explanationTranslationDisplayMode)
  }
}

export function applyCurrentMode(
  modal: HTMLElement,
  displayMode: ExplanationTranslationDisplayMode,
): void {
  switch (displayMode) {
    case "replace":
      document.getElementById(EXPLANATION_TRANSLATION_ID)?.remove()
      renderExplanationToggleButton(modal)
      return
    case "separate":
      restoreOriginalExplanationText(modal)
      return
    default:
      throw new UnexpectedExplanationDisplayModeError(displayMode)
  }
}

export function renderExplanationLoading(
  modal: HTMLElement,
  sourceText: string,
  settings: ExplanationSettings,
): void {
  if (settings.explanationTranslationDisplayMode === "replace") {
    document.getElementById(EXPLANATION_TRANSLATION_ID)?.remove()
    removeExplanationToggleButton()
    return
  }

  const block = getOrCreateExplanationBlock(modal)
  setBlockMetadata(block, sourceText, settings)
  applyBlockStyle(block, "status")
  block.textContent = "Translating explanation..."
}

export function showExplanationError(
  modal: HTMLElement,
  sourceText: string,
  errorMessage: string,
  settings: ExplanationSettings,
): void {
  restoreOriginalExplanationText(modal)

  if (settings.explanationTranslationDisplayMode === "replace") {
    clearTranslationMetadata(modal)
    modal.dataset["clozemasterNativeHelperError"] = errorMessage
    document.getElementById(EXPLANATION_TRANSLATION_ID)?.remove()
    removeExplanationToggleButton()
    return
  }

  const block = getOrCreateExplanationBlock(modal)
  setBlockMetadata(block, sourceText, settings)
  applyBlockStyle(block, "error")
  block.textContent = errorMessage
}

export function hasCurrentExplanationTranslation(
  modal: HTMLElement,
  sourceText: string,
  settings: ExplanationSettings,
): boolean {
  return (
    modal.dataset["sourceText"] === sourceText &&
    modal.dataset["targetLanguage"] === settings.targetLanguage &&
    modal.dataset["displayMode"] === settings.explanationTranslationDisplayMode
  )
}

function replaceExplanationContent(
  modal: HTMLElement,
  sourceText: string,
  translatedText: string,
  settings: ExplanationSettings,
): void {
  document.getElementById(EXPLANATION_TRANSLATION_ID)?.remove()
  setBlockMetadata(modal, sourceText, settings)
  replaceOriginalExplanationText(modal, translatedText)
}

function renderSeparateExplanationTranslation(
  modal: HTMLElement,
  sourceText: string,
  translatedText: string,
  settings: ExplanationSettings,
): void {
  restoreOriginalExplanationText(modal)
  setBlockMetadata(modal, sourceText, settings)
  const block = getOrCreateExplanationBlock(modal)
  setBlockMetadata(block, sourceText, settings)
  applyBlockStyle(block, "translation")
  block.textContent = translatedText
}

function getOrCreateExplanationBlock(modal: HTMLElement): HTMLDivElement {
  const existingBlock = document.getElementById(EXPLANATION_TRANSLATION_ID)

  if (existingBlock instanceof HTMLDivElement) {
    return existingBlock
  }

  const block = document.createElement("div")
  block.id = EXPLANATION_TRANSLATION_ID

  modal.firstElementChild?.after(block) ?? modal.prepend(block)

  return block
}

function setBlockMetadata(
  element: HTMLElement,
  sourceText: string,
  settings: ExplanationSettings,
): void {
  element.dataset["displayMode"] = settings.explanationTranslationDisplayMode
  element.dataset["sourceText"] = sourceText
  element.dataset["targetLanguage"] = settings.targetLanguage
}

function clearTranslationMetadata(modal: HTMLElement): void {
  delete modal.dataset["clozemasterNativeHelperError"]
  delete modal.dataset["displayMode"]
  delete modal.dataset["sourceText"]
  delete modal.dataset["targetLanguage"]
}

function applyBlockStyle(
  block: HTMLDivElement,
  variant: "error" | "status" | "translation",
): void {
  block.style.margin = "16px 24px"
  block.style.padding = "14px 16px"
  block.style.borderRadius = "6px"
  block.style.whiteSpace = "pre-wrap"

  switch (variant) {
    case "error":
      block.style.border = "1px solid #b45309"
      block.style.background = "#241709"
      block.style.color = "#fed7aa"
      return
    case "status":
      block.style.border = "1px solid #5f7f5f"
      block.style.background = "#162016"
      block.style.color = "#e6f4ea"
      return
    case "translation":
      block.style.border = "1px solid #5f7f5f"
      block.style.background = "#162016"
      block.style.color = "#e6f4ea"
      return
    default:
      assertNever(variant)
  }
}

function assertNever(value: never): never {
  throw new UnexpectedExplanationDisplayModeError(value)
}
