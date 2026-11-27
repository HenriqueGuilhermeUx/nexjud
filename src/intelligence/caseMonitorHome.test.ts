import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { NEXJUD_PROMISE, PRIMARY_DOORS } from "../navigation/toolCatalog"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

describe("monitor de processos, resumo por e-mail e nova home", () => {
  const monitor = read("../../supabase/functions/case-monitor/index.ts")

  it("o monitor exige segredo, usa o DJEN e só usa o Escavador (pago) para assinantes", () => {
    expect(monitor).toContain('Deno.env.get("MONITOR_CRON_SECRET")')
    expect(monitor).toContain("djenByProcess(")
    expect(monitor).toContain("payingUsers.has(c.user_id)")
    expect(monitor).toContain('frequencia: "SEMANAL"')
    expect(monitor).toContain("MAX_MONITORED_PER_USER = 100")
  })

  it("na primeira verificação não inunda o usuário com o histórico", () => {
    expect(monitor).toContain("3 * 86_400_000")
    expect(monitor).toContain("firstRun")
  })

  it("o e-mail não promete resultado e manda confirmar prazos no tribunal", () => {
    expect(monitor).toContain("confirme sempre no sistema do tribunal")
    expect(monitor).toContain("não prevê nem garante resultados")
    expect(monitor).toContain("Idempotency-Key")
  })

  it("o webhook do Escavador exige token e só marca casos para nova leitura", () => {
    const hook = read("../../supabase/functions/escavador-webhook/index.ts")
    expect(hook).toContain("ESCAVADOR_WEBHOOK_TOKEN")
    expect(hook).toContain("escavador_pending: true")
  })

  it("o agendador da Netlify chama o monitor de hora em hora e o resumo às 7h", () => {
    const schedule = read("../../netlify/functions/monitor-schedule.mjs")
    expect(schedule).toContain("schedule: '@hourly'")
    expect(schedule).toContain("hour === 10")
  })

  it("a OAB importa os processos para 'Meus processos'", () => {
    const oab = read("../../supabase/functions/setup-oab/index.ts")
    expect(oab).toContain("async function importCases(")
    expect(oab).toContain('from("legal_cases").insert(rows)')
  })

  it("home com três portas e a mensagem nova em web, PWA e app", () => {
    expect(PRIMARY_DOORS.map((d) => d.label)).toEqual(["Meus processos", "Estratégia do caso", "Escrever peça"])
    expect(NEXJUD_PROMISE.headline).toContain("conhece o seu processo e o seu juiz")
    expect(read("../App.tsx")).toContain("<Route index element={<MyProcesses />} />")
    expect(read("../pages/Landing.tsx")).toContain("o seu processo e o seu juiz.")
    expect(read("../pages/CompanionPWA.tsx")).toContain("MEUS PROCESSOS")
    expect(read("../../mobile/App.tsx")).toContain("MEUS PROCESSOS")
  })

  it("a consulta grátis mostra só contagens do juízo, nunca nomes", () => {
    const fn = read("../../supabase/functions/public-process-lookup/index.ts")
    expect(fn).toContain("judgeTeaser")
    expect(fn).toContain("decisions: decisions.length, outcomes: outcomeCounts(decisions)")
  })
})
