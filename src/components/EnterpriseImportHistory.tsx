import { useEffect, useState } from "react"
import { getSupabase } from "@/lib/supabase"

type ImportBatch = {
  batchId: string
  idempotencyKey: string
  itemCount: number
  linkedCaseCount: number
  createdAt: string
}
export function normalizeImportHistory(data: unknown): ImportBatch[] | null {
  if (!Array.isArray(data)) return null
  if (data.length > 50) return null
  const results: ImportBatch[] = []
  for (const raw of data) {
    if (!raw || typeof raw !== "object") return null
    const row = raw as Partial<ImportBatch>
    if (typeof row.batchId !== "string" ||
        typeof row.idempotencyKey !== "string" ||
        typeof row.createdAt !== "string" ||
        typeof row.itemCount !== "number" || !Number.isSafeInteger(row.itemCount) || row.itemCount < 0 ||
        typeof row.linkedCaseCount !== "number" || !Number.isSafeInteger(row.linkedCaseCount) ||
        row.linkedCaseCount < 0 || row.linkedCaseCount > row.itemCount) return null
    results.push(row as ImportBatch)
  }
  return results
}

/** Uses a scoped RPC. Never fetches private batch/audit tables directly. */
export default function EnterpriseImportHistory({
  organizationId, refresh,
}: { organizationId: string; refresh: boolean }) {
  const [history, setHistory] = useState<ImportBatch[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading")

  useEffect(() => {
    let active = true
    setHistory([])
    setStatus("loading")
    async function load() {
      try {
        const client = getSupabase()
        const { data: identity, error: identityError } = await client.auth.getUser()
        if (!organizationId || identityError || !identity.user) throw new Error("unauthenticated")
        const { data, error } = await client.rpc("enterprise_import_history", {
          p_organization: organizationId,
          p_limit: 20,
        })
        if (error) throw error
        const normalized = normalizeImportHistory(data)
        if (!normalized) throw new Error("unexpected_history")
        if (active) { setHistory(normalized); setStatus("ready") }
      } catch {
        if (active) { setHistory([]); setStatus("unavailable") }
      }
    }
    void load()
    return () => { active = false }
  }, [organizationId, refresh])

  return <section className="mt-6 border-t border-slate-700 pt-5" aria-label="Histórico dos meus lotes">
    <h2 className="text-lg font-semibold text-white">Histórico dos meus lotes</h2>
    <p className="mt-1 text-xs text-slate-400">
      Apenas importações feitas por você nesta organização. O registro permanece
      mesmo que um processo seja excluído.
    </p>
    {status === "loading" && <p role="status" className="mt-3 text-sm text-slate-300">Buscando lotes...</p>}
    {status === "unavailable" && <p role="status" className="mt-3 text-sm text-amber-300">
      Histórico ainda indisponível neste ambiente. Nenhum lote foi alterado.
    </p>}
    {status === "ready" && !history.length && <p className="mt-3 text-sm text-slate-300">
      Nenhum lote registrado por sua conta nesta organização.
    </p>}
    {status === "ready" && history.length > 0 && <div className="mt-3 space-y-2">
      {history.map(batch => <article key={batch.batchId} className="rounded-xl border border-slate-700 bg-slate-800 p-3 text-sm">
        <p className="break-all font-semibold text-white">{batch.idempotencyKey}</p>
        <p className="mt-1 text-slate-300">
          {batch.itemCount} processo(s) no lote · {batch.linkedCaseCount} ainda vinculado(s)
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {new Date(batch.createdAt).toLocaleString("pt-BR")}
        </p>
      </article>)}
    </div>}
  </section>
}
