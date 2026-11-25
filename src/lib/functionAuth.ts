import { getSupabaseClient } from "@/lib/supabase"

export const LOGIN_REQUIRED_MESSAGE = "Sessão expirada. Faça login novamente."

/**
 * Monta os headers para chamar uma Edge Function como o usuário logado.
 *
 * Nunca usa a anon key como Bearer: as funções exigem o token de sessão do
 * usuário e recusam a anon key com 401.
 */
export function buildUserFunctionHeaders(
  accessToken: string | null | undefined,
  anonKey: string,
): Record<string, string> {
  const token = String(accessToken || "").trim()
  if (!token || token === anonKey) throw new Error(LOGIN_REQUIRED_MESSAGE)
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    apikey: anonKey,
  }
}

export async function getUserFunctionHeaders(): Promise<Record<string, string>> {
  const client = getSupabaseClient()
  if (!client) throw new Error("Supabase não inicializado")
  const { data } = await client.auth.getSession()
  return buildUserFunctionHeaders(data.session?.access_token, import.meta.env.VITE_SUPABASE_ANON_KEY || "")
}
