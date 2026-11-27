import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Gavel, ExternalLink, FileText, Sparkles } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { buildDossierDraftContext } from "@/intelligence/dnaActionHandoff"

// Dossiê do juízo: decisões publicadas no DJEN (CNJ) pelo mesmo órgão julgador do processo,
// teses sugeridas conforme o lado do cliente e leitura da tese escolhida.
// Mesma função (decision-intelligence) usada pelo PWA e pelo app.

type Publication = {
  id: string
  date: string | null
  processNumber: string | null
  kindLabel: string
  outcomeLabel: string | null
  excerpt: string
  link: string | null
}

type ThesisRef = { label: string; date: string | null; kind: string; link: string | null; processNumber: string | null }
type Thesis = { type: "principal" | "subsidiaria" | "risco"; title: string; thesis: string; basis: string; refs: ThesisRef[] }

const THESIS_LABEL: Record<string, string> = {
  principal: "Tese principal",
  subsidiaria: "Tese subsidiária",
  risco: "O que a outra parte deve alegar",
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

export default function JudgeDossierPanel({ cnj, argument, onUseThesis }: { cnj: string; argument: string; onUseThesis?: (thesis: string) => void }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [side, setSide] = useState<"autor" | "reu" | "">("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [message, setMessage] = useState("")
  const [chosenThesis, setChosenThesis] = useState("")
  const digits = cnj.replace(/\D/g, "")

  async function run(thesis = argument) {
    if (digits.length !== 20) { setMessage("Informe um número CNJ completo de 20 dígitos."); return }
    setLoading(true); setMessage("")
    try {
      const { data, error } = await supabase.functions.invoke("decision-intelligence", {
        body: { cnj: digits, argument: thesis.trim() || undefined, side: side || undefined, source: "web" },
      })
      if (error) {
        let text = "Não foi possível montar o dossiê agora. Tente novamente em alguns minutos."
        try { const body = await (error as any)?.context?.json?.(); if (typeof body?.error === "string") text = body.error } catch { /* mensagem padrão */ }
        setMessage(text); return
      }
      if (!data?.found) { setMessage(data?.warning || "Processo não encontrado nas bases consultadas."); setResult(null); return }
      setResult(data)
      setChosenThesis(thesis.trim())
    } catch {
      setMessage("Não foi possível montar o dossiê. Verifique a conexão e tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function useThesis(t: Thesis) {
    onUseThesis?.(t.thesis)
    void run(t.thesis)
  }

  function writeDraft(thesis: string) {
    const dnaContext = buildDossierDraftContext({ userId: user?.id, thesis, result })
    if (!dnaContext) { setMessage("Escolha ou escreva uma tese antes de preparar a peça."); return }
    navigate("/dashboard/draft-generator", { state: { dnaContext } })
  }

  const dossier = result?.dossier
  const outcomes = Object.entries(dossier?.outcomes || {}) as [string, number][]
  const theses: Thesis[] = Array.isArray(result?.suggestedTheses) ? result.suggestedTheses : []

  return <section className="rounded-2xl border border-primary/40 bg-[#111118] p-5 space-y-4" aria-label="Dossiê do juízo">
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-widest text-primary font-bold">Dossiê do juízo · DJEN (CNJ)</p>
      <h2 className="font-semibold text-lg">Como este juízo tem decidido — e qual tese usar</h2>
      <p className="text-sm text-gray-400">Lemos as publicações oficiais do processo e as decisões recentes da mesma vara. Você não precisa trazer a tese pronta: sugerimos três, com as decisões que as sustentam.</p>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-gray-300">Você representa:</span>
      {(["autor", "reu"] as const).map(option => <button key={option} type="button" onClick={() => setSide(option)}
        className={`rounded-full border px-4 py-2 text-sm ${side === option ? "border-primary bg-primary/20 text-white" : "border-[#3a3a4d] text-gray-300"}`}>
        {option === "autor" ? "o autor" : "o réu"}
      </button>)}
      <button type="button" disabled={loading || digits.length !== 20} onClick={() => { void run() }}
        className="ml-auto inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
        <Gavel size={16} /> {loading ? "Montando dossiê..." : argument.trim() ? "Analisar minha tese" : "Montar dossiê e sugerir teses"}
      </button>
    </div>
    {message && <p role="status" className="text-sm text-amber-200">{message}</p>}
    {result && <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-lg border border-[#313142] p-3"><p className="text-gray-400 text-xs">Juízo</p><p className="font-semibold">{dossier?.judgingBody || result.process?.courtUnit || "Não identificado"}</p></div>
        <div className="rounded-lg border border-[#313142] p-3"><p className="text-gray-400 text-xs">Decisões do juízo lidas</p><p className="font-semibold">{dossier?.decisions ?? 0} <span className="text-gray-400 font-normal">em {dossier?.windowDays || 120} dias</span></p></div>
        <div className="rounded-lg border border-[#313142] p-3"><p className="text-gray-400 text-xs">Fontes</p><p className="font-semibold">{result.source}</p></div>
      </div>
      {dossier?.status && <p className="text-sm text-amber-200">{dossier.status}</p>}
      {outcomes.length > 0 && <div className="flex flex-wrap gap-2">{outcomes.map(([k, n]) =>
        <span key={k} className="rounded-full border border-[#3a3a4d] px-3 py-1 text-xs">{dossier.outcomeLabels?.[k] || k}: {n}</span>)}</div>}
      {result.summary && <p className="text-sm text-gray-100">{result.summary}</p>}

      {theses.length > 0 && <div className="space-y-3" aria-label="Teses sugeridas">
        <h3 className="font-semibold inline-flex items-center gap-2"><Sparkles size={16} className="text-primary" /> Teses sugeridas para este caso</h3>
        <div className="grid md:grid-cols-3 gap-3">
          {theses.map((t, i) => <article key={i} className={`rounded-xl border p-4 space-y-2 ${t.type === "risco" ? "border-amber-500/40" : "border-primary/40"}`}>
            <p className={`text-xs font-bold uppercase tracking-wide ${t.type === "risco" ? "text-amber-300" : "text-primary"}`}>{THESIS_LABEL[t.type] || "Tese"}</p>
            <p className="font-semibold">{t.title}</p>
            <p className="text-sm text-gray-200">{t.thesis}</p>
            {t.basis && <p className="text-xs text-gray-400">{t.basis}</p>}
            {t.refs?.length > 0 && <div className="flex flex-wrap gap-2">{t.refs.map(r => r.link
              ? <a key={r.label} href={r.link} target="_blank" rel="noopener noreferrer" className="text-xs underline text-primary">{r.kind} {r.date ? new Date(r.date).toLocaleDateString("pt-BR") : ""}</a>
              : <span key={r.label} className="text-xs text-gray-400">{r.kind} {r.date ? new Date(r.date).toLocaleDateString("pt-BR") : ""}</span>)}</div>}
            {t.type !== "risco" && <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" disabled={loading} onClick={() => useThesis(t)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">Usar esta tese</button>
              <button type="button" onClick={() => writeDraft(t.thesis)} className="rounded-lg border border-primary/50 px-3 py-2 text-xs font-semibold inline-flex items-center gap-1"><FileText size={12} /> Escrever a peça</button>
            </div>}
          </article>)}
        </div>
      </div>}

      {chosenThesis && <div className="rounded-xl border border-[#313142] p-4 space-y-3">
        <p className="text-xs text-gray-400">Leitura da tese: <span className="text-gray-200">{chosenThesis.slice(0, 280)}{chosenThesis.length > 280 ? "…" : ""}</span></p>
        <div className="grid md:grid-cols-2 gap-4">
          <List title="O que favorece a tese" items={result.adherences} />
          <List title="Pontos de atenção" items={[...(result.divergences || []), ...(result.risks || [])]} />
          <List title="Como fortalecer" items={result.opportunities} />
        </div>
        <button type="button" onClick={() => writeDraft(chosenThesis)} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white inline-flex items-center gap-2">
          <FileText size={16} /> Escrever a peça com esta tese e as decisões do juízo
        </button>
      </div>}

      <div className="grid md:grid-cols-2 gap-4">
        <List title="Padrões observados no juízo" items={result.judgePatterns} />
        <List title="Fundamentos que se repetem" items={result.recurringGrounds} />
      </div>
      {dossier?.items?.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Decisões recentes do juízo</h3><PublicationList items={dossier.items} /></div>}
      {result.processPublications?.length > 0 && <div className="space-y-2"><h3 className="font-semibold">Publicações deste processo</h3><PublicationList items={result.processPublications} /></div>}
      <p className="text-xs text-gray-400">{result.warning}</p>
    </div>}
  </section>
}
