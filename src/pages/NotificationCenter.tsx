import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, CheckCheck, ExternalLink, RefreshCw } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NexJudNotification,
} from "@/services/notificationService"

function priorityLabel(priority: NexJudNotification["priority"]) {
  if (priority === "critical") return "Crítico"
  if (priority === "high") return "Alto"
  if (priority === "low") return "Baixo"
  return "Normal"
}

function priorityClass(priority: NexJudNotification["priority"]) {
  if (priority === "critical") return "border-red-500/40 bg-red-500/10 text-red-300"
  if (priority === "high") return "border-amber-500/40 bg-amber-500/10 text-amber-300"
  if (priority === "low") return "border-slate-700 bg-slate-900/70 text-slate-300"
  return "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
}

export default function NotificationCenter() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<NexJudNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function load() {
    if (!user?.id) return
    setLoading(true)
    setError("")
    try {
      setItems(await getNotifications(user.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar os alertas.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [user?.id])

  const unread = useMemo(() => items.filter((x) => !x.read_at).length, [items])

  async function openNotification(item: NexJudNotification) {
    if (!item.read_at) {
      await markNotificationRead(item.id)
      setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, read_at: new Date().toISOString(), status: "read" } : x))
    }
    if (item.action_url) navigate(item.action_url)
  }

  async function markAll() {
    if (!user?.id || unread === 0) return
    await markAllNotificationsRead(user.id)
    const now = new Date().toISOString()
    setItems((prev) => prev.map((x) => ({ ...x, read_at: x.read_at || now, status: x.status === "failed" ? x.status : "read" })))
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-300"><Bell className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[0.18em]">NexJud Intelligence</span></div>
          <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Central de Alertas</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">Movimentações relevantes, riscos, impacto estratégico e ações que merecem sua atenção.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-900"><RefreshCw className="h-4 w-4" />Atualizar</button>
          <button onClick={markAll} disabled={!unread} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><CheckCheck className="h-4 w-4" />Marcar tudo como lido</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Não lidos" value={unread} />
        <Metric label="Total" value={items.length} />
        <Metric label="Críticos" value={items.filter((x) => x.priority === "critical").length} />
        <Metric label="Alta prioridade" value={items.filter((x) => x.priority === "high").length} />
      </div>

      {loading && <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 text-sm text-slate-400">Carregando inteligência operacional...</div>}
      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {!loading && !error && items.length === 0 && <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-8 text-center"><Bell className="mx-auto h-8 w-8 text-slate-600" /><h2 className="mt-3 font-bold text-white">Nenhum alerta ainda</h2><p className="mt-1 text-sm text-slate-500">Quando o NexJud detectar algo relevante na sua operação, aparecerá aqui.</p></div>}

      <div className="space-y-3">
        {items.map((item) => (
          <button key={item.id} onClick={() => openNotification(item)} className={`w-full rounded-2xl border p-4 text-left transition hover:border-indigo-500/40 ${item.read_at ? "border-slate-800 bg-slate-950/60" : "border-indigo-500/30 bg-indigo-500/[0.05]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {!item.read_at && <span className="h-2 w-2 rounded-full bg-indigo-400" />}
                  <h2 className="font-bold text-white">{item.title}</h2>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${priorityClass(item.priority)}`}>{priorityLabel(item.priority)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.message}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{new Date(item.created_at).toLocaleString("pt-BR")}</span>
                  <span>{item.type}</span>
                  {item.case_id && <span>Caso vinculado</span>}
                </div>
              </div>
              {item.action_url && <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-slate-500" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><div className="text-2xl font-black text-white">{value}</div><div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div></div>
}
