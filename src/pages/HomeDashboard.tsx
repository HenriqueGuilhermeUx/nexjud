import { Link } from "react-router-dom"
import {
  Brain,
  BookOpen,
  ShieldAlert,
  FileSearch,
  FileText,
  Zap,
} from "lucide-react"
import { Card } from "@/components/ui/card"

export default function HomeDashboard() {
  const modules = [
    {
      title: "Setup Zero OAB",
      description:
        "Descubra taxa de sucesso, histórico processual e oportunidades.",
      icon: Zap,
      link: "/dashboard/onboarding",
    },
    {
      title: "Verificar Processo",
      description:
        "Analise rapidamente risco, fase e próximos movimentos.",
      icon: FileSearch,
      link: "/dashboard/process-check",
    },
    {
      title: "IA Preditiva",
      description:
        "Estime a força da tese e a probabilidade de êxito.",
      icon: Brain,
      link: "/dashboard/predictive",
    },
    {
      title: "Jurisprudência",
      description:
        "Encontre tendências e argumentos vencedores.",
      icon: BookOpen,
      link: "/dashboard/jurisprudence",
    },
    {
      title: "Red Team",
      description:
        "Simule os ataques da parte contrária.",
      icon: ShieldAlert,
      link: "/dashboard/red-team",
    },
    {
      title: "Relatórios Premium",
      description:
        "Gere relatórios estratégicos para clientes e decisões.",
      icon: FileText,
      link: "/dashboard/reports",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-3">
            NexJud
          </h1>

          <p className="text-muted-foreground text-lg">
            Plataforma Jurídica Inteligente
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {modules.map((module) => {
            const Icon = module.icon

            return (
              <Link key={module.title} to={module.link}>
                <Card className="p-6 h-full hover:border-primary transition-all hover:shadow-lg cursor-pointer">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>

                    <h3 className="font-bold text-lg">
                      {module.title}
                    </h3>
                  </div>

                  <p className="text-muted-foreground">
                    {module.description}
                  </p>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
