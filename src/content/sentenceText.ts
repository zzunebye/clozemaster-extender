const CJK_TEXT_PATTERN = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/u
const LATIN_TEXT_PATTERN = /[A-Za-z]/u
const SENTENCE_END_PATTERN = /[.!?]$/u

export function getEnglishSentenceCandidate(text: string): string | null {
  const candidate = normalizeSentenceText(text)

  if (!isEnglishSentenceCandidate(candidate)) {
    return null
  }

  return candidate
}

export function isEnglishSentenceCandidate(text: string): boolean {
  const candidate = normalizeSentenceText(text)

  return (
    candidate.length >= 8 &&
    candidate.length <= 220 &&
    candidate.includes(" ") &&
    LATIN_TEXT_PATTERN.test(candidate) &&
    !CJK_TEXT_PATTERN.test(candidate) &&
    SENTENCE_END_PATTERN.test(candidate) &&
    !isKnownClozemasterUiText(candidate)
  )
}

export function replaceSentenceInText(
  text: string,
  originalSentence: string,
  translatedSentence: string,
): string {
  return text.replace(originalSentence, translatedSentence)
}

function normalizeSentenceText(text: string): string {
  return text.replace(/\s+/gu, " ").trim()
}

function isKnownClozemasterUiText(text: string): boolean {
  const lowerText = text.toLowerCase()

  return (
    lowerText.includes("translated by") ||
    lowerText.includes("mastered") ||
    lowerText.includes("score") ||
    lowerText.includes("to go")
  )
}
