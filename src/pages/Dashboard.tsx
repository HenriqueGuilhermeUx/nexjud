import { useState } from "react"
import { Link, useLocation, Outlet } from "react-router-dom"
import {
  Brain,
  BookOpen,
  Menu,
  LogOut,
  User,
  CreditCard,
  ShieldAlert,
  FileSearch,
  FileText,
  LayoutDashboard,
  History as HistoryIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import HomeDashboard from "./HomeDashboard"
import ProcessCheck from "./ProcessCheck"
import PredictiveAI from "./PredictiveAI"
import Jurisprudence from "./Jurisprudence"
import RedTeam from "./RedTeam"
import StrategicReport from "./StrategicReport"
import History from "./History"

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()

  const isHomeActive = location.pathname === "/dashboard"
  const isProcessCheckActive = location.pathname.includes("process-check")
  const isPredictiveActive = location.pathname.includes("predictive")
  const isJurisprudenceActive = location.pathname.includes("jurisprudence")
  const isRedTeamActive = location.pathname.includes("red-team")
  const isReportsActive = location.pathname.includes("reports")
  const isHistoryActive = location.pathname.includes("history")

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
              <p className="text-xs text-muted-foreground">Strategic AI</p>
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
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">Plano atual:</p>
            <div className="flex items-center gap-2 text-primary text-xs font-bold">
              <CreditCard className="w-4 h-4" />
              Gratuito / Pro em breve
            </div>
          </div>
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

        <main className="p-4 lg:p-8">
          {isHomeActive ? (
            <HomeDashboard />
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
            <Outlet />
          )}
        </main>
      </div>
    </div>
  )
}
