import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Brain, Download, Loader2, CheckCircle, AlertCircle, TrendingUp, Target, Zap, Share2 } from "lucide-react"
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid
} from "recharts"
import { performPredictiveAnalysis, getMockData, type PredictiveAnalysisResult } from "@/lib/api"

export default function PredictiveAI() {
  const [processNumber, setProcessNumber] = useState("")
  const [petitionText, setPetitionText] = useState("")
  const [caseType, setCaseType] = useState<"TRABALHISTA" | "PREVIDENCIARIO" | "TRIBUTARIO">("TRABALHISTA")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<PredictiveAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { DNA_JUIZ_DATA, SCORE_RECURSAL, ALERTAS_JURISPRUDENCIA } = getMockData()

  const handleAnalyze = async () => {
    if (!processNumber.trim() || !petitionText.trim()) {
      setError("Preencha o número do processo e a descrição do caso")
      return
    }

    setError(null)
    setIsAnalyzing(true)

    try {
      const result = await performPredictiveAnalysis({
        caseNumber: processNumber,
        caseDescription: petitionText,
        caseType,
      })
      setAnalysis(result)
    } catch (err) {
      setError("Falha ao realizar análise. Tente novamente.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return "text-success"
    if (prob >= 40) return "text-warning"
    return "text-destructive"
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "BAIXO": return "bg-success/20 text-success border-success/30"
      case "MÉDIO": return "bg-warning/20 text-warning border-warning/30"
      case "ALTO": return "bg-destructive/20 text-destructive border-destructive/30"
      default: return "bg-muted text-muted-foreground"
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">IA Preditiva Jurídica</h1>
              <p className="text-muted-foreground">Análise inteligente com previsão de resultado</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Análise do Caso</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Número do Processo</label>
                  <Input
                    placeholder="0001234-56.2020.1.01.3800"
                    value={processNumber}
                    onChange={(e) => setProcessNumber(e.target.value)}
                    disabled={isAnalyzing}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de Caso</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                    value={caseType}
                    onChange={(e) => setCaseType(e.target.value as any)}
                    disabled={isAnalyzing}
                  >
                    <option value="TRABALHISTA">Trabalhista</option>
                    <option value="PREVIDENCIARIO">Previdenciário</option>
                    <option value="TRIBUTARIO">Tributário</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Descrição do Caso</label>
                  <Textarea
                    placeholder="Descreva os fatos, argumentos e pedidos do caso..."
                    value={petitionText}
                    onChange={(e) => setPetitionText(e.target.value)}
                    disabled={isAnalyzing}
                    rows={6}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Analisar Caso
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {!analysis ? (
              <Card className="p-12 text-center">
                <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-2">
                  Preencha os dados do caso e clique em "Analisar"
                </p>
                <p className="text-sm text-muted-foreground">
                  A IA analisará padrões jurisprudenciais e fornecerá previsão de resultado
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <Card className="p-6 bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                    <h3 className="text-xl font-bold">Resumo da Análise</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4 mr-2" />
                        Miro
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Probabilidade de Sucesso</p>
                      <p className={`text-3xl font-bold ${getProbabilityColor(analysis.summary.successProbability)}`}>
                        {analysis.summary.successProbability}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Nível de Risco</p>
                      <Badge className={getRiskColor(analysis.summary.riskLevel)}>
                        {analysis.summary.riskLevel}
                      </Badge>
                    </div>
                  </div>
                </Card>

                {/* Recommendation */}
                <Card className="p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold mb-2">Recomendação</h4>
                      <p className="text-muted-foreground">{analysis.summary.recommendation}</p>
                    </div>
                  </div>
                </Card>

                {/* Gold Suggestions */}
                {analysis.summary.goldSuggestions.length > 0 && (
                  <Card className="p-6">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Sugestões de Ouro
                    </h4>
                    <ul className="space-y-3">
                      {analysis.summary.goldSuggestions.map((suggestion, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="text-primary font-bold mt-1">{i + 1}.</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* DNA do Juiz */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
                  <h4 className="font-bold mb-1 flex items-center gap-2 text-primary">
                    <Brain className="h-5 w-5" /> DNA do Juiz
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">Perfil decisório por área do direito (últimas 500 decisões)</p>
                  <div className="grid md:grid-cols-2 gap-4 items-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={DNA_JUIZ_DATA}>
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                        <Radar name="Favorabilidade" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {DNA_JUIZ_DATA.map((d) => (
                        <div key={d.subject} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24 shrink-0">{d.subject}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${d.score}%`, background: d.score >= 70 ? "#10b981" : d.score >= 50 ? "#f59e0b" : "#ef4444" }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-8 text-right ${
                            d.score >= 70 ? "text-success" : d.score >= 50 ? "text-warning" : "text-destructive"
                          }`}>{d.score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score Recursal */}
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-5">
                  <h4 className="font-bold mb-1 flex items-center gap-2 text-blue-400">
                    <Target className="h-5 w-5" /> Score de Impacto Recursal
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">Taxa de êxito por instância para casos similares</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={SCORE_RECURSAL} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="instancia" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} />
                      <Bar dataKey="favoravel" fill="#10b981" radius={[3, 3, 0, 0]} stackId="a" />
                      <Bar dataKey="desfavoravel" fill="#ef4444" radius={[3, 3, 0, 0]} stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Alertas */}
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-5">
                  <h4 className="font-bold mb-3 flex items-center gap-2 text-amber-400">
                    <Zap className="h-5 w-5" /> Alertas de Mudança Jurisprudencial
                  </h4>
                  <div className="space-y-2">
                    {ALERTAS_JURISPRUDENCIA.map((a, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                        a.impacto === "alto" ? "bg-destructive/5 border-destructive/20" : "bg-amber-500/5 border-amber-500/20"
                      }`}>
                        <AlertCircle className={`h-4 w-4 mt-0.5 shrink-0 ${a.impacto === "alto" ? "text-destructive" : "text-amber-400"}`} />
                        <div className="flex-1">
                          <p className="text-sm">{a.msg}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{a.data}</p>
                        </div>
                        <Badge variant="outline" className={a.impacto === "alto" ? "text-destructive border-destructive" : "text-amber-400 border-amber-400"}>
                          {a.impacto === "alto" ? "Alto" : "Médio"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Heatmap */}
                <Card className="p-6">
                  <h4 className="font-bold mb-4">Heatmap de Argumentos</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-success mb-2">Argumentos Fortes</p>
                      <ul className="space-y-1">
                        {analysis.heatmap.zonaVerde.map((arg, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-success" />
                            {arg}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-warning mb-2">Argumentos Médios</p>
                      <ul className="space-y-1">
                        {analysis.heatmap.zonaAmarela.map((arg, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                            {arg}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-destructive mb-2">Argumentos Fracos</p>
                      <ul className="space-y-1">
                        {analysis.heatmap.zonaVermelha.map((arg, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                            {arg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}