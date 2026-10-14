import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { getSupabase } from "@/lib/supabase"
import { parseImportedCase, type EnterpriseImportedCase } from "@/enterprise/importedCases"

/** Read-only projection of the existing per-user legal_cases RLS view. */
export default function EnterpriseImportedCases({
  organizationId,
  mode,
  refresh,
}: {
  organizationId: string
  mode: "web" | "pwa"
  refresh: boolean
}) {
  const { user } = useAuth()
  const [cases, setCases] = useState<EnterpriseImportedCase[]>([])
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let cancelled = false
    if (!user?.id || !organizationId) {
      setCases([])
      setStatus("ready")
      return () => { cancelled = true }
    }
    setStatus("loading")
    async function load() {
      try {
        const client = getSupabase()
        const { data: identity, error: identityError } = await client.auth.getUser()
        if (identityError || identity.user?.id !== user?.id) throw new Error("invalid session")
        const { data, error } = await client
          .from("legal_cases")
          .select("id,user_id,title,process_number,created_at,metadata")
          .eq("user_id", user.id)
          .contains("metadata", { enterpriseImport: { organizationId } })
          .order("created_at", { ascending: false })
          .limit(30)
        if (error) throw error
        if (!cancelled) {
          setCases((data || [])
            .map(item => parseImportedCase(item, organizationId, user.id))
            .filter((item): item is EnterpriseImportedCase => item !== null))
          setStatus("ready")
        }
      } catch {
        if (!cancelled) { setCases([]); setStatus("error") }
      }
    }
    void load()
    return () => { cancelled = true }
  }, [organizationId, user?.id, refresh])

  return <section className="mt-6 space-y-3 border-t border-slate-700 pt-5" aria-label="Processos importados">
    <h2 className="text-lg font-semibold text-white">Meus processos importados</h2>
    <p className="text-xs text-slate-400">Exibe somente casos vinculados à sua conta e à organização selecionada. Não substitui o registro de auditoria dos lotes.</p>
    {status === "loading" && <p role="status" className="text-sm text-slate-300">Consultando casos vinculados...</p>}
    {status === "error" && <p role="alert" className="text-sm text-amber-300">Não foi possível consultar os casos nesta sessão. Nenhum dado foi alterado.</p>}
    {status === "ready" && cases.length === 0 && <p className="text-sm text-slate-300">Nenhum caso importado encontrado para esta conta.</p>}
    {status === "ready" && cases.map(item =>
      <div key={item.id} className="rounded-xl border border-slate-700 bg-slate-800 p-3">
        <p className="break-all text-sm font-semibold text-white">{item.processNumber || item.title}</p>
        <p className="mt-1 break-all text-xs text-slate-300">{item.sourceSystem} · {item.externalId}</p>
        <Link className="mt-2 inline-block text-sm font-semibold text-indigo-200 underline"
          to={mode === "pwa" ? "/app/caso/" + item.id : "/dashboard/legal-cases"}>
          {mode === "pwa" ? "Abrir caso" : "Ver na carteira jurídica"}
        </Link>
      </div>
    )}
  </section>
}
