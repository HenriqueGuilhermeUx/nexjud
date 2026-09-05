import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const auth = req.headers.get("Authorization") || ""
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Não autenticado")

    const { caseId, outcomeId } = await req.json()
    if (!caseId) throw new Error("caseId obrigatório")

    const [{ data: legalCase }, { data: outcomes }, { data: dossier }] = await Promise.all([
      supabase.from("legal_cases").select("*").eq("id", caseId).eq("user_id", user.id).single(),
      supabase
        .from("legal_case_outcomes")
        .select("*")
        .eq("user_id", user.id)
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("legal_case_dossiers")
        .select("*")
        .eq("user_id", user.id)
        .eq("case_id", caseId)
        .maybeSingle(),
    ])

    if (!legalCase) throw new Error("Caso não encontrado")

    const target = outcomeId
      ? (outcomes || []).find((x: any) => x.id === outcomeId)
      : (outcomes || [])[0]

    if (!target) throw new Error("Nenhum resultado registrado para aprender")

    const { data: existingMemory, error: existingError } = await supabase
      .from("legal_strategic_memories")
      .select("*")
      .eq("user_id", user.id)
      .eq("source_outcome_id", target.id)
      .maybeSingle()

    if (existingError) throw existingError

    if (existingMemory) {
      return new Response(JSON.stringify({ memory: existingMemory, reused: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const key = Deno.env.get("OPENAI_API_KEY")

    let learned: any = {
      area: legalCase.area || legalCase.case_type || "",
      issue: (dossier?.legal_issues || [])[0] || "",
      situation: dossier?.executive_summary || legalCase.summary || "",
      strategy: dossier?.strategy?.thesis || target.recommendation || "",
      action_taken: target.action_taken || "",
      result_status: target.result_status || "",
      result_summary: target.outcome || "",
      lesson: target.outcome
        ? `Resultado registrado: ${target.outcome}`
        : "Resultado ainda sem descrição suficiente",
      confidence_score: 40,
      reusable: false,
    }

    if (key) {
      const prompt = `Extraia aprendizado jurídico-operacional reutilizável deste caso SEM transformar correlação em regra jurídica. Diferencie claramente resultado observado de causalidade. Nunca invente fatos, precedentes ou probabilidades. Se o resultado não permitir aprendizado confiável, marque reusable=false. Retorne JSON estrito: area, issue, situation, strategy, action_taken, result_status, result_summary, lesson, confidence_score (0-100), reusable boolean. CASO=${JSON.stringify(legalCase)} DOSSIÊ=${JSON.stringify(dossier || {}).slice(0, 50000)} RESULTADO=${JSON.stringify(target)}`

      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content:
                "Você cria memória estratégica jurídica conservadora e auditável. Um resultado favorável não prova que uma estratégia causou o resultado.",
            },
            { role: "user", content: prompt },
          ],
        }),
      })

      if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`)

      const ai = await r.json()
      learned = JSON.parse(ai.choices?.[0]?.message?.content || "{}")
    }

    const payload = {
      user_id: user.id,
      case_id: caseId,
      area: learned.area || null,
      issue: learned.issue || null,
      situation: learned.situation || null,
      strategy: learned.strategy || null,
      action_taken: learned.action_taken || null,
      result_status: learned.result_status || null,
      result_summary: learned.result_summary || null,
      lesson: learned.lesson || "Aprendizado insuficiente",
      confidence_score: learned.confidence_score || 0,
      reusable: learned.reusable === true,
      source_outcome_id: target.id,
      metadata: { generated_by: "outcome-learning-ai" },
    }

    const { data: memory, error } = await supabase
      .from("legal_strategic_memories")
      .upsert(payload, { onConflict: "source_outcome_id" })
      .select()
      .single()

    if (error) throw error

    await supabase
      .from("legal_case_outcomes")
      .update({ learned_lesson: learned.lesson || null })
      .eq("id", target.id)
      .eq("user_id", user.id)

    return new Response(JSON.stringify({ memory, reused: false }), {
      headers: { ...cors, "Content-Type": "application/json" },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
