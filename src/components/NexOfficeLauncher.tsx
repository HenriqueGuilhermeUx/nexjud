import { useEffect, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/lib/supabase"
import { useNexOfficeLegalSync } from "@/hooks/useNexOfficeLegalSync"

function bridgeError(status: number, code?: string) {
  if (code === "bridge_auth_configuration_missing") return "A conexão NexOffice está sem a configuração de autenticação no servidor. Contate o suporte (bridge_auth_configuration_missing)."
  if (code === "bridge_token_rejected") return "O servidor não reconheceu a autenticação do NexJud (bridge_token_rejected)."
  if (code === "nexjud_session_refresh_failed") return "Sua sessão do NexJud expirou e não pôde ser renovada. Entre novamente e tente de novo."
  if (code === "nexjud_session_verify_failed") return "Sua sessão do NexJud não pôde ser validada antes de abrir o NexOffice. Entre novamente e tente de novo."
  if (status === 401 || code === "unauthorized") return "Não foi possível autenticar a conexão com o NexOffice. Entre novamente se necessário (401)."
  if (status === 503 || code === "nexoffice_not_configured" || code === "platform_bridge_not_configured") return "O NexOffice ainda não está configurado neste ambiente."
  if (code === "workspace_access_revoked") return "Seu acesso ao workspace NexOffice foi revogado."
  if (code === "onboarding_required") return "Seu acesso ao escritório ainda precisa ser concluído."
  if (status >= 500) return "O NexOffice está temporariamente indisponível. Tente novamente em instantes."
  return `Não foi possível abrir o NexOffice${code ? ` (código: ${code})` : ""}.`
}

export default function NexOfficeLauncher() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [busy, setBusy] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
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

  useNexOfficeLegalSync(session)

  if (!enabled || !user || !session?.access_token) return null

  const openNexOffice = async () => {
    if (busy) return
    setBusy(true)
    setError("")
    try {
      const client = getSupabaseClient()
      if (!client) throw Object.assign(new Error("supabase_not_configured"), { status: 503 })

      // Do not reuse a possibly stale cached JWT for the federated handoff.
      // Force a Supabase refresh first, then verify the fresh token against
      // the same project the NexJud frontend is currently using.
      const { data: refreshed, error: refreshError } = await client.auth.refreshSession()
      if (refreshError || !refreshed.session?.access_token) {
        throw Object.assign(new Error("unauthorized"), { status: 401, code: "nexjud_session_refresh_failed" })
      }

      const accessToken = refreshed.session.access_token
      const { data: verified, error: verifyError } = await client.auth.getUser(accessToken)
      if (verifyError || !verified.user?.id || !verified.user?.email) {
        throw Object.assign(new Error("unauthorized"), { status: 401, code: "nexjud_session_verify_failed" })
      }

      const response = await fetch("/api/nexoffice/handoff", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
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
    <div className="fixed bottom-5 right-5 z-[70] flex max-w-[calc(100vw-2.5rem)] flex-col items-end gap-2">
      {showIntro ? (
        <section role="dialog" aria-modal="false" aria-label="Conheça o NexOffice" className="w-[min(370px,calc(100vw-2.5rem))] rounded-2xl border border-indigo-400/30 bg-[#11131d] p-5 text-white shadow-2xl">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Benefício NexJud</p><h2 className="mt-1 text-xl font-bold">Conheça o NexOffice</h2></div><button type="button" onClick={() => setShowIntro(false)} aria-label="Fechar apresentação" className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10">✕</button></div>
          <p className="mt-3 text-sm leading-6 text-slate-200">O NexOffice é a plataforma para organizar a operação do seu escritório: clientes, tarefas, documentos e rotinas de gestão em um só lugar.</p>
          <p className="mt-3 rounded-xl bg-indigo-500/10 p-3 text-sm text-indigo-100"><strong>Você pode conhecer o NexOffice gratuitamente.</strong> A disponibilidade de recursos adicionais depende das condições apresentadas no próprio NexOffice.</p>
          {error ? <p role="alert" className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100">{error}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={openNexOffice} className="rounded-xl bg-indigo-500 px-4 py-3 text-sm font-bold hover:bg-indigo-400 disabled:opacity-60">{busy ? "Conectando…" : "Acessar NexOffice grátis"}</button><button type="button" onClick={() => setShowIntro(false)} className="rounded-xl border border-white/20 px-4 py-3 text-sm">Agora não</button></div>
          <p className="mt-3 text-xs text-slate-400">O acesso integrado usa sua conta NexJud. Se a conexão estiver indisponível, esta apresentação continuará acessível.</p>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => { setShowIntro((value) => !value); setError("") }}
        disabled={busy}
        className="group flex items-center gap-3 rounded-full border border-indigo-400/30 bg-[#11131d]/95 px-4 py-2.5 text-left text-white shadow-2xl backdrop-blur transition hover:border-indigo-300/60 hover:bg-[#171a28] disabled:cursor-wait disabled:opacity-70"
        aria-label="Conheça o NexOffice e acesse grátis"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-indigo-500 font-black text-white">N</span>
        <span>
          <strong className="block text-sm leading-tight">NexOffice</strong>
          <small className="block text-[10px] text-slate-400">Conheça e acesse grátis</small>
        </span>
        <span className="text-indigo-300 transition group-hover:translate-x-0.5">→</span>
      </button>
    </div>
  )
}
