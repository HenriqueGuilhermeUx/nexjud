import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Zap, Search, Loader2, TrendingUp, AlertCircle, CheckCircle, Clock, BarChart3, Users } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from "recharts"
import { useAuth } from "@/context/AuthContext"

interface Case {
  id: string
  caseNumber: string
  tribunal: string
  natureza: string
  valor: number
  status: "Vitória" | "Derrota" | "Aguardando"
  judge: string
  lastMovement: string
}

interface Stats {
  totalCases: number
  totalValue: number
  victories: number
  defeats: number
  pending: number
  successRate: number
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b']

export default function Onboarding() {
  const { user } = useAuth()
  const [oabNumber, setOabNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [cases, setCases] = useState<Case[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"dashboard" | "timeline">("dashboard")

  const handleSearch = async () => {
    if (!oabNumber.trim()) {
      setError("Digite o número da OAB")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/setup-oab`, {
        method: 'POST',
        headers: {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${supabaseKey}`,
  'apikey': supabaseKey,
},
        body: JSON.stringify({
          oabNumber: oabNumber.toUpperCase(),
          userId: user?.id || 'anonymous',
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Erro ao buscar processos')
      }

      const data = await response.json()
      setCases(data.cases || [])
      setStats(data.stats || null)

    } catch (err: any) {
      setError(err.message || "Erro ao buscar OAB. Verifique o número e tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const pieData = stats ? [
    { name: 'Vitórias', value: stats.victories },
    { name: 'Derrotas', value: stats.defeats },
    { name: 'Aguardando', value: stats.pending },
  ] : []

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-amber-500/10 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Setup Zero por OAB</h1>
              <p className="text-muted-foreground">Carregue seu histórico de processos automaticamente</p>
            </div>
          </div>
        </div>

        {/* Search Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar por Número da OAB
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder="Ex: OAB/SP 123456"
                value={oabNumber}
                onChange={(e) => setOabNumber(e.target.value.toUpperCase())}
                disabled={isLoading}
                className="flex-1 text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button
                onClick={handleSearch}
                disabled={isLoading}
                size="lg"
                className="bg-amber-500 hover:bg-amber-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Sistema busca automaticamente nos últimos 2 anos de processos.
              Sem necessidade de cartão de crédito.
            </p>
          </CardContent>
        </Card>

        {/* Stats & Cases */}
        {stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Casos</p>
                      <p className="text-3xl font-bold">{stats.totalCases}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-emerald-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                      <p className="text-3xl font-bold text-emerald-500">{stats.successRate}%</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Vitórias</p>
                      <p className="text-3xl font-bold text-blue-500">{stats.victories}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-blue-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Valor Total</p>
                      <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
                    </div>
                    <Users className="h-8 w-8 text-amber-500 opacity-50" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição de Resultados</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-4">
                    {pieData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                        <span className="text-sm">{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline de Processos</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[
                      { month: 'Jan', count: Math.floor(Math.random() * 10) + 2 },
                      { month: 'Fev', count: Math.floor(Math.random() * 10) + 2 },
                      { month: 'Mar', count: Math.floor(Math.random() * 10) + 2 },
                      { month: 'Abr', count: Math.floor(Math.random() * 10) + 2 },
                      { month: 'Mai', count: Math.floor(Math.random() * 10) + 2 },
                      { month: 'Jun', count: Math.floor(Math.random() * 10) + 2 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} />
                      <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Cases List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Processos Encontrados</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant={activeTab === "dashboard" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("dashboard")}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Relatório
                    </Button>
                    <Button
                      variant={activeTab === "timeline" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveTab("timeline")}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Timeline
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {cases.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum processo encontrado para esta OAB.
                    </p>
                  ) : (
                    cases.map((caseItem) => (
                      <div
                        key={caseItem.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-medium">{caseItem.caseNumber}</span>
                            <Badge className={
                              caseItem.status === 'Vitória' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30' :
                              caseItem.status === 'Derrota' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                              'bg-amber-500/20 text-amber-500 border-amber-500/30'
                            }>
                              {caseItem.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{caseItem.tribunal}</span>
                            <span>•</span>
                            <span>{caseItem.natureza}</span>
                            <span>•</span>
                            <span>{formatCurrency(caseItem.valor)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{caseItem.judge}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(caseItem.lastMovement).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
