import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signInWithEmail, signUpWithEmail } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      if (isSignUp) {
        // Correção Crucial: Passa o objeto contendo os metadados do Nome para o Auth do Supabase
        await signUpWithEmail(email, password, {
          data: { name: name }
        })
        setSuccessMessage("Cadastro realizado com sucesso! Agora você já pode fazer login.")
        setIsSignUp(false)
       
        setName("")
        setEmail("")
        setPassword("")
      } else {
       const tutorialDone = localStorage.getItem("nexjud_onboarding")

if (!tutorialDone) {
  navigate("/welcome")
} else {
  navigate("/dashboard")
}
    } catch (err: any) {
      setError(err.message || "Erro ao processar requisição.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#6366f1] to-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-2xl">⚖</span>
          </div>
          <CardTitle className="text-2xl text-foreground">NexJud</CardTitle>
          <CardDescription className="text-muted-foreground">Justiça Inteligente onDemand</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="text-sm font-medium mb-2 block text-foreground">Nome</label>
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                  className="bg-input border-border text-foreground"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">Email</label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-input border-border text-foreground"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block text-foreground">Senha</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-input border-border text-foreground"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 p-3 bg-red-500/10 rounded-md">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2 text-sm text-green-400 p-3 bg-green-500/10 rounded-md text-left">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-[#6366f1] hover:bg-[#5558e3] text-white"
              disabled={loading}
            >
              {loading ? (
                <span className="animate-pulse">Processando...</span>
              ) : isSignUp ? (
                "Criar Conta"
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? "Já tem conta?" : "Não tem conta?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp)
                  setError(null)
                  setSuccessMessage(null)
                }}
                className="text-[#6366f1] hover:underline font-medium"
              >
                {isSignUp ? "Faça login" : "Cadastre-se"}
              </button>
            </p>
          </div>

          <div className="mt-4 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-[#6366f1]">
              ← Voltar para Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
