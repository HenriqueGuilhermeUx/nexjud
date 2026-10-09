import { FormEvent, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getSupabase, signInWithEmail, signOut } from "@/lib/supabase"

type DeletionRequest = {
  id: string
  status: string
  requested_at: string
}

export default function AccountDeletion() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authenticatedEmail, setAuthenticatedEmail] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [request, setRequest] = useState<DeletionRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState("")

  async function loadRequest(userId: string, userEmail: string) {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from("account_deletion_requests")
      .select("id,status,requested_at")
      .eq("user_id", userId)
      .in("status", ["requested", "processing"])
      .order("requested_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    setAuthenticatedEmail(userEmail)
    setEmail(userEmail)
    setRequest(data || null)
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const supabase = getSupabase()
        const { data } = await supabase.auth.getUser()
        if (data.user && mounted) {
          await loadRequest(data.user.id, data.user.email || "")
        }
      } catch {
        // Public page remains usable even when there is no active browser session.
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function authenticate(event: FormEvent) {
    event.preventDefault()
    setMessage("")
    if (!email.trim() || !password) {
      setMessage("Informe o e-mail e a senha da conta NexJud.")
      return
    }

    setWorking(true)
    try {
      const data = await signInWithEmail(email.trim().toLowerCase(), password)
      if (!data.user) throw new Error("Não foi possível confirmar sua conta.")
      await loadRequest(data.user.id, data.user.email || email.trim().toLowerCase())
      setPassword("")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível confirmar sua conta.")
    } finally {
      setWorking(false)
    }
  }

  async function requestDeletion() {
    setMessage("")
    if (confirmation.trim().toUpperCase() !== "EXCLUIR") {
      setMessage('Digite EXCLUIR para confirmar a solicitação.')
      return
    }

    setWorking(true)
    try {
      const supabase = getSupabase()
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError || !authData.user) throw new Error("Sua sessão expirou. Entre novamente.")

      const user = authData.user
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .insert({
          user_id: user.id,
          email: user.email || authenticatedEmail,
          status: "requested",
          metadata: {
            source: "account-deletion-page",
            product: "nexjud",
          },
        })
        .select("id,status,requested_at")
        .single()

      if (error) {
        if (error.code === "23505") {
          await loadRequest(user.id, user.email || authenticatedEmail)
          setMessage("Já existe uma solicitação de exclusão em andamento para esta conta.")
          return
        }
        throw error
      }

      setRequest(data)
      setConfirmation("")
      setMessage("Solicitação recebida. O processo de exclusão da sua conta NexJud foi iniciado.")
      await signOut().catch(() => undefined)
      setAuthenticatedEmail("")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar a solicitação.")
    } finally {
      setWorking(false)
    }
  }

  const requestedAt = request?.requested_at
    ? new Date(request.requested_at).toLocaleString("pt-BR")
    : ""

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white px-5 py-12 md:py-16">
      <article className="max-w-3xl mx-auto space-y-7">
        <Link to="/" className="text-indigo-400 font-semibold">← Voltar ao NexJud</Link>

        <section className="rounded-3xl border border-[#1e293b] bg-[#121218] p-7 md:p-12">
          <p className="text-sm font-bold tracking-widest text-indigo-400">NEXJUD</p>
          <h1 className="text-4xl font-bold mt-2">Excluir conta e dados</h1>
          <p className="text-gray-400 mt-4 leading-7">
            Esta página permite iniciar diretamente a exclusão da sua conta NexJud Workspace e NexJud Companion.
            Não é necessário enviar e-mail ou falar com o suporte para fazer a solicitação.
          </p>
        </section>

        {loading ? (
          <section className="rounded-2xl border border-[#334155] bg-[#0f172a] p-6 text-gray-300">
            Verificando sua sessão...
          </section>
        ) : request ? (
          <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <h2 className="text-xl font-bold text-emerald-300">Solicitação registrada</h2>
            <p className="text-gray-200 mt-3 leading-7">
              A exclusão da conta foi iniciada em {requestedAt || "data registrada pelo sistema"}.
              Status atual: <strong>{request.status === "processing" ? "em processamento" : "solicitada"}</strong>.
            </p>
            <p className="text-gray-400 mt-3 leading-7">
              O processamento pode levar alguns dias para permitir verificações de segurança e o cumprimento
              de obrigações legais de retenção quando aplicáveis. Dados que não precisem ser preservados serão
              excluídos ou anonimizados.
            </p>
          </section>
        ) : authenticatedEmail ? (
          <section className="rounded-2xl border border-red-500/30 bg-[#0f172a] p-6">
            <h2 className="text-xl font-bold">Confirmar exclusão</h2>
            <p className="text-gray-300 mt-3 leading-7">
              Conta confirmada: <strong>{authenticatedEmail}</strong>
            </p>
            <p className="text-gray-300 mt-3 leading-7">
              Esta solicitação inicia a exclusão do perfil, sessões, documentos, casos, conversas, memórias,
              jurisprudências, precedentes e demais dados associados, observadas somente as retenções exigidas
              por lei, prevenção de fraude ou defesa de direitos.
            </p>
            <label className="block text-sm font-semibold text-gray-300 mt-6">
              Digite <strong>EXCLUIR</strong> para confirmar
            </label>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#334155] bg-[#090d16] px-4 py-3 text-white outline-none focus:border-red-400"
              placeholder="EXCLUIR"
              autoCapitalize="characters"
            />
            <button
              type="button"
              disabled={working}
              onClick={requestDeletion}
              className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-bold hover:bg-red-500 disabled:opacity-60"
            >
              {working ? "Registrando..." : "Solicitar exclusão da conta"}
            </button>
          </section>
        ) : (
          <section className="rounded-2xl border border-[#334155] bg-[#0f172a] p-6">
            <h2 className="text-xl font-bold">Confirme sua identidade</h2>
            <p className="text-gray-300 mt-3 leading-7">
              Para evitar exclusões indevidas, entre com o mesmo e-mail e senha da sua conta NexJud.
            </p>
            <form onSubmit={authenticate} className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoCapitalize="none"
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-[#334155] bg-[#090d16] px-4 py-3 text-white outline-none focus:border-indigo-400"
                  placeholder="voce@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-xl border border-[#334155] bg-[#090d16] px-4 py-3 text-white outline-none focus:border-indigo-400"
                  placeholder="Sua senha"
                />
              </div>
              <button
                type="submit"
                disabled={working}
                className="rounded-xl bg-indigo-600 px-5 py-3 font-bold hover:bg-indigo-500 disabled:opacity-60"
              >
                {working ? "Confirmando..." : "Entrar para excluir a conta"}
              </button>
            </form>
          </section>
        )}

        {message ? (
          <div className="rounded-2xl border border-[#334155] bg-[#121218] p-5 text-gray-200">
            {message}
          </div>
        ) : null}

        <section className="rounded-3xl border border-[#1e293b] bg-[#121218] p-7 md:p-10 space-y-5">
          <div>
            <h2 className="text-xl font-bold">O que acontece depois</h2>
            <p className="text-gray-300 leading-7 mt-2">
              A solicitação é vinculada à conta autenticada e entra diretamente no fluxo de exclusão do NexJud.
              Você não precisa encaminhar uma mensagem ao suporte para iniciar o processo.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold">Retenções obrigatórias</h2>
            <p className="text-gray-300 leading-7 mt-2">
              Alguns registros podem ser preservados somente quando houver obrigação legal, necessidade de
              prevenção a fraude ou exercício regular de direitos. Os demais dados serão excluídos ou anonimizados.
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold">Precisa de ajuda?</h2>
            <p className="text-gray-300 leading-7 mt-2">
              O suporte continua disponível em <strong>suporte@nexjud.com.br</strong>, mas o contato com o suporte
              não é necessário para solicitar a exclusão.
            </p>
          </div>
        </section>
      </article>
    </main>
  )
}
