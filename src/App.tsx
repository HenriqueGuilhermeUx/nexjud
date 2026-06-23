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

// Componente Guardião de Rotas Privadas
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366f1]"></div>
      </div>
    )
  }

  // Se não estiver logado, redireciona estritamente para o login
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
          {/* Rotas Públicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />

          {/* Rotas Protegidas e Autenticadas */}
          <Route
            path="/dashboard"
            element = {
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
            {/* Redirecionamento base do painel */}
            <Route index element={<HomeDashboard />} />
          </Route>

          {/* Fallback de rotas seguras */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
