import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

const read = path => readFileSync(new URL(path, import.meta.url), "utf8")
const iosEntry = read("../App.ios.tsx")
const androidEntry = read("../App.android.tsx")
const lite = read("../IosLite.tsx")
const config = JSON.parse(read("../app.json")).expo
assert.match(iosEntry, /from "\.\/IosLite"/)
assert.doesNotMatch(iosEntry, /AndroidCompanion/)
assert.match(androidEntry, /from "\.\/AndroidCompanion"/)
for (const forbidden of [
  "@supabase", "supabase", "auth.", "signIn", "Login", "getSession", "legal_cases",
  "fetch(", "axios", "openai", "OpenAI", "decision-intelligence", "legal-chat-ai",
  "ScannerScreen", "ImagePicker", "DocumentPicker", "InAppPurchases", "StoreKit",
  "checkout", "payment_orders", "premium", "subscriptions", "Assinatura",
  "Criar conta", "Comprar", "Upgrade", "Pix", "WebView", "https://nexjudsolucoes"
]) {
  assert.ok(!lite.includes(forbidden), "Disallowed iOS entitlement/network/paid feature: " + forbidden)
}
assert.match(lite, /nexjud-ios-free-local-cases-v1/)
assert.match(lite, /nexjud-ios-free-local-agenda-v1/)
assert.match(lite, /AsyncStorage\.setItem\(CASES_KEY/)
assert.match(lite, /AsyncStorage\.setItem\(AGENDA_KEY/)
assert.match(lite, /setSelected\(item\)/)
assert.match(lite, /createTask\(\)/)
assert.match(lite, /commitCase\(\)/)
assert.match(lite, /<Pressable accessibilityRole="tab"/)
assert.equal(config.ios?.buildNumber, "7")
assert.equal(config.android?.versionCode, 7)
assert.equal(config.ios?.bundleIdentifier, "com.nexjud.companion")
console.log("PASS: iOS standalone offline Cases+Agenda; no sign-in, payment or cloud subscription access; Android preserved.")
