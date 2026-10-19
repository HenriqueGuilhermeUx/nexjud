import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const read = path => readFileSync(new URL(path, import.meta.url), "utf8")
const iosEntry = read("../App.ios.tsx")
const androidEntry = read("../App.android.tsx")
const lite = read("../IosLite.tsx")
const app = JSON.parse(read("../app.json")).expo

assert.match(iosEntry, /from "\.\/IosLite"/)
assert.doesNotMatch(iosEntry, /AndroidCompanion|FullCompanion/)
assert.match(androidEntry, /from "\.\/AndroidCompanion"/)
assert.ok(lite.includes('from("legal_cases")'), "Cases must load from original RLS-protected data")
assert.ok(lite.includes("nexjud-agenda-"), "Agenda must keep existing user-specific local key")
for (const forbidden of [
  "legal-chat-ai", "draft-generator", "decision-intelligence",
  "ScannerScreen", "ImagePicker", "DocumentPicker", "InAppPurchases", "StoreKit",
  "subscriptions", "checkout", "payment_orders", "Pix", "Assinatura",
  "Criar conta", "Comprar", "Upgrade", "OpenAI"
]) {
  assert.ok(!lite.includes(forbidden), "Forbidden iOS feature or sales language: " + forbidden)
}
assert.equal(app.ios?.buildNumber, "6")
assert.equal(app.android?.versionCode, 7)
assert.equal(app.ios?.bundleIdentifier, "com.nexjud.companion")
assert.ok(lite.includes('("casos")') && lite.includes('("agenda")'), "Both supported tabs must exist")
console.log("PASS: Lite iOS entry includes Cases + local Agenda only; Android retained and no commercial/AI entry.")
