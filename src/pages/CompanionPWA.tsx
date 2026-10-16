import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import {
  ArrowLeft, ArrowRight, Bell, Brain, Briefcase, CalendarDays, Camera,
  CheckCircle2, ChevronRight, CircleAlert, Clock3, FilePlus2, FileSearch,
  FileText, Gavel, Home, ListTodo, LogOut, Scale, Search, Send, ShieldCheck,
  Sparkles, Upload, User, WandSparkles, X, Download
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { getSupabase } from "@/lib/supabase"
import { paidEntitlementCurrent } from "@/services/paidEntitlement"

const colors = {
  bg: "#080A10",
  card: "#111521",
  cardAlt: "#171C2B",
  border: "#293147",
  primary: "#4F7CFF",
  primarySoft: "#17254A",
  text: "#F8FAFC",
  muted: "#94A3B8",
  success: "#19C37D",
  warning: "#F59E0B",
  danger: "#EF4444",
}

type AgendaItem = {
  id: string
  title: string
  date: string
  type: "prazo" | "audiencia" | "tarefa"
  done?: boolean
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const quickPrompts = [
  "Explique esta decisão e indique os próximos passos.",
  "Quais são os riscos e fragilidades deste caso?",
  "Pesquise jurisprudência favorável sobre este tema.",
  "Prepare perguntas para a próxima audiência.",
  "Crie a estrutura de uma contestação.",
  "Resuma os documentos e identifique provas faltantes.",
]

function ShellCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={"rounded-[20px] border p-4 " + className} style={{ background: colors.card, borderColor: colors.border }}>{children}</div>
}

function ScreenTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return <div>
    <p className="text-[12px] font-extrabold tracking-[0.13em]" style={{ color: colors.primary }}>{eyebrow}</p>
    <h1 className="mt-1 text-[30px] font-extrabold leading-tight tracking-[-0.03em]" style={{ color: colors.text }}>{title}</h1>
    {subtitle ? <p className="mt-2 text-[15px] leading-6" style={{ color: colors.muted }}>{subtitle}</p> : null}
  </div>
}

function Loader({ label }: { label: string }) {
  return <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3" style={{ color: colors.text }}>
    <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/20" style={{ borderTopColor: colors.primary }} />
    <p className="text-sm" style={{ color: colors.muted }}>{label}</p>
  </div>
}

function PrimaryButton({ children, onClick, disabled = false, secondary = false, className = "" }: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  secondary?: boolean
  className?: string
}) {
  return <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={"min-h-[50px] rounded-[15px] px-4 font-extrabold flex items-center justify-center gap-2 disabled:opacity-50 " + className}
    style={secondary ? { background: colors.primarySoft, color: colors.primary, border: "1px solid " + colors.primary } : { background: colors.primary, color: "#fff" }}
  >{children}</button>
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="rounded-[18px] border border-dashed p-7 text-center" style={{ borderColor: colors.border }}>
    <p className="font-bold" style={{ color: colors.text }}>{title}</p>
    <p className="mt-2 text-sm leading-5" style={{ color: colors.muted }}>{text}</p>
  </div>
}

function Metric({ value, label, icon }: { value: React.ReactNode; label: string; icon: React.ReactNode }) {
  return <ShellCard className="flex-1 min-w-0 !p-3">
    <div className="mb-2">{icon}</div>
    <p className="text-[22px] font-extrabold truncate" style={{ color: colors.text }}>{value}</p>
    <p className="text-[11px]" style={{ color: colors.muted }}>{label}</p>
  </ShellCard>
}

function CompanionLogin() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError("Informe e-mail e senha.")
      return
    }
    setBusy(true)
    setError("")
    try {
      await signInWithEmail(email.trim().toLowerCase(), password)
    } catch (err: any) {
      setError(err?.message || "Não foi possível entrar.")
    } finally {
      setBusy(false)
    }
  }

  return <div className="nexjud-pwa-screen min-h-screen flex items-center justify-center px-6" style={{ background: colors.bg }}>
    <form onSubmit={submit} className="w-full max-w-md space-y-4">
      <img src="/icons/icon-512.png" alt="NexJud" className="h-[72px] w-[72px] rounded-[22px]" />
      <div>
        <h1 className="text-3xl font-extrabold" style={{ color: colors.text }}>NexJud Companion</h1>
        <p className="mt-2 text-base" style={{ color: colors.muted }}>Seu escritório no bolso, conectado ao NexJud Workspace.</p>
      </div>
      <input className="nexjud-pwa-input w-full rounded-[15px] border px-4 py-3.5" style={{ background: colors.card, borderColor: colors.border, color: colors.text }} placeholder="E-mail" inputMode="email" autoCapitalize="none" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
      <input className="nexjud-pwa-input w-full rounded-[15px] border px-4 py-3.5" style={{ background: colors.card, borderColor: colors.border, color: colors.text }} placeholder="Senha" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
      {error ? <p className="text-sm" style={{ color: colors.danger }}>{error}</p> : null}
      <button disabled={busy} className="min-h-[50px] w-full rounded-[15px] font-extrabold disabled:opacity-50" style={{ background: colors.primary, color: "#fff" }}>{busy ? "Entrando..." : "Entrar"}</button>
      <button type="button" onClick={() => window.dispatchEvent(new Event("nexjud:open-install"))} className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[15px] border px-4 py-3 font-extrabold" style={{ background: colors.primarySoft, borderColor: colors.primary, color: colors.text }}><Download size={20} /> Instalar aplicativo NexJud</button>
      <Link to="/login" className="block py-2 text-center text-sm font-bold" style={{ color: colors.primary }}>Criar conta</Link>
      <div className="flex items-center gap-2 text-sm" style={{ color: colors.muted }}><ShieldCheck size={18} style={{ color: colors.success }} /> Mesma conta, casos, documentos e análises da NexJud.</div>
    </form>
  </div>
}

function BottomNav({ section, navigate }: { section: string; navigate: (path: string) => void }) {
  const tabs = [
    ["home", "/app", Home, "Início"],
    ["ia", "/app/ia", Brain, "IA"],
    ["casos", "/app/casos", Briefcase, "Casos"],
    ["agenda", "/app/agenda", CalendarDays, "Agenda"],
    ["perfil", "/app/perfil", User, "Perfil"],
  ] as const
  // Secondary screens stay inside the same mobile app shell.
  const activeSection = ["caso", "audiencia"].includes(section) ? "casos"
    : ["scanner", "analise", "studio", "ferramentas"].includes(section) ? "home"
    : section

  return <nav aria-label="Navegação principal do NexJud" className="nexjud-pwa-tabbar fixed inset-x-0 bottom-0 z-40 border-t" style={{ borderColor: colors.border }}>
    <div className="mx-auto grid max-w-xl grid-cols-5">
      {tabs.map(([key, path, Icon, label]) => {
        const active = activeSection === key
        return <button type="button" key={key} aria-label={label} aria-current={active ? "page" : undefined}
          onClick={() => navigate(path)} className="nexjud-pwa-tab min-h-[64px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold"
          style={{ color: active ? colors.primary : colors.muted }}>
          <span className="nexjud-pwa-tabicon"><Icon size={21} strokeWidth={active ? 2.5 : 2} /></span>
          <span>{label}</span>
        </button>
      })}
    </div>
  </nav>
}

function InstallHint() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)
  const [android, setAndroid] = useState(false)
  const [inAppBrowser, setInAppBrowser] = useState(false)
  const [manual, setManual] = useState(false)

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
    if (standalone) return

    const ua = navigator.userAgent
    const isIos = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
    const isAndroid = /Android/i.test(ua)
    setIos(isIos)
    setAndroid(isAndroid)
    setInAppBrowser(/Instagram|FBAN|FBAV|FB_IAB|WhatsApp/i.test(ua))

    try {
      if ((isIos || isAndroid) && localStorage.getItem("nexjud-pwa-install-dismissed-v3") !== "1") setVisible(true)
    } catch { if (isIos || isAndroid) setVisible(true) }
    const forceOpen = () => { setVisible(true); setManual(false) }
    window.addEventListener("nexjud:open-install", forceOpen)
    const handler = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => {
      window.removeEventListener("nexjud:open-install", forceOpen)
      window.removeEventListener("beforeinstallprompt", handler)
    }
  }, [])

  function dismiss() {
    setVisible(false)
    try { localStorage.setItem("nexjud-pwa-install-dismissed-v3", "1") } catch { /* private browsing */ }
    setManual(false)
  }

  async function install() {
    if (!deferred) { setManual(true); return }
    try {
      await deferred.prompt()
      const decision = await deferred.userChoice
      setDeferred(null)
      if (decision.outcome === "accepted") setVisible(false)
      else setManual(true)
    } catch { setDeferred(null); setManual(true) }
  }

  if (!visible) return null

  const guidance = inAppBrowser
    ? "Abra este endereço no Chrome ou Safari, fora de WhatsApp e Instagram, e use o menu do navegador para instalar."
    : ios ? "No Safari, toque em Compartilhar (quadrado com seta para cima), depois Adicionar à Tela de Início e Adicionar."
    : android ? "No Chrome, abra o menu ⋮ e toque em Instalar aplicativo ou Adicionar à tela inicial. O aviso automático nem sempre aparece."
    : "No Chrome ou Edge, abra o menu e procure Instalar NexJud ou Instalar este site como aplicativo."

  return <div className="fixed left-3 right-3 z-50 mx-auto max-w-xl rounded-[20px] border p-4 shadow-2xl nexjud-pwa-install" style={{ background: colors.cardAlt, borderColor: colors.border, color: colors.text }}>
    <div className="flex gap-3">
      <img src="/icons/icon-512.png" alt="" className="h-12 w-12 rounded-[14px]" />
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">Instalar NexJud Companion</p>
        <p className="mt-1 text-sm leading-5" style={{ color: colors.muted }}>Use o NexJud em tela cheia pela tela inicial do celular.</p>
        {(manual || ios || inAppBrowser) ? <p className="mt-3 rounded-xl p-3 text-sm leading-6" style={{ background: colors.bg, color: colors.text }}>{guidance}</p> : null}
        <button type="button" onClick={install} className="mt-3 flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold" style={{ background: colors.primary, color: "#fff" }}><Download size={17} /> {deferred ? "Instalar agora" : "Como instalar"}</button>
      </div>
      <button onClick={dismiss} aria-label="Fechar" className="h-9 w-9 flex items-center justify-center" style={{ color: colors.muted }}><X size={19} /></button>
    </div>
  </div>
}

function HomeScreenPWA({ userId, navigate }: { userId: string; navigate: (path: string) => void }) {
  const [profile, setProfile] = useState<any>(null)
  const [cases, setCases] = useState<any[]>([])
  const [counts, setCounts] = useState({ docs: 0, chats: 0, cnj: 0 })
  const [agenda, setAgenda] = useState<AgendaItem[]>([])
  const [processNumber, setProcessNumber] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setRefreshing(true)
    try {
      const client = getSupabase()
      const [p, c, d, h, n] = await Promise.all([
        client.from("profiles").select("*").eq("id", userId).maybeSingle(),
        client.from("legal_cases").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(5),
        client.from("knowledge_documents").select("id", { count: "exact", head: true }).eq("user_id", userId),
        client.from("chat_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
        client.from("cnj_processes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ])
      setProfile(p.data)
      setCases(c.data || [])
      setCounts({ docs: d.count || 0, chats: h.count || 0, cnj: n.count || 0 })
      const raw = localStorage.getItem("nexjud-agenda-" + userId)
      setAgenda(raw ? JSON.parse(raw) : [])
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [userId])
  const firstName = (profile?.name || profile?.full_name || "Advogado").split(" ")[0]
  const today = new Date().toISOString().slice(0, 10)
  const todayItems = agenda.filter(i => i.date === today && !i.done)

  const actions = [
    ["Analisar documento", "Foto, PDF ou DOCX", FileSearch, "/app/scanner"],
    ["Fortalecer uma peça", "Rascunho e argumentos", FilePlus2, "/app/studio"],
    ["Treinar argumentos", "Prepare audiência e sustentação", Gavel, "/app/audiencia"],
    ["Perguntar à IA", "Legal Brain contextual", Brain, "/app/ia"],
    ["Consultar casos", "Dossiês e estratégia", Briefcase, "/app/casos"],
    ["Preparar minuta", "Peças e documentos com IA", WandSparkles, "/app/studio"],
    ["Ferramentas avançadas", "Análise e estratégia completas", Sparkles, "/app/ferramentas"],
  ] as const

  return <div className="space-y-5">
    <button type="button" onClick={() => window.dispatchEvent(new Event("nexjud:open-install"))} className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold" style={{ background: colors.primarySoft, borderColor: colors.primary, color: colors.text }}><Download size={19} /> Instalar NexJud como aplicativo</button>
    <div className="flex items-start gap-3">
      <div className="flex-1"><p className="text-[12px] font-extrabold tracking-[0.13em]" style={{ color: colors.primary }}>NEXJUD · INTELIGÊNCIA DECISÓRIA</p><h1 className="mt-1 text-[30px] font-extrabold" style={{ color: colors.text }}>Olá, {firstName}.</h1></div>
      <button onClick={() => navigate("/app/agenda")} className="h-11 w-11 rounded-2xl border flex items-center justify-center" style={{ background: colors.card, borderColor: colors.border, color: colors.text }}><Bell size={21} /></button>
    </div>

    <ShellCard>
      <div className="flex items-center gap-2"><Scale size={21} style={{ color: colors.primary }} /><p className="font-bold" style={{ color: colors.text }}>Como este juízo costuma decidir casos como o seu?</p></div>
      <p className="mt-3 text-[15px] leading-6" style={{ color: colors.text }}>Compare seu processo com decisões públicas encontradas e veja evidências, pontos de atenção e caminhos para fortalecer sua estratégia.</p>
      <input className="nexjud-pwa-input mt-4 w-full rounded-[15px] border px-4 py-3.5" style={{ background: colors.cardAlt, borderColor: colors.border, color: colors.text }} placeholder="Digite ou cole o número CNJ" value={processNumber} onChange={e => setProcessNumber(e.target.value)} />
      <PrimaryButton className="mt-3 w-full" onClick={() => processNumber.trim() && navigate("/app/analise?cnj=" + encodeURIComponent(processNumber.trim()))}><Search size={18} /> ANALISAR PROCESSO</PrimaryButton>
      <p className="mt-3 text-xs leading-5" style={{ color: colors.muted }}>A NexJud analisa padrões observados em decisões públicas. Não prevê nem garante o resultado do processo.</p>
    </ShellCard>

    <div>
      <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold" style={{ color: colors.text }}>O que você quer fazer agora?</h2><button onClick={load} className="text-xs font-bold" style={{ color: colors.primary }}>{refreshing ? "Atualizando..." : "Atualizar"}</button></div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {actions.map(([title, subtitle, Icon, path]) => <button key={title} onClick={() => navigate(path)} className="min-h-[145px] rounded-[20px] border p-4 text-left active:scale-[0.98] transition-transform" style={{ background: colors.card, borderColor: colors.border }}>
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px]" style={{ background: colors.primarySoft, color: colors.primary }}><Icon size={24} /></span>
          <span className="block font-bold" style={{ color: colors.text }}>{title}</span>
          <span className="mt-1 block text-xs leading-5" style={{ color: colors.muted }}>{subtitle}</span>
        </button>)}
      </div>
    </div>

    <div>
      <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold" style={{ color: colors.text }}>Sua atividade</h2><button onClick={() => navigate("/app/agenda")} className="text-sm font-bold" style={{ color: colors.primary }}>Ver agenda</button></div>
      <div className="mt-3 flex gap-2">
        <Metric value={counts.cnj} label="Processos" icon={<Scale size={18} style={{ color: colors.primary }} />} />
        <Metric value={counts.docs} label="Documentos" icon={<FileText size={18} style={{ color: colors.primary }} />} />
        <Metric value={todayItems.length} label="Hoje" icon={<CalendarDays size={18} style={{ color: colors.primary }} />} />
      </div>
    </div>

    <div>
      <div className="flex items-center justify-between"><h2 className="text-lg font-extrabold" style={{ color: colors.text }}>Casos recentes</h2><button onClick={() => navigate("/app/casos")} className="text-sm font-bold" style={{ color: colors.primary }}>Ver todos</button></div>
      <div className="mt-3 space-y-2.5">
        {cases.length ? cases.map(item => <CaseRow key={item.id} item={item} onClick={() => navigate("/app/caso/" + item.id)} />) : <Empty title="Comece pela análise de um processo" text="Informe o número CNJ acima. Seus casos e documentos continuarão disponíveis aqui." />}
      </div>
    </div>
  </div>
}

function CaseRow({ item, onClick }: { item: any; onClick: () => void }) {
  return <button onClick={onClick} className="w-full rounded-[18px] border p-4 text-left flex items-center gap-3" style={{ background: colors.card, borderColor: colors.border }}>
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px]" style={{ background: colors.primarySoft, color: colors.primary }}><Briefcase size={20} /></span>
    <span className="min-w-0 flex-1"><span className="block truncate font-bold" style={{ color: colors.text }}>{item.title || item.client_name || "Caso jurídico"}</span><span className="mt-1 block truncate text-xs" style={{ color: colors.muted }}>{item.process_number || item.court || item.client_name || "Processo em acompanhamento"}</span></span>
    <ChevronRight size={19} style={{ color: colors.muted }} />
  </button>
}

function ChatScreenPWA({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [caseId, setCaseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState("")
  async function loadSessions() {
    const { data, error } = await getSupabase().from("chat_sessions").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(30)
    if (error) setHistoryError("Não foi possível recuperar suas conversas.")
    else { setSessions(data || []); setHistoryError("") }
  }
  async function openSession(id: string) {
    setSessionId(id)
    const { data, error } = await getSupabase().from("chat_messages").select("*").eq("user_id", userId).eq("session_id", id).order("created_at", { ascending: true })
    if (error) setHistoryError("Falha ao abrir a conversa.")
    else { setMessages(data || []); setHistoryError("") }
  }
  useEffect(() => { loadSessions() }, [userId])


  useEffect(() => {
    getSupabase().from("legal_cases").select("id,title,client_name,process_number").eq("user_id", userId).order("updated_at", { ascending: false }).limit(20).then(({ data }) => setCases(data || []))
  }, [userId])

  useEffect(() => {
    const seed = sessionStorage.getItem("nexjud-pwa-seed")
    if (seed) {
      sessionStorage.removeItem("nexjud-pwa-seed")
      setTimeout(() => send(seed), 100)
    }
  }, [])

  async function send(text = message) {
    const prompt = text.trim()
    if (!prompt || loading) return
    setMessages(prev => [...prev, { role: "user", content: prompt }])
    setMessage("")
    setLoading(true)
    try {
      const client = getSupabase()
      let id = sessionId
      if (!id) {
        const created = await client.from("chat_sessions").insert({ user_id: userId, title: prompt.slice(0, 60) }).select().single()
        if (created.error) throw created.error
        id = created.data.id
        setSessionId(id)
      }
      const saved = await client.from("chat_messages").insert({ user_id: userId, session_id: id, role: "user", content: prompt })
      if (saved.error) throw saved.error
      const { data, error } = await client.functions.invoke("legal-chat-ai", { body: { userId, sessionId: id, message: prompt, caseId } })
      if (error || data?.error) throw error || new Error(data.error)
      const answer = data?.answer || data?.response || data?.message
      if (!answer) throw new Error("A IA não retornou uma resposta válida.")
      const savedAnswer = await client.from("chat_messages").insert({ user_id: userId, session_id: id, role: "assistant", content: answer, context_used: data?.contextUsed || data?.context || {} }).select().single()
      if (savedAnswer.error) throw savedAnswer.error
      setMessages(prev => [...prev, savedAnswer.data])
      await client.from("chat_sessions").update({ updated_at: new Date().toISOString(), summary: String(answer).slice(0, 240) }).eq("id", id).eq("user_id", userId)
      await loadSessions()
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: "Não foi possível consultar o Legal Brain agora: " + (err?.message || "tente novamente.") }])
    } finally {
      setLoading(false)
    }
  }

  return <div className="flex min-h-[calc(100dvh-150px)] flex-col gap-3">
    <div className="flex gap-2 overflow-x-auto pb-2">
      <button className="shrink-0 rounded-xl border px-3 py-2 text-sm font-bold" style={{borderColor:colors.primary,color:colors.text}} onClick={() => { setSessionId(null); setMessages([]) }}>+ Nova conversa</button>
      {sessions.map(item => <button key={item.id} onClick={() => openSession(item.id)} className="max-w-[180px] truncate shrink-0 rounded-xl border px-3 py-2 text-xs" style={{borderColor:sessionId===item.id?colors.primary:colors.border,color:colors.text}}>{item.title || "Conversa"}</button>)}
    </div>
    {historyError ? <p role="alert" style={{color:colors.danger}}>{historyError}</p> : null}
    <ScreenTitle eyebrow="LEGAL BRAIN" title="Pergunte. Analise. Decida." subtitle="Use o contexto do caso, seus documentos e as fontes jurídicas do NexJud." />
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button className="shrink-0 rounded-full border px-3 py-2 text-xs font-bold" onClick={() => setCaseId(null)} style={{ borderColor: !caseId ? colors.primary : colors.border, background: !caseId ? colors.primarySoft : colors.card, color: colors.text }}>Sem caso</button>
      {cases.map(c => <button key={c.id} className="max-w-[190px] shrink-0 truncate rounded-full border px-3 py-2 text-xs font-bold" onClick={() => setCaseId(c.id)} style={{ borderColor: caseId === c.id ? colors.primary : colors.border, background: caseId === c.id ? colors.primarySoft : colors.card, color: colors.text }}>{c.title || c.client_name || c.process_number || "Caso"}</button>)}
    </div>
    <div className="flex-1 overflow-y-auto space-y-2 pb-2">
      {!messages.length ? <div className="space-y-2"><h2 className="font-extrabold" style={{ color: colors.text }}>Sugestões inteligentes</h2>{quickPrompts.map(p => <button key={p} onClick={() => send(p)} className="w-full rounded-[16px] border p-3 text-left flex items-center gap-2" style={{ background: colors.card, borderColor: colors.border, color: colors.text }}><Sparkles size={18} style={{ color: colors.primary }} /><span className="flex-1 text-sm">{p}</span><ArrowRight size={18} style={{ color: colors.muted }} /></button>)}</div> : messages.map((m, i) => <div key={i} className={"max-w-[90%] rounded-[17px] p-3 text-sm leading-6 " + (m.role === "user" ? "ml-auto" : "mr-auto border")} style={m.role === "user" ? { background: colors.primary, color: "#fff" } : { background: colors.card, borderColor: colors.border, color: colors.text }}>{m.content}{m.context ? <p className="mt-2 text-[11px]" style={{ color: colors.muted }}>Fontes e contexto considerados pelo Legal Brain.</p> : null}</div>)}
      {loading ? <p className="text-sm" style={{ color: colors.muted }}>Consultando documentos, casos e fontes...</p> : null}
    </div>
    <div className="sticky bottom-[66px] flex items-end gap-2 rounded-[18px] border p-2" style={{ background: colors.card, borderColor: colors.border }}>
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Pergunte ao Legal Brain..." className="nexjud-pwa-input min-h-[44px] max-h-28 flex-1 resize-none bg-transparent px-2 py-2 outline-none" style={{ color: colors.text }} />
      <button onClick={() => send()} className="h-11 w-11 shrink-0 rounded-[14px] flex items-center justify-center" style={{ background: colors.primary, color: "#fff" }}><Send size={20} /></button>
    </div>
  </div>
}

function CasesScreenPWA({ userId, navigate }: { userId: string; navigate: (path: string) => void }) {
  const [cases, setCases] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSupabase().from("legal_cases").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).then(({ data }) => {
      setCases(data || [])
      setLoading(false)
    })
  }, [userId])

  const filtered = useMemo(() => cases.filter(c => JSON.stringify(c).toLowerCase().includes(query.toLowerCase())), [cases, query])
  if (loading) return <Loader label="Carregando casos..." />

  return <div className="space-y-4">
    <ScreenTitle eyebrow="CARTEIRA JURÍDICA" title="Casos" subtitle="Processos, estratégia, documentos e próximas ações em um só lugar." />
    <div className="flex items-center gap-2 rounded-[15px] border px-3" style={{ background: colors.card, borderColor: colors.border }}><Search size={19} style={{ color: colors.muted }} /><input className="nexjud-pwa-input w-full bg-transparent py-3.5 outline-none" style={{ color: colors.text }} placeholder="Cliente, processo, tribunal ou assunto" value={query} onChange={e => setQuery(e.target.value)} /></div>
    <div className="space-y-2.5">{filtered.length ? filtered.map(item => <CaseRow key={item.id} item={item} onClick={() => navigate("/app/caso/" + item.id)} />) : <Empty title="Nenhum caso encontrado" text="Revise sua busca ou cadastre um caso no Workspace." />}</div>
  </div>
}

function AgendaScreenPWA({ userId }: { userId: string }) {
  const storageKey = "nexjud-agenda-" + userId
  const [items, setItems] = useState<AgendaItem[]>([])
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [type, setType] = useState<AgendaItem["type"]>("tarefa")

  useEffect(() => {
    const raw = localStorage.getItem(storageKey)
    setItems(raw ? JSON.parse(raw) : [])
  }, [storageKey])

  function save(next: AgendaItem[]) {
    setItems(next)
    localStorage.setItem(storageKey, JSON.stringify(next))
  }

  function add() {
    if (!title.trim()) return
    save([{ id: String(Date.now()), title: title.trim(), date, type }, ...items])
    setTitle("")
  }

  return <div className="space-y-4">
    <ScreenTitle eyebrow="AGENDA JURÍDICA" title="Prazos, audiências e tarefas" subtitle="Organize o dia e vincule cada compromisso à sua rotina jurídica." />
    <ShellCard>
      <input className="nexjud-pwa-input w-full rounded-[15px] border px-4 py-3.5" style={{ background: colors.cardAlt, borderColor: colors.border, color: colors.text }} placeholder="Novo compromisso" value={title} onChange={e => setTitle(e.target.value)} />
      <input className="nexjud-pwa-input mt-3 w-full rounded-[15px] border px-4 py-3.5" style={{ background: colors.cardAlt, borderColor: colors.border, color: colors.text }} type="date" value={date} onChange={e => setDate(e.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">{(["tarefa", "prazo", "audiencia"] as const).map(t => <button key={t} onClick={() => setType(t)} className="rounded-full border px-3 py-2 text-xs font-bold capitalize" style={{ borderColor: type === t ? colors.primary : colors.border, background: type === t ? colors.primarySoft : colors.card, color: colors.text }}>{t}</button>)}</div>
      <PrimaryButton className="mt-3 w-full" onClick={add}>Adicionar</PrimaryButton>
    </ShellCard>
    <div className="space-y-2.5">{items.length ? [...items].sort((a, b) => a.date.localeCompare(b.date)).map(i => <button key={i.id} onClick={() => save(items.map(x => x.id === i.id ? { ...x, done: !x.done } : x))} className="w-full rounded-[16px] border p-3 flex items-center gap-3 text-left" style={{ background: colors.card, borderColor: colors.border, opacity: i.done ? .5 : 1 }}>
      {i.type === "prazo" ? <Clock3 size={20} style={{ color: colors.warning }} /> : i.type === "audiencia" ? <Gavel size={20} style={{ color: colors.primary }} /> : <ListTodo size={20} style={{ color: colors.success }} />}
      <span className="flex-1"><span className="block text-sm" style={{ color: colors.text }}>{i.title}</span><span className="mt-1 block text-xs" style={{ color: colors.muted }}>{i.date} · {i.type}</span></span>
      <CheckCircle2 size={21} style={{ color: i.done ? colors.success : colors.muted }} />
    </button>) : <Empty title="Agenda vazia" text="Adicione prazos, audiências e tarefas. A automação CNJ será conectada depois pelo n8n." />}</div>
  </div>
}

const advancedWorkspaceTools = [
  { title: "Análise do Juízo completa", description: "Evidências, amostra, auditoria e revisão das decisões", path: "/dashboard/decision-intelligence" },
  { title: "Legal Intelligence", description: "Análise jurídica ampliada, conforme seu plano", path: "/dashboard/legal-intelligence-engine" },
  { title: "Red Team", description: "Teste teses, argumentos e fragilidades", path: "/dashboard/red-team" },
  { title: "Carteira processual", description: "Acompanhe processos e dossiês", path: "/dashboard/process-portfolio" },
  { title: "Histórico das análises", description: "Consulte os registros que você decidiu salvar", path: "/dashboard/history" },
  { title: "Estratégia de litígio", description: "Recursos empresariais sujeitos ao plano", path: "/dashboard/litigation-strategy" },
] as const

function AdvancedToolsPWA() {
  return <div className="space-y-4">
    <Back />
    <ScreenTitle eyebrow="WORKSPACE NEXJUD" title="Ferramentas avançadas" subtitle="Abra as capacidades completas da NexJud sem perder seus casos e documentos. O acesso respeita seu plano e suas permissões." />
    <div className="space-y-2">{advancedWorkspaceTools.map(tool => (
      <Link key={tool.path} to={tool.path} className="flex items-center gap-3 rounded-[18px] border p-4" style={{ background: colors.card, borderColor: colors.border }}>
        <Sparkles size={22} style={{ color: colors.primary }} />
        <span className="flex-1"><span className="block font-bold" style={{ color: colors.text }}>{tool.title}</span><span className="mt-1 block text-xs leading-5" style={{ color: colors.muted }}>{tool.description}</span></span>
        <ChevronRight size={19} style={{ color: colors.muted }} />
      </Link>
    ))}</div>
    <p className="text-xs leading-5" style={{ color: colors.muted }}>Estas ferramentas abrem o Workspace completo dentro do navegador/PWA. Análises do DataJud não substituem o inteiro teor de decisões judiciais.</p>
  </div>
}

function ProfileScreenPWA({ userId }: { userId: string }) {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [subscription, setSubscription] = useState<{ plan?: string; status?: string; active?: boolean; trial_end?: string | null; current_period_end?: string | null } | null>(null)
  const [subscriptionError, setSubscriptionError] = useState(false)
  const reloadPlan = async () => {
    const { data, error } = await getSupabase().from("subscriptions")
      .select("plan,status,active,trial_end,current_period_end").eq("user_id", userId).maybeSingle()
    setSubscription(data)
    setSubscriptionError(Boolean(error))
  }
  useEffect(() => {
    getSupabase().from("profiles").select("*").eq("id", userId).maybeSingle().then(({ data }) => setProfile(data))
    void reloadPlan()
  }, [userId])
  const paidActive = paidEntitlementCurrent(subscription)
  const trialActive = subscription?.status === "trialing" && subscription.active === true
    && Boolean(subscription.trial_end && Date.parse(subscription.trial_end) > Date.now())
  const planLabels: Record<string, string> = {
    trial: "Teste gratuito", pro: "Pro", intelligence: "Intelligence",
    enterprise: "Enterprise", enterprise_plus: "Enterprise Plus",
  }
  const statusLabel = subscriptionError ? "Falha ao consultar assinatura"
    : paidActive ? "Plano ativo" : trialActive ? "Teste gratuito ativo"
    : subscription ? "Acesso não ativo ou vencido" : "Assinatura não encontrada"

  const menu = [
    ["Abrir Workspace", "/dashboard"],
    ["Ferramentas avançadas", "/app/ferramentas"],
    ["Gerenciar assinatura", "/pricing"],
    ["Política de Privacidade", "/privacy"],
    ["Termos de Uso", "/terms"],
    ["Excluir conta e dados", "/account-deletion"],
    ["Suporte", "/support"],
  ]

  return <div className="space-y-4">
    <img src="/icons/icon-512.png" alt="NexJud" className="h-16 w-16 rounded-[22px]" />
    <div><h1 className="text-[30px] font-extrabold" style={{ color: colors.text }}>{profile?.name || profile?.full_name || "Minha conta"}</h1><p className="mt-1 text-base" style={{ color: colors.muted }}>{user?.email}</p></div>
    <ShellCard className="flex items-center gap-3"><CheckCircle2 size={21} style={{ color: colors.success }} /><div><p className="font-bold" style={{ color: colors.text }}>NexJud sincronizado</p><p className="text-xs" style={{ color: colors.muted }}>Workspace e Companion compartilham conta e dados.</p></div></ShellCard>
    <ShellCard><div className="flex items-center gap-2"><ShieldCheck size={20} style={{ color: paidActive || trialActive ? colors.success : colors.warning }} /><p className="font-bold" style={{ color: colors.text }}>Sua assinatura</p></div><p className="mt-2 text-sm" style={{ color: colors.text }}>{subscription ? (planLabels[subscription.plan || ""] || subscription.plan || "Plano") : "NexJud"} · {statusLabel}</p>{paidActive && subscription?.current_period_end ? <p className="mt-1 text-xs" style={{ color: colors.muted }}>Acesso pago até {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}</p> : null}{paidActive && !subscription?.current_period_end ? <p className="mt-1 text-xs" style={{ color: colors.muted }}>Plano legado sem vencimento informado; nenhuma alteração automática.</p> : null}{subscription?.status === "trialing" && subscription.trial_end ? <p className="mt-1 text-xs" style={{ color: colors.muted }}>Fim do teste: {new Date(subscription.trial_end).toLocaleDateString("pt-BR")}</p> : null}<button onClick={() => void reloadPlan()} className="mt-3 rounded-xl border px-3 py-2 text-xs font-bold" style={{ color: colors.primary, borderColor: colors.border }}>Atualizar situação</button></ShellCard>
    <button type="button" onClick={() => window.dispatchEvent(new Event("nexjud:open-install"))} className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[15px] border p-3 font-extrabold" style={{ background: colors.primarySoft, borderColor: colors.primary, color: colors.text }}><Download size={19} /> Instalar aplicativo NexJud</button>
    <div className="space-y-2">{menu.map(([label, href]) => <Link key={label} to={href} className="rounded-[15px] border p-4 flex items-center justify-between" style={{ background: colors.card, borderColor: colors.border, color: label.startsWith("Excluir") ? colors.danger : colors.text }}><span>{label}</span><ChevronRight size={20} /></Link>)}</div>
    <button onClick={() => signOut()} className="w-full p-4 flex items-center justify-center gap-2 font-extrabold" style={{ color: colors.danger }}><LogOut size={20} /> Sair da conta</button>
    <p className="text-center text-xs leading-5" style={{ color: colors.muted }}>NexJud Companion · Apoio tecnológico ao profissional do Direito.</p>
  </div>
}

function ScannerScreenPWA({ userId }: { userId: string }) {
  const [uploading, setUploading] = useState(false)
  const [cases, setCases] = useState<any[]>([])
  const [caseId, setCaseId] = useState<string | null>(null)
  const [status, setStatus] = useState("")
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getSupabase().from("legal_cases").select("id,title,client_name,process_number").eq("user_id", userId).limit(20).then(({ data }) => setCases(data || []))
  }, [userId])

  async function upload(file: File) {
    setUploading(true)
    setStatus("")
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
      const path = userId + "/mobile/" + Date.now() + "-" + safe
      const client = getSupabase()
      const { error } = await client.storage.from("knowledge-files").upload(path, file, { contentType: file.type || "application/octet-stream" })
      if (error) throw error
      const payload: any = { user_id: userId, title: file.name, document_type: "mobile_upload", file_path: path, content: "Documento enviado pelo Companion. Aguardando processamento.", processing_status: "pending" }
      if (caseId) payload.case_id = caseId
      const inserted = await client.from("knowledge_documents").insert(payload)
      if (inserted.error) throw inserted.error
      setStatus("Documento recebido. Ele já está sincronizado com o Workspace e pronto para o processamento jurídico.")
    } catch (err: any) {
      setStatus("Erro no envio: " + (err?.message || "tente novamente."))
    } finally {
      setUploading(false)
    }
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) upload(file)
    event.target.value = ""
  }

  return <div className="space-y-4">
    <Back />
    <ScreenTitle eyebrow="LEGAL LENS" title="Scanner inteligente" subtitle="Capture um documento e leve-o diretamente ao caso, ao Dossiê Vivo e ao Legal Brain." />
    <div className="flex gap-2 overflow-x-auto pb-1">
      <button className="shrink-0 rounded-full border px-3 py-2 text-xs font-bold" onClick={() => setCaseId(null)} style={{ borderColor: !caseId ? colors.primary : colors.border, background: !caseId ? colors.primarySoft : colors.card, color: colors.text }}>Knowledge Base</button>
      {cases.map(c => <button key={c.id} className="max-w-[190px] shrink-0 truncate rounded-full border px-3 py-2 text-xs font-bold" onClick={() => setCaseId(c.id)} style={{ borderColor: caseId === c.id ? colors.primary : colors.border, background: caseId === c.id ? colors.primarySoft : colors.card, color: colors.text }}>{c.title || c.client_name || c.process_number || "Caso"}</button>)}
    </div>
    <ShellCard><Camera size={38} style={{ color: colors.primary }} /><h2 className="mt-3 font-bold" style={{ color: colors.text }}>Fotografar documento</h2><p className="mt-2 text-sm leading-6" style={{ color: colors.text }}>Despacho, sentença, contrato, ata, intimação ou prova física.</p><PrimaryButton className="mt-4 w-full" onClick={() => cameraRef.current?.click()} disabled={uploading}>Abrir câmera</PrimaryButton><input ref={cameraRef} hidden type="file" accept="image/*" capture="environment" onChange={onPick} /></ShellCard>
    <ShellCard><Upload size={38} style={{ color: colors.primary }} /><h2 className="mt-3 font-bold" style={{ color: colors.text }}>Importar arquivo</h2><p className="mt-2 text-sm leading-6" style={{ color: colors.text }}>PDF, DOCX ou imagem armazenada no aparelho.</p><PrimaryButton secondary className="mt-4 w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>Selecionar arquivo</PrimaryButton><input ref={fileRef} hidden type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*" onChange={onPick} /></ShellCard>
    {uploading ? <p className="text-sm" style={{ color: colors.muted }}>Enviando com segurança...</p> : null}
    {status ? <ShellCard className="flex items-start gap-2"><WandSparkles size={22} style={{ color: status.startsWith("Erro") ? colors.danger : colors.primary }} /><p className="text-sm leading-6" style={{ color: colors.text }}>{status}</p></ShellCard> : null}
  </div>
}

function AnalysisScreenPWA() {
  const location = useLocation()
  const initial = new URLSearchParams(location.search).get("cnj") || ""
  const [cnj, setCnj] = useState(initial)
  const [thesis, setThesis] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [errorText, setErrorText] = useState("")

  async function analyze() {
    if (!cnj.trim()) return
    setLoading(true)
    setErrorText("")
    setResult(null)
    try {
      const { data, error } = await getSupabase().functions.invoke("decision-intelligence", { body: { cnj: cnj.trim(), argument: thesis.trim() || undefined, source: "pwa" } })
      if (error) throw error
      setResult(data)
    } catch (err: any) {
      setErrorText(err?.message || "Não foi possível concluir a análise agora.")
    } finally {
      setLoading(false)
    }
  }

  const sample = result?.decisionsAnalyzed ?? result?.sampledCases ?? result?.evidence?.length ?? 0
  const found = result?.totalFound ?? result?.decisionsFound ?? sample
  const favorable = Array.isArray(result?.adherences) ? result.adherences : Array.isArray(result?.strengths) ? result.strengths : []
  const attention = Array.isArray(result?.divergences) ? result.divergences : Array.isArray(result?.risks) ? result.risks : []
  const opportunities = Array.isArray(result?.opportunities) ? result.opportunities : Array.isArray(result?.recommendations) ? result.recommendations : []

  return <div className="space-y-4"><Back /><ScreenTitle eyebrow="ANÁLISE DO JUÍZO" title="Como este juízo costuma decidir casos como o seu?" subtitle="Compare o processo com decisões públicas relevantes e confira as evidências que sustentam a análise." />
    <ShellCard><input className="nexjud-pwa-input w-full rounded-[15px] border px-4 py-3.5" style={{ background: colors.cardAlt, borderColor: colors.border, color: colors.text }} placeholder="Número CNJ" value={cnj} onChange={e => setCnj(e.target.value)} /><textarea className="nexjud-pwa-input mt-3 min-h-24 w-full rounded-[15px] border px-4 py-3.5" style={{ background: colors.cardAlt, borderColor: colors.border, color: colors.text }} placeholder="Opcional: tese, argumento ou ponto que você quer testar" value={thesis} onChange={e => setThesis(e.target.value)} /><PrimaryButton className="mt-3 w-full" onClick={analyze} disabled={loading}><Search size={18} /> {loading ? "ANALISANDO..." : "ANALISAR PROCESSO"}</PrimaryButton></ShellCard>
    {errorText ? <ShellCard className="flex items-start gap-2"><CircleAlert size={20} style={{ color: colors.warning }} /><p className="text-sm" style={{ color: colors.text }}>{errorText}</p></ShellCard> : null}
    {result ? <><div className="flex gap-2"><Metric value={sample} label="Analisadas" icon={<Scale size={18} style={{ color: colors.primary }} />} /><Metric value={found} label="Encontradas" icon={<FileSearch size={18} style={{ color: colors.primary }} />} /><Metric value={result?.period || "—"} label="Período" icon={<CalendarDays size={18} style={{ color: colors.primary }} />} /></div><AnalysisBlock title="O que favorece sua tese" items={favorable} /><AnalysisBlock title="Pontos de atenção" items={attention} /><AnalysisBlock title="Como fortalecer o caso" items={opportunities} /></> : !loading ? <Empty title="Comece pelo número do processo" text="A NexJud mostrará a amostra, o período e as decisões públicas que sustentam cada padrão observado." /> : null}
    <p className="text-center text-xs leading-5" style={{ color: colors.muted }}>A NexJud analisa padrões observados em decisões públicas. Não prevê nem garante o resultado do processo.</p>
  </div>
}

function AnalysisBlock({ title, items }: { title: string; items: any[] }) {
  return <ShellCard><h2 className="font-bold" style={{ color: colors.text }}>{title}</h2>{items.length ? <div className="mt-2 space-y-2">{items.map((item, i) => <p key={i} className="text-sm leading-6" style={{ color: colors.text }}>• {typeof item === "string" ? item : item?.label || item?.text || JSON.stringify(item)}</p>)}</div> : <p className="mt-2 text-sm" style={{ color: colors.muted }}>Ainda não há evidência suficiente para afirmar este ponto.</p>}</ShellCard>
}

function CaseDetailPWA({ caseId, navigate }: { caseId: string; navigate: (path: string) => void }) {
  const [item, setItem] = useState<any>(null)
  const [docs, setDocs] = useState<any[]>([])
  const [cnj, setCnj] = useState<any[]>([])
  useEffect(() => {
    const client = getSupabase()
    Promise.all([
      client.from("legal_cases").select("*").eq("id", caseId).maybeSingle(),
      client.from("knowledge_documents").select("*").eq("case_id", caseId).order("created_at", { ascending: false }).limit(10),
      client.from("cnj_processes").select("*").eq("case_id", caseId).limit(5),
    ]).then(([c, d, n]) => { setItem(c.data); setDocs(d.data || []); setCnj(n.data || []) })
  }, [caseId])

  if (!item) return <Loader label="Abrindo dossiê do caso..." />
  return <div className="space-y-4"><Back /><ScreenTitle eyebrow="DOSSIÊ VIVO" title={item.title || item.client_name || "Caso jurídico"} subtitle={item.process_number || item.court || "Processo em acompanhamento"} /><ShellCard><h2 className="font-bold" style={{ color: colors.text }}>Resumo executivo</h2><p className="mt-2 text-sm leading-6" style={{ color: colors.text }}>{item.summary || item.description || "O resumo será enriquecido conforme documentos, conversas e movimentações forem vinculados."}</p></ShellCard>
    <div className="grid grid-cols-2 gap-2"><PrimaryButton onClick={() => navigate("/app/audiencia/" + caseId)}><Gavel size={18} /> Audiência</PrimaryButton><PrimaryButton secondary onClick={() => navigate("/app/ia")}><Brain size={18} /> Perguntar à IA</PrimaryButton></div>
    <InfoBlock title="Estratégia" text={item.strategy || item.legal_strategy || "Ainda não registrada."} /><InfoBlock title="Riscos e fragilidades" text={item.risks || item.risk_analysis || "Aguardando análise."} />
    <h2 className="text-lg font-extrabold" style={{ color: colors.text }}>Documentos ({docs.length})</h2>{docs.length ? <div className="space-y-2">{docs.map(d => <ShellCard key={d.id} className="flex items-center gap-3 !p-3"><FileText size={20} style={{ color: colors.primary }} /><div><p className="text-sm" style={{ color: colors.text }}>{d.title || d.file_name || "Documento"}</p><p className="text-xs" style={{ color: colors.muted }}>{d.processing_status || "Disponível"}</p></div></ShellCard>)}</div> : <Empty title="Sem documentos vinculados" text="Use o Scanner para adicionar documentos a este caso." />}
    <h2 className="text-lg font-extrabold" style={{ color: colors.text }}>Movimentações CNJ ({cnj.length})</h2>{cnj.length ? <div className="space-y-2">{cnj.map(n => <ShellCard key={n.id} className="flex items-center gap-3 !p-3"><Scale size={20} style={{ color: colors.primary }} /><p className="text-sm" style={{ color: colors.text }}>{n.last_movement || n.status || n.process_number || "Processo monitorado"}</p></ShellCard>)}</div> : <Empty title="Sem movimentações disponíveis" text="Vincule ou consulte o processo CNJ no Workspace." />}
  </div>
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return <ShellCard><h2 className="font-bold" style={{ color: colors.text }}>{title}</h2><p className="mt-2 text-sm leading-6" style={{ color: colors.text }}>{text}</p></ShellCard>
}

function HearingPWA({ userId, caseId, navigate }: { userId: string; caseId?: string; navigate: (path: string) => void }) {
  const [cases, setCases] = useState<any[]>([])
  const [item, setItem] = useState<any>(null)
  useEffect(() => {
    const client = getSupabase()
    if (caseId) client.from("legal_cases").select("*").eq("id", caseId).maybeSingle().then(({ data }) => setItem(data))
    else client.from("legal_cases").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).then(({ data }) => setCases(data || []))
  }, [userId, caseId])

  if (!caseId) return <div className="space-y-4"><Back /><ScreenTitle eyebrow="MODO AUDIÊNCIA" title="Escolha o caso" subtitle="Abra um briefing limpo, objetivo e fácil de consultar." />{cases.map(c => <CaseRow key={c.id} item={c} onClick={() => navigate("/app/audiencia/" + c.id)} />)}</div>
  if (!item) return <Loader label="Preparando audiência..." />

  const blocks = [
    ["Objetivo", item.objective || item.goal || "Defina o resultado principal da audiência."],
    ["Teses centrais", item.strategy || item.legal_strategy || "Estratégia ainda não registrada."],
    ["Pontos fortes", item.strengths || "Revise documentos e provas favoráveis."],
    ["Fragilidades", item.risks || item.risk_analysis || "Revise riscos antes do ato."],
    ["Perguntas sugeridas", item.hearing_questions || "Quem definiu as obrigações? Quais fatos podem ser comprovados? Há contradições?"],
    ["Pedidos", item.requests || item.claims || "Confirme os pedidos e alternativas de acordo."],
  ]
  return <div className="space-y-4"><Back label="Sair do modo audiência" /><h1 className="text-[34px] font-black" style={{ color: "#fff" }}>{item.title || item.client_name || "Audiência"}</h1><p className="text-base" style={{ color: colors.muted }}>{item.process_number || item.court || ""}</p>{blocks.map(([title, text]) => <div key={title} className="rounded-[20px] border p-5" style={{ background: "#0C101A", borderColor: "#20283A" }}><p className="text-xs font-extrabold tracking-[0.13em]" style={{ color: colors.primary }}>{title}</p><p className="mt-2 text-[20px] leading-8" style={{ color: "#fff" }}>{text}</p></div>)}</div>
}

function StudioPWA({ navigate }: { navigate: (path: string) => void }) {
  const pieceTypes = ["Petição inicial", "Contestação", "Réplica", "Recurso", "Notificação", "Contrato", "Parecer"]
  const [piece, setPiece] = useState(pieceTypes[0])
  const [facts, setFacts] = useState("")
  const [objective, setObjective] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [drafts, setDrafts] = useState<any[]>([])
  const [notice, setNotice] = useState("")
  const [error, setError] = useState("")
  async function loadDrafts() {
    const { data, error } = await getSupabase().from("drafts").select("*").order("created_at", { ascending: false }).limit(20)
    if (!error) setDrafts(data || [])
  }
  useEffect(() => { loadDrafts() }, [])
  async function start() {
    if (!facts.trim() || busy) return
    setBusy(true); setError(""); setNotice("")
    try {
      const client = getSupabase()
      const { data: auth } = await client.auth.getUser()
      if (!auth.user) throw new Error("Entre novamente na sua conta.")
      const draftType = ({ "Petição inicial": "peticao_inicial", "Contestação": "contestacao", "Réplica": "replica", "Recurso": "recurso", "Notificação": "notificacao", "Contrato": "contrato", "Parecer": "parecer" } as Record<string,string>)[piece] || "peticao_inicial"
      const { data, error } = await client.functions.invoke("draft-generator", { body: { caseText: facts, draftType, focus: objective } })
      if (error || data?.error) throw error || new Error(data.error)
      setResult(data)
      const saved = await client.from("drafts").insert({ user_id: auth.user.id, title: data?.title || piece, draft_type: draftType, case_text: facts, focus: objective, result: data }).select().single()
      if (saved.error) setNotice("Minuta gerada, mas não salva. Copie antes de sair.")
      else { setNotice("Minuta salva no histórico."); await loadDrafts() }
    } catch (err: any) { setError(err?.message || "Falha ao gerar minuta.") }
    finally { setBusy(false) }
  }
  return <div className="space-y-4"><Back /><ScreenTitle eyebrow="ESTÚDIO JURÍDICO" title="Comece uma peça no celular" subtitle="Estruture o rascunho aqui e continue a revisão completa no Workspace." /><h2 className="font-extrabold" style={{ color: colors.text }}>Tipo de documento</h2><div className="flex flex-wrap gap-2">{pieceTypes.map(p => <button key={p} onClick={() => setPiece(p)} className="rounded-full border px-3 py-2 text-xs font-bold" style={{ borderColor: piece === p ? colors.primary : colors.border, background: piece === p ? colors.primarySoft : colors.card, color: colors.text }}>{p}</button>)}</div><textarea className="nexjud-pwa-input min-h-40 w-full rounded-[15px] border p-4" style={{ background: colors.card, borderColor: colors.border, color: colors.text }} placeholder="Resuma os fatos relevantes..." value={facts} onChange={e => setFacts(e.target.value)} /><textarea className="nexjud-pwa-input min-h-24 w-full rounded-[15px] border p-4" style={{ background: colors.card, borderColor: colors.border, color: colors.text }} placeholder="Qual é o objetivo principal?" value={objective} onChange={e => setObjective(e.target.value)} /><PrimaryButton className="w-full" onClick={start} disabled={busy}><Sparkles size={18} /> {busy ? "Gerando..." : "Gerar e salvar minuta"}</PrimaryButton>
    {error ? <p role="alert" style={{color:colors.danger}}>{error}</p> : null}
    {notice ? <p role="status" style={{color:colors.muted}}>{notice}</p> : null}
    {result ? <ShellCard><h3 className="font-bold" style={{color:colors.text}}>{result.title || "Minuta gerada"}</h3><pre className="mt-3 whitespace-pre-wrap text-sm" style={{color:colors.text}}>{JSON.stringify(result, null, 2)}</pre><PrimaryButton className="mt-3 w-full" onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}>Copiar minuta</PrimaryButton></ShellCard> : null}
    <h3 className="font-bold" style={{color:colors.text}}>Minutas salvas</h3>
    {drafts.map(item => <button key={item.id} onClick={() => { setResult(item.result); setNotice("Minuta recuperada do histórico.") }} className="w-full rounded-xl border p-3 text-left" style={{borderColor:colors.border,color:colors.text}}>{item.title || "Minuta"} · {new Date(item.created_at).toLocaleDateString("pt-BR")}</button>)}<p className="text-center text-xs leading-5" style={{ color: colors.muted }}>O conteúdo gerado é um rascunho de apoio e deve ser revisado pelo profissional responsável.</p></div>
}

function Back({ label = "Voltar" }: { label?: string }) {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm font-bold" style={{ color: colors.primary }}><ArrowLeft size={18} /> {label}</button>
}

export default function CompanionPWA() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const segments = location.pathname.replace(/^\/app\/?/, "").split("/").filter(Boolean)
  const section = segments[0] || "home"

  if (loading) return <div className="nexjud-pwa-screen min-h-screen" style={{ background: colors.bg }}><Loader label="Iniciando NexJud..." /></div>
  if (!user) return <><CompanionLogin /><InstallHint /></>

  let view: React.ReactNode
  if (section === "ia") view = <ChatScreenPWA userId={user.id} />
  else if (section === "casos") view = <CasesScreenPWA userId={user.id} navigate={navigate} />
  else if (section === "agenda") view = <AgendaScreenPWA userId={user.id} />
  else if (section === "perfil") view = <ProfileScreenPWA userId={user.id} />
  else if (section === "ferramentas") view = <AdvancedToolsPWA />
  else if (section === "scanner") view = <ScannerScreenPWA userId={user.id} />
  else if (section === "analise") view = <AnalysisScreenPWA />
  else if (section === "caso" && segments[1]) view = <CaseDetailPWA caseId={segments[1]} navigate={navigate} />
  else if (section === "audiencia") view = <HearingPWA userId={user.id} caseId={segments[1]} navigate={navigate} />
  else if (section === "studio") view = <StudioPWA navigate={navigate} />
  else view = <HomeScreenPWA userId={user.id} navigate={navigate} />

  return <div className="nexjud-pwa-screen nexjud-pwa-shell min-h-[100dvh]" style={{ background: colors.bg }}>
    <main id="nexjud-pwa-content" className="nexjud-pwa-main mx-auto w-full max-w-xl px-4" key={location.pathname}>{view}</main>
    <BottomNav section={section} navigate={navigate} />
    <InstallHint />
  </div>
}
