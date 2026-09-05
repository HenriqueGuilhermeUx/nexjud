import { useEffect, useMemo, useState } from "react"
import { Activity, BellRing, BrainCircuit, FileCheck2, Landmark, Radar, Scale, ShieldAlert, Sparkles } from "lucide-react"
import { useSearchParams } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { getLegalCases } from "@/services/aiWorkspaceService"
import { searchPrecedents } from "@/services/precedentsService"
import { runPrecedentIntelligenceAi } from "@/services/precedentIntelligenceService"

const steps = [
  ["1", "Fatos relevantes", "Mapeie os fatos juridicamente determinantes do caso."],
  ["2", "Questões jurídicas", "Defina as questões que precisam ser respondidas."],
  ["3", "Precedentes qualificados", "Cruze temas, repetitivos, repercussão geral, IRDR e IAC."],
  ["4", "Aderência fática", "Compare os fatos determinantes do precedente com o caso concreto."],
  ["5", "Distinguishing", "Identifique diferenças capazes de afastar ou limitar a aplicação."],
  ["6", "Matriz probatória", "Confronte requisitos jurídicos com as provas disponíveis e ausentes."],
  ["7", "Estratégia", "Consolide aplicação, risco, contrargumentos e próximos passos."],
]

export default function PrecedentIntelligence() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const caseId = params.get("caseId") || null
  const [linkedCase, setLinkedCase] = useState<any>(null)
  const [caseFacts, setCaseFacts] = useState("")
  const [legalIssue, setLegalIssue] = useState("")
  const [query, setQuery] = useState("")
  const [precedents, setPrecedents] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [output, setOutput] = useState<any>(null)

  useEffect(() => {
    async function loadLinkedCase() {
      if (!user?.id || !caseId) return
      try {
        const cases = await getLegalCases(user.id)
        const item = cases.find((c: any) => c.id === caseId)
        if (!item) return
        setLinkedCase(item)
        if (!caseFacts.trim()) {
          const facts = [
            item.summary,
            item.client_name ? `Cliente: ${item.client_name}.` : "",
            item.opponent_name ? `Parte adversa: ${item.opponent_name}.` : "",
            item.process_number ? `Processo: ${item.process_number}.` : "",
            item.court ? `Tribunal/Vara: ${item.court}.` : "",
          ].filter(Boolean).join("\n")
          setCaseFacts(facts)
        }
        if (!legalIssue.trim() && Array.isArray(item.tags) && item.tags.length) {
          setLegalIssue(`Analisar as questões jurídicas centrais relacionadas a: ${item.tags.join(", ")}.`)
        }
      } catch (e) {
        console.error("Falha ao carregar caso vinculado", e)
      }
    }
    loadLinkedCase()
  }, [user, caseId])

  async function search() {
    if (!user?.id) return
    setLoading(true)
    try {
      const q = query || legalIssue || caseFacts.slice(0, 100)
      const data = await searchPrecedents(user.id, q)
      setPrecedents(data)
      setSelected(data.slice(0, 5).map((p: any) => p.id))
    } catch (e: any) {
      alert(e?.message || "Erro ao buscar precedentes")
    } finally {
      setLoading(false)
    }
  }

  async function analyze() {
    if (!user?.id) return
    if (caseFacts.trim().length < 20 || legalIssue.trim().length < 10) {
      alert("Descreva os fatos e a questão jurídica com um pouco mais de detalhe.")
      return
    }
    setAiLoading(true)
    try {
      const data = await runPrecedentIntelligenceAi({ userId: user.id, caseId, caseFacts, legalIssue, precedentIds: selected })
      setOutput(data)
    } catch (e: any) {
      alert(e?.message || "Erro ao executar Precedent Intelligence")
    } finally {
      setAiLoading(false)
    }
  }

  const readiness = useMemo(() => {
    let score = 0
    if (caseFacts.trim().length > 30) score += 35
    if (legalIssue.trim().length > 15) score += 30
    if (selected.length) score += 35
    return score
  }, [caseFacts, legalIssue, selected])

  const result = output?.result

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-7">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-indigo-500/10 to-[#05050a] p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex gap-4"><BrainCircuit className="text-primary mt-1" size={46} /><div><p className="text-xs uppercase tracking-[.25em] text-primary font-bold">NexJud Legal Intelligence</p><h1 className="text-4xl font-bold mt-1">Precedent Intelligence™</h1><p className="text-muted-foreground mt-2 max-w-3xl">Teste a aplicação do precedente contra fatos, provas, distinções e risco processual.</p>{linkedCase && <p className="text-sm text-primary mt-3 font-bold">Vinculado ao caso: {linkedCase.title}</p>}</div></div>
            <div className="rounded-2xl border border-border bg-black/30 px-6 py-4 min-w-44"><p className="text-xs text-muted-foreground">Prontidão da análise</p><p className="text-3xl font-black text-primary">{readiness}%</p></div>
          </div>
        </section>

        <section className="grid lg:grid-cols-7 gap-3">{steps.map(([n,t,d]) => <div key={n} className="rounded-2xl border border-border bg-card p-4"><span className="text-xs font-black text-primary">{n}</span><h3 className="font-bold mt-2">{t}</h3><p className="text-xs text-muted-foreground mt-2">{d}</p></div>)}</section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2"><Scale className="text-primary"/><h2 className="text-xl font-bold">Caso × Precedente</h2></div>
            <textarea value={caseFacts} onChange={e=>setCaseFacts(e.target.value)} placeholder="Descreva os fatos juridicamente relevantes do caso..." className="w-full h-40 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
            <textarea value={legalIssue} onChange={e=>setLegalIssue(e.target.value)} placeholder="Qual é a questão jurídica central?" className="w-full h-28 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
            <div className="flex gap-2"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tema, tribunal, número ou palavra-chave" className="flex-1 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/><button onClick={search} className="rounded-xl bg-[#171721] border border-border px-5 font-bold">{loading ? "Buscando..." : "Buscar"}</button></div>
            <button onClick={analyze} disabled={aiLoading} className="w-full rounded-xl bg-primary py-4 font-black text-white disabled:opacity-50">{aiLoading ? "Construindo aderência, distinguishing e matriz probatória..." : "Executar Precedent Intelligence"}</button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-2 mb-4"><Landmark className="text-primary"/><h2 className="text-xl font-bold">Precedentes candidatos</h2></div>{precedents.length === 0 ? <div className="text-muted-foreground py-10 text-center">Busque na sua base de Precedentes Inteligentes e selecione quais devem entrar no confronto.</div> : <div className="space-y-3">{precedents.slice(0,10).map(p=>{const checked=selected.includes(p.id);return <button type="button" onClick={()=>setSelected(s=>checked?s.filter(x=>x!==p.id):[...s,p.id])} key={p.id} className={`w-full text-left rounded-xl border p-4 ${checked?"border-primary bg-primary/10":"border-border bg-[#0f0f15]"}`}><div className="flex justify-between gap-3"><div><p className="font-bold">{p.title}</p><p className="text-xs text-muted-foreground">{p.tribunal} · {p.numero || p.tema}</p></div><span className="text-xs text-primary font-bold">{checked?"selecionado":p.impacto||"selecionar"}</span></div><p className="text-sm text-gray-300 mt-3 line-clamp-3">{p.resumo || p.fundamento}</p></button>})}</div>}</div>
        </section>

        {result && <>
          {caseId && <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5"><p className="font-bold text-primary">Resultado conectado ao Dossiê Vivo</p><p className="text-sm text-muted-foreground mt-1">Esta análise foi executada com o ID do caso. Na próxima atualização do Dossiê Vivo, o Precedent Agent poderá consumir a análise persistida deste processo.</p></section>}
          <section className="grid md:grid-cols-4 gap-4">
            <Metric label="Aderência" value={`${result.adherence_score ?? 0}%`} />
            <Metric label="Aplicabilidade" value={result.applicability || "unknown"} />
            <Metric label="Risco" value={result.risk_level || "não identificado"} />
            <Metric label="Precedentes" value={String(result.precedent_items?.length || 0)} />
          </section>

          <section className="grid lg:grid-cols-2 gap-6">
            <Panel title="Estratégia"><p className="text-gray-300 whitespace-pre-line">{result.strategy_summary || "-"}</p></Panel>
            <Panel title="Próximas ações"><Bullets items={result.next_actions} /></Panel>
            <Panel title="Argumentos favoráveis"><Bullets items={result.favorable_arguments} /></Panel>
            <Panel title="Argumentos contrários"><Bullets items={result.adverse_arguments} /></Panel>
          </section>

          <section className="rounded-2xl border border-border bg-card p-6"><h2 className="font-bold text-xl mb-4">Matriz de aderência fática</h2><div className="space-y-3">{(result.fact_matrix||[]).map((r:any,i:number)=><div key={i} className="grid lg:grid-cols-5 gap-3 rounded-xl border border-border bg-black/20 p-4 text-sm"><b>{r.fact_name}</b><span>{r.case_fact}</span><span>{r.precedent_fact}</span><span className="text-primary font-bold">{r.relation}</span><span>{r.note}</span></div>)}</div></section>

          <section className="rounded-2xl border border-border bg-card p-6"><h2 className="font-bold text-xl mb-4">Evidence Matrix</h2><div className="space-y-3">{(result.evidence_matrix||[]).map((r:any,i:number)=><div key={i} className="grid lg:grid-cols-5 gap-3 rounded-xl border border-border bg-black/20 p-4 text-sm"><b>{r.requirement}</b><span>{r.evidence_found}</span><span className="text-primary font-bold">{r.evidence_strength}</span><span>{r.gap}</span><span>{r.recommended_action}</span></div>)}</div></section>
        </>}

        <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4"><Card icon={<FileCheck2/>} title="Evidence Matrix" text="Requisito → prova encontrada → força → lacuna." /><Card icon={<ShieldAlert/>} title="Distinguishing Engine" text="Diferenças materialmente relevantes entre caso e precedente." /><Card icon={<Radar/>} title="Precedent Radar" text="Monitoramento de afetação, julgamento, modulação e superação." /><Card icon={<Activity/>} title="Impact Scanner" text="Novo precedente × carteira de processos potencialmente afetados." /></section>

        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6"><div className="flex gap-3"><Sparkles className="text-primary"/><div><h2 className="font-bold text-lg">Análise persistida</h2><p className="text-sm text-muted-foreground mt-1">Cada execução é gravada no Supabase com itens, matriz fática e Evidence Matrix, pronta para ser incorporada ao Dossiê Vivo e aos próximos motores de monitoramento.</p></div><BellRing className="ml-auto text-primary hidden md:block"/></div></section>
      </div>
    </div>
  )
}

function Card({icon,title,text}:{icon:React.ReactNode,title:string,text:string}) { return <div className="rounded-2xl border border-border bg-card p-5"><div className="text-primary">{icon}</div><h3 className="font-bold mt-3">{title}</h3><p className="text-sm text-muted-foreground mt-2">{text}</p></div> }
function Metric({label,value}:{label:string,value:string}) { return <div className="rounded-2xl border border-primary/20 bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-black text-primary mt-1">{value}</p></div> }
function Panel({title,children}:{title:string,children:React.ReactNode}) { return <div className="rounded-2xl border border-border bg-card p-6"><h2 className="font-bold text-xl mb-3">{title}</h2>{children}</div> }
function Bullets({items=[]}:{items?:string[]}) { return <div className="space-y-2">{items.length?items.map((x,i)=><div key={i} className="flex gap-2 text-sm text-gray-300"><span className="text-primary">•</span><span>{x}</span></div>):<span className="text-muted-foreground">Nenhum item identificado.</span>}</div> }
