import assert from "node:assert/strict"
import test from "node:test"

import { inferSourceLanguageFromPath } from "../../src/shared/sourceLanguage.ts"

test("inferSourceLanguageFromPath maps Clozemaster source language from URL pair", () => {
  assert.equal(
    inferSourceLanguageFromPath(
      "/l/jpn-eng/collections/fast-track-level-1-a51d75a3/play",
    ),
    "en",
  )
})

test("inferSourceLanguageFromPath returns undefined for malformed or unknown paths", () => {
  assert.equal(inferSourceLanguageFromPath("/l/not-a-real-pair"), undefined)
  assert.equal(inferSourceLanguageFromPath("/dashboard"), undefined)
})
