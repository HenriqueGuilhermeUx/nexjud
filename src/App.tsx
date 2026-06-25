import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider, useAuth } from "@/context/AuthContext"
import Landing from "@/pages/Landing"
import Login from "@/pages/Login"
import Dashboard from "@/pages/Dashboard"
import Onboarding from "@/pages/Onboarding"
import ProcessCheck from "@/pages/ProcessCheck"
import PredictiveAI from "@/pages/PredictiveAI"
import Jurisprudence from "@/pages/Jurisprudence"
import RedTeam from "@/pages/RedTeam"
import StrategicReport from "@/pages/StrategicReport"
import HomeDashboard from "@/pages/HomeDashboard"
import History from "@/pages/History"
import RedTeamSimulator from "@/pages/RedTeamSimulator"
import DraftGenerator from "@/pages/DraftGenerator"
import DraftHistory from "@/pages/DraftHistory"
import JudgeSimulator from "@/pages/JudgeSimulator"
import ProcessPortfolio from "@/pages/ProcessPortfolio"
import JudgeHistory from "@/pages/JudgeHistory"
import EnterpriseCommandCenter from "@/pages/EnterpriseCommandCenter"
import WarRoomCenter from "@/pages/WarRoomCenter"
import PartnerCouncilCenter from "@/pages/PartnerCouncilCenter"
import OneClickActionsCenter from "@/pages/OneClickActionsCenter"
import OpponentDatabaseCenter from "@/pages/OpponentDatabaseCenter"
import TribunalHeatmapCenter from "@/pages/TribunalHeatmapCenter"
import LegalIntelligenceEngine from "@/pages/LegalIntelligenceEngine"
import LegalIntelligenceHistory from "@/pages/LegalIntelligenceHistory"
import LitigationStrategyCenter from "@/pages/LitigationStrategyCenter"
import PricingPage from "@/pages/PricingPage"
import UpgradePage from "@/pages/UpgradePage"
import PlanGate from "@/components/PlanGate"
import Welcome from "@/pages/Welcome"

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366f1]"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/upgrade" element={<UpgradePage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeDashboard />} />
            <Route path="onboarding" element={<Onboarding />} />
            <Route path="process-check" element={<ProcessCheck />} />
            <Route path="predictive" element={<PredictiveAI />} />
            <Route path="jurisprudence" element={<Jurisprudence />} />
            <Route path="red-team" element={<RedTeam />} />
            <Route path="reports" element={<StrategicReport />} />
            <Route path="history" element={<History />} />
            <Route path="red-team-simulator" element={<RedTeamSimulator />} />
            <Route path="draft-generator" element={<DraftGenerator />} />
            <Route path="draft-history" element={<DraftHistory />} />
            <Route path="judge-simulator" element={<JudgeSimulator />} />
            <Route path="judge-history" element={<JudgeHistory />} />
            <Route path="process-portfolio" element={<ProcessPortfolio />} />
            <Route path="enterprise-command-center" element={<EnterpriseCommandCenter />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route
  path="legal-intelligence-engine"
  element={
    <PlanGate requiredPlan="intelligence">
      <LegalIntelligenceEngine />
    </PlanGate>
  }
/>

<Route
  path="legal-intelligence-history"
  element={
    <PlanGate requiredPlan="intelligence">
      <LegalIntelligenceHistory />
    </PlanGate>
  }
/>

<Route
  path="litigation-strategy"
  element={
    <PlanGate requiredPlan="enterprise">
      <LitigationStrategyCenter />
    </PlanGate>
  }
/>
            <Route path="war-room" element={<WarRoomCenter />} />
            <Route path="partner-council" element={<PartnerCouncilCenter />} />
            <Route path="one-click-actions" element={<OneClickActionsCenter />} />
            <Route path="opponent-database" element={<OpponentDatabaseCenter />} />
            <Route path="tribunal-heatmap" element={<TribunalHeatmapCenter />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
