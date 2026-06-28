import { useEffect, useState } from "react"
import { Search, Plus, Trash2, Scale } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  createCnjProcess,
  searchCnjProcesses,
  deleteCnjProcess,
} from "@/services/cnjService"

export default function CNJProcesses() {
  const { user } = useAuth()

  const [items, setItems] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const [processNumber, setProcessNumber] = useState("")
  const [court, setCourt] = useState("")
  const [className, setClassName] = useState("")
  const [subject, setSubject] = useState("")
  const [lastMovement, setLastMovement] = useState("")

  useEffect(() => {
    load()
  }, [user])

  async function load(q = "") {
    if (!user?.id) return

    setLoading(true)
    try {
      const data = await searchCnjProcesses(user.id, q)
      setItems(data)
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar processos CNJ.")
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!user?.id) {
      alert("Faça login novamente.")
      return
    }

    if (!processNumber.trim()) {
      alert("Número do processo é obrigatório.")
      return
    }

    try {
      await createCnjProcess({
        user_id: user.id,
        process_number: processNumber,
        court: court || null,
        class_name: className || null,
        subject: subject || null,
        last_movement: lastMovement || null,
        movements: lastMovement
          ? [{ date: new Date().toISOString(), text: lastMovement }]
          : [],
      })

      setProcessNumber("")
      setCourt("")
      setClassName("")
      setSubject("")
      setLastMovement("")

      await load()
      alert("Processo CNJ salvo.")
    } catch (error: any) {
      alert(error.message || "Erro ao salvar processo CNJ.")
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir processo CNJ?")) return

    try {
      await deleteCnjProcess(id)
      await load(query)
    } catch (error: any) {
      alert(error.message || "Erro ao excluir.")
    }
  }

  function loadExample() {
    setProcessNumber("0000000-00.2026.8.26.0000")
    setCourt("TJSP")
    setClassName("Procedimento Comum Cível")
    setSubject("Responsabilidade Civil")
    setLastMovement("Conclusos para decisão.")
  }

  if (loading) {
    return <div className="p-6">Carregando processos CNJ...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Scale className="text-primary" size={44} />
            <div>
              <h1 className="text-4xl font-bold">CNJ Process Intelligence™</h1>
              <p className="text-muted-foreground mt-1">
                Salve processos, movimentações e contexto CNJ para o Legal Brain.
              </p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-[420px_1fr] gap-6">
          <div className="rounded-2xl border border-border bg-card p-6 h-fit">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="text-primary" />
              <h2 className="text-xl font-bold">Adicionar processo</h2>
            </div>

            <div className="space-y-4">
              <input
                value={processNumber}
                onChange={(e) => setProcessNumber(e.target.value)}
                placeholder="Número CNJ"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"
              />

              <input
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                placeholder="Tribunal: TJSP, TRT2, TRF3..."
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"
              />

              <input
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Classe processual"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"
              />

              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Assunto"
                className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"
              />

              <textarea
                value={lastMovement}
                onChange={(e) => setLastMovement(e.target.value)}
                placeholder="Última movimentação"
                className="w-full h-32 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={save}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-bold"
                >
                  Salvar
                </button>

                <button
                  onClick={loadExample}
                  className="px-5 py-3 rounded-xl bg-[#171721] border border-border font-bold"
                >
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
                  placeholder="Buscar por número, tribunal, classe, assunto..."
                  className="w-full bg-transparent outline-none"
                />
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
                Nenhum processo CNJ salvo ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border bg-card p-5"
                  >
                    <div className="flex justify-between gap-4">
                      <div>
                        <h2 className="font-bold text-xl">
                          {item.process_number}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.court || "sem tribunal"} ·{" "}
                          {item.class_name || "sem classe"} ·{" "}
                          {item.subject || "sem assunto"}
                        </p>
                      </div>

                      <button
                        onClick={() => remove(item.id)}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {item.last_movement && (
                      <p className="text-gray-300 mt-4">
                        Última movimentação: {item.last_movement}
                      </p>
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
