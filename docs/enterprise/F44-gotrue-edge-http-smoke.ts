// F44: actual NexJud Edge HTTP handler wired to real local GoTrue Auth tokens
// and PostgREST PostgreSQL. All three services are disposable CI-only fixtures.
import {
  handleImportRequest,
  type ImportHttpRuntime,
} from "../../supabase/functions/enterprise-case-import/handler.ts"

const owner = Deno.env.get("OWNER_JWT")
const revoked = Deno.env.get("READER_JWT")
if (!owner || !revoked) throw new Error("No ephemeral GoTrue JWTs supplied")

const authUrl = "http://127.0.0.1:9999/user"
const rpcUrl = "http://127.0.0.1:3017/rpc/enterprise_import_cases"
const origin = "https://nexjud.local"
const endpoint = origin + "/functions/v1/enterprise-case-import"
const data = {
  organizationId: "c9191919-1919-4919-8919-191919191919",
  idempotencyKey: "gotrue-edge-handler-1",
  items: [{
    externalId: "gotrue-edge-case",
    sourceSystem: "gotrue-handler",
    cnjDigits: "00000000002026826000",
  }],
}
const runtime: ImportHttpRuntime = {
  allowedOrigins: [origin],
  configured: true,
  async verifyUser(token) {
    const response = await fetch(authUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return response.ok
  },
  async commit(token, payload) {
    const response = await fetch(rpcUrl, {
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
    const body = await response.json()
    return response.ok
      ? { data: body, error: null }
      : { data: null, error: { code: String(body.code || "") } }
  },
}
function request(token: string, payload: unknown = data): Request {
  return new Request(endpoint, {
    method: "POST",
    headers: { Origin: origin, Authorization: token ? `Bearer ${token}` : "" },
    body: JSON.stringify(payload),
  })
}
async function expectStatus(label: string, req: Request, expected: number) {
  const response = await handleImportRequest(req, runtime)
  const body = await response.text()
  if (response.status !== expected)
    throw new Error(`${label}: expected HTTP ${expected}, got ${response.status}: ${body}`)
  console.log(`${label}: HTTP ${response.status}`)
}
await expectStatus("actual GoTrue session creates via handler", request(owner), 201)
await expectStatus("same session replays without duplicating", request(owner), 200)
await expectStatus("revoked membership denied despite valid GoTrue session", request(revoked), 403)
await expectStatus("invalid GoTrue JWT denied", request("not-a-real-jwt"), 401)
await expectStatus("missing bearer denied", request(""), 401)
await expectStatus(
  "same key changed payload conflicts",
  request(owner, { ...data, items: [{ ...data.items[0], externalId: "changed" }] }),
  409,
)
console.log("real local GoTrue user endpoint + NexJud Deno handler + PostgREST PASS")
