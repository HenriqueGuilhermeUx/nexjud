import { useMemo, useState } from "react"
import { Activity, BellRing, BrainCircuit, FileCheck2, Landmark, Radar, Scale, ShieldAlert, Sparkles } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { searchPrecedents } from "@/services/precedentsService"

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
  const [caseFacts, setCaseFacts] = useState("")
  const [legalIssue, setLegalIssue] = useState("")
  const [query, setQuery] = useState("")
  const [precedents, setPrecedents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  async function run() {
    if (!user?.id) return
    setLoading(true)
    try {
      const q = query || legalIssue || caseFacts.slice(0, 100)
      setPrecedents(await searchPrecedents(user.id, q))
    } finally {
      setLoading(false)
    }
  }

  const readiness = useMemo(() => {
    let score = 0
    if (caseFacts.trim().length > 30) score += 35
    if (legalIssue.trim().length > 15) score += 30
    if (precedents.length) score += 35
    return score
  }, [caseFacts, legalIssue, precedents])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-7">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-indigo-500/10 to-[#05050a] p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex gap-4">
              <BrainCircuit className="text-primary mt-1" size={46} />
              <div><p className="text-xs uppercase tracking-[.25em] text-primary font-bold">NexJud Legal Intelligence</p><h1 className="text-4xl font-bold mt-1">Precedent Intelligence™</h1><p className="text-muted-foreground mt-2 max-w-3xl">Não apenas encontre jurisprudência. Teste a aplicação do precedente contra fatos, provas, distinções e risco processual.</p></div>
            </div>
            <div className="rounded-2xl border border-border bg-black/30 px-6 py-4 min-w-44"><p className="text-xs text-muted-foreground">Prontidão da análise</p><p className="text-3xl font-black text-primary">{readiness}%</p></div>
          </div>
        </section>

        <section className="grid lg:grid-cols-7 gap-3">{steps.map(([n,t,d]) => <div key={n} className="rounded-2xl border border-border bg-card p-4"><span className="text-xs font-black text-primary">{n}</span><h3 className="font-bold mt-2">{t}</h3><p className="text-xs text-muted-foreground mt-2">{d}</p></div>)}</section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4"><div className="flex items-center gap-2"><Scale className="text-primary"/><h2 className="text-xl font-bold">Caso × Precedente</h2></div><textarea value={caseFacts} onChange={e=>setCaseFacts(e.target.value)} placeholder="Cole ou descreva os fatos juridicamente relevantes do caso..." className="w-full h-40 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/><textarea value={legalIssue} onChange={e=>setLegalIssue(e.target.value)} placeholder="Qual é a questão jurídica central?" className="w-full h-28 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/><div className="flex gap-2"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tema, tribunal, número ou palavra-chave" className="flex-1 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/><button onClick={run} className="rounded-xl bg-primary px-5 font-bold text-white">{loading ? "Analisando..." : "Cruzar"}</button></div></div>

          <div className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-2 mb-4"><Landmark className="text-primary"/><h2 className="text-xl font-bold">Precedentes candidatos</h2></div>{precedents.length === 0 ? <div className="text-muted-foreground py-10 text-center">Informe o caso e execute o cruzamento. O motor usará a base de Precedentes Inteligentes já cadastrada.</div> : <div className="space-y-3">{precedents.slice(0,8).map(p=><div key={p.id} className="rounded-xl border border-border bg-[#0f0f15] p-4"><div className="flex justify-between gap-3"><div><p className="font-bold">{p.title}</p><p className="text-xs text-muted-foreground">{p.tribunal} · {p.numero || p.tema}</p></div><span className="text-xs text-primary font-bold">{p.impacto || "analisar"}</span></div><p className="text-sm text-gray-300 mt-3">{p.resumo || p.fundamento}</p></div>)}</div>}</div>
        </section>

        <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card icon={<FileCheck2/>} title="Evidence Matrix" text="Requisito → prova encontrada → força → lacuna. Transforme tese jurídica em plano probatório." />
          <Card icon={<ShieldAlert/>} title="Distinguishing Engine" text="Registre fatos equivalentes, diferenças materialmente relevantes e argumentos para afastar aplicação automática." />
          <Card icon={<Radar/>} title="Precedent Radar" text="Estrutura preparada para monitorar afetação, julgamento, modulação, superação e mudança de entendimento." />
          <Card icon={<Activity/>} title="Impact Scanner" text="Camada destinada a cruzar novos precedentes com a carteira e apontar processos potencialmente afetados." />
        </section>

        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6"><div className="flex gap-3"><Sparkles className="text-primary"/><div><h2 className="font-bold text-lg">Saída estratégica do motor</h2><p className="text-sm text-muted-foreground mt-1">A próxima camada conecta esta análise ao Dossiê Vivo: aplicabilidade, argumentos favoráveis e contrários, distinguishing, lacunas probatórias, risco, ações recomendadas e fontes consideradas.</p></div><BellRing className="ml-auto text-primary hidden md:block"/></div></section>
      </div>
    </div>
  )
}

function Card({icon,title,text}:{icon:React.ReactNode,title:string,text:string}) { return <div className="rounded-2xl border border-border bg-card p-5"><div className="text-primary">{icon}</div><h3 className="font-bold mt-3">{title}</h3><p className="text-sm text-muted-foreground mt-2">{text}</p></div> }
