import type {
  ExplanationTranslationDisplayMode,
  TranslateMeaningPayload,
  TranslateMeaningResponse,
} from "../shared/types.ts"
import { resetExplanationTranslation, translateExplanationModal } from "./explanation.ts"

type ExtensionSettings = {
  readonly explanationTranslationDisplayMode: ExplanationTranslationDisplayMode
  readonly googleApiKey: string
  readonly targetLanguage: string
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  explanationTranslationDisplayMode: "replace",
  googleApiKey: "",
  targetLanguage: "ko",
}

const CJK_TEXT_PATTERN = /[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff\uac00-\ud7af]/u
const LATIN_TEXT_PATTERN = /[A-Za-z]/u
const SENTENCE_END_PATTERN = /[.!?]$/u
const EXPLANATION_MODAL_ID = "explanation-modal"
const SOURCE_LANGUAGE_CODES: Record<string, string> = {
  chi: "zh",
  deu: "de",
  eng: "en",
  fra: "fr",
  ger: "de",
  jpn: "ja",
  kor: "ko",
  por: "pt",
  spa: "es",
  zho: "zh",
}
const TRANSLATION_SELECTOR = ".clozeable > .translation"
const pendingSentenceTranslations = new Set<string>()

function startClozemasterHelper(): void {
  const observer = new MutationObserver(() => {
    run().catch(logContentError)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })

  chrome.storage.onChanged.addListener(handleStorageChanged)
  run().catch(logContentError)
}

async function run(): Promise<void> {
  const sourceLanguage = inferSourceLanguageFromPath(location.pathname)
  const explanationModal = document.getElementById(EXPLANATION_MODAL_ID)

  if (explanationModal instanceof HTMLElement) {
    const settings = await getSettings()

    if (
      await translateExplanationModal({
        modal: explanationModal,
        requestTranslation,
        settings,
        sourceLanguage: sourceLanguage,
      })
    ) {
      return
    }
  }

  const translationElement = document.querySelector(TRANSLATION_SELECTOR)
  const candidate =
    translationElement instanceof HTMLElement
      ? findEnglishSentenceTextNode(translationElement)
      : null

  if (candidate === null || pendingSentenceTranslations.has(candidate.sentence)) {
    return
  }

  pendingSentenceTranslations.add(candidate.sentence)

  try {
    const settings = await getSettings()
    const response = await requestTranslation({
      meaning: candidate.sentence,
      sourceLanguage: sourceLanguage,
      targetLanguage: settings.targetLanguage,
    })

    if (response.translatedText === undefined) {
      return
    }

    const currentText = candidate.node.textContent

    if (currentText !== null && getEnglishSentenceCandidate(currentText) === candidate.sentence) {
      candidate.node.textContent = currentText.replace(candidate.sentence, response.translatedText)
    }
  } finally {
    pendingSentenceTranslations.delete(candidate.sentence)
  }
}

function handleStorageChanged(
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string,
): void {
  if (
    areaName !== "local" ||
    (changes["targetLanguage"] === undefined &&
      changes["translationProvider"] === undefined &&
      changes["explanationTranslationDisplayMode"] === undefined)
  ) {
    return
  }

  const explanationModal = document.getElementById(EXPLANATION_MODAL_ID)

  if (explanationModal instanceof HTMLElement) {
    resetExplanationTranslation(explanationModal)
    run().catch(logContentError)
  }
}

function findEnglishSentenceTextNode(
  root: ParentNode,
): { readonly node: Text; readonly sentence: string } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (!(node instanceof Text) || shouldIgnoreTextNode(node)) {
      continue
    }

    const sentence = getEnglishSentenceCandidate(node.textContent ?? "")

    if (sentence !== null) {
      return { node, sentence }
    }
  }

  return null
}

function shouldIgnoreTextNode(node: Text): boolean {
  const parent = node.parentElement

  if (parent === null) {
    return true
  }

  return (
    ["script", "style", "noscript", "textarea", "input", "select", "option"].includes(
      parent.tagName.toLowerCase(),
    ) ||
    parent.closest(`#${EXPLANATION_MODAL_ID}`) !== null
  )
}

function getEnglishSentenceCandidate(text: string): string | null {
  const candidate = normalizeSentenceText(text)

  return (
    candidate.length >= 8 &&
    candidate.length <= 220 &&
    candidate.includes(" ") &&
    LATIN_TEXT_PATTERN.test(candidate) &&
    !CJK_TEXT_PATTERN.test(candidate) &&
    SENTENCE_END_PATTERN.test(candidate) &&
    !isKnownClozemasterUiText(candidate)
      ? candidate
      : null
  )
}

function inferSourceLanguageFromPath(pathname: string): string | undefined {
  const sourceCode = pathname.match(/^\/l\/[^/]+-([^/]+)/u)?.[1]

  return sourceCode === undefined ? undefined : SOURCE_LANGUAGE_CODES[sourceCode]
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

async function getSettings(): Promise<ExtensionSettings> {
  const result = await getLocal(DEFAULT_SETTINGS)
  const explanationTranslationDisplayMode = result["explanationTranslationDisplayMode"]
  const googleApiKey = result["googleApiKey"]
  const targetLanguage = result["targetLanguage"]

  return {
    explanationTranslationDisplayMode: parseExplanationTranslationDisplayMode(
      explanationTranslationDisplayMode,
    ),
    googleApiKey: typeof googleApiKey === "string" ? googleApiKey : DEFAULT_SETTINGS.googleApiKey,
    targetLanguage:
      typeof targetLanguage === "string" ? targetLanguage : DEFAULT_SETTINGS.targetLanguage,
  }
}

function getLocal(keys: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (items) => {
      resolve(items)
    })
  })
}

function parseExplanationTranslationDisplayMode(
  value: unknown,
): ExplanationTranslationDisplayMode {
  return value === "separate" ? "separate" : "replace"
}

async function requestTranslation(
  payload: TranslateMeaningPayload,
): Promise<TranslateMeaningResponse> {
  const response: unknown = await chrome.runtime.sendMessage({
    payload,
    type: "TRANSLATE_MEANING",
  })

  if (isTranslateMeaningResponse(response)) {
    return response
  }

  return { error: "Extension returned an invalid translation response." }
}

function isTranslateMeaningResponse(value: unknown): value is TranslateMeaningResponse {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function logContentError(error: unknown): void {
  console.error(error instanceof Error ? error.message : "Unknown Clozemaster helper error.")
}

if (
  typeof document !== "undefined" &&
  typeof MutationObserver !== "undefined" &&
  typeof chrome !== "undefined" &&
  chrome.runtime?.sendMessage !== undefined &&
  chrome.storage?.local !== undefined
) {
  startClozemasterHelper()
}
