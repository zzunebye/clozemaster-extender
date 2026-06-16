import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)))
const distDir = join(projectRoot, "dist")
const manifestPath = join(distDir, "manifest.json")
const releaseDir = join(projectRoot, "release")

if (!existsSync(manifestPath)) {
  throw new Error("dist/manifest.json was not found. Run the build before packaging.")
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))
const extensionName = String(manifest.name ?? "extension")
const extensionVersion = String(manifest.version ?? "0.0.0")
const zipName = `${slugify(extensionName)}-${extensionVersion}.zip`
const zipPath = join(releaseDir, zipName)

mkdirSync(dirname(zipPath), { recursive: true })
rmSync(zipPath, { force: true })
execFileSync("zip", ["-qr", zipPath, "."], { cwd: distDir, stdio: "inherit" })

console.log(`Packaged ${basename(zipPath)}`)

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
