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

export default function DecisionIntelligence() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [cnj, setCnj] = useState("")
  const [alias, setAlias] = useState("")
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
  const searchGuard = useRef(new DecisionSearchGuard())

  useEffect(() => () => searchGuard.current.invalidate(), [])

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
  const reviewDocuments = evidence?.argument && audit
    ? buildDecisionReviewWorksheet(evidence.normalized || [], {
        court: process?.court,
        judgingBody: process?.courtUnit,
      })
    : []

  return <div className="min-h-screen bg-background text-foreground">
    <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-7">
      <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 lg:p-10">
        <div className="inline-flex items-center gap-2 text-primary text-sm mb-4"><Brain size={17}/> ANÁLISE DO JUÍZO</div>
        <h1 className="text-4xl lg:text-5xl font-bold">Como este juízo costuma decidir casos como o seu?</h1>
        <p className="text-gray-400 text-lg mt-4 max-w-4xl">Informe o processo e, se quiser, acrescente os pontos principais da sua tese. A NexJud consulta registros processuais públicos para contextualizar o caso. A comparação de fundamentações e resultados dependerá de decisões com inteiro teor verificável; não há previsão de êxito.</p>
      </section>

      <section className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6 space-y-4">
        <h2 className="font-bold text-xl">Por onde quer começar?</h2>
        <div className="grid lg:grid-cols-4 gap-3">
          <input value={cnj} onChange={e=>{ invalidateCurrentSearch(); setCnj(formatCnj(e.target.value)) }} placeholder="Número CNJ" className="lg:col-span-2 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
          <input value={alias} onChange={e=>{ invalidateCurrentSearch(); setAlias(e.target.value.toLowerCase()) }} placeholder="Tribunal: tjsp, trt2..." className="rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"/>
          <button onClick={analyze} disabled={loading} className="rounded-xl bg-primary text-white font-bold p-4 disabled:opacity-50 flex items-center justify-center gap-2"><Search size={18}/>{loading?"LOCALIZANDO...":"ANALISAR PROCESSO"}</button>
        </div>
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

      {message && <p role="alert" className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-200">{message}</p>}
      {!evidence ? <section className="rounded-2xl border border-dashed border-[#343442] p-8 text-center">
        <Database className="mx-auto text-gray-500 mb-3"/>
        <h2 className="font-bold text-xl">Vamos começar pelo processo</h2>
        <p className="text-gray-500 mt-2">Informe o número do processo. Quando localizarmos registros relacionados, mostraremos a quantidade recuperada e se há decisões com fundamentação suficiente para análise.</p>
      </section> : <>
        <section className="grid md:grid-cols-4 gap-4">
          <Box label="Registros processuais recuperados" value={String(recordsFound)} />
          <Box label="Decisões documentadas na busca" value={String(audit?.qualifiedDecisions ?? 0)} />
          <Box label="Decisões comparáveis ao juízo" value={String(sample)} />
          <Box label="Período de decisões comparáveis" value={audit?.period || "Não identificado"} />
        </section>
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-bold text-xl flex items-center gap-2"><Scale className="text-primary"/> O que encontramos</h2>
          <p className="text-gray-400 mt-2">Classe: {process?.className || "-"} · Assunto: {process?.subject || "-"} · Unidade: {process?.courtUnit || "-"}</p>
          <p className="text-sm text-gray-500 mt-3">{observedPattern?.warning || p?.warning || "Os registros encontrados servem como contexto, não como prova de tendência decisória ou probabilidade de êxito."}</p>
          {!observedPattern && <p role="status" className="text-sm text-amber-300 mt-3">
            Não há amostra comparável suficiente para descrever padrões deste juízo. Exigimos, para uma
            síntese exploratória, ao menos três decisões distintas do mesmo órgão, com fundamentação,
            resultado, data e origem rastreável. Esse mínimo não garante representatividade
            nem autoriza previsão de êxito ou de comportamento do magistrado.
          </p>}
          {observedPattern && <p className="text-sm text-gray-400 mt-3">Base estruturada: {observedPattern.decisionsAnalyzed} decisões públicas normalizadas{observedPattern.period ? ` · ${observedPattern.period}` : ""}. Cada padrão mantém vínculo com as decisões que o sustentam.</p>}
        </section>
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
