import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import {
  getEnglishSentenceCandidate,
  isEnglishSentenceCandidate,
} from "../../src/content/sentenceText.ts"

test("getEnglishSentenceCandidate returns the Clozemaster English prompt sentence", () => {
  assert.equal(getEnglishSentenceCandidate("Start the meeting now."), "Start the meeting now.")
})

test("getEnglishSentenceCandidate trims surrounding whitespace", () => {
  assert.equal(getEnglishSentenceCandidate("\n  Start the meeting now.  \n"), "Start the meeting now.")
})

test("isEnglishSentenceCandidate rejects Clozemaster UI copy", () => {
  assert.equal(isEnglishSentenceCandidate("4 to go"), false)
  assert.equal(isEnglishSentenceCandidate("25% mastered"), false)
  assert.equal(isEnglishSentenceCandidate("SCORE:"), false)
})

test("isEnglishSentenceCandidate rejects Japanese answer text", () => {
  assert.equal(isEnglishSentenceCandidate("ミーティングを開始しましょう。"), false)
})

test("content renderer does not inject page text with innerHTML", async () => {
  const contentSource = await readFile(
    new URL("../../src/content/clozemaster.ts", import.meta.url),
    "utf8",
  )
  const explanationSource = await readExplanationSource()

  assert.equal(contentSource.includes("innerHTML"), false)
  assert.equal(explanationSource.includes("innerHTML"), false)
})

test("content script source has no static imports or exports", async () => {
  const source = await readFile(new URL("../../src/content/clozemaster.ts", import.meta.url), "utf8")

  assert.equal(source.includes("export "), false)
})

test("content explanation renderer supports replace and separate display modes", async () => {
  const source = await readExplanationSource()

  assert.equal(source.includes('"replace"'), true)
  assert.equal(source.includes('"separate"'), true)
  assert.equal(source.includes("replaceExplanationContent"), true)
  assert.equal(source.includes("renderSeparateExplanationTranslation"), true)
})

test("content explanation replacement mutates existing modal text instead of hiding body content", async () => {
  const source = await readExplanationSource()

  assert.equal(source.includes("data-clozemaster-native-helper-original-text"), true)
  assert.equal(source.includes("replaceOriginalExplanationText"), true)
  assert.equal(source.includes("hideOriginalExplanationBody"), false)
  assert.equal(source.includes("data-clozemaster-native-helper-original-display"), false)
})

test("content explanation replacement adds a toggle button for original and translation", async () => {
  const source = await readExplanationSource()

  assert.equal(source.includes("clozemaster-native-helper-explanation-toggle"), true)
  assert.equal(source.includes("data-clozemaster-native-helper-translated-text"), true)
  assert.equal(source.includes("renderExplanationToggleButton"), true)
  assert.equal(source.includes("toggleExplanationText"), true)
  assert.equal(source.includes("Show original"), true)
  assert.equal(source.includes("Show translation"), true)
})

test("content explanation toggle is placed beside the Clozemaster close button", async () => {
  const source = await readExplanationSource()

  assert.equal(source.includes("findCloseButton"), true)
  assert.equal(source.includes('"Close"'), true)
  assert.equal(source.includes("insertBefore(button, closeButton)"), true)
})

test("content explanation toggle resolves the current modal on click", async () => {
  const source = await readExplanationSource()

  assert.equal(source.includes('button.addEventListener("pointerdown"'), true)
  assert.equal(source.includes("lastPointerActivationTime"), true)
  assert.equal(source.includes("event.preventDefault()"), true)
  assert.equal(source.includes("event.stopPropagation()"), true)
  assert.equal(source.includes('button.closest("#explanation-modal")'), true)
  assert.equal(source.includes("getToggleButtonModal(button)"), true)
})

test("content explanation toggle keeps working when placed outside the modal element", async () => {
  const source = await readExplanationSource()

  assert.equal(source.includes("new WeakMap<HTMLButtonElement, HTMLElement>()"), true)
  assert.equal(source.includes("setToggleButtonModal(button, modal)"), true)
  assert.equal(source.includes("toggleButtonModals.get(button)"), true)
})

test("content explanation replacement preserves original content on translation failure", async () => {
  const source = await readExplanationSource()

  assert.equal(source.includes("showExplanationError"), true)
  assert.equal(source.includes("restoreOriginalExplanationText(modal)"), true)
  assert.equal(source.includes("No explanation translation."), true)
})

test("content script refreshes explanation translation when storage settings change", async () => {
  const source = await readFile(new URL("../../src/content/clozemaster.ts", import.meta.url), "utf8")

  assert.equal(source.includes("chrome.storage.onChanged"), true)
  assert.equal(source.includes("explanationTranslationDisplayMode"), true)
})

test("content script can import local modules before bundling", async () => {
  const source = await readFile(new URL("../../src/content/clozemaster.ts", import.meta.url), "utf8")

  assert.equal(source.includes('from "./explanation.ts"'), true)
  assert.equal(source.includes("export "), false)
})

test("content script watches the Clozemaster explanation modal", async () => {
  const contentSource = await readFile(
    new URL("../../src/content/clozemaster.ts", import.meta.url),
    "utf8",
  )
  const explanationSource = await readExplanationSource()

  assert.equal(contentSource.includes("explanation-modal"), true)
  assert.equal(explanationSource.includes("clozemaster-native-helper-explanation-translation"), true)
})

test("content script targets the Clozemaster translation element", async () => {
  const source = await readFile(new URL("../../src/content/clozemaster.ts", import.meta.url), "utf8")

  assert.equal(source.includes(".clozeable > .translation"), true)
  assert.equal(source.includes("findEnglishSentenceTextNode(document.body)"), false)
})

test("content script infers source language from the Clozemaster URL", async () => {
  const source = await readFile(new URL("../../src/content/clozemaster.ts", import.meta.url), "utf8")

  assert.equal(source.includes("inferSourceLanguageFromPath(location.pathname)"), true)
  assert.equal(source.includes("sourceLanguage: sourceLanguage"), true)
})

test("content script preserves explanation paragraph and list markers before translation", async () => {
  const source = await readExplanationSource()

  assert.equal(source.includes('querySelectorAll("p, li")'), true)
  assert.equal(source.includes('closest("li")'), true)
  assert.equal(source.includes('closest("ol")'), true)
  assert.equal(source.includes('closest("ul")'), true)
  assert.equal(source.includes('"  "'), true)
  assert.equal(source.includes('"• "'), true)
})

async function readExplanationSource() {
  const sources = await Promise.all(
    [
      "../../src/content/explanation.ts",
      "../../src/content/explanationConstants.ts",
      "../../src/content/explanationRender.ts",
      "../../src/content/explanationText.ts",
      "../../src/content/explanationToggle.ts",
    ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
  )

  return sources.join("\n")
}
