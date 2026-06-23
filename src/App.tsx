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
import JudgeSimulator from "@/pages/JudgeSimulator"

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

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route path="onboarding" element={<Onboarding />} />
            <Route path="process-check" element={<ProcessCheck />} />
            <Route path="predictive" element={<PredictiveAI />} />
            <Route path="jurisprudence" element={<Jurisprudence />} />
            <Route path="red-team" element={<RedTeam />} />
            <Route path="reports" element={<StrategicReport />} />
            <Route path="history" element={<History />} />
            <Route path="red-team-simulator" element={<RedTeamSimulator />} />
            <Route path="draft-generator" element={<DraftGenerator />} />
            <Route path="judge-simulator" element={<JudgeSimulator />} />
            <Route index element={<HomeDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
