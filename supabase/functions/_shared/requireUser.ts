import { createClient } from "jsr:@supabase/supabase-js@2"

/**
 * Exige um usuário logado.
 *
 * Importante: `verify_jwt = true` sozinho NÃO basta, porque a anon key pública
 * também é um JWT válido. Aqui validamos o token de sessão do usuário no Auth;
 * a anon key (ou nenhum token) devolve 401 antes de qualquer gasto com OpenAI,
 * CNJ ou Escavador.
 */
export type AuthResult =
  | { ok: true; userId: string; token: string }
  | { ok: false; response: Response }

export function bearerToken(req: Request): string {
  const header = req.headers.get("Authorization") || ""
  return header.replace(/^Bearer\s+/i, "").trim()
}

export async function requireUser(req: Request, corsHeaders: Record<string, string>): Promise<AuthResult> {
  const unauthorized = (message: string) => ({
    ok: false as const,
    response: Response.json({ error: message }, { status: 401, headers: corsHeaders }),
  })

  const token = bearerToken(req)
  const url = Deno.env.get("SUPABASE_URL") || ""
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || ""

  if (!token) return unauthorized("Faça login para usar este recurso.")
  if (anon && token === anon) return unauthorized("Faça login para usar este recurso.")
  if (!url || !anon) {
    return {
      ok: false,
      response: Response.json({ error: "Autenticação indisponível." }, { status: 500, headers: corsHeaders }),
    }
  }

  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data?.user?.id) return unauthorized("Sessão inválida ou expirada. Faça login novamente.")

  return { ok: true, userId: data.user.id, token }
}
