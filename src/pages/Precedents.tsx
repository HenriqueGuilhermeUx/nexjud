import { useEffect, useState } from "react"
import { Landmark, Plus, Search, Trash2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  createPrecedent,
  searchPrecedents,
  deletePrecedent,
} from "@/services/precedentsService"

export default function Precedents() {
  const { user } = useAuth()

  const [items, setItems] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState("")
  const [tribunal, setTribunal] = useState("")
  const [tema, setTema] = useState("")
  const [numero, setNumero] = useState("")
  const [resumo, setResumo] = useState("")
  const [fundamento, setFundamento] = useState("")
  const [impacto, setImpacto] = useState("")
  const [tags, setTags] = useState("")

  useEffect(() => {
    load()
  }, [user])

  async function load(q = "") {
    if (!user?.id) return

    setLoading(true)

    try {
      const data = await searchPrecedents(user.id, q)
      setItems(data)
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar precedentes.")
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!user?.id) {
      alert("Faça login novamente.")
      return
    }

    if (!title.trim() || !fundamento.trim()) {
      alert("Título e fundamento são obrigatórios.")
      return
    }

    try {
      await createPrecedent({
        user_id: user.id,
        title,
        tribunal: tribunal || null,
        tema: tema || null,
        numero: numero || null,
        resumo: resumo || null,
        fundamento,
        impacto: impacto || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })

      setTitle("")
      setTribunal("")
      setTema("")
      setNumero("")
      setResumo("")
      setFundamento("")
      setImpacto("")
      setTags("")

      await load()
      alert("Precedente salvo.")
    } catch (error: any) {
      alert(error.message || "Erro ao salvar precedente.")
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir precedente?")) return

    try {
      await deletePrecedent(id)
      await load(query)
    } catch (error: any) {
      alert(error.message || "Erro ao excluir precedente.")
    }
  }

  function loadExample() {
    setTitle("Tema STJ - Responsabilidade civil e dano moral")
    setTribunal("STJ")
    setTema("Responsabilidade civil")
    setNumero("Tema/Repetitivo")
    setResumo("Precedente utilizado para orientar a análise de risco e a tese jurídica.")
    setFundamento(
      "Quando houver precedente qualificado aplicável, a estratégia deve considerar aderência fática, distinções possíveis e risco de superação."
    )
    setImpacto("Alto")
    setTags("STJ, precedente, repetitivo, responsabilidade civil")
  }

  if (loading) {
    return <div className="p-6">Carregando precedentes...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Landmark className="text-primary" size={44} />
            <div>
              <h1 className="text-4xl font-bold">Precedentes Inteligentes™</h1>
              <p className="text-muted-foreground mt-1">
                Salve temas, repetitivos, IRDRs, repercussão geral e precedentes estratégicos.
              </p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[420px_1fr] gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 h-fit">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="text-primary" />
              <h2 className="text-xl font-bold">Adicionar precedente</h2>
            </div>

            <div className="space-y-4">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
              <input value={tribunal} onChange={(e) => setTribunal(e.target.value)} placeholder="Tribunal: STF, STJ, TST..." className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
              <input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Tema" className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
              <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número: Tema 123, REsp..." className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
              <input value={impacto} onChange={(e) => setImpacto(e.target.value)} placeholder="Impacto: Alto, Médio, Baixo" className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags separadas por vírgula" className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />

              <textarea value={resumo} onChange={(e) => setResumo(e.target.value)} placeholder="Resumo" className="w-full h-24 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />

              <textarea value={fundamento} onChange={(e) => setFundamento(e.target.value)} placeholder="Fundamento / tese / aplicabilidade / distinção" className="w-full h-48 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />

              <div className="flex gap-3">
                <button onClick={save} className="flex-1 py-3 rounded-xl bg-primary text-white font-bold">
                  Salvar
                </button>

                <button onClick={loadExample} className="px-5 py-3 rounded-xl bg-[#171721] border border-border font-bold">
                  Exemplo
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <Search className="text-primary" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    load(e.target.value)
                  }}
                  placeholder="Buscar por tribunal, tema, número, fundamento..."
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                Nenhum precedente salvo ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex justify-between gap-4">
                      <div>
                        <h2 className="font-bold text-xl">{item.title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.tribunal || "sem tribunal"} · {item.tema || "sem tema"} · {item.numero || "sem número"}
                        </p>
                      </div>

                      <button onClick={() => remove(item.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {item.impacto && (
                      <p className="text-xs font-bold text-primary mt-3">
                        Impacto: {item.impacto}
                      </p>
                    )}

                    <p className="text-gray-300 mt-4 line-clamp-4">
                      {item.resumo || item.fundamento}
                    </p>

                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {item.tags.map((tag: string) => (
                          <span key={tag} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
