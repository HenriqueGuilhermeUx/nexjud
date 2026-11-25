import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { ALL_TOOLS, TOOL_GROUPS } from "./toolCatalog"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const webCatalog = read("./toolCatalog.ts")
const mobileCatalog = read("../../mobile/src/toolCatalog.ts")
const app = read("../App.tsx")
const dashboard = read("../pages/Dashboard.tsx")
const pwa = read("../pages/CompanionPWA.tsx")
const mobile = read("../../mobile/App.tsx")

describe("catálogo único de ferramentas", () => {
  it("web e app usam o mesmo catálogo (rode scripts/sync-tool-catalog.mjs se falhar)", () => {
    expect(mobileCatalog).toBe(webCatalog)
  })

  it("web, PWA e app desenham o menu a partir do catálogo", () => {
    expect(dashboard).toContain('from "@/navigation/toolCatalog"')
    expect(pwa).toContain('from "@/navigation/toolCatalog"')
    expect(mobile).toContain('from "./src/toolCatalog"')
  })

  it("toda ferramenta do catálogo tem rota no site", () => {
    const routes = new Set([...app.matchAll(/<Route path="([^"]+)"/g)].map((m) => m[1]))
    for (const tool of ALL_TOOLS) {
      const sub = tool.path.replace(/^\/dashboard\//, "")
      expect(routes.has(sub), `rota ausente: ${tool.path}`).toBe(true)
    }
  })

  it("não repete ferramenta dentro do catálogo e não perde nenhuma das que existiam", () => {
    const paths = ALL_TOOLS.map((tool) => tool.path)
    expect(new Set(paths).size).toBe(paths.length)
    for (const legacy of [
      "/dashboard/decision-intelligence", "/dashboard/legal-chat", "/dashboard/knowledge-base", "/dashboard/ai-copilot",
      "/dashboard/legal-memory", "/dashboard/draft-generator", "/dashboard/draft-history", "/dashboard/reports",
      "/dashboard/office-intelligence", "/dashboard/notifications", "/dashboard/legal-cases", "/dashboard/process-portfolio",
      "/dashboard/history", "/dashboard/ai-copilot-history", "/dashboard/litigation-strategy", "/dashboard/cnj-processes",
      "/dashboard/precedents", "/dashboard/jurisprudence-library", "/dashboard/judge-simulator", "/dashboard/red-team-simulator",
      "/dashboard/chief-legal-officer", "/dashboard/legal-intelligence-engine", "/dashboard/war-room", "/dashboard/partner-council",
      "/dashboard/opponent-database", "/dashboard/tribunal-heatmap", "/dashboard/enterprise-command-center",
      "/dashboard/one-click-actions", "/dashboard/red-team",
    ]) expect(paths).toContain(legacy)
    expect(TOOL_GROUPS.length).toBeGreaterThan(0)
  })
})
