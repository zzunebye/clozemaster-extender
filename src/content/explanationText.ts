import {
  EXPLANATION_TRANSLATION_ID,
  ORIGINAL_TEXT_ATTRIBUTE,
} from "./explanationConstants.ts"

export function getExplanationSourceText(modal: HTMLElement): string | null {
  const parts: string[] = []

  for (const element of getExplanationTextElements(modal)) {
    const text = normalizeSentenceText(
      element.getAttribute(ORIGINAL_TEXT_ATTRIBUTE) ?? element.textContent ?? "",
    )

    if (text.length > 0) {
      parts.push(`${getExplanationMarker(element)}${text}`)
    }
  }

  const sourceText = parts.join("\n")

  return sourceText.length > 0 ? sourceText : null
}

export function getExplanationTextElements(modal: HTMLElement): readonly HTMLElement[] {
  const elements: HTMLElement[] = []

  for (const element of modal.querySelectorAll("p, li")) {
    if (
      element instanceof HTMLElement &&
      element.closest("button") === null &&
      element.closest(`#${EXPLANATION_TRANSLATION_ID}`) === null &&
      !(element.tagName.toLowerCase() === "p" && element.closest("li") !== null)
    ) {
      elements.push(element)
    }
  }

  return elements
}

function getExplanationMarker(element: HTMLElement): string {
  if (element.tagName.toLowerCase() !== "li") return ""

  let indent = ""

  for (let ancestor = element.parentElement; ancestor !== null; ancestor = ancestor.parentElement) {
    indent +=
      ancestor.tagName.toLowerCase() === "ol" || ancestor.tagName.toLowerCase() === "ul" ? "  " : ""
  }

  if (element.closest("ol") !== null) return `${indent}${getListItemIndex(element)}. `

  return `${indent}${element.closest("ul") !== null ? "• " : ""}`
}

function getListItemIndex(element: HTMLElement): number {
  let index = 1

  for (
    let sibling = element.previousElementSibling;
    sibling !== null;
    sibling = sibling.previousElementSibling
  ) {
    index += sibling.tagName.toLowerCase() === "li" ? 1 : 0
  }

  return index
}

function normalizeSentenceText(text: string): string {
  return text.replace(/\s+/gu, " ").trim()
}
