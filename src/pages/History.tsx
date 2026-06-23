import { useEffect, useState } from "react"
import { Clock, Trash2, FileText, Loader2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext"
import {
  getAnalysisHistory,
  deleteAnalysisHistoryItem,
  getAnalysisTypeLabel,
} from "@/lib/supabase"

export default function History() {
  const { user } = useAuth()
  const [items, setItems] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadHistory = async () => {
    if (!user) return

    setLoading(true)
    try {
      const data = await getAnalysisHistory(user.id)
      setItems(data || [])
      setSelected(data?.[0] || null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [user])

  const handleDelete = async (id: string) => {
    if (!user) return
    if (!confirm("Excluir este item do histórico?")) return

    setDeletingId(id)
    try {
      await deleteAnalysisHistoryItem(id, user.id)
      await loadHistory()
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Histórico de Análises</h1>
              <p className="text-muted-foreground">
                Seu patrimônio estratégico salvo dentro do NexJud.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Carregando histórico...</p>
          </Card>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-14 w-14 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-2">
              Nenhuma análise salva ainda.
            </p>
            <p className="text-sm text-muted-foreground">
              Gere uma IA Preditiva, Red Team ou Relatório para começar.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className={`p-4 cursor-pointer transition-all ${
                    selected?.id === item.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelected(item)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge className="mb-2">
                        {getAnalysisTypeLabel(item.type)}
                      </Badge>
                      <h3 className="font-bold line-clamp-2">
                        {item.title || "Análise sem título"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(item.id)
                      }}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            <Card className="lg:col-span-2 p-6">
              {selected ? (
                <div className="space-y-6">
                  <div>
                    <Badge className="mb-3">
                      {getAnalysisTypeLabel(selected.type)}
                    </Badge>
                    <h2 className="text-2xl font-bold">{selected.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selected.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold mb-2">Entrada</h3>
                    <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(selected.input_data, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h3 className="font-bold mb-2">Resultado</h3>
                    <pre className="text-xs whitespace-pre-wrap bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(selected.result, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Selecione uma análise.</p>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
