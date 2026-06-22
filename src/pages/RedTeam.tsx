import { useState } from "react"
import { ShieldAlert, Loader2, AlertTriangle, CheckCircle, Gavel } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

export default function RedTeam() {
  const [strategy, setStrategy] = useState("")
  const [caseType, setCaseType] = useState("CÍVEL")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!strategy.trim()) {
      setError("Cole sua tese, petição ou estratégia.")
      return
    }

    setError(null)
    setLoading(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/red-team`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({ strategy, caseType }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Erro ao rodar Red Team")
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || "Erro ao analisar estratégia.")
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
            <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Red Team Jurídico</h1>
              <p className="text-muted-foreground">
                Simule o ataque da parte contrária antes de protocolar.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle>Ataque minha tese</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo de caso</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  disabled={loading}
                >
                  <option value="CÍVEL">Cível</option>
                  <option value="TRABALHISTA">Trabalhista</option>
                  <option value="PREVIDENCIÁRIO">Previdenciário</option>
                  <option value="TRIBUTÁRIO">Tributário</option>
                  <option value="CONSUMIDOR">Consumidor</option>
                </select>
              </div>

              <Textarea
                placeholder="Cole aqui sua tese, petição, estratégia ou resumo do caso..."
                rows={10}
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                disabled={loading}
              />

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button onClick={handleAnalyze} disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Atacando tese...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-4 w-4 mr-2" />
                    Rodar Red Team
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            {!result ? (
              <Card className="p-12 text-center">
                <Gavel className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-2">
                  Cole sua tese e descubra como ela será atacada.
                </p>
                <p className="text-sm text-muted-foreground">
                  O NexJud simula a parte contrária, aponta fragilidades e mostra como blindar a estratégia.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="p-6 border-red-500/20 bg-red-500/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">Diagnóstico de Risco</h3>
                    <Badge className={riskClass}>{result.riskLevel}</Badge>
                  </div>
                  <p className="text-4xl font-bold">{result.riskScore}%</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Probabilidade estimada de ataque relevante à tese.
                  </p>
                </Card>

                <Section title="Ataques prováveis da parte contrária" icon={<AlertTriangle /> } items={result.attacks} />
                <Section title="Pontos fracos da sua tese" icon={<ShieldAlert /> } items={result.weakPoints} />
                <Section title="Provas que estão faltando" icon={<Gavel /> } items={result.missingProofs} />
                <Section title="Perguntas difíceis do juiz" icon={<AlertTriangle /> } items={result.judgeQuestions} />
                <Section title="Como blindar a petição" icon={<CheckCircle /> } items={result.howToFix} />

                <Card className="p-6 border-emerald-500/20 bg-emerald-500/5">
                  <h4 className="font-bold mb-3 text-emerald-400">Estratégia fortalecida</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {result.strengthenedStrategy}
                  </p>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, items }: { title: string; icon: any; items: string[] }) {
  return (
    <Card className="p-6">
      <h4 className="font-bold mb-4 flex items-center gap-2">
        <span className="w-5 h-5">{icon}</span>
        {title}
      </h4>
      <ul className="space-y-3">
        {items?.map((item, index) => (
          <li key={index} className="flex gap-3">
            <span className="text-primary font-bold">{index + 1}.</span>
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
