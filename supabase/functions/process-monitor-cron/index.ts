import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const jsonHeaders = { "Content-Type": "application/json" }

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "")
}

function detectAlias(cnj: string, fallback = "tjsp") {
  const clean = onlyNumbers(cnj)
  const tribunalCode = clean.slice(13, 16)
  const map: Record<string, string> = {
    "826": "tjsp", "821": "tjrs", "819": "tjrj", "813": "tjmg",
    "815": "tjpb", "804": "tjam", "401": "trf1", "402": "trf2",
    "403": "trf3", "404": "trf4", "405": "trf5", "406": "trf6",
    "502": "trt2", "515": "trt15",
  }
  return map[tribunalCode] || fallback
}

function normalizeMovements(source: any) {
  const movements = source?.movimentos || source?.movimentacoes || source?.movimento || []
  if (!Array.isArray(movements)) return []
  return movements.slice(-20).reverse().map((m: any) => ({
    date: m.dataHora || m.data || m.dtMovimento || null,
    name: m.nome || m.descricao || m.movimentoNacional?.descricao || m.codigoMovimento || "Movimentação",
    complement: m.complementosTabelados || m.complemento || m.texto || "",
  }))
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function fetchDataJud(processNumber: string, apiKey: string) {
  const alias = detectAlias(processNumber)
  const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: onlyNumbers(processNumber) } } }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`DataJud ${response.status}: ${text.slice(0, 500)}`)
  const data = JSON.parse(text)
  const source = data?.hits?.hits?.[0]?._source || null
  return { alias, found: Boolean(source), movements: source ? normalizeMovements(source) : [] }
}

serve(async (req) => {
  const startedAt = Date.now()
  try {
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido" }), { status: 405, headers: jsonHeaders })

    const suppliedSecret = req.headers.get("x-nexjud-secret") || ""
    const expectedSecret = Deno.env.get("NEXJUD_AUTOMATION_SECRET") || ""
    if (!expectedSecret || suppliedSecret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: jsonHeaders })
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const dataJudKey = Deno.env.get("DATAJUD_API_KEY") || ""
    if (!supabaseUrl || !serviceRole) throw new Error("Supabase server credentials ausentes")
    if (!dataJudKey) throw new Error("DATAJUD_API_KEY não configurada")

    const body = await req.json().catch(() => ({}))
    const requestedLimit = Number(body.limit || 60)
    const limit = Math.max(1, Math.min(250, Number.isFinite(requestedLimit) ? requestedLimit : 60))
    const caseId = body.caseId ? String(body.caseId) : null

    const admin = createClient(supabaseUrl, serviceRole)
    let query = admin
      .from("legal_cases")
      .select("id,user_id,title,process_number,status,court")
      .not("process_number", "is", null)
      .neq("process_number", "")
      .limit(limit)

    if (caseId) query = query.eq("id", caseId)
    else query = query.eq("status", "active")

    const { data: cases, error: casesError } = await query
    if (casesError) throw casesError

    const summary: any = {
      ok: true,
      cases_checked: 0,
      cases_found: 0,
      movements_seen: 0,
      new_movements: 0,
      impacts_created: 0,
      deduplicated: 0,
      errors: [],
      duration_ms: 0,
    }

    for (const legalCase of cases || []) {
      summary.cases_checked += 1
      try {
        const processNumber = String(legalCase.process_number || "")
        if (onlyNumbers(processNumber).length !== 20) {
          summary.errors.push({ case_id: legalCase.id, error: "Número CNJ inválido" })
          continue
        }

        const dj = await fetchDataJud(processNumber, dataJudKey)
        if (!dj.found) continue
        summary.cases_found += 1
        summary.movements_seen += dj.movements.length

        const { data: existingEvents, error: existingError } = await admin
          .from("legal_process_movement_events")
          .select("fingerprint")
          .eq("user_id", legalCase.user_id)
          .eq("case_id", legalCase.id)
          .limit(500)
        if (existingError) throw existingError
        const known = new Set((existingEvents || []).map((x: any) => x.fingerprint))

        const fresh: Array<{ movement: any; fingerprint: string }> = []
        for (const movement of dj.movements) {
          const rawFingerprint = JSON.stringify({
            caseId: legalCase.id,
            processNumber,
            date: movement.date || null,
            name: movement.name,
            complement: movement.complement || null,
          })
          const fingerprint = await sha256(rawFingerprint)
          if (!known.has(fingerprint)) fresh.push({ movement, fingerprint })
          else summary.deduplicated += 1
        }

        // Processa do mais antigo para o mais novo para preservar a sequência no Dossiê Vivo.
        fresh.reverse()
        summary.new_movements += fresh.length

        for (const item of fresh) {
          const response = await fetch(`${supabaseUrl}/functions/v1/process-movement-impact`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${serviceRole}`,
              apikey: serviceRole,
              "Content-Type": "application/json",
              "x-nexjud-secret": expectedSecret,
            },
            body: JSON.stringify({
              userId: legalCase.user_id,
              caseId: legalCase.id,
              processNumber,
              movement: item.movement,
              source: "datajud-monitor",
            }),
          })
          const resultText = await response.text()
          if (!response.ok) throw new Error(`process-movement-impact ${response.status}: ${resultText.slice(0, 700)}`)
          const result = JSON.parse(resultText)
          if (result?.deduplicated) summary.deduplicated += 1
          else summary.impacts_created += 1
        }
      } catch (error) {
        summary.errors.push({
          case_id: legalCase.id,
          process_number: legalCase.process_number,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    summary.duration_ms = Date.now() - startedAt
    return new Response(JSON.stringify(summary), { headers: jsonHeaders })
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startedAt,
    }), { status: 400, headers: jsonHeaders })
  }
})
