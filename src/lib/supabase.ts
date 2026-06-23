import { createClient, SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ""
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ""

// Create client only if credentials are available
let supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  console.warn("Supabase credentials not configured. Using mock mode.")
}

// Export a safe wrapper
export const getSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase not initialized. Please configure environment variables.")
  }
  return supabase
}

// For backward compatibility, export supabase directly but handle null case
export const getSupabaseClient = () => supabase

// Auth helpers - Email/Password only
export async function signInWithEmail(email: string, password: string) {
  const client = getSupabase()
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signUpWithEmail(email: string, password: string) {
  const client = getSupabase()
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin + "/dashboard",
    },
  })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  if (!supabase) return null
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Re-export supabase for direct access if needed (will be null if not configured)
export { supabase }

// Database helpers
export async function getUserSubscription(userId: string) {
  const client = getSupabase()
  const { data, error } = await client
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .single()

  if (error && error.code !== "PGRST116") throw error
  return data
}

export async function saveAnalysis(
  userId: string,
  type: "predictive" | "jurisprudence",
  inputData: Record<string, any>,
  result: Record<string, any>
) {
  const client = getSupabase()
  const { data, error } = await client
    .from("analysis_history")
    .insert({
      user_id: userId,
      type,
      input_data: inputData,
      result,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getAnalysisHistory(userId: string, type?: string) {
  const client = getSupabase()
  let query = client
    .from("analysis_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (type) {
    query = query.eq("type", type)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function saveToFavorites(
  userId: string,
  type: "predictive" | "jurisprudence",
  referenceId: string
) {
  const client = getSupabase()
  const { data, error } = await client
    .from("favorites")
    .insert({
      user_id: userId,
      type,
      reference_id: referenceId,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getFavorites(userId: string, type?: string) {
  const client = getSupabase()
  let query = client
    .from("favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (type) {
    query = query.eq("type", type)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function deleteAnalysisHistoryItem(id: string, userId: string) {
  const client = getSupabase()

  const { error } = await client
    .from("analysis_history")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)

  if (error) throw error
}

export function getAnalysisTypeLabel(type: string) {
  const labels: Record<string, string> = {
    predictive: "IA Preditiva",
    jurisprudence: "Jurisprudência",
    red_team: "Red Team",
    process_check: "Verificação de Processo",
    setup_oab: "Setup Zero OAB",
    report: "Relatório Estratégico",
  }

  return labels[type] || "Análise"
}
