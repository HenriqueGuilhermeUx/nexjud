import { useState } from "react"
import { Building2, ExternalLink, Loader2, ShieldCheck, LockKeyhole } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { usePlan } from "@/hooks/usePlan"

export default function NexOfficeAccess() {
  const { session } = useAuth()
  const { subscription, isInternal, loading: planLoading } = usePlan()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // NexOffice is included at no additional charge for paying NexJud customers.
  // Internal NexJud accounts keep access for controlled validation/support.
  // A trial by itself does not activate NexOffice.
  const paidNexJudCustomer = Boolean(
    subscription?.active && subscription?.status === "active" && subscription?.plan !== "trial"
  )
  const eligible = isInternal || paidNexJudCustomer

  async function openNexOffice() {
    if (!eligible) return
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
            <h1 className="mt-2 text-3xl font-bold text-foreground">NexOffice incluído no seu NexJud</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
              Clientes pagantes NexJud podem ativar e usar o NexOffice sem assinatura ou cobrança adicional. No primeiro acesso, seu workspace é provisionado automaticamente; depois, o mesmo ambiente é reutilizado.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border p-4"><ShieldCheck className="mb-2 h-5 w-5 text-primary" /><b>Incluído no NexJud</b><p className="mt-1 text-sm text-muted-foreground">Sem cobrança NexOffice separada.</p></div>
          <div className="rounded-2xl border border-border p-4"><ShieldCheck className="mb-2 h-5 w-5 text-primary" /><b>Mesmo acesso</b><p className="mt-1 text-sm text-muted-foreground">Sem criar outra senha.</p></div>
          <div className="rounded-2xl border border-border p-4"><ShieldCheck className="mb-2 h-5 w-5 text-primary" /><b>Workspace próprio</b><p className="mt-1 text-sm text-muted-foreground">Ambiente isolado para seu escritório.</p></div>
        </div>

        {!planLoading && !eligible && (
          <div className="mt-6 flex gap-3 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            <LockKeyhole className="h-5 w-5 shrink-0 text-primary" />
            <div><b className="text-foreground">Disponível após ativação do plano NexJud.</b><p className="mt-1">Seu trial NexJud continua normalmente. O NexOffice é liberado sem custo adicional quando sua assinatura NexJud estiver ativa.</p></div>
          </div>
        )}

        {error && <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

        <button
          type="button"
          onClick={openNexOffice}
          disabled={loading || planLoading || !eligible}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading || planLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : eligible ? <ExternalLink className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
          {planLoading ? "Verificando seu plano..." : loading ? "Ativando NexOffice..." : eligible ? "Ativar / Abrir NexOffice" : "NexOffice incluído nos planos pagos"}
        </button>
      </div>
    </div>
  )
}
