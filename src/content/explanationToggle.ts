import {
  EXPLANATION_TOGGLE_ID,
  ORIGINAL_TEXT_ATTRIBUTE,
  TRANSLATED_TEXT_ATTRIBUTE,
} from "./explanationConstants.ts"
import { getExplanationTextElements } from "./explanationText.ts"

type ExplanationTextState = "original" | "translation"

const toggleButtonModals = new WeakMap<HTMLButtonElement, HTMLElement>()
let lastPointerActivationTime = 0

export function replaceOriginalExplanationText(modal: HTMLElement, translatedText: string): void {
  const elements = getExplanationTextElements(modal)
  const translatedLines = splitTranslatedText(translatedText)
  const shouldMapLineByLine = translatedLines.length === elements.length

  elements.forEach((element, index) => {
    if (!element.hasAttribute(ORIGINAL_TEXT_ATTRIBUTE)) {
      element.setAttribute(ORIGINAL_TEXT_ATTRIBUTE, element.textContent ?? "")
    }

    const replacementText = shouldMapLineByLine
      ? getLineReplacement(element, translatedLines[index] ?? "")
      : index === 0
        ? translatedText
        : ""

    element.setAttribute(TRANSLATED_TEXT_ATTRIBUTE, replacementText)
    element.textContent = replacementText
  })

  setExplanationTextState(modal, "translation")
  renderExplanationToggleButton(modal)
}

export function restoreOriginalExplanationText(modal: HTMLElement): void {
  showOriginalExplanationText(modal)

  for (const element of modal.querySelectorAll(`[${ORIGINAL_TEXT_ATTRIBUTE}]`)) {
    if (!(element instanceof HTMLElement)) {
      continue
    }

    element.removeAttribute(ORIGINAL_TEXT_ATTRIBUTE)
    element.removeAttribute(TRANSLATED_TEXT_ATTRIBUTE)
  }

  delete modal.dataset["clozemasterNativeHelperTextState"]
  removeExplanationToggleButton()
}

export function renderExplanationToggleButton(modal: HTMLElement): void {
  const button = getOrCreateToggleButton(modal)
  updateToggleButtonLabel(modal, button)
}

export function removeExplanationToggleButton(): void {
  document.getElementById(EXPLANATION_TOGGLE_ID)?.remove()
}

function getOrCreateToggleButton(modal: HTMLElement): HTMLButtonElement {
  const existingButton = document.getElementById(EXPLANATION_TOGGLE_ID)

  if (existingButton instanceof HTMLButtonElement) {
    placeToggleButtonNearCloseButton(modal, existingButton)
    return existingButton
  }

  const button = document.createElement("button")
  button.id = EXPLANATION_TOGGLE_ID
  button.type = "button"
  button.style.marginLeft = "12px"
  button.style.padding = "4px 8px"
  button.style.border = "1px solid currentColor"
  button.style.borderRadius = "4px"
  button.style.background = "transparent"
  button.style.color = "inherit"
  button.style.cursor = "pointer"
  button.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return
    }

    lastPointerActivationTime = event.timeStamp
    activateToggleButton(button, event)
  })
  button.addEventListener("click", (event) => {
    if (event.timeStamp - lastPointerActivationTime < 1000) {
      event.preventDefault()
      event.stopPropagation()
      return
    }

    activateToggleButton(button, event)
  })

  placeToggleButtonNearCloseButton(modal, button)

  return button
}

function activateToggleButton(button: HTMLButtonElement, event: Event): void {
  event.preventDefault()
  event.stopPropagation()

  const currentModal = getToggleButtonModal(button)

  if (currentModal !== undefined) {
    toggleExplanationText(currentModal)
  }
}

function placeToggleButtonNearCloseButton(modal: HTMLElement, button: HTMLButtonElement): void {
  setToggleButtonModal(button, modal)

  const closeButton = findCloseButton(modal)
  const closeButtonParent = closeButton?.parentElement

  if (closeButton !== undefined && closeButtonParent !== null && closeButtonParent !== undefined) {
    button.style.marginLeft = "0"
    button.style.marginRight = "12px"
    closeButtonParent.insertBefore(button, closeButton)
    return
  }

  const header = modal.firstElementChild

  if (header instanceof HTMLElement) {
    header.append(button)
  } else {
    modal.prepend(button)
  }
}

function findCloseButton(modal: HTMLElement): HTMLButtonElement | undefined {
  for (const button of modal.querySelectorAll("button")) {
    if (button instanceof HTMLButtonElement && button.textContent?.trim() === "Close") {
      return button
    }
  }

  return undefined
}

function getToggleButtonModal(button: HTMLButtonElement): HTMLElement | undefined {
  const modal = button.closest("#explanation-modal")

  return modal instanceof HTMLElement ? modal : toggleButtonModals.get(button)
}

function setToggleButtonModal(button: HTMLButtonElement, modal: HTMLElement): void {
  toggleButtonModals.set(button, modal)
}

function toggleExplanationText(modal: HTMLElement): void {
  const currentState = getExplanationTextState(modal)

  if (currentState === "translation") {
    showOriginalExplanationText(modal)
    setExplanationTextState(modal, "original")
    return
  }

  showTranslatedExplanationText(modal)
  setExplanationTextState(modal, "translation")
}

function showOriginalExplanationText(modal: HTMLElement): void {
  for (const element of modal.querySelectorAll(`[${ORIGINAL_TEXT_ATTRIBUTE}]`)) {
    if (element instanceof HTMLElement) {
      element.textContent = element.getAttribute(ORIGINAL_TEXT_ATTRIBUTE) ?? ""
    }
  }
}

function showTranslatedExplanationText(modal: HTMLElement): void {
  for (const element of modal.querySelectorAll(`[${TRANSLATED_TEXT_ATTRIBUTE}]`)) {
    if (element instanceof HTMLElement) {
      element.textContent = element.getAttribute(TRANSLATED_TEXT_ATTRIBUTE) ?? ""
    }
  }
}

function setExplanationTextState(modal: HTMLElement, state: ExplanationTextState): void {
  modal.dataset["clozemasterNativeHelperTextState"] = state

  const button = document.getElementById(EXPLANATION_TOGGLE_ID)

  if (button instanceof HTMLButtonElement) {
    updateToggleButtonLabel(modal, button)
  }
}

function updateToggleButtonLabel(modal: HTMLElement, button: HTMLButtonElement): void {
  const state = getExplanationTextState(modal)
  button.textContent = state === "translation" ? "Show original" : "Show translation"
  button.setAttribute("aria-pressed", state === "original" ? "true" : "false")
}

function getExplanationTextState(modal: HTMLElement): ExplanationTextState {
  return modal.dataset["clozemasterNativeHelperTextState"] === "original"
    ? "original"
    : "translation"
}

function splitTranslatedText(translatedText: string): readonly string[] {
  return translatedText
    .split(/\n+/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

function getLineReplacement(element: HTMLElement, line: string): string {
  return element.tagName.toLowerCase() === "li" ? stripListMarker(line) : line
}

function stripListMarker(line: string): string {
  return line.replace(/^\s*(?:[•*-]|\d+\.)\s*/u, "").trim()
}
