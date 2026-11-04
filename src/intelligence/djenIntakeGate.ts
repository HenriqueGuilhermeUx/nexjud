/**
 * DJEN intake safety gate. Pure functions; no network requests or storage.
 * Public communication != full judicial decision. Never index personal data
 * or attribute authorship based only on an unverified signature guess.
 */
export type DjenActKind = "sentenca" | "decisao_interlocutoria" | "despacho" | "comunicacao" | "indeterminado"
export type DjenScreening = {
  disposition: "block" | "manual_review"
  kind: DjenActKind
  flags: string[]
  canIndexForJudgeDna: false
  safeToStoreRaw: false
  source: "djen_public_communication"
}
const sensitive = [
  /segredo\s+de\s+justi[çc]a/i,
  /tramita[çc][ãa]o\s+(?:sigilosa|em\s+sigilo)/i,
  /processo\s+sigiloso/i,
  /sigilo\s+processual/i,
]
const isDecision = /\b(?:decis[ãa]o\s+interlocut[óo]ria|decido|defiro|indefiro)\b/i
const isSentence = /\b(?:senten[çc]a|julgo\s+(?:procedente|improcedente|parcialmente\s+procedente)|extingo\s+o\s+processo)\b/i
const isDesk = /\b(?:despacho|intime-se|cite-se|vista\s+[àa]s?\s+partes)\b/i
const containsTaxId = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/
const containsEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i

export function screenDjenCommunication(input: { text: string; publicSourceUrl?: string; court?: string }): DjenScreening {
  const text = input.text || ""
  const flags: string[] = []
  if (!/^https:\/\/[^\s]+$/i.test(input.publicSourceUrl || "")) flags.push("no_valid_public_source_url")
  if (!input.court?.trim()) flags.push("court_not_identified")
  if (text.length < 160) flags.push("insufficient_text")
  if (sensitive.some(re => re.test(text))) flags.push("possible_sealed_proceeding")
  if (containsTaxId.test(text) || containsEmail.test(text)) flags.push("personal_identifiers_need_redaction")
  const kind: DjenActKind = isSentence.test(text) ? "sentenca"
    : isDecision.test(text) ? "decisao_interlocutoria"
    : isDesk.test(text) ? "despacho"
    : text.trim() ? "comunicacao" : "indeterminado"
  if (kind !== "sentenca" && kind !== "decisao_interlocutoria") flags.push("not_a_reasoned_decision")
  // Even apparent full sentences require a reviewer to establish authenticity,
  // judge attribution, outcome, redaction, and legal reuse rights.
  flags.push("authorship_and_full_reasoning_unverified")
  const blocked = flags.some(flag =>
    ["possible_sealed_proceeding", "no_valid_public_source_url", "not_a_reasoned_decision"].includes(flag))
  return {
    disposition: blocked ? "block" : "manual_review",
    kind, flags,
    canIndexForJudgeDna: false,
    safeToStoreRaw: false,
    source: "djen_public_communication",
  }
}

export function redactKnownIdentifiers(text: string) {
  // This is only a minimal preview; it is NOT sufficient anonymization of parties.
  return text.replace(containsTaxId, "[DOCUMENTO SUPRIMIDO]")
    .replace(new RegExp(containsEmail.source, "gi"), "[EMAIL SUPRIMIDO]")
}
