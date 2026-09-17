import { useState } from "react"
import { Building2, ExternalLink, Loader2, ShieldCheck } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function NexOfficeAccess() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function openNexOffice() {
    if (!session?.access_token) {
      setError("Sua sessão expirou. Entre novamente no NexJud.")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/nexoffice/handoff", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error || "NexOffice indisponível no momento")
      }
      window.location.assign(payload.url)
    } catch (err: any) {
      setError(err?.message || "Não foi possível abrir o NexOffice")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      <div className="rounded-3xl border border-primary/30 bg-card p-7 lg:p-10 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-primary/10 p-4"><Building2 className="h-8 w-8 text-primary" /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">NexJud + NexOffice</p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">Gestão do escritório integrada</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
              Acesse o NexOffice com sua identidade NexJud. No primeiro acesso, seu workspace é provisionado automaticamente; nos próximos, o mesmo ambiente é reutilizado.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border p-4"><ShieldCheck className="mb-2 h-5 w-5 text-primary" /><b>Mesmo acesso</b><p className="mt-1 text-sm text-muted-foreground">Sem criar outra senha.</p></div>
          <div className="rounded-2xl border border-border p-4"><ShieldCheck className="mb-2 h-5 w-5 text-primary" /><b>Workspace próprio</b><p className="mt-1 text-sm text-muted-foreground">Ambiente isolado para seu escritório.</p></div>
          <div className="rounded-2xl border border-border p-4"><ShieldCheck className="mb-2 h-5 w-5 text-primary" /><b>Produtos conectados</b><p className="mt-1 text-sm text-muted-foreground">NexJud jurídico; NexOffice operacional.</p></div>
        </div>

        {error && <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

        <button
          type="button"
          onClick={openNexOffice}
          disabled={loading}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ExternalLink className="h-5 w-5" />}
          {loading ? "Conectando ao NexOffice..." : "Abrir NexOffice"}
        </button>
      </div>
    </div>
  )
}
