import { createClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ""
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers - Email/Password only
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
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
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Database helpers
export async function getUserSubscription(userId: string) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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
  let query = supabase
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
  const { data, error } = await supabase
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
  let query = supabase
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