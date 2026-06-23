import { useState } from "react"
import { Search, Loader2, FileSearch, AlertTriangle, CheckCircle, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

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
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/process-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
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

  const riskClass =
    result?.riskLevel === "ALTO"
      ? "bg-red-500/20 text-red-400 border-red-500/30"
      : result?.riskLevel === "MÉDIO"
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"

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
              <p className="text-muted-foreground">Entenda o status, risco e próximo movimento provável.</p>
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

        {!result ? (
          <Card className="p-12 text-center">
            <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground mb-2">Digite um número CNJ para analisar o processo.</p>
            <p className="text-sm text-muted-foreground">
              O NexJud mostrará fase, risco, alertas e próximos movimentos prováveis.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="p-6 bg-gradient-to-r from-blue-500/5 to-transparent border-blue-500/20">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-xl font-bold">{result.processNumber}</h3>
                  <p className="text-muted-foreground">{result.court} • {result.phase}</p>
                  <p className="text-sm text-muted-foreground">Juiz: {result.judge}</p>
                </div>
                <Badge className={riskClass}>Risco {result.riskLevel}</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Chance estimada</p>
                  <p className="text-3xl font-bold">{result.successProbability}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Última movimentação</p>
                  <p className="font-bold">{new Date(result.lastMovement).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Resumo</p>
                  <p className="text-sm">{result.lastMovementSummary}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h4 className="font-bold mb-3">Resumo Executivo</h4>
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
              <h4 className="font-bold mb-4">Próximos Eventos Prováveis</h4>
              <div className="space-y-3">
                {result.nextLikelyEvents.map((item: any) => (
                  <div key={item.event}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.event}</span>
                      <span className="font-bold">{item.probability}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${item.probability}%` }} />
                    </div>
                  </div>
                ))}
              </div>
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
