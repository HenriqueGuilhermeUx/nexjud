import { FormEvent, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Loader2, Search } from "lucide-react"
import { getSupabase } from "@/lib/supabase"

type LookupResult = {
  cnj: string
  court: { alias: string; name: string }
  found: boolean
  restricted?: boolean
  message?: string
  source: string
  process?: {
    courtUnit: string | null
    className: string | null
    subjects: string[]
    instance: string | null
    filingDate: string | null
    lastUpdate: string | null
    movementsCount: number
    recentMovements: { date: string | null; name: string }[]
  }
}

export const PENDING_CNJ_KEY = "nexjud_pending_cnj"

export function maskCnj(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 20)
  const parts = [d.slice(0, 7), d.slice(7, 9), d.slice(9, 13), d.slice(13, 14), d.slice(14, 16), d.slice(16, 20)]
  let out = parts[0]
  if (parts[1]) out += `-${parts[1]}`
  if (parts[2]) out += `.${parts[2]}`
  if (parts[3]) out += `.${parts[3]}`
  if (parts[4]) out += `.${parts[4]}`
  if (parts[5]) out += `.${parts[5]}`
  return out
}

function date(value: string | null | undefined) {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("pt-BR")
}

export default function FreeProcessLookup({ ctaTo = "/login" }: { ctaTo?: string }) {
  const [cnj, setCnj] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<LookupResult | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError("")
    setResult(null)
    if (cnj.replace(/\D/g, "").length !== 20) {
      setError("Informe o número do processo com 20 dígitos (padrão CNJ).")
      return
    }
    const client = getSupabase()
    if (!client) {
      setError("Consulta indisponível no momento.")
      return
    }
    setLoading(true)
    try {
      const { data, error: invokeError } = await client.functions.invoke("public-process-lookup", { body: { cnj } })
      if (invokeError) {
        // supabase-js devolve o corpo da resposta de erro em invokeError.context
        let message = "Não foi possível consultar agora. Tente de novo em instantes."
        try {
          const payload = await (invokeError as { context?: Response }).context?.json()
          if (payload?.error) message = payload.error
        } catch {
          // mantém a mensagem padrão
        }
        setError(message)
        return
      }
      setResult(data as LookupResult)
      try { localStorage.setItem(PENDING_CNJ_KEY, maskCnj(cnj)) } catch { /* armazenamento indisponível */ }
    } finally {
      setLoading(false)
    }
  }

  const process = result?.process

  return (
    <div className="max-w-3xl mx-auto text-left">
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3">
        <label htmlFor="free-cnj" className="sr-only">Número do processo</label>
        <input
          id="free-cnj"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0000000-00.0000.0.00.0000"
          value={cnj}
          onChange={(event) => setCnj(maskCnj(event.target.value))}
          className="flex-1 rounded-xl border border-[#334155] bg-[#0b1020] px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6366f1] px-6 py-3 font-semibold text-white hover:bg-[#5558e3] disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Consultar grátis
        </button>
      </form>
      <p className="mt-2 text-xs text-gray-500">Sem cadastro. Dados públicos do DataJud (CNJ). Não exibimos nomes das partes.</p>

      {error && <p role="alert" className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</p>}

      {result && (
        <div className="mt-6 rounded-2xl border border-[#1f2937] bg-[#0f0f14] p-6">
          <p className="text-xs uppercase tracking-widest text-[#22d3ee]">{result.court.name} · {result.cnj}</p>

          {!result.found && <p className="mt-3 text-gray-300">{result.message}</p>}
          {result.found && result.restricted && <p className="mt-3 text-gray-300">{result.message}</p>}

          {process && (
            <>
              <h3 className="mt-2 text-xl font-bold text-white">{process.courtUnit || "Órgão julgador não informado"}</h3>
              <dl className="mt-4 grid sm:grid-cols-2 gap-4 text-sm">
                <div><dt className="text-gray-500">Classe</dt><dd className="text-white">{process.className || "—"}</dd></div>
                <div><dt className="text-gray-500">Assuntos</dt><dd className="text-white">{process.subjects.length ? process.subjects.join(", ") : "—"}</dd></div>
                <div><dt className="text-gray-500">Ajuizado em</dt><dd className="text-white">{date(process.filingDate)}</dd></div>
                <div><dt className="text-gray-500">Movimentações registradas</dt><dd className="text-white">{process.movementsCount}</dd></div>
              </dl>
              {process.recentMovements.length > 0 && (
                <div className="mt-5">
                  <p className="text-sm font-semibold text-white">Últimas movimentações</p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-300">
                    {process.recentMovements.slice(0, 5).map((movement, index) => (
                      <li key={`${movement.date}-${index}`}><span className="text-gray-500">{date(movement.date)}</span> · {movement.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {result.found && !result.restricted && (
            <div className="mt-6 rounded-xl border border-[#6366f1]/40 bg-[#6366f1]/10 p-4">
              <p className="text-sm text-gray-200">
                No DNA do Juiz você vê como este juízo tem fundamentado casos parecidos, com as decisões citadas, e monta a estratégia do caso.
              </p>
              <Link to={ctaTo} className="mt-3 inline-flex items-center gap-2 font-semibold text-white hover:underline">
                Abrir o DNA do Juiz deste processo · 7 dias grátis <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
          <p className="mt-4 text-xs text-gray-500">Fonte: {result.source}. Os dados vêm como o tribunal registrou; confira no sistema do tribunal antes de agir.</p>
        </div>
      )}
    </div>
  )
}
