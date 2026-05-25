import { Link } from "react-router-dom"
import { Brain, BookOpen, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"

export default function Landing() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e293b] bg-[#0a0a0f]/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#6366f1] to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">⚖</span>
            </div>
            <div>
              <span className="text-xl font-bold text-white">NexJud</span>
              <p className="text-xs text-gray-400">Justiça Inteligente onDemand</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link to="/dashboard">
                <Button className="bg-[#6366f1] hover:bg-[#5558e3] text-white">Acessar Plataforma</Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 mb-6">
            <Brain className="w-4 h-4 text-[#22d3ee]" />
            <span className="text-sm text-gray-400">Powered by Claude AI</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#22d3ee]">IA Preditiva</span>
            <br />
            para Advogados
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            Análise inteligente de processos com previsão de resultado baseada em padrões jurisprudenciais.
            DNA do juiz, heatmap de argumentos e muito mais.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            {user ? (
              <Link to="/dashboard">
                <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
                  Acessar Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
                  Começar Grátis
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-[#6366f1] mb-1">314K+</div>
              <div className="text-sm text-gray-400">Advogados no Brasil</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#22d3ee] mb-1">6 TRFs</div>
              <div className="text-sm text-gray-400">Cobertura Nacional</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-1">&lt;2s</div>
              <div className="text-sm text-gray-400">Tempo de Análise</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0f0f14]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">2 Soluções Jurídicas Inteligentes</h2>
            <p className="text-gray-400 text-lg">Cada ferramenta foi desenvolvida para resolver um problema específico dos advogados</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature 1: IA Preditiva */}
            <Card className="border-[#6366f1]/20 bg-[#121218]">
              <div className="h-2 bg-gradient-to-r from-[#6366f1] to-indigo-600" />
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#6366f1]/10 rounded-lg flex items-center justify-center">
                    <Brain className="w-7 h-7 text-[#6366f1]" />
                  </div>
                  <CardTitle className="text-2xl text-white">IA Preditiva Jurídica</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-400">
                  Análise inteligente de processos com previsão de resultado baseada em padrões jurisprudenciais e DNA do juiz.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Previsão de resultado</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>DNA do juiz</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Red Team simulation</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Heatmap de argumentos</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feature 2: Jurisprudência */}
            <Card className="border-[#22d3ee]/20 bg-[#121218]">
              <div className="h-2 bg-gradient-to-r from-[#22d3ee] to-cyan-400" />
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#22d3ee]/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-[#22d3ee]" />
                  </div>
                  <CardTitle className="text-2xl text-white">Pesquisa de Jurisprudência</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-400">
                  Busque decisões em múltiplos tribunais e identifique tendências jurisprudenciais em segundos. Economize 3-4 horas de pesquisa manual.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Busca em 6 tribunais</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Identifica tendências</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Argumentos que funcionam</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>Timeline de mudanças</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Como Funciona</h2>
            <p className="text-gray-400 text-lg">4 passos simples para decisões baseadas em dados</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-[#6366f1]/10 rounded-full flex items-center justify-center mb-4 relative">
                <span className="text-2xl font-bold text-[#6366f1]">1</span>
              </div>
              <h3 className="font-bold mb-2 text-white">Insira os Dados</h3>
              <p className="text-sm text-gray-400">Número do processo ou tema jurídico</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-[#6366f1]/10 rounded-full flex items-center justify-center mb-4 relative">
                <span className="text-2xl font-bold text-[#6366f1]">2</span>
              </div>
              <h3 className="font-bold mb-2 text-white">IA Analisa</h3>
              <p className="text-sm text-gray-400">Claude LLM processa em tempo real</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-[#6366f1]/10 rounded-full flex items-center justify-center mb-4 relative">
                <span className="text-2xl font-bold text-[#6366f1]">3</span>
              </div>
              <h3 className="font-bold mb-2 text-white">Receba Insights</h3>
              <p className="text-sm text-gray-400">Heatmap, previsão e recomendações</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-[#6366f1]/10 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-[#6366f1]">4</span>
              </div>
              <h3 className="font-bold mb-2 text-white">Exporte</h3>
              <p className="text-sm text-gray-400">PDF ou integre com seu fluxo</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0f0f14]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Pronto para Revolucionar Sua Prática?</h2>
          <p className="text-gray-400 text-lg mb-8">
            Junte-se a advogados que já economizam tempo e aumentam seus resultados com NexJud
          </p>
          {user ? (
            <Link to="/dashboard">
              <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
                Acessar Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
                Começar Grátis
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e293b] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#6366f1] to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">⚖</span>
            </div>
            <span className="text-white font-bold">NexJud</span>
          </div>
          <p className="text-sm text-gray-400">
            © 2026 NexJud. Todos os direitos reservados.
          </p>
          <p className="text-xs text-gray-500">
            Desenvolvido por advogados, para advogados.
          </p>
        </div>
      </footer>
    </div>
  )
}