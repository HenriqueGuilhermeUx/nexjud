import { useState } from "react"
import { Search, Loader2, FileSearch, AlertTriangle, CheckCircle, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getUserFunctionHeaders } from "@/lib/functionAuth"

export default function ProcessCheck() {
  const [processNumber, setProcessNumber] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheck = async () => {
    if (!processNumber.trim()) {
      setError("Digite o número do processo.")
      return
    }

    setError(null)
    setLoading(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      const response = await fetch(`${supabaseUrl}/functions/v1/process-check`, {
        method: "POST",
        headers: await getUserFunctionHeaders(),
        body: JSON.stringify({ processNumber }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Erro ao verificar processo")
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || "Erro ao verificar processo.")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (value: string | null | undefined) => {
    if (!value) return "—"
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("pt-BR")
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <FileSearch className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Verificação Inteligente de Processo</h1>
              <p className="text-muted-foreground">Fase, órgão julgador e movimentações do processo, direto do DataJud.</p>
            </div>
          </div>
        </div>

        <Card className="p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <Input
              placeholder="Ex.: 0001234-56.2024.8.26.0100"
              value={processNumber}
              onChange={(e) => setProcessNumber(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCheck()}
              disabled={loading}
              className="text-lg"
            />
            <Button onClick={handleCheck} disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Verificar
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-400 bg-red-500/10 p-3 rounded-md">
              {error}
            </div>
          )}
        </Card>

        {result && result.found === false ? (
          <Card className="p-12 text-center">
            <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="font-semibold mb-2">{result.processNumber} · {result.court}</p>
            <p className="text-muted-foreground">{result.message}</p>
          </Card>
        ) : !result ? (
          <Card className="p-12 text-center">
            <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-2">Digite um número CNJ para analisar o processo.</p>
            <p className="text-sm text-muted-foreground">
              O NexJud mostra classe, órgão julgador, assuntos, últimas movimentações e um resumo para orientar o próximo passo.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-r from-blue-500/5 to-transparent border-blue-500/20">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold">{result.processNumber}</h3>
                  <p className="text-muted-foreground">{result.court} • {result.phase}</p>
                  <p className="text-sm text-muted-foreground">Órgão julgador: {result.judge}</p>
                  {result.subjects?.length > 0 && <p className="text-sm text-muted-foreground">Assuntos: {result.subjects.join(", ")}</p>}
                </div>
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Fonte: DataJud</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Movimentações registradas</p>
                  <p className="text-3xl font-bold">{result.movementsCount ?? "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última movimentação</p>
                  <p className="font-bold">{formatDate(result.lastMovement)}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Resumo</p>
                  <p className="text-sm">{result.lastMovementSummary}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-bold mb-3">Resumo Executivo <span className="text-xs font-normal text-muted-foreground">(gerado por IA a partir dos dados acima)</span></h4>
              <p className="text-muted-foreground leading-relaxed">{result.executiveSummary}</p>
            </Card>

            <Card className="p-6">
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-400" />
                Radar Processual
              </h4>
              <ul className="space-y-3">
                {result.radar.map((item: string, i: number) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-primary font-bold">{i + 1}.</span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <h4 className="font-bold mb-4">Últimas movimentações</h4>
              <ul className="space-y-2">
                {(result.recentMovements || []).map((item: { date: string | null; name: string }, i: number) => (
                  <li key={`${item.date}-${i}`} className="flex gap-3 text-sm">
                    <span className="w-24 shrink-0 text-muted-foreground">{formatDate(item.date)}</span>
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted-foreground">Registros do tribunal no DataJud. O NexJud não calcula chance de êxito sem base de decisões validada.</p>
            </Card>

            <Card className="p-6 border-amber-500/20 bg-amber-500/5">
              <h4 className="font-bold mb-4 flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                Alertas
              </h4>
              <ul className="space-y-3">
                {result.alerts.map((item: string, i: number) => (
                  <li key={i} className="text-muted-foreground">{item}</li>
                ))}
              </ul>
            </Card>

            <Card className="p-6 border-emerald-500/20 bg-emerald-500/5">
              <h4 className="font-bold mb-3 text-emerald-400">Recomendação Estratégica</h4>
              <p className="text-muted-foreground leading-relaxed">{result.recommendation}</p>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
