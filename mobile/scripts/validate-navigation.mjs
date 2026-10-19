// Regression guard for App Review Guideline 2.1(a): action routes must exist.
import { readFileSync } from "node:fs"
import assert from "node:assert/strict"

// Full navigation lives in AndroidCompanion after iOS Lite was isolated.
const source = readFileSync(new URL("../AndroidCompanion.tsx", import.meta.url), "utf8")
const screen = source.match(/function MainTabs\(\)\s*\{[\s\S]*?<\/Tabs\.Navigator>/)?.[0] || ""
const stack = source.match(/<Stack\.Navigator[\s\S]*?<\/Stack\.Navigator>/)?.[0] || ""
assert.ok(screen, "Main tab navigator missing")
assert.ok(stack, "Main stack navigator missing")
const tabNames = new Set([...screen.matchAll(/<Tabs\.Screen name="([^"]+)"/g)].map(m => m[1]))
const stackNames = new Set([...stack.matchAll(/<Stack\.Screen name="([^"]+)"/g)].map(m => m[1]))
const actionsBlock = source.match(/const actions = \[[\s\S]*?\] as const/)?.[0]
  || source.match(/const actions = \[[\s\S]*?\]\s*\n\s*return \(/)?.[0]
assert.ok(actionsBlock, "Home actions missing")
for (const match of actionsBlock.matchAll(/\{\s*title:\s*"([^"]+)"[^}]+\}/g)) {
  const action = match[0]
  const label = match[1]
  const parent = action.match(/parent:\s*"([^"]+)"/)?.[1]
  const route = action.match(/route:\s*"([^"]+)"/)?.[1]
  if (parent) assert.ok(stackNames.has(parent), `Action "${label}" points to unregistered stack route "${parent}"`)
  else if (route) assert.ok(tabNames.has(route), `Action "${label}" points to unregistered tab "${route}"`)
}
assert.match(source, /title:\s*"Analisar documento"[^\n]*parent:\s*"Scanner"/)
assert.ok(stackNames.has("Scanner"), "iPad: document scanner not in main stack")
assert.match(source, /<Stack\.Screen name="Scanner" component=\{ScannerScreen\}/)
assert.match(source, /navigation\.getParent\(\)\?\.navigate\(parent\)/)
console.log("PASS: Home actions resolve to registered native screens, including iPad document scanner.")
