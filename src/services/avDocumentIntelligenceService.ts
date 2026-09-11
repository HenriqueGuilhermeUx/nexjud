import { supabase } from "@/lib/supabase"

export type AvDocumentIntelligence = {
  documentId?: string
  documentType?: string
  confidence?: number
  issuer?: string | null
  recipient?: string | null
  documentNumber?: string | null
  dates?: Array<{ label?: string; value?: string }>
  parties?: Array<{ role?: string; name?: string }>
  amounts?: Array<{ currency?: string; raw?: string; value?: number }>
  identifiers?: Array<{ type?: string; value?: string }>
  obligations?: Array<{ index?: number; text?: string }>
  items?: Array<Record<string, unknown>>
  summary?: string
  source?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export async function analyzeKnowledgeDocument(input: {
  text: string
  documentType?: string
  fileName?: string
  mimeType?: string
  pages?: number
}): Promise<AvDocumentIntelligence> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error("Sessão necessária para analisar o documento")

  const response = await fetch("/api/av-document-intelligence", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      text: input.text,
      documentType: input.documentType || "auto",
      file: {
        name: input.fileName || "documento",
        mimeType: input.mimeType || "text/plain",
        pages: input.pages || 1,
      },
    }),
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok || !payload?.result) {
    throw new Error(payload?.error || "Não foi possível analisar o documento")
  }
  return payload.result as AvDocumentIntelligence
}

export function compactIntelligence(result: AvDocumentIntelligence | null) {
  if (!result) return null
  return {
    documentId: result.documentId || null,
    documentType: result.documentType || "other",
    confidence: Number(result.confidence || 0),
    issuer: result.issuer || null,
    recipient: result.recipient || null,
    documentNumber: result.documentNumber || null,
    dates: (result.dates || []).slice(0, 20),
    parties: (result.parties || []).slice(0, 20),
    amounts: (result.amounts || []).slice(0, 30),
    obligations: (result.obligations || []).slice(0, 20),
    summary: result.summary || null,
  }
}
