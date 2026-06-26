import { useEffect, useState } from "react"
import { Brain, Loader2, Plus, Send, MessageSquare, Sparkles } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  createChatSession,
  getChatSessions,
  getChatMessages,
  saveChatMessage,
  updateChatSession,
  runLegalChatAi,
} from "@/services/aiWorkspaceService"

export default function LegalChat() {
  const { user } = useAuth()

  const [sessions, setSessions] = useState<any[]>([])
  const [activeSession, setActiveSession] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [user])

  async function loadSessions() {
    if (!user?.id) return

    setLoadingSessions(true)

    try {
      const data = await getChatSessions(user.id)
      setSessions(data || [])

      if (data?.length && !activeSession) {
        await openSession(data[0])
      }
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar chats.")
    } finally {
      setLoadingSessions(false)
    }
  }

  async function openSession(session: any) {
    if (!user?.id) return

    setActiveSession(session)

    try {
      const data = await getChatMessages(session.id, user.id)
      setMessages(data || [])
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar mensagens.")
    }
  }

  async function newChat() {
    if (!user?.id) return

    try {
      const session = await createChatSession({
        user_id: user.id,
        title: "Novo chat jurídico",
      })

      setSessions((prev) => [session, ...prev])
      setActiveSession(session)
      setMessages([])
    } catch (error) {
      console.error(error)
      alert("Erro ao criar chat.")
    }
  }

  async function sendMessage() {
    if (!user?.id) {
      alert("Faça login novamente.")
      return
    }

    const text = input.trim()

    if (!text) return

    setLoading(true)
    setInput("")

    try {
      let session = activeSession

      if (!session) {
        session = await createChatSession({
          user_id: user.id,
          title: text.slice(0, 60),
        })

        setActiveSession(session)
        setSessions((prev) => [session, ...prev])
      }

      const userMessage = await saveChatMessage({
        user_id: user.id,
        session_id: session.id,
        role: "user",
        content: text,
      })

      setMessages((prev) => [...prev, userMessage])

      const ai = await runLegalChatAi({
        userId: user.id,
        sessionId: session.id,
        message: text,
        caseId: session.case_id,
      })

      const assistantMessage = await saveChatMessage({
        user_id: user.id,
        session_id: session.id,
        role: "assistant",
        content: ai.answer,
        context_used: ai.contextUsed || {},
      })

      setMessages((prev) => [...prev, assistantMessage])

      await updateChatSession(session.id, {
        title: session.title === "Novo chat jurídico" ? text.slice(0, 60) : session.title,
        summary: ai.answer.slice(0, 240),
      })

      await loadSessions()
    } catch (error: any) {
      console.error(error)
      alert(error.message || "Erro ao enviar mensagem.")
    } finally {
      setLoading(false)
    }
  }

  function loadExample() {
    setInput(
      "Tenho uma ação contra banco por descontos indevidos. Quais documentos preciso reunir, quais riscos existem e qual seria a melhor estratégia?"
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-primary" size={44} />
            <div>
              <h1 className="text-4xl font-bold">Chat Jurídico Contextual™</h1>
              <p className="text-muted-foreground mt-1">
                Converse com a IA usando documentos, casos, histórico e memória jurídica.
              </p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[320px_1fr] gap-6">
          <aside className="rounded-2xl border border-border bg-card p-4 h-fit">
            <button
              onClick={newChat}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Novo chat
            </button>

            <div className="mt-5 space-y-3">
              {loadingSessions ? (
                <p className="text-muted-foreground text-sm">Carregando chats...</p>
              ) : sessions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum chat ainda.</p>
              ) : (
                sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => openSession(session)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      activeSession?.id === session.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-black/10 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare size={16} className="text-primary shrink-0" />
                      <p className="font-semibold truncate">{session.title}</p>
                    </div>
                    {session.summary && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {session.summary}
                      </p>
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          <main className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border p-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-xl">
                  {activeSession?.title || "Novo chat jurídico"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  A IA consulta Knowledge Base, Memória Jurídica e histórico do chat.
                </p>
              </div>

              <button
                onClick={loadExample}
                className="px-4 py-2 rounded-xl bg-[#171721] border border-border font-semibold flex items-center gap-2"
              >
                <Sparkles size={16} />
                Exemplo
              </button>
            </div>

            <div className="p-5 min-h-[520px] max-h-[620px] overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="h-[480px] flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <Brain className="mx-auto mb-4 text-primary" size={44} />
                    <p className="font-bold text-foreground text-xl">Comece uma conversa jurídica.</p>
                    <p className="mt-2 max-w-md">
                      Pergunte sobre estratégia, documentos, riscos, cliente, processo ou minuta.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl p-4 border ${
                      msg.role === "user"
                        ? "bg-primary/10 border-primary/20 ml-12"
                        : "bg-black/20 border-white/5 mr-12"
                    }`}
                  >
                    <p className="text-xs font-bold text-muted-foreground mb-2">
                      {msg.role === "user" ? "Você" : "NexJud AI"}
                    </p>
                    <p className="whitespace-pre-line text-gray-200">{msg.content}</p>
                  </div>
                ))
              )}

              {loading && (
                <div className="rounded-2xl p-4 border bg-black/20 border-white/5 mr-12 flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="animate-spin" size={18} />
                  A IA está consultando contexto, memória e documentos...
                </div>
              )}
            </div>

            <div className="border-t border-border p-5">
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua pergunta jurídica..."
                  className="flex-1 min-h-[70px] rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                />

                <button
                  onClick={sendMessage}
                  disabled={loading}
                  className="px-6 rounded-xl bg-primary text-white font-bold flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Send />}
                </button>
              </div>
            </div>
          </main>
        </section>
      </div>
    </div>
  )
}
