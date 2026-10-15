// F42: real application handler -> live disposable PostgREST -> PostgreSQL 17.
// Identity resolution alone is test-double; PostgREST still checks signed JWT,
// membership, RPC permissions and SQL transaction. NO production environment.
import {
  handleImportRequest,
  type ImportHttpRuntime,
} from "../../supabase/functions/enterprise-case-import/handler.ts"

const admin = Deno.env.get("ADMIN_TOKEN")
const reader = Deno.env.get("READER_TOKEN")
const peer = Deno.env.get("PEER_TOKEN")
if (!admin || !reader || !peer) throw new Error("Missing isolated JWT fixtures")
const api = "http://127.0.0.1:3017/rpc/enterprise_import_cases"
const endpoint = "https://nexjud.local/functions/v1/enterprise-case-import"
const origin = "https://nexjud.local"
const organizationId = "c9191919-1919-4919-8919-191919191919"
const base = {
  organizationId,
  idempotencyKey: "handler-smoke-1",
  items: [{
    externalId: "handler-one",
    sourceSystem: "handler-test",
    cnjDigits: "00000000002026826000",
  }],
}
const runtime: ImportHttpRuntime = {
  allowedOrigins: [origin],
  configured: true,
  verifyUser: async token => token === admin || token === reader || token === peer,
  async commit(token, payload) {
    const res = await fetch(api, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_organization: payload.organizationId,
        p_key: payload.idempotencyKey,
        p_items: payload.items,
      }),
    })
    const parsed = await res.json()
    return res.ok
      ? { data: parsed, error: null }
      : { data: null, error: { code: parsed.code } }
  },
}
function request(
  body: unknown = base,
  token = admin,
  reqOrigin = origin,
): Request {
  return new Request(endpoint, {
    method: "POST",
    headers: {
      Origin: reqOrigin,
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}
async function expectStatus(label: string, req: Request, status: number) {
  const res = await handleImportRequest(req, runtime)
  const detail = await res.text()
  if (res.status !== status) {
    throw new Error(`${label}: expected HTTP ${status}, got ${res.status} ${detail}`)
  }
  console.log(`${label}: HTTP ${status}`)
}
await expectStatus(
  "allowed preflight",
  new Request(endpoint, { method: "OPTIONS", headers: { Origin: origin } }),
  204,
)
await expectStatus(
  "denied foreign origin",
  request(base, admin, "https://untrusted.example"),
  403,
)
await expectStatus("unauthenticated request", request(base, ""), 401)
await expectStatus("unknown bearer token", request(base, "invalid.jwt.token"), 401)
await expectStatus("reader cannot import", request(base, reader), 403)
await expectStatus(
  "client actor spoofing denied",
  request({ ...base, actorId: "a7171717-1717-4717-8717-171717171717" }),
  400,
)
await expectStatus("valid import", request(), 201)
await expectStatus("idempotent replay", request(), 200)
await expectStatus("same-tenant different actor cannot replay receipt", request(base, peer), 403)
await expectStatus(
  "same idempotency key with changed case",
  request({ ...base, items: [{ ...base.items[0], externalId: "handler-two" }] }),
  409,
)
await expectStatus(
  "same external id with new key",
  request({ ...base, idempotencyKey: "handler-smoke-2" }),
  409,
)
await expectStatus(
  "oversized request is rejected",
  request({ ...base, extra: "x".repeat(512_500) }),
  413,
)
console.log("Deno handler -> PostgREST JWT -> SQL smoke PASS")
