import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Search, Loader2, TrendingUp, CheckCircle, AlertCircle, Download, Clock, Filter, BarChart3 } from "lucide-react"
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from "recharts"
import { performJurisprudenceSearch, getMockData, type JurisprudenceSearchResult } from "@/lib/api"

export default function Jurisprudence() {
  const [theme, setTheme] = useState("")
  const [court, setCourt] = useState<"STF" | "STJ" | "TRF1" | "TRF2" | "TRF3" | "TRF4">("STJ")
  const [period, setPeriod] = useState<"1year" | "3years" | "5years" | "all">("5years")
  const [materia, setMateria] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState<JurisprudenceSearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { TENDENCIAS_TRIBUNAL, TIMELINE_MUDANCAS } = getMockData()

  // Câmaras/Turmas dinâmicos
  const camarasMap: Record<string, string[]> = {
    STJ: ["1ª Turma", "2ª Turma", "3ª Turma", "4ª Turma", "5ª Turma", "6ª Turma", "Corte Especial"],
    STF: ["1ª Turma", "2ª Turma", "Plenário"],
    TRF1: ["1ª Câmara", "2ª Câmara", "3ª Câmara", "4ª Câmara", "5ª Câmara", "6ª Câmara", "7ª Câmara", "8ª Câmara"],
    TRF2: ["1ª Turma", "2ª Turma", "3ª Turma", "4ª Turma", "5ª Turma", "6ª Turma"],
    TRF3: ["1ª Turma", "2ª Turma", "3ª Turma", "4ª Turma", "5ª Turma", "6ª Turma", "7ª Turma", "8ª Turma"],
    TRF4: ["1ª Turma", "2ª Turma", "3ª Turma", "4ª Turma"],
  }
  const camarasOptions = camarasMap[court] || []
  const [camara, setCamara] = useState("")

  const handleSearch = async () => {
    if (!theme.trim()) {
      setError("Digite o tema da jurisprudência")
      return
    }

    setError(null)
    setIsSearching(true)

    try {
      const res = await performJurisprudenceSearch({ theme, court, period, camara, materia })
      setResult(res)
    } catch (err) {
      setError("Falha ao buscar jurisprudência. Tente novamente.")
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-secondary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Pesquisa de Jurisprudência</h1>
              <p className="text-muted-foreground">Busque decisões em múltiplos tribunais</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Search Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Buscar Jurisprudência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tema da Pesquisa</label>
                  <Textarea
                    placeholder="Ex: Rescisão de contrato de trabalho sem justa causa"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    disabled={isSearching}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Tribunal</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                    value={court}
                    onChange={(e) => setCourt(e.target.value as any)}
                    disabled={isSearching}
                  >
                    <option value="STJ">STJ (Superior)</option>
                    <option value="STF">STF (Supremo)</option>
                    <option value="TRF1">TRF1 (Brasília)</option>
                    <option value="TRF2">TRF2 (Rio/ES)</option>
                    <option value="TRF3">TRF3 (SP/MS)</option>
                    <option value="TRF4">TRF4 (Sul)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Período</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    disabled={isSearching}
                  >
                    <option value="1year">Último 1 ano</option>
                    <option value="3years">Últimos 3 anos</option>
                    <option value="5years">Últimos 5 anos</option>
                    <option value="all">Todo o período</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5" /> Câmara / Turma
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                    value={camara}
                    onChange={(e) => setCamara(e.target.value)}
                    disabled={isSearching}
                  >
                    <option value="">Todas as câmaras/turmas</option>
                    {camarasOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Matéria</label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground"
                    value={materia}
                    onChange={(e) => setMateria(e.target.value)}
                    disabled={isSearching}
                  >
                    <option value="">Todas as matérias</option>
                    <option value="previdenciario">Previdenciário</option>
                    <option value="tributario">Tributário</option>
                    <option value="trabalhista">Trabalhista</option>
                    <option value="administrativo">Administrativo</option>
                    <option value="civil">Civil</option>
                    <option value="penal">Penal</option>
                  </select>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-md">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="w-full"
                  size="lg"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Buscando...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Buscar
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            {!result ? (
              <Card className="p-12 text-center">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-2">
                  Pesquise jurisprudência em múltiplos tribunais
                </p>
                <p className="text-sm text-muted-foreground">
                  Identifique tendências, argumentos que funcionam e padrões de decisão
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <Card className="p-6 bg-gradient-to-r from-secondary/5 to-transparent border-secondary/20">
                  <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                    <div>
                      <h3 className="text-xl font-bold mb-2">Resultado da Pesquisa</h3>
                      <p className="text-sm text-muted-foreground">
                        {result.decisionsCount} decisões encontradas
                      </p>
                    </div>
                    <Badge className="bg-success/20 text-success border-success/30">
                      {result.trend}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Taxa de Sucesso</p>
                      <p className="text-3xl font-bold text-success">{result.successRate}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tendência</p>
                      <Badge className="bg-secondary/20 text-secondary border-secondary/30">
                        {result.trend}
                      </Badge>
                    </div>
                  </div>
                </Card>

                {/* Gráfico Tendências */}
                <Card className="p-6">
                  <h4 className="font-bold mb-1 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-secondary" /> Tendências por Tribunal
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">Evolução da taxa de sucesso nos últimos 5 anos</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={TENDENCIAS_TRIBUNAL} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="ano" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[30, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} />
                      <Legend formatter={(v) => <span className="text-xs text-slate-400">{v}</span>} />
                      <Line type="monotone" dataKey="STJ" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="STF" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="TRF3" stroke="#22d3ee" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                {/* Timeline */}
                <Card className="p-6">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" /> Timeline de Mudanças Jurisprudenciais
                  </h4>
                  <div className="space-y-3">
                    {TIMELINE_MUDANCAS.map((item, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${
                            item.impacto === "alto" ? "bg-destructive" : "bg-warning"
                          }`} />
                          {i < TIMELINE_MUDANCAS.length - 1 && <div className="w-px flex-1 bg-border/50 mt-1" />}
                        </div>
                        <div className="pb-3 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-muted-foreground">{item.data}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded border ${
                              item.impacto === "alto" ? "text-destructive border-destructive/30 bg-destructive/5" : "text-warning border-warning/30 bg-warning/5"
                            }`}>{item.impacto === "alto" ? "Alto impacto" : "Médio impacto"}</span>
                          </div>
                          <p className="text-sm">{item.evento}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Análise */}
                <Card className="p-6">
                  <h4 className="font-bold mb-4">Análise de Jurisprudência</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{result.analysis}</p>
                </Card>

                {/* Heatmap */}
                <Card className="p-6">
                  <h4 className="font-bold mb-4">Heatmap de Argumentos</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-success mb-2">Argumentos que Funcionam</p>
                      <ul className="space-y-1">
                        {result.heatmap.zonaVerde.map((arg, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                            {arg}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-warning mb-2">Argumentos com Jurisprudência Dividida</p>
                      <ul className="space-y-1">
                        {result.heatmap.zonaAmarela.map((arg, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-warning shrink-0" />
                            {arg}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-destructive mb-2">Argumentos que Não Funcionam</p>
                      <ul className="space-y-1">
                        {result.heatmap.zonaVermelha.map((arg, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                            {arg}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Recomendações */}
                <Card className="p-6">
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" /> Recomendações
                  </h4>
                  <ul className="space-y-3">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Relatório
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}