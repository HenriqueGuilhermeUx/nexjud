import { Link } from "react-router-dom"
import { Brain, BookOpen, Zap, Shield, Clock, TrendingUp, ArrowRight, CheckCircle, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">⚖</span>
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">NexJud</span>
              <p className="text-xs text-muted-foreground">Justiça Inteligente onDemand</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button>Acessar Plataforma</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button className="gap-2">
                  Login
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Brain className="w-4 h-4 text-secondary" />
            <span className="text-sm text-muted-foreground">Powered by Claude AI</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-gradient">IA Preditiva</span>
            <br />
            para Advogados
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Análise inteligente de processos com previsão de resultado baseada em padrões jurisprudenciais.
            DNA do juiz, heatmap de argumentos e muito mais.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="gap-2 animate-pulse-glow">
                  Acessar Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="lg" className="gap-2 animate-pulse-glow">
                  Começar Grátis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-1">314K+</div>
              <div className="text-sm text-muted-foreground">Advogados no Brasil</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-secondary mb-1">6 TRFs</div>
              <div className="text-sm text-muted-foreground">Cobertura Nacional</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-success mb-1">&lt;2s</div>
              <div className="text-sm text-muted-foreground">Tempo de Análise</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">2 Soluções Jurídicas Inteligentes</h2>
            <p className="text-muted-foreground text-lg">Cada ferramenta foi desenvolvida para resolver um problema específico dos advogados</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1: IA Preditiva */}
            <Card className="card-hover border-primary/20 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary to-indigo-600" />
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Brain className="w-7 h-7 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">IA Preditiva Jurídica</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Análise inteligente de processos com previsão de resultado baseada em padrões jurisprudenciais e DNA do juiz.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Previsão de resultado</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>DNA do juiz</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Red Team simulation</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Heatmap de argumentos</span>
                  </div>
                </div>
                {user && (
                  <Link to="/dashboard/predictive">
                    <Button className="w-full mt-4 gap-2">
                      Acessar
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Feature 2: Jurisprudência */}
            <Card className="card-hover border-secondary/20 overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-secondary to-cyan-400" />
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-secondary" />
                  </div>
                  <CardTitle className="text-2xl">Pesquisa de Jurisprudência</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Busque decisões em múltiplos tribunais e identifique tendências jurisprudenciais em segundos. Economize 3-4 horas de pesquisa manual.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Busca em 6 tribunais</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Identifica tendências</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Argumentos que funcionam</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span>Timeline de mudanças</span>
                  </div>
                </div>
                {user && (
                  <Link to="/dashboard/jurisprudence">
                    <Button variant="secondary" className="w-full mt-4 gap-2">
                      Acessar
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como Funciona</h2>
            <p className="text-muted-foreground text-lg">4 passos simples para decisões baseadas em dados</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4 relative">
                <span className="text-2xl font-bold text-primary">1</span>
                <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-border" />
              </div>
              <h3 className="font-bold mb-2">Insira os Dados</h3>
              <p className="text-sm text-muted-foreground">Número do processo ou tema jurídico</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4 relative">
                <span className="text-2xl font-bold text-primary">2</span>
                <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-border" />
              </div>
              <h3 className="font-bold mb-2">IA Analisa</h3>
              <p className="text-sm text-muted-foreground">Claude LLM processa em tempo real</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4 relative">
                <span className="text-2xl font-bold text-primary">3</span>
                <div className="hidden md:block absolute top-1/2 left-full w-full h-0.5 bg-border" />
              </div>
              <h3 className="font-bold mb-2">Receba Insights</h3>
              <p className="text-sm text-muted-foreground">Heatmap, previsão e recomendações</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-primary">4</span>
              </div>
              <h3 className="font-bold mb-2">Exporte</h3>
              <p className="text-sm text-muted-foreground">PDF ou integre com seu fluxo</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Por que Escolher NexJud?</h2>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            <Card className="text-center p-4">
              <Clock className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-sm mb-1">Velocidade</h3>
              <p className="text-xs text-muted-foreground">Análises em menos de 2 segundos</p>
            </Card>
            <Card className="text-center p-4">
              <Brain className="w-8 h-8 text-secondary mx-auto mb-3" />
              <h3 className="font-bold text-sm mb-1">IA Avançada</h3>
              <p className="text-xs text-muted-foreground">Claude LLM + Análise Preditiva</p>
            </Card>
            <Card className="text-center p-4">
              <Shield className="w-8 h-8 text-success mx-auto mb-3" />
              <h3 className="font-bold text-sm mb-1">Segurança</h3>
              <p className="text-xs text-muted-foreground">Conformidade com LGPD</p>
            </Card>
            <Card className="text-center p-4">
              <BarChart3 className="w-8 h-8 text-warning mx-auto mb-3" />
              <h3 className="font-bold text-sm mb-1">Para Advogados</h3>
              <p className="text-xs text-muted-foreground">Interface intuitiva e profissional</p>
            </Card>
            <Card className="text-center p-4">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-sm mb-1">Dados Reais</h3>
              <p className="text-xs text-muted-foreground">Integração com tribunais</p>
            </Card>
            <Card className="text-center p-4">
              <Zap className="w-8 h-8 text-secondary mx-auto mb-3" />
              <h3 className="font-bold text-sm mb-1">Relatórios</h3>
              <p className="text-xs text-muted-foreground">Exportar em PDF</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pronto para Revolucionar Sua Prática?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Junte-se a advogados que já economizam tempo e aumentam seus resultados com NexJud
          </p>
          {user ? (
            <Link to="/dashboard">
              <Button size="lg" className="gap-2">
                Acessar Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="lg" className="gap-2">
                Começar Grátis
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">⚖</span>
            </div>
            <span className="text-foreground font-bold">NexJud</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 NexJud. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground">
            Desenvolvido por advogados, para advogados.
          </p>
        </div>
      </footer>
    </div>
  )
}