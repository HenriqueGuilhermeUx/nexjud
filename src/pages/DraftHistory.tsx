import { useEffect, useState } from "react"
import { FileText, Trash2, Copy } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { getUserDrafts, deleteDraft } from "@/services/draftService"

export default function DraftHistory() {
  const { user } = useAuth()
  const [drafts, setDrafts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) return

    setLoading(true)
    const data = await getUserDrafts(user.id)
    setDrafts(data)
    setLoading(false)
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta minuta?")) return
    await deleteDraft(id)
    setDrafts((prev) => prev.filter((x) => x.id !== id))
  }

  function copyDraft(item: any) {
    const r = item.result || {}

    const text = `
${r.title || item.title}

Objetivo:
${r.strategicObjective || "-"}

Tese Central:
${r.mainThesis || "-"}

Estrutura:
${(r.structure || [])
  .map(
    (s: any, i: number) => `
${i + 1}. ${s.section}
${s.content}
`
  )
  .join("\n")}
`

    navigator.clipboard.writeText(text)
    alert("Minuta copiada.")
  }

  if (loading) return <div className="p-6">Carregando minutas...</div>

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Minutas Salvas</h1>
          <p className="text-muted-foreground mt-2">
            Reabra, copie ou exclua minutas geradas pelo NexJud.
          </p>
        </div>

        {drafts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhuma minuta salva ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {drafts.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="text-primary" />
                      <h2 className="font-bold text-lg">
                        {item.title || "Minuta NexJud"}
                      </h2>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      {item.draft_type || "-"} •{" "}
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString("pt-BR")
                        : "-"}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => copyDraft(item)}
                      className="px-4 py-2 rounded-xl bg-primary text-white font-semibold flex items-center gap-2"
                    >
                      <Copy size={16} />
                      Copiar
                    </button>

                    <button
                      onClick={() => remove(item.id)}
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-background/50 border border-border p-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Tese central
                  </p>
                  <p className="text-gray-300">
                    {item.result?.mainThesis || "-"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
