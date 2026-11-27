import { useState, useEffect } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
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
  Bell,
ChevronDown,
ChevronRight,
Search,
Scale,
} from "lucide-react"
import type { ComponentType } from "react"
import { TOOL_GROUPS, type ToolIcon } from "@/navigation/toolCatalog"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
import { usePlan } from "@/hooks/usePlan"
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
import Precedents from "./Precedents"
import CNJProcesses from "./CNJProcesses"

const TOOL_ICONS: Record<ToolIcon, ComponentType<{ className?: string }>> = {
  target: Target,
  brain: Brain,
  file: FileText,
  sparkles: Sparkles,
  archive: Archive,
  wand: Wand2,
  bell: Bell,
  database: Database,
  history: HistoryIcon,
  gavel: Gavel,
  shield: ShieldAlert,
  search: Search,
  scale: Scale,
}

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAllTools, setShowAllTools] = useState(false)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
const [morningBriefUnread, setMorningBriefUnread] = useState(false)
const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const { user, signOut } = useAuth()
  const location = useLocation()

  const { subscription, trialDaysLeft } = usePlan()
  const isTrial = subscription?.status === "trialing"
  const hasActiveAccess = Boolean(subscription?.active)

  const isHomeActive = location.pathname === "/dashboard" || location.pathname === "/dashboard/meus-processos"
  const isDecisionIntelligenceActive = location.pathname.includes("decision-intelligence")

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
  const isPrecedentsActive = location.pathname.includes("precedents")
  const isCnjProcessesActive =
  location.pathname.includes("cnj-processes")

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
const isOfficeIntelligenceActive = location.pathname.includes("office-intelligence")
const isNotificationsActive = location.pathname.includes("notifications")
  const isJurisprudenceLibraryActive =
  location.pathname.includes("jurisprudence-library")

  useEffect(() => {
    async function checkNotificationUnread() {
      if (!user?.id) return
      const { count } = await supabase
        .from("automation_notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null)
      setNotificationUnreadCount(count || 0)
    }
    checkNotificationUnread()
  }, [user, location.pathname])

  useEffect(() => {
    async function checkMorningBriefUnread() {
      if (!user?.id) return
      const today = new Date().toLocaleDateString("en-CA")
      const { data } = await supabase
        .from("legal_morning_briefs")
        .select("id, read_at")
        .eq("user_id", user.id)
        .eq("brief_date", today)
        .maybeSingle()
      setMorningBriefUnread(Boolean(data && !data.read_at))
    }
    checkMorningBriefUnread()
  }, [user, location.pathname])

  const NavItem = ({ to, icon: Icon, label, description, active, badge }: any) => (
  <a
    href={to}
    className={`flex items-start gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active
        ? "bg-primary/10 text-primary border-l-2 border-primary"
        : "text-muted-foreground hover:text-foreground hover:bg-muted"
    }`}
    onClick={() => setSidebarOpen(false)}
  >
    <Icon className="w-5 h-5 mt-0.5 shrink-0" />
    <div className="min-w-0 flex-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium block leading-tight">{label}</span>
        {badge && <span className="shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black text-black">{badge}</span>}
      </div>
      {description && (
        <span className="text-[11px] text-muted-foreground leading-snug block mt-1">
          {description}
        </span>
      )}
    </div>
  </a>
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
  to="/dashboard/decision-intelligence"
  icon={Target}
  title="DNA do Juiz — IA Preditiva"
  description="Descubra argumentos, provas e estratégias com base nas decisões e precedentes disponíveis."
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
  title="Quero treinar meus argumentos"
  description="Simule questionamentos e teste a sustentação dos seus argumentos."
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

<nav aria-label="Navegação principal" className="flex-1 overflow-y-auto p-3 space-y-1 pb-6">
  <p className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Seu trabalho</p>
  <NavItem to="/dashboard" icon={Database} label="Meus processos" description="O que mudou e o próximo passo." active={isHomeActive} />
<NavItem to="/dashboard/decision-intelligence" icon={Target} label="DNA do Juiz — IA Preditiva" description="Estratégia do caso: como o juízo decide e qual tese usar." active={isDecisionIntelligenceActive} />
<NavItem to="/dashboard/draft-generator" icon={Wand2} label="Escrever peça" description="Com decisões reais da sua vara." active={isDraftGeneratorActive} />
<NavItem to="/dashboard/legal-chat" icon={Brain} label="Assistente IA" description="Pergunte e pesquise." active={isLegalChatActive} />
<NavItem to="/dashboard/notifications" icon={Bell} label="Alertas" description="O que precisa da sua atenção." active={isNotificationsActive} badge={notificationUnreadCount > 0 ? String(notificationUnreadCount) : undefined} />
<button type="button" aria-expanded={showAllTools} onClick={() => setShowAllTools(v => !v)} className="w-full flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted"><span>{showAllTools ? "Ocultar ferramentas" : "Mais ferramentas"}</span>{showAllTools ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
{showAllTools && <div className="space-y-2 border-l border-border/60 pl-1">
{TOOL_GROUPS.map((group) => (
  <NavGroup
    key={group.id}
    label={group.label}
    open={Boolean(openGroups[group.id])}
    onClick={() => setOpenGroups((current) => ({ ...current, [group.id]: !current[group.id] }))}
  >
    {group.tools.map((tool) => (
      <NavItem
        key={tool.path}
        to={tool.path}
        icon={TOOL_ICONS[tool.icon]}
        label={tool.label}
        description={tool.description}
        active={location.pathname === tool.path}
        badge={tool.path === "/dashboard/notifications" && notificationUnreadCount > 0
          ? String(notificationUnreadCount)
          : tool.path === "/dashboard/office-intelligence" && morningBriefUnread
            ? "NOVO"
            : tool.badge}
      />
    ))}
  </NavGroup>
))}
</div>}

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

        <div className="mx-4 mb-2 p-3 bg-muted rounded-lg border border-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-green-600 text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              {isTrial ? "TRIAL PREMIUM ATIVO" : "PLANO ATIVO"}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isTrial
                ? `Restam ${trialDaysLeft} dia(s) de acesso completo.`
                : hasActiveAccess
                  ? "Acesso liberado pelo seu plano."
                  : "Verificando acesso..."}
            </p>
          </div>
        </div>
        <div className="shrink-0 p-3 border-t border-border bg-card relative z-[40]">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email || "Usuário"}</p>
            </div>
          </div>

          <Button variant="ghost" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive border border-border" onClick={async () => { try { await signOut(); window.location.assign("/login") } catch (error) { console.error("Falha ao sair", error); window.alert("Não foi possível encerrar a sessão. Tente novamente.") } }}>
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 lg:ml-64">
        <header className="sticky top-0 z-30 bg-card border-b border-border p-4 lg:hidden">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-muted rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-lg font-bold">NexJud</span>
          </div>
        </header>

        <main className="min-w-0 w-full"><Outlet /></main>
      </div>
    </div>
  )
}
