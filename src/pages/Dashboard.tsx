import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { Brain, BookOpen, Menu, LogOut, User, Zap, CreditCard, ShieldAlert, FileSearch, FileText, LayoutDashboard, History as HistoryIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { wooviApi } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import PredictiveAI from "./PredictiveAI"
import Jurisprudence from "./Jurisprudence"
import Onboarding from "./Onboarding"
import RedTeam from "./RedTeam"
import ProcessCheck from "./ProcessCheck"
import StrategicReport from "./StrategicReport"
import HomeDashboard from "./HomeDashboard"
import History from "./History"

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()

  const [isPremium, setIsPremium] = useState<boolean>(false)
  const [freeUses, setFreeUses] = useState<number>(0)
  const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false)
  const [cpf, setCpf] = useState<string>("")
  const [loadingPayment, setLoadingPayment] = useState<boolean>(false)
  const [pixData, setPixData] = useState<{ qrcode: string; brCode: string } | null>(null)

  const WOOVI_PLAN_ID = "SEU_ID_DE_PLANO_WOOVI_AQUI"

  const isHomeActive = location.pathname === "/dashboard"
  const isOnboardingActive = location.pathname.includes("onboarding")
  const isProcessCheckActive = location.pathname.includes("process-check")
  const isPredictiveActive = location.pathname.includes("predictive")
  const isJurisprudenceActive = location.pathname.includes("jurisprudence")
  const isRedTeamActive = location.pathname.includes("red-team")
  const isReportsActive = location.pathname.includes("reports")
  const isHistoryActive = location.pathname.includes("history")

  useEffect(() => {
    async function checkUserSubscription() {
      if (!user) return

      const { data, error } = await supabase
        .from("profiles")
        .select("free_uses_count, is_premium")
        .eq("id", user.id)
        .maybeSingle()

      if (data && !error) {
        setFreeUses(data.free_uses_count || 0)
        setIsPremium(data.is_premium || false)

        if (!data.is_premium && (data.free_uses_count || 0) >= 3) {
          setIsPaywallOpen(true)
        }
      }
    }

    checkUserSubscription()
  }, [user, location.pathname])

  const handleGerarPixAssinatura = async () => {
    if (!cpf || cpf.replace(/\D/g, "").length < 11) {
      alert("Por favor, informe um CPF ou CNPJ válido.")
      return
    }

    setLoadingPayment(true)
    try {
      const response = await wooviApi.createSubscription(WOOVI_PLAN_ID, {
        name: user?.user_metadata?.full_name || "Advogado NexJud",
        email: user?.email || "",
        taxID: cpf.replace(/\D/g, ""),
      })

      if (response.success) {
        setPixData({
          qrcode: response.qrcode,
          brCode: response.brCode,
        })
      }
    } catch (error: any) {
      alert("Erro ao conectar à Woovi: " + error.message)
    } finally {
      setLoadingPayment(false)
    }
  }

  const NavItem = ({ to, icon: Icon, label, active }: { to: string; icon: any; label: string; active: boolean }) => (
    <Link
      to={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        active
          ? "bg-primary/10 text-primary border-l-2 border-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      onClick={() => setSidebarOpen(false)}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Link>
  )

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">⚖</span>
            </div>
            <div>
              <span className="text-lg font-bold text-foreground">NexJud</span>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-2">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Home" active={isHomeActive} />
          <NavItem to="/dashboard/process-check" icon={FileSearch} label="Verificar Processo" active={isProcessCheckActive} />
          <NavItem to="/dashboard/predictive" icon={Brain} label="IA Preditiva" active={isPredictiveActive} />
          <NavItem to="/dashboard/jurisprudence" icon={BookOpen} label="Jurisprudência" active={isJurisprudenceActive} />
          <NavItem to="/dashboard/red-team" icon={ShieldAlert} label="Red Team" active={isRedTeamActive} />
          <NavItem to="/dashboard/reports" icon={FileText} label="Relatórios" active={isReportsActive} />
          <NavItem to="/dashboard/history" icon={HistoryIcon} label="Histórico" active={isHistoryActive} />
        </nav>

        <div className="mx-4 p-3 bg-muted rounded-lg border border-border">
          {isPremium ? (
            <div className="flex items-center gap-2 text-green-600 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              PLANO PREMIUM ATIVO
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Uso Gratuito restante:</p>
              <div className="w-full bg-background rounded-full h-2 overflow-hidden border">
                <div className="bg-primary h-2 transition-all" style={{ width: `${Math.max(0, ((3 - freeUses) / 3) * 100)}%` }} />
              </div>
              <p className="text-[10px] text-right font-bold text-primary">{Math.max(0, 3 - freeUses)} / 3 restantes</p>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email || "Usuário"}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive" onClick={signOut}>
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-card border-b border-border p-4 lg:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-muted rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-lg font-bold">NexJud</span>
          </div>
        </header>

        <main>
  {isHomeActive ? (
    <HomeDashboard />
  ) : isOnboardingActive ? (
    <Onboarding />
  ) : isProcessCheckActive ? (
    <ProcessCheck />
  ) : isPredictiveActive ? (
    <PredictiveAI />
  ) : isJurisprudenceActive ? (
    <Jurisprudence />
  ) : isRedTeamActive ? (
    <RedTeam />
  ) : isReportsActive ? (
  <StrategicReport />
) : isHistoryActive ? (
  <History />
) : (
  <HomeDashboard />
)}
</main>
      </div>

      {isPaywallOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md border border-border p-6 rounded-xl shadow-2xl space-y-6 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <CreditCard className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Limite gratuito atingido!</h2>
              <p className="text-sm text-muted-foreground">
                Suas 3 análises de cortesia acabaram. Assine o <strong>Plano Premium da NexJud</strong> por <strong>R$ 179,90/mês</strong> para liberar acessos ilimitados.
              </p>
            </div>

            {!pixData ? (
              <div className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Informe CPF/CNPJ para assinatura:</label>
                  <Input placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} />
                </div>
                <Button className="w-full h-11 text-base font-medium" onClick={handleGerarPixAssinatura} disabled={loadingPayment}>
                  {loadingPayment ? "Gerando Pix Automático..." : "Ativar Premium Ilimitado"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col items-center">
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                  Escaneie para autorizar o Pix Recorrente
                </span>

                <img src={pixData.qrcode} alt="QR Code" className="w-44 h-44 border p-2 rounded bg-white" />

                <div className="w-full text-left space-y-1">
                  <label className="text-xs font-bold text-muted-foreground">Copia e Cola:</label>
                  <div className="flex gap-2">
                    <Input readOnly value={pixData.brCode} className="font-mono text-xs" />
                    <Button onClick={() => navigator.clipboard.writeText(pixData.brCode)}>Copiar</Button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ao pagar o primeiro mês, o banco configurará o Pix Automático para os meses seguintes. Sua tela destravará segundos após o pagamento.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
