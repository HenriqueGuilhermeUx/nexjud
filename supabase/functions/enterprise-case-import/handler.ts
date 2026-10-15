// Framework-neutral NexJud Enterprise HTTP adapter. No privileged keys or database SDK here.
import { validateImportPayload, type ImportPayload } from "./validation.ts"

type RpcError = { code?: string } | null
export type ImportHttpRuntime = {
  allowedOrigins: string[]
  configured: boolean
  verifyUser: (token: string) => Promise<boolean>
  commit: (token: string, payload: ImportPayload) => Promise<{ data: unknown; error: RpcError }>
}
const MAX_BYTES = 512_000
const responseHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
}
function respond(status: number, value: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...responseHeaders, ...(origin ? { "Access-Control-Allow-Origin": origin } : {}) },
  })
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
async function readLimited(req: Request): Promise<string | null> {
  if (!req.body) return ""
  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(total)
  let index = 0
  for (const chunk of chunks) {
    bytes.set(chunk, index)
    index += chunk.byteLength
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
}
export async function handleImportRequest(req: Request, runtime: ImportHttpRuntime): Promise<Response> {
  const origin = req.headers.get("origin")
  const allowed = origin !== null && runtime.allowedOrigins.includes(origin) ? origin : null
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: allowed ? 204 : 403,
      headers: { ...responseHeaders, ...(allowed ? { "Access-Control-Allow-Origin": allowed } : {}) },
    })
  }
  if (origin && !allowed) return respond(403, { error: "origin_not_allowed" }, null)
  if (req.method !== "POST") return respond(405, { error: "method_not_allowed" }, allowed)
  const authorization = req.headers.get("authorization") || ""
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return respond(401, { error: "unauthorized" }, allowed)
  }
  if (!runtime.configured) return respond(503, { error: "unavailable" }, allowed)
  const token = authorization.replace(/^Bearer\s+/i, "")
  let authenticated = false
  try {
    authenticated = await runtime.verifyUser(token)
  } catch {
    return respond(503, { error: "unavailable" }, allowed)
  }
  if (!authenticated) return respond(401, { error: "unauthorized" }, allowed)
  const contentLength = Number(req.headers.get("content-length") || "0")
  if (!Number.isFinite(contentLength) || contentLength < 0 || contentLength > MAX_BYTES) {
    return respond(413, { error: "payload_too_large" }, allowed)
  }
  let payload: unknown
  try {
    const raw = await readLimited(req)
    if (raw === null) return respond(413, { error: "payload_too_large" }, allowed)
    payload = JSON.parse(raw)
  } catch {
    return respond(400, { error: "invalid_json" }, allowed)
  }
  if (!validateImportPayload(payload)) return respond(400, { error: "invalid_import" }, allowed)
  try {
    const { data, error } = await runtime.commit(token, payload)
    if (error) {
      if (error.code === "23505") return respond(409, { error: "import_conflict" }, allowed)
      if (error.code === "42501") return respond(403, { error: "forbidden" }, allowed)
      if (error.code === "28000") return respond(401, { error: "unauthorized" }, allowed)
      if (["22023", "23514", "22P02"].includes(error.code || "")) {
        return respond(400, { error: "invalid_import" }, allowed)
      }
      return respond(503, { error: "unavailable" }, allowed)
    }
    if (!isRecord(data) || !isRecord(data.receipt) ||
      !["created", "already_processed"].includes(String(data.status))) {
      return respond(503, { error: "unavailable" }, allowed)
    }
    return respond(data.status === "created" ? 201 : 200, data, allowed)
  } catch {
    return respond(503, { error: "unavailable" }, allowed)
  }
}
