/**
 * NexJud USA — narrow adapter between US-only membership rows and the
 * research authorization vocabulary. This module DOES NOT authenticate users.
 *
 * The caller must verify JWT on the server, read the user's active membership
 * under RLS, and require exactly one active row. Never source the role from
 * editable JWT user_metadata, request bodies or query parameters.
 */
import type { VerifiedUSPrincipal } from "./usOpinionSearchGate.ts"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Database roles:
 *  owner -> firm_admin; attorney -> lawyer; researcher -> researcher;
 *  viewer -> other (expressly denied by runUSOpinionSearch).
 *
 * Unknown roles DENY rather than falling through to "researcher".
 */
export function verifiedUSPrincipalFromMembership(
  verifiedUserId: unknown,
  rows: unknown,
): VerifiedUSPrincipal | null {
  if (typeof verifiedUserId !== "string" || !UUID.test(verifiedUserId) ||
      !Array.isArray(rows) || rows.length !== 1) return null
  const row = rows[0]
  if (!row || typeof row !== "object" || Array.isArray(row)) return null
  const r = row as Record<string, unknown>
  if (typeof r.tenant_id !== "string" || !UUID.test(r.tenant_id)) return null
  if (r.role === "owner") return { userId: verifiedUserId, tenantId: r.tenant_id, role: "firm_admin" }
  if (r.role === "attorney") return { userId: verifiedUserId, tenantId: r.tenant_id, role: "lawyer" }
  if (r.role === "researcher") return { userId: verifiedUserId, tenantId: r.tenant_id, role: "researcher" }
  if (r.role === "viewer") return { userId: verifiedUserId, tenantId: r.tenant_id, role: "other" }
  return null
}
