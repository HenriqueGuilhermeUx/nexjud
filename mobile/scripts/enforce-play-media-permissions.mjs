import fs from "node:fs"

const manifestPath = "android/app/src/main/AndroidManifest.xml"
if (!fs.existsSync(manifestPath)) {
  throw new Error(`AndroidManifest não encontrado em ${manifestPath}`)
}

let xml = fs.readFileSync(manifestPath, "utf8")

if (!xml.includes("xmlns:tools=")) {
  xml = xml.replace(
    /<manifest\s+([^>]*?)xmlns:android="http:\/\/schemas\.android\.com\/apk\/res\/android"([^>]*)>/,
    '<manifest $1xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"$2>'
  )
}

const restricted = [
  "android.permission.READ_MEDIA_IMAGES",
  "android.permission.READ_MEDIA_VIDEO",
  "android.permission.READ_EXTERNAL_STORAGE",
]

for (const permission of restricted) {
  const escaped = permission.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const existing = new RegExp(`<uses-permission[^>]*android:name=["']${escaped}["'][^>]*/?>\\s*`, "g")
  xml = xml.replace(existing, "")
}

const removalNodes = restricted
  .map(p => `  <uses-permission android:name="${p}" tools:node="remove" />`)
  .join("\n")

xml = xml.replace(/(<manifest[^>]*>)/, `$1\n${removalNodes}`)
fs.writeFileSync(manifestPath, xml)

console.log("Permissões amplas de mídia bloqueadas no AndroidManifest:")
for (const p of restricted) console.log(`- ${p}`)
