import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { tsImport } from "tsx/esm/api"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { ALL_CARDS } = await tsImport("../src/data/cards.ts", import.meta.url)

const cardsDir = path.resolve(__dirname, "../public/cards")
const existingFiles = new Set(
  fs
    .readdirSync(cardsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
)

const normalize = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

const manualRenameByName = new Map([
  ["corujadaneve", "snow-owl"],
  ["rastejadordelama", "mud-crawler"],
  ["besourodaareia", "sand-beetle"],
])

const pngFiles = Array.from(existingFiles).filter(
  (name) => name.toLowerCase().endsWith(".png") && !name.includes("placeholder")
)

const normalizedFileMap = new Map()
for (const filename of pngFiles) {
  const base = path.basename(filename, ".png")
  const normalized = normalize(base)
  if (!normalizedFileMap.has(normalized)) {
    normalizedFileMap.set(normalized, filename)
  }
}

const renamed = []
const missing = []

for (const card of ALL_CARDS) {
  const targetName = `${card.id}.png`
  const targetPath = path.join(cardsDir, targetName)

  if (existingFiles.has(targetName)) {
    continue
  }

  const normalizedName = normalize(card.name)
  const manualId = manualRenameByName.get(normalizedName)
  const manualSource =
    manualId === card.id ? normalizedFileMap.get(normalizedName) : undefined

  const sourceName =
    manualSource ?? normalizedFileMap.get(normalize(card.name))

  if (!sourceName) {
    missing.push(card.id)
    continue
  }

  const sourcePath = path.join(cardsDir, sourceName)
  if (!fs.existsSync(sourcePath)) {
    missing.push(card.id)
    continue
  }

  fs.renameSync(sourcePath, targetPath)
  existingFiles.delete(sourceName)
  existingFiles.add(targetName)
  normalizedFileMap.delete(normalize(path.basename(sourceName, ".png")))
  renamed.push({ from: sourceName, to: targetName })
}

console.log("Renomeados:")
if (renamed.length === 0) {
  console.log("- (nenhum)")
} else {
  for (const item of renamed) {
    console.log(`- ${item.from} -> ${item.to}`)
  }
}

console.log("Ainda faltando:")
if (missing.length === 0) {
  console.log("- (nenhum)")
} else {
  for (const id of missing) {
    console.log(`- ${id}.png`)
  }
}
