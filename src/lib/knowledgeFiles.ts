import { getSupabaseClient } from "@/lib/supabase"

export const KNOWLEDGE_BUCKET = "knowledge-files"

/**
 * O bucket knowledge-files é privado. Em knowledge_documents.file_url guardamos o
 * caminho do arquivo dentro do bucket (ex.: "<userId>/1732540000-peticao.pdf").
 * Registros antigos guardavam a URL pública completa; esta função aceita os dois.
 */
export function knowledgeFilePath(value: string | null | undefined): string | null {
  const raw = String(value || "").trim()
  if (!raw) return null
  const marker = `/${KNOWLEDGE_BUCKET}/`
  const index = raw.indexOf(marker)
  if (/^https?:\/\//i.test(raw)) {
    if (index === -1) return null
    const path = raw.slice(index + marker.length).split("?")[0]
    return path ? decodeURIComponent(path) : null
  }
  return raw.replace(/^\/+/, "")
}

/** Gera um link temporário (5 min) e abre o arquivo em nova aba. */
export async function openKnowledgeFile(value: string | null | undefined): Promise<void> {
  const path = knowledgeFilePath(value)
  if (!path) throw new Error("Arquivo não encontrado.")
  const client = getSupabaseClient()
  if (!client) throw new Error("Supabase não inicializado")
  const { data, error } = await client.storage.from(KNOWLEDGE_BUCKET).createSignedUrl(path, 300)
  if (error || !data?.signedUrl) throw new Error("Não foi possível abrir o arquivo. Tente de novo.")
  window.open(data.signedUrl, "_blank", "noopener,noreferrer")
}
