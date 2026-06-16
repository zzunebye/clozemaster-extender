import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("popup offers explanation translation display mode setting", async () => {
  const html = await readFile(new URL("../../popup.html", import.meta.url), "utf8")

  assert.equal(html.includes('id="explanationTranslationDisplayMode"'), true)
  assert.equal(html.includes('value="replace"'), true)
  assert.equal(html.includes("Replace Explanation dialog"), true)
  assert.equal(html.includes('value="separate"'), true)
  assert.equal(html.includes("Show in separate dialog"), true)
})

test("popup loads and saves explanation translation display mode", async () => {
  const source = await readFile(new URL("../../src/popup/popup.ts", import.meta.url), "utf8")

  assert.equal(source.includes("explanationTranslationDisplayModeSelect"), true)
  assert.equal(source.includes("settings.explanationTranslationDisplayMode"), true)
  assert.equal(source.includes("explanationTranslationDisplayMode:"), true)
})
