import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

test("built content script is a classic script without module imports", async () => {
  const contentBundle = await readFile(new URL("../../dist/content.js", import.meta.url), "utf8")

  assert.equal(contentBundle.startsWith("import"), false)
  assert.equal(contentBundle.includes("from\"./chunks/"), false)
  assert.equal(contentBundle.includes("from './chunks/"), false)
  assert.equal(contentBundle.includes("export{"), false)
})
