import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import {
  Brain,
  Menu,
  LogOut,
  User,
  CreditCard,
  FileText,
  History as HistoryIcon,
  ShieldAlert,
  Wand2,
  Gavel,
  Archive,
  Database,
  Target,
ChevronDown,
ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { wooviApi } from "@/lib/api"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import StrategicReport from "./StrategicReport"
import HomeDashboard from "./HomeDashboard"
import History from "./History"
import RedTeamSimulator from "./RedTeamSimulator"
import DraftGenerator from "./DraftGenerator"
import DraftHistory from "./DraftHistory"
import JudgeSimulator from "./JudgeSimulator"
import JudgeHistory from "./JudgeHistory"
import ProcessPortfolio from "./ProcessPortfolio"
import EnterpriseCommandCenter from "./EnterpriseCommandCenter"
import WarRoomCenter from "./WarRoomCenter"
import PartnerCouncilCenter from "./PartnerCouncilCenter"
import OneClickActionsCenter from "./OneClickActionsCenter"
import OpponentDatabaseCenter from "./OpponentDatabaseCenter"
import TribunalHeatmapCenter from "./TribunalHeatmapCenter"
import LegalIntelligenceEngine from "./LegalIntelligenceEngine"
import LegalIntelligenceHistory from "./LegalIntelligenceHistory"
import LitigationStrategyCenter from "./LitigationStrategyCenter"

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [enterpriseOpen, setEnterpriseOpen] = useState(true)
  const { user, signOut } = useAuth()
  const location = useLocation()

  const [isPremium, setIsPremium] = useState(false)
  const [freeUses, setFreeUses] = useState(0)
  const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [cpf, setCpf] = useState("")
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [pixData, setPixData] = useState<{ qrcode: string; brCode: string } | null>(null)

  const WOOVI_PLAN_ID = "SEU_ID_DE_PLANO_WOOVI_AQUI"

  const isHomeActive = location.pathname === "/dashboard"
  const isRedTeamSimulatorActive = location.pathname.includes("red-team-simulator")
  const isDraftGeneratorActive = location.pathname.includes("draft-generator")
  const isDraftHistoryActive = location.pathname.includes("draft-history")
  const isJudgeSimulatorActive = location.pathname.includes("judge-simulator")
  const isJudgeHistoryActive = location.pathname.includes("judge-history")
  const isProcessPortfolioActive =
  location.pathname.includes("process-portfolio")
  const isEnterpriseCommandCenterActive =
  location.pathname.includes("enterprise-command-center")
  const isLegalIntelligenceEngineActive =
  location.pathname.includes("legal-intelligence-engine")
  const isWarRoomCenterActive = location.pathname.includes("war-room")
const isPartnerCouncilActive = location.pathname.includes("partner-council")
const isOneClickActionsActive = location.pathname.includes("one-click-actions")
const isOpponentDatabaseActive = location.pathname.includes("opponent-database")
const isTribunalHeatmapActive = location.pathname.includes("tribunal-heatmap")
  const isReportsActive = location.pathname.includes("reports")
  const isHistoryActive =
    location.pathname.includes("history") &&
    !isDraftHistoryActive &&
    !isJudgeHistoryActive
  const isLegalIntelligenceHistoryActive =
  location.pathname.includes("legal-intelligence-history")
  const isLitigationStrategyActive =
  location.pathname.includes("litigation-strategy")
  const isPricingActive = location.pathname.includes("pricing")

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

  const NavItem = ({ to, icon: Icon, label, active }: any) => (
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

const NavGroup = ({ label, open, onClick, children }: any) => (
  <div>
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
    >
      <span className="font-semibold text-xs uppercase tracking-wider">
        {label}
      </span>

      {open ? (
        <ChevronDown className="w-4 h-4" />
      ) : (
        <ChevronRight className="w-4 h-4" />
      )}
    </button>

    {open && (
      <div className="mt-1 space-y-1 pl-2 border-l border-border/60 ml-4">
        {children}
      </div>
    )}
  </div>
)
  
  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
  className={`fixed top-0 left-0 h-screen w-64 bg-card border-r border-border z-50 transform transition-transform duration-300 lg:translate-x-0 flex flex-col ${
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
              <p className="text-xs text-muted-foreground">Strategic AI Platform</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2 pb-6">
          <NavItem to="/dashboard" icon={Brain} label="Strategic Analysis" active={isHomeActive} />

          <NavItem
            to="/dashboard/red-team-simulator"
            icon={ShieldAlert}
            label="Simulador Red Team"
            active={isRedTeamSimulatorActive}
          />

          <NavItem
            to="/dashboard/judge-simulator"
            icon={Gavel}
            label="Judge Simulator"
            active={isJudgeSimulatorActive}
          />

          <NavItem
            to="/dashboard/judge-history"
            icon={HistoryIcon}
            label="Histórico Judge"
            active={isJudgeHistoryActive}
          />

          <NavItem
            to="/dashboard/draft-generator"
            icon={Wand2}
            label="Gerador de Minutas"
            active={isDraftGeneratorActive}
          />

          <NavItem
            to="/dashboard/draft-history"
            icon={Archive}
            label="Minutas Salvas"
            active={isDraftHistoryActive}
          />

          <NavItem
  to="/dashboard/process-portfolio"
  icon={Database}
  label="Carteira Processual"
  active={isProcessPortfolioActive}
/>

<NavGroup
  label="Enterprise Suite"
  open={enterpriseOpen}
  onClick={() => setEnterpriseOpen((prev) => !prev)}
>

  <NavItem
  to="/dashboard/legal-intelligence-engine"
  icon={Brain}
  label="Legal Intelligence"
  active={isLegalIntelligenceEngineActive}
/>

<NavItem
  to="/dashboard/legal-intelligence-history"
  icon={FileText}
  label="Histórico Intelligence"
  active={isLegalIntelligenceHistoryActive}
/>

  <NavItem
  to="/dashboard/litigation-strategy"
  icon={Target}
  label="Litigation Strategy"
  active={isLitigationStrategyActive}
/>

<NavItem
  to="/dashboard/enterprise-command-center"
  icon={Brain}
  label="Command Center"
  active={isEnterpriseCommandCenterActive}
/>

  <NavItem
    to="/dashboard/war-room"
    icon={ShieldAlert}
    label="War Room"
    active={isWarRoomCenterActive}
  />

  <NavItem
    to="/dashboard/partner-council"
    icon={Brain}
    label="Partner Council"
    active={isPartnerCouncilActive}
  />

  <NavItem
    to="/dashboard/one-click-actions"
    icon={Wand2}
    label="One-Click Actions"
    active={isOneClickActionsActive}
  />

  <NavItem
    to="/dashboard/opponent-database"
    icon={ShieldAlert}
    label="Opponent DB"
    active={isOpponentDatabaseActive}
  />

  <NavItem
    to="/dashboard/tribunal-heatmap"
    icon={Database}
    label="Tribunal Heatmap"
    active={isTribunalHeatmapActive}
  />
</NavGroup>

<NavItem
  to="/pricing"
  icon={CreditCard}
  label="Planos"
  active={isPricingActive}
/>

<NavItem to="/dashboard/reports" icon={FileText} label="Relatórios" active={isReportsActive} />
<NavItem to="/dashboard/history" icon={HistoryIcon} label="Histórico" active={isHistoryActive} />
        </nav>

        <div className="mx-4 p-3 bg-muted rounded-lg border border-border">
          {isPremium ? (
            <div className="flex items-center gap-2 text-green-600 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              PLANO PREMIUM ATIVO
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Uso gratuito restante:</p>
              <div className="w-full bg-background rounded-full h-2 overflow-hidden border">
                <div
                  className="bg-primary h-2 transition-all"
                  style={{ width: `${Math.max(0, ((3 - freeUses) / 3) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-right font-bold text-primary">
                {Math.max(0, 3 - freeUses)} / 3 restantes
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 p-4 border-t border-border bg-card">
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
          ) : isRedTeamSimulatorActive ? (
            <RedTeamSimulator />
          ) : isJudgeSimulatorActive ? (
            <JudgeSimulator />
          ) : isJudgeHistoryActive ? (
  <JudgeHistory />
) : isProcessPortfolioActive ? (
  <ProcessPortfolio />
) : isLegalIntelligenceEngineActive ? (
  <LegalIntelligenceEngine />
      ) : isLegalIntelligenceHistoryActive ? (
  <LegalIntelligenceHistory />
      ) : isLitigationStrategyActive ? (
  <LitigationStrategyCenter />
) : isEnterpriseCommandCenterActive ? (
  <EnterpriseCommandCenter />
      ) : isWarRoomCenterActive ? (
  <WarRoomCenter />
) : isPartnerCouncilActive ? (
  <PartnerCouncilCenter />
) : isOneClickActionsActive ? (
  <OneClickActionsCenter />
) : isOpponentDatabaseActive ? (
  <OpponentDatabaseCenter />
) : isTribunalHeatmapActive ? (
  <TribunalHeatmapCenter />
) : isDraftGeneratorActive ? (
            <DraftGenerator />
          ) : isDraftHistoryActive ? (
            <DraftHistory />
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
          <div className="bg-card w-full max-w-md border border-border p-6 rounded-xl shadow-2xl space-y-6 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary">
              <CreditCard className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Limite gratuito atingido!</h2>
              <p className="text-sm text-muted-foreground">
                Suas 3 análises de cortesia acabaram. Assine o <strong>Plano Premium da NexJud</strong> por{" "}
                <strong>R$ 179,90/mês</strong>.
              </p>
            </div>

            {!pixData ? (
              <div className="space-y-4 text-left">
                <Input placeholder="CPF/CNPJ" value={cpf} onChange={(e) => setCpf(e.target.value)} />
                <Button className="w-full h-11" onClick={handleGerarPixAssinatura} disabled={loadingPayment}>
                  {loadingPayment ? "Gerando Pix..." : "Ativar Premium"}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 flex flex-col items-center">
                <img src={pixData.qrcode} alt="QR Code" className="w-44 h-44 border p-2 rounded bg-white" />
                <Input readOnly value={pixData.brCode} className="font-mono text-xs" />
                <Button onClick={() => navigator.clipboard.writeText(pixData.brCode)}>Copiar Pix</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
