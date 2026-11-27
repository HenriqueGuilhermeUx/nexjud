import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Bell, ExternalLink, FileText, Gavel, Loader2, Plus, Search, Target } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { PRIMARY_DOORS, NEXJUD_PROMISE } from "@/navigation/toolCatalog"

// Tela inicial: o que mudou nos processos do advogado, explicado e com o próximo passo.
// Os processos entram pela OAB (setup-oab importa) ou pelo número CNJ; o case-monitor
// acompanha todos (DJEN todo dia; Escavador para assinantes) e cria as notificações.

type LegalCase = { id: string; title: string | null; process_number: string | null; court: string | null; status: string | null; metadata: Record<string, any> | null; updated_at: string }
type Notice = { id: string; case_id: string | null; title: string; message: string | null; priority: string; status: string; metadata: Record<string, any> | null; created_at: string; read_at: string | null }

const onlyDigits = (v: string) => v.replace(/\D/g, "")

function formatCnj(v: string) {
  const d = onlyDigits(v)
  if (d.length !== 20) return v
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16)}`
}

const DOOR_ICON = { database: Bell, target: Target, wand: FileText } as const

export default function MyProcesses() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cases, setCases] = useState<LegalCase[]>([])
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [oab, setOab] = useState("")
  const [cnj, setCnj] = useState("")
  const [busy, setBusy] = useState<"" | "oab" | "cnj">("")
  const [message, setMessage] = useState("")
  const [filter, setFilter] = useState("")

  async function load() {
    if (!user?.id) return
    setLoading(true)
    const [c, n] = await Promise.all([
      supabase.from("legal_cases").select("id,title,process_number,court,status,metadata,updated_at").eq("user_id", user.id).neq("status", "archived").order("updated_at", { ascending: false }).limit(300),
      supabase.from("automation_notifications").select("id,case_id,title,message,priority,status,metadata,created_at,read_at").eq("user_id", user.id).eq("type", "process_movement").order("created_at", { ascending: false }).limit(200),
    ])
    setCases((c.data as LegalCase[]) || [])
    setNotices((n.data as Notice[]) || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [user?.id])

  async function importOab() {
    if (!oab.trim()) { setMessage("Digite sua OAB, por exemplo: SP 123456."); return }
    setBusy("oab"); setMessage("")
    try {
      const { data, error } = await supabase.functions.invoke("setup-oab", { body: { oabNumber: oab.trim().toUpperCase() } })
      if (error) {
        let text = "Não foi possível buscar seus processos agora."
        try { const body = await (error as any)?.context?.json?.(); if (typeof body?.error === "string") text = body.error } catch { /* padrão */ }
        setMessage(text); return
      }
      const found = Array.isArray(data?.cases) ? data.cases.length : 0
      setMessage(found
        ? `Encontramos ${found} processos${data?.imported ? ` e adicionamos ${data.imported} à sua lista` : ""}. A partir de agora acompanhamos tudo e avisamos o que mudar.`
        : "Não encontramos processos para esta OAB. Confira o número e a UF, ou adicione pelo número CNJ.")
      await load()
    } finally {
      setBusy("")
    }
  }

  async function addCnj() {
    const digits = onlyDigits(cnj)
    if (digits.length !== 20 || !user?.id) { setMessage("Informe o número CNJ completo (20 dígitos)."); return }
    if (cases.some(c => onlyDigits(c.process_number || "") === digits)) { setMessage("Esse processo já está na sua lista."); return }
    setBusy("cnj"); setMessage("")
    const { error } = await supabase.from("legal_cases").insert({ user_id: user.id, title: `Processo ${formatCnj(digits)}`, process_number: formatCnj(digits), status: "active", metadata: { source: "manual" } })
    setBusy("")
    if (error) { setMessage("Não foi possível adicionar agora."); return }
    setCnj("")
    setMessage("Processo adicionado. Na próxima verificação já trazemos as novidades.")
    await load()
  }

  async function markRead(id: string) {
    await supabase.from("automation_notifications").update({ read_at: new Date().toISOString() }).eq("id", id)
    setNotices(list => list.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
  }

  const latestByCase = useMemo(() => {
    const map = new Map<string, Notice>()
    for (const n of notices) if (n.case_id && !map.has(n.case_id)) map.set(n.case_id, n)
    return map
  }, [notices])
  const unread = notices.filter(n => !n.read_at)
  const urgent = unread.filter(n => n.priority === "critical" || n.priority === "high")
  const visible = cases.filter(c => !filter || `${c.title} ${c.process_number} ${c.court}`.toLowerCase().includes(filter.toLowerCase()))

  return <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
    <header className="space-y-2">
      <p className="text-xs uppercase tracking-widest text-primary font-bold">NexJud</p>
      <h1 className="text-3xl font-bold">{NEXJUD_PROMISE.headline}</h1>
      <p className="text-gray-400 max-w-3xl">{NEXJUD_PROMISE.subline}</p>
    </header>

    <nav className="grid md:grid-cols-3 gap-4" aria-label="O que você quer fazer">
      {PRIMARY_DOORS.map(door => {
        const Icon = DOOR_ICON[door.icon as keyof typeof DOOR_ICON] || Target
        const isHere = door.path === "/dashboard/meus-processos"
        return <Link key={door.path} to={isHere ? "#processos" : door.path} className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-5 hover:border-primary/60 transition">
          <Icon className="text-primary" size={22} />
          <p className="mt-3 font-semibold text-lg">{door.label}</p>
          <p className="text-sm text-gray-400 mt-1">{door.description}</p>
        </Link>
      })}
    </nav>

    {urgent.length > 0 && <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-5 space-y-3" aria-label="Pede atenção">
      <h2 className="font-semibold text-lg">Pede atenção agora ({urgent.length})</h2>
      {urgent.slice(0, 6).map(n => <article key={n.id} className="rounded-xl border border-[#3a3a4d] bg-[#111118] p-4 space-y-1">
        <p className="font-semibold">{n.title}</p>
        <p className="text-sm text-gray-200 whitespace-pre-line">{n.message}</p>
        <div className="flex flex-wrap gap-3 pt-1 text-xs">
          {n.metadata?.link && <a className="underline text-primary inline-flex items-center gap-1" href={n.metadata.link} target="_blank" rel="noopener noreferrer">Ver no tribunal <ExternalLink size={12} /></a>}
          {n.metadata?.process_number && <button type="button" className="underline text-primary" onClick={() => navigate(`/dashboard/decision-intelligence?cnj=${onlyDigits(n.metadata!.process_number)}`)}>Estratégia do caso</button>}
          <button type="button" className="underline text-gray-400" onClick={() => { void markRead(n.id) }}>Marcar como visto</button>
        </div>
      </article>)}
    </section>}

    <section id="processos" className="space-y-4" aria-label="Meus processos">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Meus processos</h2>
          <p className="text-sm text-gray-400">Acompanhamos o DJEN (CNJ) todos os dias e avisamos por e-mail o que mudou, com o próximo passo.</p>
        </div>
        {cases.length > 0 && <div className="relative"><Search size={14} className="absolute left-3 top-3 text-gray-500" /><input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filtrar" className="rounded-xl bg-[#0f0f15] border border-[#2a2a35] pl-8 pr-3 py-2 text-sm" /></div>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-primary/40 bg-[#111118] p-5 space-y-3">
          <p className="font-semibold">{cases.length ? "Trazer mais processos pela OAB" : "Comece pela sua OAB"}</p>
          <p className="text-sm text-gray-400">Em segundos trazemos seus processos, com a última movimentação de cada um.</p>
          <div className="flex gap-2">
            <input value={oab} onChange={e => setOab(e.target.value)} placeholder="SP 123456" className="flex-1 rounded-xl bg-[#0f0f15] border border-[#2a2a35] px-4 py-3" />
            <button type="button" disabled={busy !== ""} onClick={() => { void importOab() }} className="rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-50 inline-flex items-center gap-2">
              {busy === "oab" ? <Loader2 className="animate-spin" size={16} /> : <Gavel size={16} />} Buscar
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-5 space-y-3">
          <p className="font-semibold">Adicionar pelo número do processo</p>
          <p className="text-sm text-gray-400">Para processos em que você ainda não aparece como advogado.</p>
          <div className="flex gap-2">
            <input value={cnj} onChange={e => setCnj(e.target.value)} placeholder="0000000-00.0000.0.00.0000" className="flex-1 rounded-xl bg-[#0f0f15] border border-[#2a2a35] px-4 py-3" />
            <button type="button" disabled={busy !== ""} onClick={() => { void addCnj() }} className="rounded-xl border border-primary/60 px-5 py-3 font-bold disabled:opacity-50 inline-flex items-center gap-2">
              {busy === "cnj" ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Adicionar
            </button>
          </div>
        </div>
      </div>
      {message && <p role="status" className="text-sm text-amber-200">{message}</p>}

      {loading ? <p className="text-sm text-gray-400">Carregando seus processos…</p> : visible.length === 0 ? null :
        <div className="rounded-2xl border border-[#2a2a35] divide-y divide-[#2a2a35] bg-[#0f0f15]">
          {visible.map(c => {
            const n = latestByCase.get(c.id)
            const digits = onlyDigits(c.process_number || "")
            const checked = c.metadata?.monitor?.last_checked_at
            return <div key={c.id} className="p-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{c.title || "Processo"}</p>
                <p className="text-xs text-gray-400">{c.process_number}{c.court ? ` · ${c.court}` : ""}</p>
                {n ? <p className={`mt-2 text-sm ${n.read_at ? "text-gray-300" : "text-white"}`}>
                  {!n.read_at && <span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${n.priority === "critical" || n.priority === "high" ? "bg-amber-500/20 text-amber-200" : "bg-primary/20 text-primary"}`}>NOVO</span>}
                  {(n.message || n.title).split("\n")[0]}
                </p> : <p className="mt-2 text-xs text-gray-500">{checked ? `Verificado em ${new Date(checked).toLocaleDateString("pt-BR")} — sem novidades.` : "Primeira verificação nas próximas horas."}</p>}
              </div>
              {digits.length === 20 && <div className="flex gap-2">
                <button type="button" onClick={() => navigate(`/dashboard/decision-intelligence?cnj=${digits}`)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white inline-flex items-center gap-1"><Target size={12} /> Estratégia do caso</button>
              </div>}
            </div>
          })}
        </div>}
    </section>

    <p className="text-xs text-gray-500">O NexJud lê fontes oficiais (DJEN/CNJ e tribunais) e explica o que mudou. Prazos sugeridos devem ser sempre confirmados no sistema do tribunal. Não prevemos nem garantimos resultados.</p>
  </div>
}
