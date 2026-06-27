import { useEffect, useState } from "react"
import { Scale, Plus, Search, Trash2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import {
  createJurisprudence,
  searchJurisprudence,
} from "@/services/jurisprudenceService"

export default function Jurisprudence() {
  const { user } = useAuth()

  const [items, setItems] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState("")
  const [court, setCourt] = useState("")
  const [area, setArea] = useState("")
  const [theme, setTheme] = useState("")
  const [summary, setSummary] = useState("")
  const [content, setContent] = useState("")
  const [processNumber, setProcessNumber] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [tags, setTags] = useState("")

  useEffect(() => {
    load()
  }, [user])

  async function load(q = "") {
    if (!user?.id) return

    setLoading(true)

    try {
      const data = await searchJurisprudence(user.id, q)
      setItems(data)
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar jurisprudência.")
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!user?.id) {
      alert("Faça login novamente.")
      return
    }

    if (!title.trim() || !content.trim()) {
      alert("Título e conteúdo são obrigatórios.")
      return
    }

    try {
      await createJurisprudence({
        user_id: user.id,
        title,
        court: court || null,
        area: area || null,
        theme: theme || null,
        summary: summary || null,
        content,
        source_url: sourceUrl || null,
        process_number: processNumber || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })

      setTitle("")
      setCourt("")
      setArea("")
      setTheme("")
      setSummary("")
      setContent("")
      setProcessNumber("")
      setSourceUrl("")
      setTags("")

      await load()
      alert("Jurisprudência salva.")
    } catch (error: any) {
      alert(error.message || "Erro ao salvar jurisprudência.")
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir jurisprudência?")) return

    const { error } = await supabase
      .from("legal_jurisprudence")
      .delete()
      .eq("id", id)

    if (error) {
      alert("Erro ao excluir.")
      return
    }

    await load(query)
  }

  function loadExample() {
    setTitle("Exemplo - Assinatura conjunta em associação")
    setCourt("STJ / TJ")
    setArea("Civil")
    setTheme("Associação civil; estatuto; poderes de representação")
    setSummary(
      "Atos de representação de associação devem observar as regras estatutárias, especialmente quando há exigência de assinatura conjunta."
    )
    setContent(
      "Entendimento jurídico: quando o estatuto de associação exige assinatura conjunta de determinados diretores, a prática de ato por apenas um representante pode ser questionada por violação estatutária, salvo autorização expressa, ratificação válida ou regra específica aplicável."
    )
    setTags("associação, estatuto, assinatura conjunta, representação")
  }

  if (loading) {
    return <div className="p-6">Carregando jurisprudência...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Scale className="text-primary" size={44} />
            <div>
              <h1 className="text-4xl font-bold">Jurisprudência Inteligente™</h1>
              <p className="text-muted-foreground mt-1">
                Salve precedentes, entendimentos e decisões para fundamentar o Chat Jurídico.
              </p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[420px_1fr] gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 h-fit">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="text-primary" />
              <h2 className="text-xl font-bold">Adicionar jurisprudência</h2>
            </div>

            <div className="space-y-4">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
              <input value={court} onChange={(e) => setCourt(e.target.value)} placeholder="Tribunal: STJ, STF, TJSP..." className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
              <input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Área: Civil, Trabalhista..." className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
              <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Tema" className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
              <input value={processNumber} onChange={(e) => setProcessNumber(e.target.value)} placeholder="Processo / Tema / Repetitivo" className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
              <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Link da fonte" className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags separadas por vírgula" className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />

              <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Resumo" className="w-full h-24 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />

              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Conteúdo / tese / ementa / fundamento" className="w-full h-48 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4" />

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
                  placeholder="Buscar por tribunal, tese, tema, área..."
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                Nenhuma jurisprudência salva ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex justify-between gap-4">
                      <div>
                        <h2 className="font-bold text-xl">{item.title}</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.court || "sem tribunal"} · {item.area || "sem área"} · {item.theme || "sem tema"}
                        </p>
                      </div>

                      <button onClick={() => remove(item.id)} className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <p className="text-gray-300 mt-4 line-clamp-4">
                      {item.summary || item.content}
                    </p>

                    {item.source_url && (
                      <a href={item.source_url} target="_blank" rel="noreferrer" className="inline-block mt-4 text-primary text-sm font-bold hover:underline">
                        Abrir fonte
                      </a>
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
