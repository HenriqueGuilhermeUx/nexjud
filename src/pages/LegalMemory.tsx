import { useEffect, useState } from "react"
import { Brain, Plus, Search, Trash2, Sparkles } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  createLegalMemory,
  getLegalMemory,
} from "@/services/aiWorkspaceService"
import { supabase } from "@/lib/supabase"

export default function LegalMemory() {
  const { user } = useAuth()

  const [memories, setMemories] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState("")
  const [memoryType, setMemoryType] = useState("client")
  const [importance, setImportance] = useState(3)
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")

  useEffect(() => {
    load()
  }, [user])

  useEffect(() => {
    const q = query.toLowerCase().trim()

    if (!q) {
      setFiltered(memories)
      return
    }

    setFiltered(
      memories.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(q)
      )
    )
  }, [query, memories])

  async function load() {
    if (!user?.id) return

    setLoading(true)

    try {
      const data = await getLegalMemory(user.id)
      setMemories(data || [])
      setFiltered(data || [])
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar Memória Jurídica.")
    } finally {
      setLoading(false)
    }
  }

  async function saveMemory() {
    if (!user?.id) {
      alert("Faça login novamente.")
      return
    }

    if (!title.trim()) {
      alert("Informe o título.")
      return
    }

    if (!content.trim()) {
      alert("Informe o conteúdo da memória.")
      return
    }

    try {
      await createLegalMemory({
        user_id: user.id,
        title,
        memory_type: memoryType,
        content,
        importance,
        source: "manual",
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })

      setTitle("")
      setMemoryType("client")
      setImportance(3)
      setContent("")
      setTags("")

      await load()

      alert("Memória salva.")
    } catch (error) {
      console.error(error)
      alert("Erro ao salvar memória.")
    }
  }

  async function deleteMemory(id: string) {
    if (!confirm("Excluir esta memória jurídica?")) return

    try {
      const { error } = await supabase
        .from("legal_memory")
        .delete()
        .eq("id", id)

      if (error) throw error

      await load()
    } catch (error) {
      console.error(error)
      alert("Erro ao excluir memória.")
    }
  }

  function loadExample() {
    setTitle("Cliente Exemplo - Preferência de acordo")
    setMemoryType("client")
    setImportance(5)
    setTags("cliente, acordo, estratégia")
    setContent(
      "Cliente prefere soluções rápidas e aceita acordo se a proposta representar pelo menos 70% do valor estimado. Evitar estratégias que aumentem custo processual sem ganho claro."
    )
  }

  if (loading) {
    return <div className="p-6">Carregando Memória Jurídica...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-primary" size={44} />
            <div>
              <h1 className="text-4xl font-bold">Memória Jurídica™</h1>
              <p className="text-muted-foreground mt-1">
                Ensine o NexJud a lembrar preferências, clientes, teses, padrões e estratégias.
              </p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[420px_1fr] gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 h-fit">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="text-primary" />
              <h2 className="text-xl font-bold">Nova memória</h2>
            </div>

            <div className="space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da memória"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <select
                value={memoryType}
                onChange={(e) => setMemoryType(e.target.value)}
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              >
                <option value="client">Cliente</option>
                <option value="case">Processo</option>
                <option value="strategy">Estratégia</option>
                <option value="template">Modelo</option>
                <option value="opponent">Adversário</option>
                <option value="general">Geral</option>
              </select>

              <select
                value={importance}
                onChange={(e) => setImportance(Number(e.target.value))}
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              >
                <option value={1}>Importância 1 - baixa</option>
                <option value={2}>Importância 2</option>
                <option value={3}>Importância 3 - média</option>
                <option value={4}>Importância 4</option>
                <option value={5}>Importância 5 - alta</option>
              </select>

              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags separadas por vírgula"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="O que a IA deve lembrar?"
                className="w-full h-56 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <div className="flex gap-3">
                <button
                  onClick={saveMemory}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold"
                >
                  Salvar memória
                </button>

                <button
                  onClick={loadExample}
                  className="px-5 py-3 rounded-xl bg-[#171721] border border-border font-bold flex items-center gap-2"
                >
                  <Sparkles size={16} />
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
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar memória por cliente, tese, processo, estratégia..."
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                Nenhuma memória salva ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-bold text-xl">{item.title}</h2>
                        <p className="text-sm text-muted-foreground mt-2">
                          {item.memory_type || "general"} · importância {item.importance || 3}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteMemory(item.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <p className="text-gray-300 mt-4 whitespace-pre-line">
                      {item.content}
                    </p>

                    {Array.isArray(item.tags) && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {item.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold"
                          >
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
