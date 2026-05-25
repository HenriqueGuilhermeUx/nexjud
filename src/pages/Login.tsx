import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"
import { AlertCircle, AlertTriangle } from "lucide-react"

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { signInWithEmail, signUpWithEmail, isConfigured } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!isConfigured) {
        setError("Supabase não está configurado. Verifique as variáveis de ambiente.")
        setLoading(false)
        return
      }

      if (isSignUp) {
        await signUpWithEmail(email, password)
        setError("Verifique seu email para confirmar o cadastro!")
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login")
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
          {!isConfigured && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-200">
                <p className="font-medium">Modo Demo Ativo</p>
                <p className="text-yellow-300/80">O Supabase não está configurado. O login não funcionará até que as variáveis de ambiente sejam configuradas no Netlify.</p>
              </div>
            </div>
          )}

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

            <Button
              type="submit"
              className="w-full bg-[#6366f1] hover:bg-[#5558e3] text-white"
              disabled={loading || !isConfigured}
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