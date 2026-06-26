import { useEffect, useState } from "react"
import { Briefcase, Plus, Search, Trash2, Sparkles } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  createLegalCase,
  getLegalCases,
} from "@/services/aiWorkspaceService"
import { supabase } from "@/lib/supabase"

export default function LegalCases() {
  const { user } = useAuth()

  const [cases, setCases] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState("")
  const [clientName, setClientName] = useState("")
  const [processNumber, setProcessNumber] = useState("")
  const [opponentName, setOpponentName] = useState("")
  const [court, setCourt] = useState("")
  const [riskLevel, setRiskLevel] = useState("MÉDIO")
  const [successProbability, setSuccessProbability] = useState(50)
  const [summary, setSummary] = useState("")
  const [tags, setTags] = useState("")

  useEffect(() => {
    load()
  }, [user])

  useEffect(() => {
    const q = query.toLowerCase().trim()

    if (!q) {
      setFiltered(cases)
      return
    }

    setFiltered(
      cases.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(q)
      )
    )
  }, [query, cases])

  async function load() {
    if (!user?.id) return

    setLoading(true)

    try {
      const data = await getLegalCases(user.id)
      setCases(data || [])
      setFiltered(data || [])
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar casos.")
    } finally {
      setLoading(false)
    }
  }

  async function saveCase() {
    if (!user?.id) {
      alert("Faça login novamente.")
      return
    }

    if (!title.trim()) {
      alert("Informe o título do caso.")
      return
    }

    try {
      await createLegalCase({
        user_id: user.id,
        title,
        client_name: clientName || null,
        process_number: processNumber || null,
        opponent_name: opponentName || null,
        court: court || null,
        risk_level: riskLevel,
        success_probability: successProbability,
        summary,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: "active",
      })

      setTitle("")
      setClientName("")
      setProcessNumber("")
      setOpponentName("")
      setCourt("")
      setRiskLevel("MÉDIO")
      setSuccessProbability(50)
      setSummary("")
      setTags("")

      await load()

      alert("Caso salvo.")
    } catch (error) {
      console.error(error)
      alert("Erro ao salvar caso.")
    }
  }

  async function deleteCase(id: string) {
    if (!confirm("Excluir este caso jurídico?")) return

    try {
      const { error } = await supabase
        .from("legal_cases")
        .delete()
        .eq("id", id)

      if (error) throw error

      await load()
    } catch (error) {
      console.error(error)
      alert("Erro ao excluir caso.")
    }
  }

  function loadExample() {
    setTitle("Ação contra banco por descontos indevidos")
    setClientName("Cliente Exemplo")
    setProcessNumber("0000000-00.2026.8.26.0000")
    setOpponentName("Banco Exemplo S.A.")
    setCourt("TJSP")
    setRiskLevel("MÉDIO")
    setSuccessProbability(72)
    setTags("banco, consumidor, dano moral")
    setSummary(
      "Cliente possui extratos e protocolos demonstrando descontos não reconhecidos. Estratégia recomendada: organizar documentos, pedir cessação dos descontos, repetição de indébito e avaliar dano moral conforme prova disponível."
    )
  }

  if (loading) {
    return <div className="p-6">Carregando Casos Jurídicos...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Briefcase className="text-primary" size={44} />
            <div>
              <h1 className="text-4xl font-bold">Casos Jurídicos™</h1>
              <p className="text-muted-foreground mt-1">
                Organize clientes, processos, adversários, risco e estratégia em uma base contextual.
              </p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[420px_1fr] gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 h-fit">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="text-primary" />
              <h2 className="text-xl font-bold">Novo caso</h2>
            </div>

            <div className="space-y-4">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do caso"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Cliente"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <input
                value={processNumber}
                onChange={(e) => setProcessNumber(e.target.value)}
                placeholder="Número do processo"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <input
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                placeholder="Adversário"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <input
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                placeholder="Tribunal / Vara"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              >
                <option value="BAIXO">Risco baixo</option>
                <option value="MÉDIO">Risco médio</option>
                <option value="ALTO">Risco alto</option>
              </select>

              <input
                type="number"
                min={0}
                max={100}
                value={successProbability}
                onChange={(e) => setSuccessProbability(Number(e.target.value))}
                placeholder="Chance de êxito"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Tags separadas por vírgula"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Resumo estratégico do caso..."
                className="w-full h-40 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <div className="flex gap-3">
                <button
                  onClick={saveCase}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold"
                >
                  Salvar caso
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
                  placeholder="Buscar por cliente, processo, adversário, risco..."
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                Nenhum caso salvo ainda.
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
                          {item.client_name || "sem cliente"} ·{" "}
                          {item.process_number || "sem processo"} ·{" "}
                          {item.opponent_name || "sem adversário"}
                        </p>
                      </div>

                      <button
                        onClick={() => deleteCase(item.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3 mt-4">
                      <MiniBox label="Risco" value={item.risk_level || "-"} />
                      <MiniBox label="Chance" value={`${item.success_probability || 0}%`} />
                      <MiniBox label="Status" value={item.status || "active"} />
                    </div>

                    <p className="text-gray-300 mt-4 whitespace-pre-line">
                      {item.summary || "-"}
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

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-bold text-gray-200">{value}</p>
    </div>
  )
}
