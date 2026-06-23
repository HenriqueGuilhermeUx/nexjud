import { useState } from "react"
import { FileText, Loader2, Download, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export default function StrategicReport() {
  const [title, setTitle] = useState("Relatório Estratégico NexJud")
  const [context, setContext] = useState("")
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const generateReport = async () => {
    if (!context.trim()) {
      setError("Cole o resumo do caso ou da análise.")
      return
    }

    setError(null)
    setLoading(true)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/strategic-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
        body: JSON.stringify({ title, context, module: "premium-report" }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Erro ao gerar relatório")
      }

      const data = await response.json()
      setReport(data)
    } catch (err: any) {
      setError(err.message || "Erro ao gerar relatório.")
    } finally {
      setLoading(false)
    }
  }

  const downloadTxt = () => {
    if (!report) return

    const text = [
      report.title,
      "",
      `Score Estratégico: ${report.strategicScore}/100`,
      "",
      "Resumo Executivo:",
      report.executiveSummary,
      "",
      ...report.sections.flatMap((section: any) => [
        section.title,
        ...section.items.map((item: string) => `- ${item}`),
        "",
      ]),
      "Conclusão:",
      report.conclusion,
    ].join("\n")

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "relatorio-estrategico-nexjud.txt"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Relatório Estratégico Premium</h1>
              <p className="text-muted-foreground">
                Transforme análise, tese ou processo em um relatório executivo para decisão.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="p-6 lg:col-span-1 h-fit">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Título</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={loading} />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Contexto</label>
                <Textarea
                  rows={10}
                  placeholder="Cole aqui o resumo do caso, resultado da IA Preditiva, Red Team ou andamento do processo..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button onClick={generateReport} disabled={loading} className="w-full" size="lg">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </>
                )}
              </Button>
            </div>
          </Card>

          <div className="lg:col-span-2">
            {!report ? (
              <Card className="p-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-2">
                  Cole o contexto e gere um relatório estratégico.
                </p>
                <p className="text-sm text-muted-foreground">
                  Ideal para revisar tese, explicar riscos ao cliente ou decidir próximos passos.
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                <Card className="p-6 border-purple-500/20 bg-purple-500/5">
                  <div className="flex justify-between gap-4 flex-wrap mb-4">
                    <div>
                      <h3 className="text-2xl font-bold">{report.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Gerado em {new Date(report.generatedAt).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      Score {report.strategicScore}/100
                    </Badge>
                  </div>

                  <p className="text-muted-foreground leading-relaxed">
                    {report.executiveSummary}
                  </p>

                  <Button variant="outline" className="mt-6" onClick={downloadTxt}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar TXT
                  </Button>
                </Card>

                {report.sections.map((section: any, index: number) => (
                  <Card key={index} className="p-6">
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                      {section.title}
                    </h4>
                    <ul className="space-y-3">
                      {section.items.map((item: string, i: number) => (
                        <li key={i} className="flex gap-3">
                          <span className="text-primary font-bold">{i + 1}.</span>
                          <span className="text-muted-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}

                <Card className="p-6 border-emerald-500/20 bg-emerald-500/5">
                  <h4 className="font-bold mb-3 text-emerald-400">Conclusão</h4>
                  <p className="text-muted-foreground leading-relaxed">{report.conclusion}</p>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
