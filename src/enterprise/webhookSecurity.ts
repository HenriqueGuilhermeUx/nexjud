import type { EnterpriseWebhookEnvelope } from "./apiContracts"

/**
 * Transport-level validation only. Signing and delivery must happen on a
 * trusted server with per-tenant secrets, never in browser code.
 */
export function validateWebhookDestination(rawUrl: string): URL {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error("URL de webhook inválida.")
  }
  if (url.protocol !== "https:") throw new Error("Webhook exige HTTPS.")
  if (url.username || url.password) throw new Error("Credenciais na URL não são permitidas.")
  if (url.port && url.port !== "443") throw new Error("Porta de webhook não permitida.")
  if (url.hash) throw new Error("Fragmentos não são permitidos.")
  const host = url.hostname.toLowerCase().replace(/\.$/, "")
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal" ||
    /^\d+(?:\.\d+){3}$/.test(host) ||
    host.includes(":") ||
    !host.includes(".")
  ) {
    throw new Error("Destino de webhook não permitido.")
  }
  return url
}

export function validateWebhookEnvelope(event: EnterpriseWebhookEnvelope): void {
  if (!event.id?.trim() || !event.organizationId?.trim() || !event.resourceId?.trim()) {
    throw new Error("Evento sem identificadores obrigatórios.")
  }
  if (event.version !== "v1") throw new Error("Versão de evento não suportada.")
  if (!Number.isFinite(Date.parse(event.occurredAt))) {
    throw new Error("Data de evento inválida.")
  }
}

/**
 * Important: hostname checks are insufficient against DNS rebinding/SSRF.
 * Server delivery must resolve and validate every IP, reject private and
 * reserved ranges, prohibit redirects and revalidate on each connection.
 */
