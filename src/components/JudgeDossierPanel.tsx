import { useState } from "react"
import { Gavel, ExternalLink } from "lucide-react"
import { supabase } from "@/lib/supabase"

// Dossiê do juízo: decisões publicadas no DJEN (CNJ) pelo mesmo órgão julgador do processo,
// lidas contra a tese do usuário pela função decision-intelligence. Mesma resposta do PWA e do app.

type Publication = {
  id: string
  date: string | null
  processNumber: string | null
  kindLabel: string
  outcomeLabel: string | null
  excerpt: string
  link: string | null
}

function PublicationList({ items }: { items?: Publication[] }) {
  if (!Array.isArray(items) || !items.length) return null
  return <div className="space-y-2">
    {items.map(d => <article key={d.id} className="rounded-lg border border-[#313142] p-3 space-y-1">
      <p className="text-xs font-semibold text-primary">
        {d.kindLabel}{d.outcomeLabel ? ` · ${d.outcomeLabel}` : ""}{d.date ? ` · ${new Date(d.date).toLocaleDateString("pt-BR")}` : ""}
      </p>
      {d.processNumber && <p className="text-xs text-gray-400">{d.processNumber}</p>}
      <p className="text-sm text-gray-200">{d.excerpt}</p>
      {d.link && <a className="inline-flex items-center gap-1 text-xs underline text-primary" href={d.link} target="_blank" rel="noopener noreferrer">Ver no tribunal <ExternalLink size={12} /></a>}
    </article>)}
  </div>
}

function List({ title, items }: { title: string; items?: string[] }) {
  if (!Array.isArray(items) || !items.length) return null
  return <div><h4 className="font-semibold">{title}</h4><ul className="list-disc pl-5 mt-1 text-sm text-gray-200">{items.map((t, i) => <li key={i}>{t}</li>)}</ul></div>
}

export default function JudgeDossierPanel({ cnj, argument }: { cnj: string; argument: string }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [message, setMessage] = useState("")
  const digits = cnj.replace(/\D/g, "")

  async function run() {
    if (digits.length !== 20) { setMessage("Informe um número CNJ completo de 20 dígitos."); return }
    setLoading(true); setMessage(""); setResult(null)
    try {
      const { data, error } = await supabase.functions.invoke("decision-intelligence", {
        body: { cnj: digits, argument: argument.trim() || undefined, source: "web" },
      })
      if (error) {
        let text = "Não foi possível montar o dossiê agora. Tente novamente em alguns minutos."
        try { const body = await (error as any)?.context?.json?.(); if (typeof body?.error === "string") text = body.error } catch { /* mensagem padrão */ }
        setMessage(text); return
      }
      if (!data?.found) { setMessage(data?.warning || "Processo não encontrado nas bases consultadas."); return }
      setResult(data)
    } catch {
      setMessage("Não foi possível montar o dossiê. Verifique a conexão e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  const dossier = result?.dossier
  const outcomes = Object.entries(dossier?.outcomes || {}) as [string, number][]

  return <section className="rounded-2xl border border-primary/40 bg-[#111118] p-5 space-y-4" aria-label="Dossiê do juízo">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary font-bold">Dossiê do juízo · DJEN (CNJ)</p>
        <h2 className="font-semibold text-lg">Como este juízo tem decidido — e onde sua tese se encaixa</h2>
        <p className="text-sm text-gray-400">Lê as publicações oficiais do processo e as decisões recentes da mesma vara, câmara ou turma, e compara com a tese informada acima.</p>
      </div>
      <button type="button" disabled={loading || digits.length !== 20} onClick={() => { void run() }}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
        <Gavel size={16} /> {loading ? "Montando dossiê..." : "Montar dossiê do juízo"}
      </button>
    </div>
    {message && <p role="status" className="text-sm text-amber-200">{message}</p>}
    {result && <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-[#313142] p-3"><p className="text-gray-400 text-xs">Juízo</p><p className="font-semibold">{dossier?.judgingBody || result.process?.courtUnit || "Não identificado"}</p></div>
        <div className="rounded-lg border border-[#313142] p-3"><p className="text-gray-400 text-xs">Decisões do juízo lidas</p><p className="font-semibold">{dossier?.decisions ?? 0} <span className="text-gray-400 font-normal">em {dossier?.windowDays || 120} dias</span></p></div>
        <div className="rounded-lg border border-[#313142] p-3"><p className="text-gray-400 text-xs">Fontes</p><p className="font-semibold">{result.source}</p></div>
      </div>
      {dossier?.status && <p className="text-sm text-amber-200">{dossier.status}</p>}
      {outcomes.length > 0 && <div className="flex flex-wrap gap-2">{outcomes.map(([k, n]) =>
        <span key={k} className="rounded-full border border-[#3a3a4d] px-3 py-1 text-xs">{dossier.outcomeLabels?.[k] || k}: {n}</span>)}</div>}
      {result.summary && <p className="text-sm text-gray-100">{result.summary}</p>}
      <div className="grid md:grid-cols-2 gap-4">
        <List title="Padrões observados no juízo" items={result.judgePatterns} />
        <List title="Fundamentos que se repetem" items={result.recurringGrounds} />
        <List title="O que favorece sua tese" items={result.adherences} />
        <List title="Pontos de atenção" items={[...(result.divergences || []), ...(result.risks || [])]} />
        <List title="Como fortalecer o caso" items={result.opportunities} />
      </div>
      {dossier?.items?.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Decisões recentes do juízo</h3><PublicationList items={dossier.items} /></div>}
      {result.processPublications?.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Publicações deste processo</h3><PublicationList items={result.processPublications} /></div>}
      <p className="text-xs text-gray-400">{result.warning}</p>
    </div>}
  </section>
}
