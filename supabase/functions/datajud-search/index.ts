import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { requireUser } from "../_shared/requireUser.ts"
import { courtFromCnj, formatCnj, isValidCnj, onlyDigits } from "../_shared/cnj.ts"
import { lookupProcess } from "../_shared/processData.ts"

// Consulta de processo para usuários logados (tela DNA do Juiz e histórico).
// O nome "datajud-search" ficou por compatibilidade com web, PWA e app:
// a fonte principal agora é o Escavador, com o DataJud como reserva.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405, headers: corsHeaders })

  const auth = await requireUser(req, corsHeaders)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json().catch(() => ({}))
    const cnj = onlyDigits(String(body.cnj || ""))
    if (cnj.length !== 20) {
      return Response.json({ error: "Informe um número CNJ de 20 dígitos." }, { status: 400, headers: corsHeaders })
    }
    if (!isValidCnj(cnj)) {
      return Response.json({ error: "Esse número CNJ não é válido. Confira os dígitos." }, { status: 400, headers: corsHeaders })
    }
    const court = courtFromCnj(cnj)
    const alias = court?.alias || String(body.tribunalAlias || "").trim()

    const lookup = await lookupProcess(cnj, { movements: true, includeParties: true, includeMovementText: true })
    console.info("process lookup:", lookup.source, lookup.found ? "found" : lookup.reason, "credits:", lookup.credits)

    if (!lookup.found) {
      if (lookup.reason !== "not_found") {
        return Response.json({ error: "As bases de processos não responderam agora. Tente de novo em alguns minutos.", status: 503, alias }, { status: 503, headers: corsHeaders })
      }
      return Response.json({ success: true, alias, found: false, process: null, total: 0, source: lookup.source }, { headers: corsHeaders })
    }

    const p = lookup.summary
    return Response.json({
      success: true,
      alias,
      found: true,
      total: 1,
      source: lookup.source,
      process: {
        number: formatCnj(p.cnj),
        court: p.court || court?.name || "-",
        courtUnit: p.courtUnit || "-",
        className: p.className || "-",
        subject: p.subjects.join(", ") || "-",
        area: p.area,
        causeValue: p.causeValue,
        filingDate: p.filingDate,
        lastMovementDate: p.lastMovementDate,
        movementsCount: p.movementsCount,
        restricted: p.restricted,
        activeSide: p.activeSide ?? null,
        passiveSide: p.passiveSide ?? null,
        parties: p.parties ?? [],
        sourceUrl: p.sourceUrl ?? null,
        movements: p.recentMovements.map((m) => ({ date: m.date, name: m.name, complement: m.content || "" })),
      },
    }, { headers: corsHeaders })
  } catch (error) {
    console.error("datajud-search", error instanceof Error ? error.message : String(error))
    return Response.json({ error: "Não foi possível concluir a consulta do processo." }, { status: 500, headers: corsHeaders })
  }
})
