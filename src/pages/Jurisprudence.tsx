import { useState } from "react"
import { supabase } from "@/lib/supabase"

type Decision = { title: string; court: string; result: string | null; sourceId: string | null; sourceUrl: string | null }
type SearchResult = {
  decisionsCount: number
  analysis: string
  decisions: Decision[]
  warning: string
  source: string
}

export default function Jurisprudence() {
  const [theme, setTheme] = useState("")
  const [court, setCourt] = useState("STJ")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<SearchResult | null>(null)

  async function search() {
    if (!theme.trim()) { setError("Informe um tema de pesquisa."); return }
    setError("")
    setResult(null)
    setLoading(true)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("search-jurisprudence", {
        body: { theme: theme.trim(), court },
      })
      if (invokeError || data?.error) throw new Error(data?.error || "Consulta indisponível.")
      if (!data || !Array.isArray(data.decisions)) throw new Error("Resposta da fonte sem evidências verificáveis.")
      setResult(data as SearchResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao consultar a fonte jurisprudencial.")
    } finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-background text-foreground p-6 lg:p-10">
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold">Pesquisa de Jurisprudência</h1>
        <p className="text-muted-foreground mt-2">Registros retornados pela fonte consultada, sem taxas de êxito simuladas ou tendências inventadas.</p>
      </header>
      <section className="rounded-xl border border-border p-5 space-y-4">
        <label className="block text-sm font-medium" htmlFor="juris-theme">Tema da pesquisa</label>
        <textarea id="juris-theme" value={theme} onChange={e=>setTheme(e.target.value)} className="w-full p-3 rounded-md border border-border bg-background" rows={3} maxLength={500} />
        <label className="block text-sm font-medium" htmlFor="juris-court">Tribunal</label>
        <select id="juris-court" value={court} onChange={e=>setCourt(e.target.value)} className="w-full p-3 rounded-md border border-border bg-background">
          {["STF","STJ","TRF1","TRF2","TRF3","TRF4"].map(x=><option key={x} value={x}>{x}</option>)}
        </select>
        <button disabled={loading} onClick={search} className="rounded-lg bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">{loading ? "Consultando..." : "Pesquisar"}</button>
        {error && <p role="alert" className="text-destructive">{error}</p>}
      </section>
      {result && <section className="space-y-4" aria-live="polite">
        <div className="rounded-xl border border-border p-5">
          <h2 className="text-xl font-semibold">{result.decisions.length} registros recuperados</h2>
          <p className="text-muted-foreground mt-2">{result.analysis}</p>
          <p className="text-sm mt-3">Fonte: {result.source}. {result.warning}</p>
        </div>
        {result.decisions.map((item,i)=><article key={item.sourceId || i} className="rounded-xl border border-border p-5 space-y-2">
          <h3 className="font-semibold">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.court} · Resultado: {item.result || "Não informado"}</p>
          {item.sourceUrl ? <a className="underline text-primary" href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Conferir na fonte</a> : <p className="text-xs text-muted-foreground">Link direto não disponibilizado pela fonte. Verifique o inteiro teor antes de citar.</p>}
        </article>)}
        {!result.decisions.length && <p>Nenhum registro retornado para esta pesquisa.</p>}
      </section>}
    </div>
  </main>
}
