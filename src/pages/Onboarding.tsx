import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Brain, Briefcase, Building2, GraduationCap, Scale, FileText, Wand2, Database } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [profileType, setProfileType] = useState("")
  const [legalArea, setLegalArea] = useState("")
  const [goal, setGoal] = useState("")
  const [saving, setSaving] = useState(false)

  async function finishOnboarding() {
    if (!user?.id) {
      alert("Faça login novamente.")
      return
    }

    if (!profileType || !legalArea || !goal) {
      alert("Responda as 3 perguntas para continuar.")
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          user_profile_type: profileType,
          main_legal_area: legalArea,
          main_goal: goal,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      navigate("/dashboard")
    } catch (error: any) {
      alert(error.message || "Erro ao salvar onboarding.")
    } finally {
      setSaving(false)
    }
  }

  const Option = ({ value, selected, onClick, icon: Icon, title, description }: any) => (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`text-left rounded-2xl border p-4 transition ${
        selected === value
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <Icon className="w-6 h-6 text-primary mb-3" />
      <p className="font-bold">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </button>
  )

  return (
    <div className="min-h-screen bg-background text-foreground p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8">
          <h1 className="text-4xl font-bold">Bem-vindo ao NexJud</h1>
          <p className="text-muted-foreground mt-2">
            Responda 3 perguntas rápidas para ajustar sua experiência.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">1. Qual é o seu perfil?</h2>
          <div className="grid md:grid-cols-4 gap-4">
            <Option value="advogado" selected={profileType} onClick={setProfileType} icon={Scale} title="Advogado" description="Atuação individual." />
            <Option value="escritorio" selected={profileType} onClick={setProfileType} icon={Briefcase} title="Escritório" description="Equipe ou banca." />
            <Option value="juridico_interno" selected={profileType} onClick={setProfileType} icon={Building2} title="Jurídico interno" description="Empresa ou holding." />
            <Option value="estudante" selected={profileType} onClick={setProfileType} icon={GraduationCap} title="Estudante" description="Aprendizado jurídico." />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">2. Qual sua principal área?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {["Trabalhista", "Cível", "Empresarial", "Tributário", "Penal", "Previdenciário"].map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => setLegalArea(area)}
                className={`rounded-2xl border p-4 text-left ${
                  legalArea === area ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <p className="font-bold">{area}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">3. O que você quer fazer primeiro?</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Option value="analisar_documentos" selected={goal} onClick={setGoal} icon={FileText} title="Analisar documentos" description="PDF, DOCX, estatutos e contratos." />
            <Option value="analisar_processo" selected={goal} onClick={setGoal} icon={Brain} title="Analisar processo" description="Riscos, chances e estratégia." />
            <Option value="criar_peticao" selected={goal} onClick={setGoal} icon={Wand2} title="Criar petição" description="Peças e minutas com IA." />
            <Option value="organizar_casos" selected={goal} onClick={setGoal} icon={Database} title="Organizar casos" description="Clientes, processos e histórico." />
            <Option value="conversar_ia" selected={goal} onClick={setGoal} icon={Brain} title="Conversar com IA" description="Tire dúvidas jurídicas." />
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={finishOnboarding}
            disabled={saving}
            className="px-8 py-4 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Começar agora"}
          </button>
        </div>
      </div>
    </div>
  )
}
