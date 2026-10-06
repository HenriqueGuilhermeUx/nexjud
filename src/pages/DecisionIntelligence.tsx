import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Brain, Search, Scale, FileText, AlertTriangle, Target, Database, ArrowRight } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { searchProcessDatajud, buildCaseTextFromDatajud, formatCnj, detectTribunalAliasFromCnj } from "@/services/datajudService"
import { searchSimilarCasesDatajud } from "@/services/realJurisprudenceService"\nimport { datajudCasesToEvidence } from "@/intelligence/adapters/datajudEvidenceAdapter"\nimport { evidenceStore } from "@/intelligence/evidenceStore"\nimport { buildObservedDecisionPattern } from "@/intelligence/decisionPattern"

export default function DecisionIntelligence() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cnj, setCnj] = useState("")
  const [alias, setAlias] = useState("")
  const [caseText, setCaseText] = useState("")
  const [lawyerArgument, setLawyerArgument] = useState("")
  const [process, setProcess] = useState<any>(null)
  const [evidence, setEvidence] = useState<any>(null)\n  const [observedPattern, setObservedPattern] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function analyze() {
    if (!cnj.trim()) { alert("Informe o número CNJ para começar."); return }
    setLoading(true)
    try {
      const tribunal = alias || detectTribunalAliasFromCnj(cnj)
      const found = await searchProcessDatajud(cnj, tribunal, user?.id)
      if (!found.found || !found.process) { alert("Processo não localizado no DataJud para este tribunal."); return }
      setProcess(found.process)
      const base = caseText.trim() || buildCaseTextFromDatajud(found.process)
      setCaseText(base)
      const similar = await searchSimilarCasesDatajud({
        cnj, tribunalAlias: tribunal, classe: found.process.className, assunto: found.process.subject,
      })
      const normalized = datajudCasesToEvidence(similar.cases || [], tribunal)\n      await evidenceStore.put(normalized)\n      setObservedPattern(buildObservedDecisionPattern(normalized))\n      setEvidence({ prediction: similar.prediction, cases: similar.cases || [], normalized, argument: lawyerArgument.trim() })
    } catch (error) {
      console.error(error)
      alert("Não foi possível concluir a análise agora. Os dados disponíveis não serão apresentados como previsão.")
    } finally { setLoading(false) }
  }

  const p = evidence?.prediction
  const sample = Number(p?.sampledCases || evidence?.cases?.length || 0)

  return <div className="min-h-screen bg-background text-foreground">
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-7">
      <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 lg:p-10">
        <div className="inline-flex items-center gap-2 text-primary text-sm mb-4"><Brain size={17}/> ANÁLISE DO JUÍZO</div>
        <h1 className="text-4xl lg:text-5xl font-bold">Como este juízo costuma decidir casos como o seu?</h1>
        <p className="text-gray-400 text-lg mt-4 max-w-4xl">Informe o processo e, se quiser, acrescente os pontos principais da sua tese. A NexJud compara fatos, pedidos e argumentos com decisões públicas encontradas para este juízo e mostra o que merece sua atenção — sem prever ou garantir o resultado.</p>
      </section>

      <section className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6 space-y-4">
        <h2 className="font-bold text-xl">Por onde quer começar?</h2>
        <div className="grid lg:grid-cols-4 gap-3">
          <input value={cnj} onChange={e=>setCnj(formatCnj(e.target.value))} placeholder="Número CNJ" className="lg:col-span-2 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
          <input value={alias} onChange={e=>setAlias(e.target.value.toLowerCase())} placeholder="Tribunal: tjsp, trt2..." className="rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
          <button onClick={analyze} disabled={loading} className="rounded-xl bg-primary text-white font-bold p-4 disabled:opacity-50 flex items-center justify-center gap-2"><Search size={18}/>{loading?"LOCALIZANDO...":"ANALISAR PROCESSO"}</button>
        </div>
        <textarea value={caseText} onChange={e=>setCaseText(e.target.value)} placeholder="Opcional: complemente fatos, pedidos e teses que não estejam claros nos dados públicos." className="w-full h-32 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
        <textarea value={lawyerArgument} onChange={e=>setLawyerArgument(e.target.value)} placeholder="Opcional: cole o argumento, tese ou trecho da peça que você quer testar contra o padrão observado." className="w-full h-28 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
      </section>

      {!evidence ? <section className="rounded-2xl border border-dashed border-[#343442] p-8 text-center">
        <Database className="mx-auto text-gray-500 mb-3"/>
        <h2 className="font-bold text-xl">Vamos começar pelo processo</h2>
        <p className="text-gray-500 mt-2">Informe o número do processo. Quando localizarmos decisões relacionadas, você verá quantas foram analisadas, de qual período são e quais decisões sustentam a análise.</p>
      </section> : <>
        <section className="grid md:grid-cols-4 gap-4">
          <Box label="Decisões analisadas" value={String(sample)} />
          <Box label="Decisões encontradas" value={String(p?.totalFound || evidence.cases.length || 0)} />
          <Box label="Período" value={p?.period || "Conforme dados retornados"} />
          <Box label="Fonte" value={p?.source || "DataJud/CNJ"} />
        </section>
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-bold text-xl flex items-center gap-2"><Scale className="text-primary"/> O que encontramos</h2>
          <p className="text-gray-400 mt-2">Classe: {process?.className || "-"} · Assunto: {process?.subject || "-"} · Unidade: {process?.courtUnit || "-"}</p>
          <p className="text-sm text-gray-500 mt-3">{observedPattern?.warning || p?.warning || "As decisões encontradas servem de apoio à estratégia. Esta análise não representa probabilidade de êxito nem garantia de resultado."}</p>\n          {observedPattern && <p className="text-sm text-gray-400 mt-3">Base estruturada: {observedPattern.decisionsAnalyzed} decisões públicas normalizadas{observedPattern.period ? ` · ${observedPattern.period}` : ""}. Cada padrão mantém vínculo com as decisões que o sustentam.</p>}
        </section>
        <section className="grid lg:grid-cols-3 gap-4">
          <Insight icon={<Target/>} title="O que favorece sua tese" text="Veja quais fatos, pedidos e fundamentos do seu caso também aparecem nas decisões encontradas. Confira sempre as decisões que sustentam a análise."/>
          <Insight icon={<AlertTriangle/>} title="Pontos de atenção" text="Veja diferenças relevantes, fundamentos que não costumam ser acolhidos e pontos do seu caso que merecem reforço."/>
          <Insight icon={<Brain/>} title="Como fortalecer o caso" text={lawyerArgument ? "Sua tese foi incluída na análise. Use as decisões encontradas para reforçar, ajustar ou delimitar o argumento." : "Acrescente uma tese ou argumento para tornar a análise mais útil à sua estratégia."}/>
        </section>
      </>}

      <section className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6">
        <h2 className="font-bold text-xl">E agora, o que você quer fazer?</h2>
        <p className="text-gray-400 mt-1 mb-4">Leve a análise para o trabalho do caso sem precisar entender os motores que funcionam por trás da NexJud.</p>
        <div className="grid md:grid-cols-3 gap-3">
          <Next title="Abrir Dossiê Vivo" desc="Leve contexto e evidências para acompanhar o caso." onClick={()=>navigate("/dashboard/live-dossier")}/>
          <Next title="Preparar documento" desc="Transforme a estratégia em minuta ou peça." onClick={()=>navigate("/dashboard/draft-generator")}/>
          <Next title="Conferir decisões" desc="Confira os fundamentos e as fontes usadas na análise." onClick={()=>navigate("/dashboard/jurisprudence-library")}/>
        </div>
        <p className="text-xs text-gray-500 mt-5">A NexJud mostra as ferramentas certas conforme o trabalho avança. Você não precisa navegar pela complexidade técnica do sistema.</p>
      </section>
    </div>
  </div>
}

function Box({label,value}:{label:string,value:string}) { return <div className="rounded-2xl bg-[#111118] border border-[#2a2a35] p-5"><p className="text-xs text-gray-500">{label}</p><p className="font-bold text-lg mt-1">{value}</p></div> }
function Insight({icon,title,text}:{icon:any,title:string,text:string}) { return <div className="rounded-2xl bg-[#111118] border border-[#2a2a35] p-6"><div className="text-primary mb-3">{icon}</div><h3 className="font-bold text-xl">{title}</h3><p className="text-gray-400 mt-2">{text}</p></div> }
function Next({title,desc,onClick}:{title:string,desc:string,onClick:()=>void}) { return <button onClick={onClick} className="text-left rounded-xl border border-[#2a2a35] bg-black/20 p-5 hover:border-primary/50"><FileText className="text-primary mb-3"/><p className="font-bold">{title}</p><p className="text-sm text-gray-500 mt-1">{desc}</p><ArrowRight className="mt-3" size={17}/></button> }
