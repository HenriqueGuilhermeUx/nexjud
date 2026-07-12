import { useEffect, useMemo, useState } from "react"
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  FileSearch,
  Gavel,
  Landmark,
  Loader2,
  MessageSquare,
  Plus,
  Scale,
  Send,
  Sparkles,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  createChatSession,
  getChatSessions,
  getChatMessages,
  saveChatMessage,
  updateChatSession,
  runLegalChatAi,
} from "@/services/aiWorkspaceService"

type ContextUsed = Record<string, unknown>

type SourceItem = {
  key: string
  label: string
  count: number
  icon: typeof Database
}

function numberFromContext(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (Array.isArray(value)) return value.length
  return 0
}

function buildSourceItems(context: ContextUsed | null | undefined): SourceItem[] {
  if (!context) return []

  const candidates: SourceItem[] = [
    {
      key: "documents",
      label: "Documentos",
      count: numberFromContext(context.documents),
      icon: FileSearch,
    },
    {
      key: "knowledge",
      label: "Knowledge Base",
      count: Math.max(
        numberFromContext(context.knowledge),
        numberFromContext(context.chunks),
        numberFromContext(context.semanticChunks)
      ),
      icon: Database,
    },
    {
      key: "jurisprudence",
      label: "Jurisprudência",
      count: numberFromContext(context.jurisprudence),
      icon: Scale,
    },
    {
      key: "precedents",
      label: "Precedentes",
      count: numberFromContext(context.precedents),
      icon: Landmark,
    },
    {
      key: "cnj",
      label: "Processos CNJ",
      count: Math.max(
        numberFromContext(context.cnj),
        numberFromContext(context.cnjProcesses)
      ),
      icon: Gavel,
    },
    {
      key: "memory",
      label: "Memória Jurídica",
      count: numberFromContext(context.memory),
      icon: Brain,
    },
    {
      key: "cases",
      label: "Casos",
      count: numberFromContext(context.cases),
      icon: MessageSquare,
    },
    {
      key: "chat",
      label: "Histórico do chat",
      count: Math.max(
        numberFromContext(context.messages),
        numberFromContext(context.chatMessages)
      ),
      icon: MessageSquare,
    },
  ]

  return candidates.filter((item) => item.count > 0)
}

function inferResponseMode(content: string) {
  const normalized = content.toLowerCase()

  if (
    normalized.includes("resposta objetiva") ||
    normalized.includes("fundamento documental") ||
    normalized.includes("trecho ou cláusula")
  ) {
    return "Document Review"
  }

  if (
    normalized.includes("litigation chess") ||
    normalized.includes("victory plan") ||
    normalized.includes("deal breaker")
  ) {
    return "Estratégia Processual"
  }

  if (
    normalized.includes("precedente") ||
    normalized.includes("jurisprudência") ||
    normalized.includes("fundamentação jurídica")
  ) {
    return "Pesquisa Jurídica"
  }

  return "Consulta Jurídica"
}

function modeClass(mode: string) {
  if (mode === "Document Review") {
    return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
  }

  if (mode === "Estratégia Processual") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300"
  }

  if (mode === "Pesquisa Jurídica") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300"
  }

  return "border-primary/30 bg-primary/10 text-primary"
}

function AssistantMessage({ message }: { message: any }) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const mode = useMemo(() => inferResponseMode(message.content || ""), [message.content])
  const sources = useMemo(
    () => buildSourceItems(message.context_used || message.contextUsed),
    [message.context_used, message.contextUsed]
  )

  return (
    <div className="rounded-2xl border border-white/5 bg-black/20 p-5 mr-0 lg:mr-10 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain size={17} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">NexJud AI</p>
            <p className="text-[11px] text-muted-foreground">Legal Brain 2.0</p>
          </div>
        </div>

        <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${modeClass(mode)}`}>
          {mode}
        </span>
      </div>

      <div className="whitespace-pre-wrap text-gray-200 leading-7 text-[15px]">
        {message.content}
      </div>

      <div className="mt-5 pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={() => setSourcesOpen((value) => !value)}
          className="w-full flex items-center justify-between gap-3 text-left"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span className="text-sm font-semibold text-foreground">
              Evidências e fontes consideradas
            </span>
            <span className="text-xs text-muted-foreground">
              {sources.length > 0 ? `${sources.length} fontes` : "contexto não informado"}
            </span>
          </div>

          {sourcesOpen ? (
            <ChevronUp size={17} className="text-muted-foreground" />
          ) : (
            <ChevronDown size={17} className="text-muted-foreground" />
          )}
        </button>

        {sourcesOpen && (
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-4">
            {sources.length === 0 ? (
              <div className="sm:col-span-2 xl:col-span-4 rounded-xl border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                Esta mensagem foi salva antes do registro visual das fontes ou a Edge Function não retornou o objeto contextUsed.
              </div>
            ) : (
              sources.map((source) => {
                const Icon = source.icon

                return (
                  <div
                    key={source.key}
                    className="rounded-xl border border-border bg-background/40 p-3 flex items-center gap-3"
                  >
                    <Icon size={17} className="text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{source.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {source.count} item(ns) considerado(s)
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}

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
                Converse com o Legal Brain usando documentos, casos, jurisprudência,
                precedentes, CNJ e memória jurídica.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-5">
            {["Document Review", "Consulta Jurídica", "Pesquisa Jurídica", "Estratégia Processual"].map(
              (mode) => (
                <span
                  key={mode}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-gray-300"
                >
                  {mode}
                </span>
              )
            )}
          </div>
        </section>

        <section className="grid lg:grid-cols-[300px_1fr] gap-6">
          <aside className="rounded-2xl border border-border bg-card p-4 h-fit lg:sticky lg:top-6">
            <button
              onClick={newChat}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              Novo chat
            </button>

            <div className="mt-5 space-y-3 max-h-[650px] overflow-y-auto pr-1">
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

          <main className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="border-b border-border p-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-xl">
                  {activeSession?.title || "Novo chat jurídico"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  A resposta informa o modo de análise e permite conferir as fontes consideradas.
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

            <div className="p-5 min-h-[520px] max-h-[680px] overflow-y-auto space-y-4">
              {messages.length === 0 ? (
                <div className="h-[480px] flex items-center justify-center text-center text-muted-foreground">
                  <div>
                    <Brain className="mx-auto mb-4 text-primary" size={44} />
                    <p className="font-bold text-foreground text-xl">Comece uma conversa jurídica.</p>
                    <p className="mt-2 max-w-md">
                      Pergunte sobre documentos, fundamentos, precedentes, processo CNJ,
                      riscos ou estratégia.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((msg) =>
                  msg.role === "user" ? (
                    <div
                      key={msg.id}
                      className="rounded-2xl p-4 border bg-primary/10 border-primary/20 ml-6 lg:ml-16"
                    >
                      <p className="text-xs font-bold text-muted-foreground mb-2">Você</p>
                      <p className="whitespace-pre-wrap text-gray-200 leading-7">{msg.content}</p>
                    </div>
                  ) : (
                    <AssistantMessage key={msg.id} message={msg} />
                  )
                )
              )}

              {loading && (
                <div className="rounded-2xl p-5 border bg-black/20 border-white/5 mr-0 lg:mr-10">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="animate-spin text-primary" size={20} />
                    <div>
                      <p className="font-semibold text-foreground">Construindo a análise jurídica...</p>
                      <p className="text-xs mt-1">
                        Consultando documentos, Knowledge Base, jurisprudência, precedentes,
                        CNJ e memória.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border p-5 bg-background/30">
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Digite sua pergunta jurídica..."
                  className="flex-1 min-h-[82px] rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary resize-y"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                />

                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  aria-label="Enviar pergunta jurídica"
                  className="px-6 rounded-xl bg-primary text-white font-bold flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Send />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Enter envia · Shift + Enter cria uma nova linha · Revise a resposta antes de uso profissional.
              </p>
            </div>
          </main>
        </section>
      </div>
    </div>
  )
}
