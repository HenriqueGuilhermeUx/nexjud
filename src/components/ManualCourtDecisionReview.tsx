import { useState } from "react"
import { prepareLawyerProvidedDecision, type LocalReviewDocument } from "@/intelligence/lawyerProvidedDecision"

type Assessment = "pendente" | "convergente" | "divergente"
type Review = { id: number; document: LocalReviewDocument; assessment: Assessment }

/** Purely local, unverified source worksheet. No persistence, upload, or AI analysis. */
export default function ManualCourtDecisionReview({ argument }: { argument: string }) {
  const [reference, setReference] = useState("")
  const [url, setUrl] = useState("")
  const [excerpt, setExcerpt] = useState("")
  const [reviews, setReviews] = useState<Review[]>([])
  const [error, setError] = useState("")

  function addDocument() {
    const result = prepareLawyerProvidedDecision({
      documentReference: reference, sourceUrl: url, reasoningExcerpt: excerpt,
    })
    if (result.ok === false) { setError(result.error); return }
    if (reviews.length >= 5) { setError("Limite de cinco documentos por sessão local."); return }
    const document = result.document
    setReviews(current => [...current, {
      id: current.reduce((max, review) => Math.max(max, review.id), 0) + 1,
      document,
      assessment: "pendente",
    }])
    setReference("")
    setUrl("")
    setExcerpt("")
    setError("")
  }

  return <div className="space-y-4">
    <p className="text-sm text-amber-200">
      Fonte informada pelo advogado, não autenticada pela NexJud. Nenhum desses trechos
      compõe estatísticas, padrões ou previsões de resultado. Revise o original.
    </p>
    <div className="grid md:grid-cols-2 gap-3">
      <label className="text-sm space-y-1">
        <span>Identificador do documento (se disponível)</span>
        <input value={reference} onChange={e => setReference(e.target.value)}
          placeholder="Número/ID da decisão" maxLength={180}
          className="w-full rounded-lg bg-[#0f0f15] border border-[#353542] p-3" />
      </label>
      <label className="text-sm space-y-1">
        <span>URL pública do tribunal (se disponível)</span>
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://..." type="url" maxLength={2048}
          className="w-full rounded-lg bg-[#0f0f15] border border-[#353542] p-3" />
      </label>
    </div>
    <label className="text-sm space-y-1 block">
      <span>Trecho literal da fundamentação (copiado do documento)</span>
      <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)}
        placeholder="Cole aqui o fundamento, sem acrescentar interpretações da NexJud."
        rows={4} maxLength={12000}
        className="w-full rounded-lg bg-[#0f0f15] border border-[#353542] p-3"/>
    </label>
    <button type="button" onClick={addDocument}
      className="rounded-lg border border-primary/60 px-4 py-2 text-sm hover:bg-primary/10">
      Adicionar para confronto local
    </button>
    {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
    {reviews.map(review => <article key={review.id} className="rounded-xl border border-[#353542] p-4 space-y-3">
      <h3 className="font-semibold">Documento informado pelo advogado (não verificado)</h3>
      <p className="text-xs text-gray-400">
        Referência: {review.document.documentReference || "não indicada"}
      </p>
      {review.document.sourceUrl && <a target="_blank" rel="noopener noreferrer"
        href={review.document.sourceUrl} className="text-sm text-primary underline">
        Abrir endereço informado — conferir autenticidade
      </a>}
      <div className="grid md:grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-[#33333d] p-3">
          <p className="font-semibold mb-2">Tese fornecida pelo advogado</p>
          <p className="whitespace-pre-wrap break-words">{argument}</p>
        </div>
        <div className="rounded-lg border border-[#33333d] p-3">
          <p className="font-semibold mb-2">Fundamentação colada pelo advogado</p>
          <p className="whitespace-pre-wrap break-words">{review.document.reasoningExcerpt}</p>
        </div>
      </div>
      <label className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
        <span>Sua avaliação manual (não salva):</span>
        <select value={review.assessment}
          onChange={e => setReviews(current => current.map(item => item.id === review.id
            ? { ...item, assessment: e.target.value as Assessment } : item))}
          className="rounded-lg bg-[#0f0f15] border border-[#424253] p-2">
          <option value="pendente">Pendente de análise</option>
          <option value="convergente">Convergência apontada pelo advogado</option>
          <option value="divergente">Divergência apontada pelo advogado</option>
        </select>
      </label>
      <button type="button" className="text-xs text-gray-400 underline"
        onClick={() => setReviews(current => current.filter(item => item.id !== review.id))}>
        Remover desta sessão
      </button>
    </article>)}
    <p className="text-xs text-gray-500">Este material permanece apenas na memória desta tela. Ao mudar o caso ou a tese, ele é descartado.</p>
  </div>
}
