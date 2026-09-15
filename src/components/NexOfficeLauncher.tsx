import { useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/lib/supabase"

function bridgeError(status: number, code?: string) {
  if (status === 401 || code === "unauthorized") return "Sua sessão expirou. Entre novamente no NexJud e tente de novo."
  if (status === 503 || code === "nexoffice_not_configured" || code === "platform_bridge_not_configured") return "O NexOffice ainda não está configurado neste ambiente."
  if (code === "workspace_access_revoked") return "Seu acesso ao workspace NexOffice foi revogado."
  if (code === "onboarding_required") return "Seu acesso ao escritório ainda precisa ser concluído."
  if (status >= 500) return "O NexOffice está temporariamente indisponível. Tente novamente em instantes."
  return "Não foi possível abrir o NexOffice."
}

export default function NexOfficeLauncher() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const enabled = import.meta.env.VITE_NEXOFFICE_ENABLED === "true"

  useEffect(() => {
    if (!enabled) return
    const client = getSupabaseClient()
    if (!client) return
    client.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [enabled])

  if (!enabled || !user || !session?.access_token) return null

  const openNexOffice = async () => {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const response = await fetch("/api/nexoffice/handoff", {
        method: "POST",
        headers: {
          authorization: `Bearer ${session.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok || !payload?.url) throw Object.assign(new Error("nexoffice_handoff_failed"), { status: response.status, code: payload?.error })
      window.location.assign(String(payload.url))
    } catch (cause: any) {
      setError(bridgeError(Number(cause?.status || 0), String(cause?.code || cause?.message || "")))
      setBusy(false)
    }
  }

  return (
    <div className="fixed bottom-5 left-5 z-[70] flex max-w-[calc(100vw-2.5rem)] flex-col items-start gap-2">
      {error ? <div className="max-w-xs rounded-lg border border-red-500/30 bg-[#17131a] px-3 py-2 text-xs text-red-300 shadow-xl">{error}</div> : null}
      <button
        type="button"
        onClick={openNexOffice}
        disabled={busy}
        className="group flex items-center gap-3 rounded-full border border-indigo-400/30 bg-[#11131d]/95 px-4 py-2.5 text-left text-white shadow-2xl backdrop-blur transition hover:border-indigo-300/60 hover:bg-[#171a28] disabled:cursor-wait disabled:opacity-70"
        aria-label="Abrir NexOffice"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500 font-black text-white">N</span>
        <span>
          <strong className="block text-sm leading-tight">{busy ? "Abrindo NexOffice…" : "NexOffice"}</strong>
          <small className="block text-[10px] text-slate-400">Operação do escritório</small>
        </span>
        <span className="text-indigo-300 transition group-hover:translate-x-0.5">→</span>
      </button>
    </div>
  )
}