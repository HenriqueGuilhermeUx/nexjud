import { supabase } from "@/lib/supabase"

export async function createLegalCase(payload: any) {
  const { data, error } = await supabase
    .from("legal_cases")
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getLegalCases(userId: string) {
  const { data, error } = await supabase
    .from("legal_cases")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function createKnowledgeDocument(payload: any) {
  const { data, error } = await supabase
    .from("knowledge_documents")
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getKnowledgeDocuments(userId: string) {
  const { data, error } = await supabase
    .from("knowledge_documents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function createLegalMemory(payload: any) {
  const { data, error } = await supabase
    .from("legal_memory")
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getLegalMemory(userId: string) {
  const { data, error } = await supabase
    .from("legal_memory")
    .select("*")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function createChatSession(payload: any) {
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getChatSessions(userId: string) {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getChatMessages(sessionId: string, userId: string) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data || []
}

export async function saveChatMessage(payload: any) {
  const { data, error } = await supabase
    .from("chat_messages")
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateChatSession(sessionId: string, payload: any) {
  const { data, error } = await supabase
    .from("chat_sessions")
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function runLegalChatAi({
  userId,
  sessionId,
  message,
  caseId,
}: {
  userId: string
  sessionId?: string
  message: string
  caseId?: string | null
}) {
  const { data, error } = await supabase.functions.invoke("legal-chat-ai", {
    body: {
      userId,
      sessionId,
      message,
      caseId,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return data
}

export async function uploadKnowledgeFile({
  userId,
  file,
}: {
  userId: string
  file: File
}) {
  const safeName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")

  const path = `${userId}/${Date.now()}-${safeName}`

  const { data, error } = await supabase.storage
    .from("knowledge-files")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (error) throw error

  const { data: publicUrl } = supabase.storage
    .from("knowledge-files")
    .getPublicUrl(data.path)

  return {
    path: data.path,
    url: publicUrl.publicUrl,
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
  }
}
