import { useState, useEffect } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
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
  Sparkles,
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
import AICopilot from "./AICopilot"
import LegalChat from "./LegalChat"
import ChiefLegalOfficer from "./ChiefLegalOfficer"
import AICopilotHistory from "./AICopilotHistory"
import KnowledgeBase from "./KnowledgeBase"
import LegalMemory from "./LegalMemory"
import LegalCases from "./LegalCases"
import JurisprudenceLibrary from "./JurisprudenceLibrary"

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [enterpriseOpen, setEnterpriseOpen] = useState(true)
  const [analysisOpen, setAnalysisOpen] = useState(true)
const [productionOpen, setProductionOpen] = useState(false)
const [managementOpen, setManagementOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [isPremium, setIsPremium] = useState(false)
const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)
const [isPaywallOpen, setIsPaywallOpen] = useState(false)
  const [cpf, setCpf] = useState("")
  const [loadingPayment, setLoadingPayment] = useState(false)
  const [pixData, setPixData] = useState<{ qrcode: string; brCode: string } | null>(null)

  const WOOVI_PLAN_ID = "SEU_ID_DE_PLANO_WOOVI_AQUI"

  const isHomeActive = location.pathname === "/dashboard"

const isAICopilotHistoryActive =
  location.pathname.includes("ai-copilot-history")

const isAICopilotActive =
  location.pathname.includes("ai-copilot") && !isAICopilotHistoryActive
  const isLegalChatActive =
  location.pathname.includes("/dashboard/legal-chat")
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

const isLegalIntelligenceHistoryActive =
  location.pathname.includes("legal-intelligence-history")

const isHistoryActive =
  location.pathname.includes("history") &&
  !isDraftHistoryActive &&
  !isJudgeHistoryActive &&
  !isAICopilotHistoryActive &&
  !isLegalIntelligenceHistoryActive
  const isLitigationStrategyActive =
  location.pathname.includes("litigation-strategy")
  const isPricingActive = location.pathname.includes("pricing")
  const isTutorialActive =
  location.pathname.includes("tutorial")
  const isChiefLegalOfficerActive =
  location.pathname.includes("chief-legal-officer")
  const isKnowledgeBaseActive = location.pathname.includes("knowledge-base")
const isLegalMemoryActive = location.pathname.includes("legal-memory")
const isLegalCasesActive = location.pathname.includes("legal-cases")
  const isJurisprudenceLibraryActive =
  location.pathname.includes("jurisprudence-library")

  useEffect(() => {
  async function checkUserSubscription() {
    if (!user) return

    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_plan, subscription_status, trial_ends_at, premium_until, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle()

    if (data && !error) {
      if (
        data.onboarding_completed === false &&
        !location.pathname.includes("onboarding")
      ) {
        navigate("/dashboard/onboarding")
        return
      }

      const now = new Date()

      const trialEnds = data.trial_ends_at
        ? new Date(data.trial_ends_at)
        : null

      const premiumUntil = data.premium_until
        ? new Date(data.premium_until)
        : null

      const daysLeft = trialEnds
        ? Math.max(
            0,
            Math.ceil(
              (trialEnds.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 0

      const hasActivePremium =
        data.subscription_status === "active" ||
        data.subscription_plan === "enterprise" ||
        Boolean(premiumUntil && premiumUntil > now)

      const hasActiveTrial = daysLeft > 0

      setTrialDaysLeft(daysLeft)
      setIsPremium(hasActivePremium || hasActiveTrial)

      if (!hasActivePremium && !hasActiveTrial) {
        setIsPaywallOpen(true)
      }
    }
  }

  checkUserSubscription()
}, [user, location.pathname, navigate])
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

  const NavItem = ({ to, icon: Icon, label, description, active }: any) => (
  <Link
    to={to}
    className={`flex items-start gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active
        ? "bg-primary/10 text-primary border-l-2 border-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`}
    onClick={() => setSidebarOpen(false)}
  >
    <Icon className="w-5 h-5 mt-0.5 shrink-0" />
    <div className="min-w-0">
      <span className="font-medium block leading-tight">{label}</span>
      {description && (
        <span className="text-[11px] text-muted-foreground leading-snug block mt-1">
          {description}
        </span>
      )}
    </div>
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

  const TaskLauncher = () => (
  <section className="p-6 lg:p-10 pb-0">
    <div className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-6 lg:p-8 shadow-2xl">
      <h1 className="text-3xl font-bold text-foreground">
        O que você deseja fazer agora?
      </h1>

      <p className="text-muted-foreground mt-2">
        Escolha uma tarefa e o NexJud leva você para a ferramenta certa.
      </p>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        <QuickAction
  to="/dashboard/knowledge-base"
  icon={FileText}
  title="Quero analisar um documento"
  description="Envie estatuto, contrato, ata, PDF, DOCX ou imagem."
/>

<QuickAction
  to="/dashboard/ai-copilot"
  icon={Sparkles}
  title="Quero analisar um processo"
  description="Receba riscos, chances de êxito e estratégia."
/>

<QuickAction
  to="/dashboard/legal-chat"
  icon={Brain}
  title="Quero tirar uma dúvida jurídica"
  description="Converse com a IA usando seus documentos e casos."
/>

<QuickAction
  to="/dashboard/draft-generator"
  icon={Wand2}
  title="Quero criar uma petição"
  description="Gere peças, contratos, notificações e minutas."
/>

<QuickAction
  to="/dashboard/legal-cases"
  icon={Database}
  title="Quero organizar meus processos"
  description="Cadastre clientes, processos, riscos e histórico."
/>

<QuickAction
  to="/dashboard/litigation-strategy"
  icon={Target}
  title="Quero montar uma estratégia"
  description="Use Deal Breaker, Victory Plan e Litigation Chess."
/>

<QuickAction
  to="/dashboard/judge-simulator"
  icon={Gavel}
  title="Quero simular uma decisão"
  description="Veja como um juiz poderia analisar o caso."
/>

<QuickAction
  to="/dashboard/reports"
  icon={FileText}
  title="Quero preparar uma reunião"
  description="Gere relatório claro para cliente, sócio ou diretoria."
/>
      </div>
    </div>
  </section>
)

const QuickAction = ({ to, icon: Icon, title, description }: any) => (
  <Link
    to={to}
    className="rounded-2xl border border-border bg-card/80 p-4 hover:border-primary/50 transition block"
  >
    <Icon className="w-6 h-6 text-primary mb-3" />
    <p className="font-bold text-foreground">{title}</p>
    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
      {description}
    </p>
  </Link>
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
  <NavItem
    to="/dashboard"
  icon={Brain}
  label="Início"
  description="Escolha o que deseja fazer."
  active={isHomeActive}
/>

<NavGroup
  label="Analisar"
  open={analysisOpen}
  onClick={() => setAnalysisOpen((v) => !v)}
>
  <NavItem
    to="/dashboard/legal-chat"
    icon={Brain}
    label="Conversar com a IA"
description="Tire dúvidas jurídicas usando seus documentos e casos."
    active={isLegalChatActive}
  />

  <NavItem
    to="/dashboard/knowledge-base"
    icon={FileText}
    label="Analisar documentos"
description="Envie contratos, estatutos, atas, PDFs, DOCX e imagens."
    active={isKnowledgeBaseActive}
  />

  <NavItem
    to="/dashboard/ai-copilot"
    icon={Sparkles}
    label="Analisar um processo"
description="Receba riscos, chances, estratégia e próximos passos."
    active={isAICopilotActive}
  />

  <NavItem
    to="/dashboard/legal-memory"
    icon={Archive}
    label="Biblioteca Inteligente"
description="Salve teses, aprendizados e conhecimento do escritório."
    active={isLegalMemoryActive}
  />
</NavGroup>

<NavGroup
  label="Produzir"
  open={productionOpen}
  onClick={() => setProductionOpen((v) => !v)}
>
  <NavItem
    to="/dashboard/draft-generator"
    icon={Wand2}
    label="Criar petição ou contrato"
description="Gere peças, contratos, notificações e minutas com IA."
    active={isDraftGeneratorActive}
  />

  <NavItem
    to="/dashboard/draft-history"
    icon={Archive}
    label="Documentos criados"
description="Revise e reutilize peças anteriores."
    active={isDraftHistoryActive}
  />

  <NavItem
    to="/dashboard/reports"
    icon={FileText}
    label="Relatórios"
description="Prepare relatórios para clientes, sócios e reuniões."
    active={isReportsActive}
  />
</NavGroup>

<NavGroup
  label="Gerenciar"
  open={managementOpen}
  onClick={() => setManagementOpen((v) => !v)}
>
  <NavItem
    to="/dashboard/legal-cases"
    icon={Database}
    label="Meus processos"
description="Organize clientes, processos, riscos e estratégia."
    active={isLegalCasesActive}
  />

  <NavItem
    to="/dashboard/process-portfolio"
    icon={Database}
    label="Carteira de processos"
description="Visualize todos os casos em andamento."
    active={isProcessPortfolioActive}
  />

  <NavItem
    to="/dashboard/history"
    icon={HistoryIcon}
    label="Histórico"
description="Veja tudo que já foi feito na plataforma."
    active={isHistoryActive}
  />

  <NavItem
    to="/dashboard/ai-copilot-history"
    icon={HistoryIcon}
    label="Histórico das análises"
description="Consulte análises anteriores da IA."
    active={isAICopilotHistoryActive}
  />
</NavGroup>

<NavGroup
  label="Estratégia Avançada"
  open={enterpriseOpen}
  onClick={() => setEnterpriseOpen((prev) => !prev)}
>
  <NavItem
    to="/dashboard/litigation-strategy"
    icon={Target}
    label="Strategy Engine"
    description="Deal Breaker, Victory Plan e tática."
    active={isLitigationStrategyActive}
  />

  <NavItem
  to="/dashboard/jurisprudence-library"
  icon={Gavel}
  label="Jurisprudência Salva"
  description="Guarde teses, decisões e fundamentos."
  active={isJurisprudenceLibraryActive}
/>

  <NavItem
    to="/dashboard/judge-simulator"
    icon={Gavel}
    label="Simular juiz"
    description="Antecipe riscos e decisões possíveis."
    active={isJudgeSimulatorActive}
  />

  <NavItem
    to="/dashboard/red-team-simulator"
    icon={ShieldAlert}
    label="Red Team"
    description="Encontre fragilidades na sua tese."
    active={isRedTeamSimulatorActive}
  />

  <NavItem
    to="/dashboard/chief-legal-officer"
    icon={Brain}
    label="Chief Legal Officer"
    description="Visão executiva para decisões complexas."
    active={isChiefLegalOfficerActive}
  />

  <NavItem
    to="/dashboard/legal-intelligence-engine"
    icon={Brain}
    label="Legal Intelligence"
    description="Inteligência jurídica e padrões."
    active={isLegalIntelligenceEngineActive}
  />

  <NavItem
    to="/dashboard/war-room"
    icon={ShieldAlert}
    label="War Room"
    description="Cenários, riscos e plano de ataque."
    active={isWarRoomCenterActive}
  />

  <NavItem
    to="/dashboard/partner-council"
    icon={Brain}
    label="Partner Council"
    description="Simule uma reunião de sócios."
    active={isPartnerCouncilActive}
  />

  <NavItem
    to="/dashboard/opponent-database"
    icon={ShieldAlert}
    label="Banco de Oponentes"
    description="Mapeie adversários e padrões."
    active={isOpponentDatabaseActive}
  />

  <NavItem
    to="/dashboard/tribunal-heatmap"
    icon={Database}
    label="Mapa dos Tribunais"
    description="Tendências e comportamento decisório."
    active={isTribunalHeatmapActive}
  />

  <NavItem
    to="/dashboard/enterprise-command-center"
    icon={Brain}
    label="Command Center"
    description="Painel executivo avançado."
    active={isEnterpriseCommandCenterActive}
  />

  <NavItem
    to="/dashboard/one-click-actions"
    icon={Wand2}
    label="Ações rápidas"
    description="Atalhos para tarefas frequentes."
    active={isOneClickActionsActive}
  />
</NavGroup>

<NavItem
  to="/pricing"
  icon={CreditCard}
  label="Planos"
  description="Assinatura e upgrade."
  active={isPricingActive}
/>

<NavItem
  to="/tutorial"
  icon={Sparkles}
  label="Tutorial"
  description="Aprenda a usar o NexJud."
  active={isTutorialActive}
/>
        </nav>

        <div className="mx-4 p-3 bg-muted rounded-lg border border-border">
  {isPremium ? (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-green-600 text-xs font-bold">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        TRIAL PREMIUM ATIVO
      </div>

      <p className="text-[11px] text-muted-foreground">
        {trialDaysLeft !== null
          ? `Restam ${trialDaysLeft} dia(s) de acesso completo.`
          : "Acesso completo liberado."}
      </p>
    </div>
  ) : (
    <div className="space-y-2">
      <p className="text-xs font-bold text-destructive">
        Trial expirado
      </p>
      <p className="text-[11px] text-muted-foreground">
        Assine o Premium para continuar usando todos os recursos.
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
  {isAICopilotActive ? (
    <AICopilot />
) : isLegalChatActive ? (
    <LegalChat />
      ) : isKnowledgeBaseActive ? (
  <KnowledgeBase />
) : isLegalMemoryActive ? (
  <LegalMemory />
) : isLegalCasesActive ? (
  <LegalCases />
      ) : isAICopilotHistoryActive ? (
  <AICopilotHistory />
  ) : isHomeActive ? (
  <>
    <TaskLauncher />
    <HomeDashboard />
  </>
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
      ) : isJurisprudenceLibraryActive ? (
  <JurisprudenceLibrary />
  ) : isChiefLegalOfficerActive ? (
    <ChiefLegalOfficer />
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
