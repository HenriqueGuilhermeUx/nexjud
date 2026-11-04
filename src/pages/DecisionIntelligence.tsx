import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Brain, Search, Scale, FileText, AlertTriangle, Target, Database, ArrowRight } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { searchProcessDatajud, buildCaseTextFromDatajud, formatCnj, detectTribunalAliasFromCnj } from "@/services/datajudService"
import { searchSimilarCasesDatajud } from "@/services/realJurisprudenceService"
import { datajudCasesToEvidence } from "@/intelligence/adapters/datajudEvidenceAdapter"
import { evidenceStore } from "@/intelligence/evidenceStore"
import { buildObservedDecisionPattern } from "@/intelligence/decisionPattern"
import { auditDecisionEvidence, type DecisionEvidenceAudit } from "@/intelligence/decisionEvidenceAudit"
import { DecisionSearchGuard } from "@/intelligence/decisionSearchGuard"
import { buildDecisionReviewWorksheet } from "@/intelligence/decisionReviewWorksheet"
import ManualCourtDecisionReview from "@/components/ManualCourtDecisionReview"
import { historyUserIdForSearch } from "@/intelligence/historyWritePolicy"
import { assessPredictiveReadiness, buildPredictiveEvidenceDossier } from "@/intelligence/predictiveEvidenceDossier"
import { buildJudgeStrategyAdvice } from "@/intelligence/judgeStrategyAdvice"
import { getPrecedents } from "@/services/precedentsService"
import { runPrecedentIntelligenceAi } from "@/services/precedentIntelligenceService"

export default function DecisionIntelligence() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cnj, setCnj] = useState("")
  const [alias, setAlias] = useState("")
  const [judgeName, setJudgeName] = useState("")
  const [caseText, setCaseText] = useState("")
  const [lawyerArgument, setLawyerArgument] = useState("")
  const [process, setProcess] = useState<any>(null)
  const [evidence, setEvidence] = useState<any>(null)
  const [observedPattern, setObservedPattern] = useState<ReturnType<typeof buildObservedDecisionPattern>>(null)
  const [audit, setAudit] = useState<DecisionEvidenceAudit | null>(null)
  const [reviewLimit, setReviewLimit] = useState(8)
  const [manualReview, setManualReview] = useState<Record<string, "pendente" | "convergente" | "divergente">>({})
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [saveToHistory, setSaveToHistory] = useState(false)
  const [availablePrecedents, setAvailablePrecedents] = useState<any[]>([])
  const [selectedPrecedents, setSelectedPrecedents] = useState<string[]>([])
  const [strategyLoading, setStrategyLoading] = useState(false)
  const [strategyResult, setStrategyResult] = useState<any>(null)
  const [strategyMessage, setStrategyMessage] = useState("")
  const searchGuard = useRef(new DecisionSearchGuard())

  useEffect(() => () => searchGuard.current.invalidate(), [])

  async function loadPrecedents() {
    if (!user?.id) { setStrategyMessage("Entre na sua conta para consultar os precedentes salvos."); return }
    try {
      const items = await getPrecedents(user.id)
      setAvailablePrecedents(items.filter((item: any) => item.id && (item.fundamento || item.resumo)))
      setStrategyMessage(items.length ? "" : "Sua biblioteca ainda não tem precedentes. Cadastre documentos de decisões reais em Precedentes e retorne para comparar as teses.")
    } catch {
      setStrategyMessage("Não foi possível carregar seus precedentes. Verifique a conexão e tente novamente.")
    }
  }

  async function analyzeStrategy() {
    if (!user?.id || selectedPrecedents.length === 0) { setStrategyMessage("Selecione decisões da sua biblioteca para orientar a análise."); return }
    if (caseText.trim().length < 20 || lawyerArgument.trim().length < 10) {
      setStrategyMessage("Informe os fatos do caso e a tese jurídica com detalhes antes de solicitar a estratégia."); return
    }
    const currentUserId = user.id
    const guardVersion = searchGuard.current.begin()
    setStrategyLoading(true)
    setStrategyResult(null)
    setStrategyMessage("")
    try {
      const result = await runPrecedentIntelligenceAi({
        userId: currentUserId,
        caseFacts: caseText.trim(),
        legalIssue: lawyerArgument.trim(),
        precedentIds: selectedPrecedents,
      })
      if (!searchGuard.current.isCurrent(guardVersion)) return
      setStrategyResult(result?.result || null)
      setStrategyMessage(result?.result ? "Estratégia preliminar gerada a partir dos precedentes selecionados. Confira cada fonte." : "O motor não retornou uma estratégia verificável.")
    } catch (error) {
      if (searchGuard.current.isCurrent(guardVersion)) setStrategyMessage(error instanceof Error ? error.message : "Falha ao analisar precedentes.")
    } finally {
      if (searchGuard.current.isCurrent(guardVersion)) setStrategyLoading(false)
    }
  }

  function invalidateCurrentSearch() {
    searchGuard.current.invalidate()
    setLoading(false)
    setMessage("")
    setProcess(null)
    setEvidence(null)
    setAudit(null)
    setObservedPattern(null)
    setReviewLimit(8)
    setManualReview({})
    setStrategyResult(null)
    setStrategyMessage("")
    setStrategyLoading(false)
  }

  async function analyze() {
    if (!cnj.trim()) { setMessage("Informe o número CNJ para começar."); return }
    const requestVersion = searchGuard.current.begin()
    const requestedCnj = cnj.trim()
    const requestedAlias = alias || detectTribunalAliasFromCnj(requestedCnj)
    const providedCase = caseText.trim()
    const providedArgument = lawyerArgument.trim()
    const historyUserId = historyUserIdForSearch(saveToHistory, user?.id)
    setLoading(true)
    setMessage("")
    // A failed or changed search must never display stale results as the new case.
    setProcess(null)
    setEvidence(null)
    setObservedPattern(null)
    setAudit(null)
    setReviewLimit(8)
    setManualReview({})
    try {
      const found = await searchProcessDatajud(requestedCnj, requestedAlias, historyUserId)
      if (!searchGuard.current.isCurrent(requestVersion)) return
      if (!found.found || !found.process) { setMessage("Processo não localizado no DataJud para este tribunal."); return }
      const similar = await searchSimilarCasesDatajud({
        cnj: requestedCnj, tribunalAlias: requestedAlias,
        classe: found.process.className, assunto: found.process.subject,
      })
      if (!searchGuard.current.isCurrent(requestVersion)) return
      const normalized = datajudCasesToEvidence(similar.cases || [], requestedAlias)
      const reviewed = auditDecisionEvidence(normalized, {
        court: found.process.court || requestedAlias,
        judgingBody: found.process.courtUnit,
      })
      // Persist evidence only when it still belongs to the currently selected case.
      await evidenceStore.put(normalized)
      if (!searchGuard.current.isCurrent(requestVersion)) return
      setProcess(found.process)
      if (!providedCase) setCaseText(buildCaseTextFromDatajud(found.process))
      setAudit(reviewed)
      setObservedPattern(reviewed.enoughForDescriptivePattern
        ? buildObservedDecisionPattern(reviewed.comparableEvidence)
        : null)
      setEvidence({ prediction: similar.prediction, cases: similar.cases || [], normalized, argument: providedArgument })
    } catch (error) {
      if (!searchGuard.current.isCurrent(requestVersion)) return
      console.error(error)
      setMessage("Não foi possível concluir a análise agora. Nenhum resultado anterior será apresentado como se fosse desta consulta.")
    } finally {
      if (searchGuard.current.isCurrent(requestVersion)) setLoading(false)
    }
  }

  const p = evidence?.prediction
  const sample = audit?.comparableDecisions ?? 0
  const recordsFound = evidence?.cases?.length ?? 0
  const predictiveReadiness = audit ? assessPredictiveReadiness(audit) : null
  const judgeAdvice = audit ? buildJudgeStrategyAdvice(audit, caseText, lawyerArgument, judgeName) : null

  function downloadEvidenceDossier() {
    if (!audit || !process) return
    const content = buildPredictiveEvidenceDossier({
      processNumber: cnj,
      court: process.court || alias,
      judgingBody: process.courtUnit || "",
      caseDescription: caseText,
      argument: lawyerArgument,
      audit,
      pattern: observedPattern,
      generatedAt: new Date().toISOString(),
    })
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }))
    const link = document.createElement("a")
    link.href = url
    link.download = `nexjud-evidencias-${cnj.replace(/\D/g, "") || "processo"}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }
  const reviewDocuments = evidence?.argument && audit
    ? buildDecisionReviewWorksheet(evidence.normalized || [], {
        court: process?.court,
        judgingBody: process?.courtUnit,
      })
    : []

  return <div className="min-h-screen bg-background text-foreground">
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-7">
      <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 lg:p-10">
        <div className="inline-flex items-center gap-2 text-primary text-sm mb-4"><Brain size={17}/> NEXJUD · CARRO-CHEFE</div>
        <h1 className="text-4xl lg:text-5xl font-bold">DNA do Juiz — IA Preditiva</h1>
        <p className="text-gray-400 text-lg mt-4 max-w-4xl">Descubra quais fundamentos, argumentos e provas merecem atenção, confronte decisões documentadas e prepare a melhor estratégia para o seu caso. Identificamos tribunal, vara e magistrado quando os documentos permitem. Sem decisões atribuíveis ao juiz, não inventamos seu perfil.</p>
      </section>

      <section className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6 space-y-4">
        <h2 className="font-bold text-xl">Conte o caso e, se tiver, informe o processo e o magistrado</h2>
        <div className="grid lg:grid-cols-4 gap-3">
          <input value={cnj} onChange={e=>{ invalidateCurrentSearch(); setCnj(formatCnj(e.target.value)) }} placeholder="Número CNJ" className="lg:col-span-2 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
          <input value={alias} onChange={e=>{ invalidateCurrentSearch(); setAlias(e.target.value.toLowerCase()) }} placeholder="Tribunal: tjsp, trt2..." className="rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
          <button onClick={analyze} disabled={loading} className="rounded-xl bg-primary text-white font-bold p-4 disabled:opacity-50 flex items-center justify-center gap-2"><Search size={18}/>{loading?"LOCALIZANDO...":"ANALISAR PROCESSO"}</button>
        </div>
        <label className="block text-sm text-gray-300">Magistrado ou relator (opcional; apenas para análise individual quando identificado nas decisões)
          <input value={judgeName} onChange={e => { invalidateCurrentSearch(); setJudgeName(e.target.value) }} placeholder="Nome completo do magistrado" className="block mt-2 w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-[#343442] p-3 text-sm text-gray-300">
          <input type="checkbox" checked={saveToHistory} disabled={loading || !user?.id}
            onChange={e => { invalidateCurrentSearch(); setSaveToHistory(e.target.checked) }}
            className="mt-1 accent-primary" />
          <span><strong>Salvar este processo no meu histórico</strong> (opcional). Desmarcado por padrão:
            a análise consulta o DataJud, mas não envia um pedido de gravação do processo
            ao histórico da NexJud. </span>
        </label>
        <textarea value={caseText} onChange={e=>{ invalidateCurrentSearch(); setCaseText(e.target.value) }} placeholder="Opcional: complemente fatos, pedidos e teses que não estejam claros nos dados públicos." className="w-full h-32 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
        <textarea value={lawyerArgument} onChange={e=>{ invalidateCurrentSearch(); setLawyerArgument(e.target.value) }} placeholder="Opcional: cole o argumento, tese ou trecho da peça que você quer testar contra o padrão observado." className="w-full h-28 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
      </section>

      <section className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-[#151525] to-[#0d0d15] p-6 space-y-4" aria-label="Análise estratégica com IA">
        <p className="text-xs uppercase tracking-widest text-primary font-bold">Motor estratégico de IA · trabalho com precedentes</p>
        <h2 className="text-2xl font-bold">Qual tese defender, reforçar ou reformular?</h2>
        <p className="text-sm text-gray-300">Descreva os fatos e sua tese acima. Selecione precedentes documentados da sua biblioteca para gerar orientações sobre argumentos, objeções, provas e próximos passos. Funciona também sem número CNJ.</p>
          <div className="rounded-xl border border-[#414158] p-5 space-y-4">
            <div>
              <h3 className="font-semibold text-lg">Analisar estratégia com IA e precedentes reais</h3>
              <p className="text-sm text-gray-400 mt-1">Use decisões da sua Biblioteca de Precedentes para confrontar a tese com fatos, distinguishing, prova e contra-argumentos. O texto gerado exige revisão e não determina o comportamento do magistrado.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => { void loadPrecedents() }} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">1. Buscar decisões da minha biblioteca</button>
              <button type="button" onClick={() => navigate("/dashboard/precedents")} className="rounded-lg border border-primary/50 px-4 py-2 text-sm">Cadastrar decisões e fontes</button>
            </div>
            {availablePrecedents.length > 0 && <div className="grid md:grid-cols-2 gap-2">
              {availablePrecedents.slice(0, 12).map(item => <label key={item.id} className="flex items-start gap-3 border border-[#343446] rounded-lg p-3 text-sm">
                <input type="checkbox" checked={selectedPrecedents.includes(item.id)}
                  onChange={event => setSelectedPrecedents(current => event.target.checked ? [...current, item.id] : current.filter(id => id !== item.id))}
                  className="mt-1" />
                <span><strong>{item.title || item.numero || "Decisão"}</strong><span className="block text-xs text-gray-400">{item.tribunal || "Tribunal não informado"} · {item.numero || "Referência não informada"}</span></span>
              </label>)}
            </div>}
            <button type="button" onClick={() => { void analyzeStrategy() }}
              disabled={strategyLoading || selectedPrecedents.length === 0}
              className="rounded-xl bg-primary px-6 py-3 font-bold text-white disabled:opacity-50">
              {strategyLoading ? "Analisando fundamentos..." : "Analisar melhor argumento e estratégia"}
            </button>
            {strategyMessage && <p role="status" className="text-sm text-amber-200">{strategyMessage}</p>}
            {strategyResult && <div className="rounded-xl border border-primary/30 p-5 space-y-4 text-sm">
              <h4 className="text-lg font-semibold">Orientação estratégica preliminar</h4>
              <p className="whitespace-pre-wrap">{strategyResult.strategy_summary || "Análise não identificada."}</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div><h5 className="font-semibold">Argumentos a explorar</h5><ul className="list-disc pl-5 mt-2">{(strategyResult.favorable_arguments || []).map((a: string, i: number) => <li key={i}>{a}</li>)}</ul></div>
                <div><h5 className="font-semibold">Objeções e riscos</h5><ul className="list-disc pl-5 mt-2">{(strategyResult.adverse_arguments || []).map((a: string, i: number) => <li key={i}>{a}</li>)}</ul></div>
                <div><h5 className="font-semibold">Reforço probatório</h5><ul className="list-disc pl-5 mt-2">{(strategyResult.evidence_matrix || []).map((e: any, i: number) => <li key={i}>{e.requirement || "Prova"}: {e.recommended_action || e.gap || "Conferir"}</li>)}</ul></div>
                <div><h5 className="font-semibold">Próximos movimentos</h5><ul className="list-disc pl-5 mt-2">{(strategyResult.next_actions || []).map((a: string, i: number) => <li key={i}>{a}</li>)}</ul></div>
              </div>
              <p className="text-xs text-amber-200">Orientação gerada por IA a partir dos precedentes selecionados da biblioteca. Confira o texto, a fonte e a pertinência fática; não é conclusão empírica sobre este juiz.</p>
            </div>}
          </div>
      </section>

      {message && <p role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-200">{message}</p>}
      {!evidence ? <section className="rounded-2xl border border-dashed border-[#343442] p-8 text-center">
        <Database className="mx-auto text-gray-500 mb-3"/>
        <h2 className="font-bold text-xl">Vamos começar pelo processo</h2>
        <p className="text-gray-500 mt-2">Informe o número do processo. Quando localizarmos registros relacionados, mostraremos a quantidade recuperada e se há decisões com fundamentação suficiente para análise.</p>
        <button type="button" onClick={() => navigate("/dashboard/precedent-intelligence")} className="mt-5 rounded-lg border border-primary/60 px-5 py-3 text-sm font-semibold text-primary">Já tenho decisões: analisar argumentos e estratégias</button>
      </section> : <>
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-bold text-xl flex items-center gap-2"><Scale className="text-primary"/> O que encontramos</h2>
          <p className="text-gray-400 mt-2">Classe: {process?.className || "-"} · Assunto: {process?.subject || "-"} · Unidade: {process?.courtUnit || "-"}</p>
          <p className="text-sm text-gray-500 mt-3">{observedPattern?.warning || p?.warning || "Os registros encontrados servem como contexto, não como prova de tendência decisória ou probabilidade de êxito."}</p>
          {!observedPattern && <p role="status" className="text-sm text-amber-300 mt-3">
            A consulta processual ainda não trouxe fundamentos de decisões suficientes para identificar o entendimento do juízo. Use a biblioteca de decisões acima para comparar teses e estratégias, sem atribuir automaticamente os precedentes a um magistrado.
          </p>}
          {observedPattern && <p className="text-sm text-gray-400 mt-3">Base estruturada: {observedPattern.decisionsAnalyzed} decisões públicas normalizadas{observedPattern.period ? ` · ${observedPattern.period}` : ""}. Cada padrão mantém vínculo com as decisões que o sustentam.</p>}
        </section>
        {judgeAdvice && <section className="rounded-2xl border border-primary/40 bg-gradient-to-br from-[#151525] to-[#0d0d15] p-6 space-y-5" aria-label="DNA estratégico do juízo">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary font-bold">NexJud · DNA estratégico do juízo</p>
            <h2 className="text-2xl font-bold mt-2">Qual estratégia vale testar neste caso?</h2>
            <p className="text-sm text-gray-300 mt-2">{judgeAdvice.headline}</p>
            <p className="text-xs text-amber-200 mt-3">{judgeAdvice.disclaimer}</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-3">
            {judgeAdvice.actions.map((action) => <article key={action.title} className="rounded-xl border border-[#36364d] bg-black/20 p-4 space-y-3">
              <h3 className="font-semibold">{action.title}</h3>
              <p className="whitespace-pre-wrap break-words text-sm text-gray-200">{action.recommendation}</p>
              <p className="text-xs text-gray-400">{action.rationale}</p>
              {action.references.length > 0 && <div className="text-xs text-primary">
                Fontes: {action.references.map(ref => ref.sourceUrl
                  ? <a key={ref.id} href={ref.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline mr-2">{ref.document}</a>
                  : <span key={ref.id} className="mr-2">{ref.document} (conferir no tribunal)</span>)}
              </div>}
            </article>)}
          </div>

        </section>}
        {predictiveReadiness && <section className="rounded-2xl border border-primary/30 bg-[#111118] p-6 space-y-4" aria-label="Prontidão da inteligência preditiva">
          <div className="flex flex-wrap gap-4 justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-bold">NexJud · Inteligência Preditiva</p>
              <h2 className="text-2xl font-bold mt-1">{predictiveReadiness.label}</h2>
              <p className="text-sm text-gray-300 mt-2 max-w-3xl">{predictiveReadiness.explanation}</p>
            </div>
            <button type="button" onClick={downloadEvidenceDossier} className="rounded-xl bg-primary px-5 py-3 font-semibold text-white">
              Baixar dossiê de evidências
            </button>
          </div>
          <p className="text-xs text-amber-200">O dossiê contém fontes, contagens, exclusões e próximos passos. Não fornece percentual de êxito nem julgamento automatizado.</p>
          <h3 className="font-semibold">Próximas verificações para fortalecer a análise</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
            {predictiveReadiness.nextActions.map((action, index) => <li key={index}>{action}</li>)}
          </ul>
        </section>}
        {audit && <section className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6 space-y-4" aria-label="Auditoria das evidências">
          <h2 className="font-bold text-xl">Auditoria das fontes e limitações</h2>
          <p className="text-sm text-gray-400">
            {audit.distinctRecords} registro(s) distinto(s) após excluir {audit.duplicateRecords} duplicata(s).
            O DataJud oferece metadados processuais; eles não são, por si, decisões com inteiro teor.
            A análise não identifica automaticamente convergência ou divergência da sua tese.
          </p>
          {audit.gaps.length > 0 && <ul className="space-y-3">
            {audit.gaps.map(gap => <li key={gap.label} className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm">
              <strong className="text-amber-200">{gap.label}: {gap.count}</strong>
              <p className="mt-1 text-gray-400">{gap.guidance}</p>
            </li>)}
          </ul>}
          <h3 className="font-semibold">Registros para conferência de origem</h3>
          {audit.review.length === 0 && <p className="text-sm text-gray-500">Nenhum registro recuperado para conferência.</p>}
          {audit.review.length > 0 && <ul className="space-y-2">
            {audit.review.slice(0, reviewLimit).map((item, index) => <li key={item.id + "-" + index} className="rounded-xl border border-[#2a2a35] p-3 text-sm">
              <p className="font-medium text-gray-200">{item.processNumber || "Processo sem número verificável"}</p>
              <p className="text-xs text-gray-400 mt-1">Origem: {item.source} · Tribunal: {item.court || "não identificado"} · Órgão: {item.judgingBody || "não identificado"}</p>
              <p className="text-xs text-gray-400">Identificador informado: {item.documentReference || item.id || "não disponível"} · Data da decisão: {item.decisionDate || "não identificada"}</p>
              {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-primary underline mt-2">Abrir referência informada (conferir autenticidade)</a>}
              <p className={item.comparable ? "text-xs text-emerald-300 mt-1" : "text-xs text-amber-300 mt-1"}>
                {item.comparable ? "Decisão qualificada e comparável ao órgão selecionado" : item.qualified ? "Decisão documentada, mas de outro juízo" : "Registro contextual; insuficiente para padrão decisório"}
              </p>
              {item.exclusionReasons.length > 0 && <p className="text-xs text-gray-400 mt-1">Pendências: {item.exclusionReasons.join("; ")}.</p>}
            </li>)}
          </ul>}
          {audit.review.length > reviewLimit && <button type="button" onClick={() => setReviewLimit(current => current + 8)}
            className="rounded-lg border border-[#3c3c4a] px-4 py-2 text-sm hover:border-primary/60">
            Mostrar mais registros ({Math.min(reviewLimit, audit.review.length)} de {audit.review.length})
          </button>}
        </section>}
        {evidence?.argument && <section aria-label="Confronto documental para revisão humana" className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6 space-y-4">
          <h2 className="font-bold text-xl">Confronto documental — revisão do advogado</h2>
          <p className="text-sm text-gray-400">
            Sua tese: {evidence.argument.slice(0, 450)}{evidence.argument.length > 450 ? "…" : ""}
          </p>
          <p className="text-sm text-amber-200">
            A NexJud não determinou convergência nem divergência. Compare o argumento com o
            inteiro teor original antes de marcar sua avaliação. Marcações são locais a esta
            consulta e não são salvas nem transformadas em previsão.
          </p>
          {reviewDocuments.length === 0 && <p role="status" className="text-sm text-gray-400">
            Ainda não há fundamentações documentadas do mesmo órgão julgador disponíveis para
            confronto. Os metadados DataJud não permitem inferir o entendimento do magistrado.
          </p>}
          {reviewDocuments.map((document) => <article key={document.evidenceId} className="rounded-xl border border-[#353543] p-4 space-y-3">
            <p className="font-semibold">Decisão {document.documentReference || document.evidenceId}</p>
            <p className="text-xs text-gray-400">
              {document.court} · {document.judgingBody || "Órgão não identificado"} · {document.decisionDate || "Sem data"}
              {document.processNumber ? ` · Processo ${document.processNumber}` : ""}
            </p>
            <p className="text-sm">Resultado registrado no documento: {document.observedOutcome}</p>
            <h3 className="text-sm font-semibold">Fundamentação estruturada na fonte</h3>
            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-300">
              {document.reasoningExcerpts.map((reason, index) => <li key={index}>{reason}</li>)}
            </ul>
            {document.remainingReasoningSegments > 0 && <p className="text-xs text-gray-500">
              Mais {document.remainingReasoningSegments} trecho(s) não exibido(s); consulte o documento original.
            </p>}
            {document.sourceUrl && <a href={document.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
              Abrir referência original (verificar autenticidade)
            </a>}
            {!document.sourceUrl && <p className="text-xs text-amber-200">
              Sem link público informado. Confira a autenticidade pelo identificador documental.
            </p>}
            <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
              <span>Avaliação manual (não salva):</span>
              <select value={manualReview[document.evidenceId] || "pendente"}
                onChange={(event) => setManualReview(current => ({
                  ...current,
                  [document.evidenceId]: event.target.value as "pendente" | "convergente" | "divergente",
                }))}
                className="rounded-lg bg-[#101017] border border-[#424253] p-2">
                <option value="pendente">Pendente de análise</option>
                <option value="convergente">Convergência apontada pelo advogado</option>
                <option value="divergente">Divergência apontada pelo advogado</option>
              </select>
            </label>
          </article>)}
        </section>}
        {observedPattern && <section className="grid lg:grid-cols-3 gap-4">
          <Insight icon={<Target/>} title="Teses citadas na amostra" text={observedPattern.recurringTheses.length
            ? observedPattern.recurringTheses.slice(0, 5).map(item => `${item.label} (${item.count})`).join("; ")
            : "Nenhuma tese estruturada foi identificada com fonte suficiente."}/>
          <Insight icon={<AlertTriangle/>} title="Resultados documentados" text={observedPattern.observedOutcomes.length
            ? observedPattern.observedOutcomes.slice(0, 5).map(item => `${item.label} (${item.count})`).join("; ")
            : "Nenhum resultado estruturado disponível."}/>
          <Insight icon={<Brain/>} title="Comparação com sua tese" text={lawyerArgument.trim()
            ? "Você informou um argumento, mas ainda não foi realizado confronto semântico verificável com a fundamentação. Confira os documentos originais."
            : "Inclua fatos e argumentos para preparar a revisão profissional; ainda não há comparação automática comprovada."}/>
        </section>}
      </>}

      <section className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6 space-y-3" aria-label="Documento judicial informado pelo advogado">
        <h2 className="font-bold text-xl">Já tem uma decisão judicial em mãos?</h2>
        <p className="text-sm text-gray-400">Cole um trecho da fundamentação e informe o endereço público ou identificador do documento. A conferência será manual, sem enviar esse material ao servidor nem misturá-lo à contagem de decisões verificadas.</p>
        {lawyerArgument.trim()
          ? <ManualCourtDecisionReview key={`${cnj}:${alias}:${lawyerArgument}`} argument={lawyerArgument.trim()} />
          : <p className="text-sm text-amber-200">Para começar, preencha sua tese no campo “argumento” acima.</p>}
      </section>

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
