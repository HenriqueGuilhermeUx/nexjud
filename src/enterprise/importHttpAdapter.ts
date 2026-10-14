import type { EnterpriseCaseImportRequest } from "./apiContracts"
import type { TenantContext } from "./tenantScope"
import type { ServerImportDependencies } from "./importCommitService"
import { commitEnterpriseImport } from "./importCommitService"
import { publicImportError } from "./importError"
import { validateImportRequest } from "./apiContracts"
import { canPerformEnterpriseAction } from "./authorization"
import { validateImportPayloadLimits } from "./importPayloadLimits"

export type VerifiedImportIdentity = { context: TenantContext }
export type ImportHttpDependencies = ServerImportDependencies & {
  /** Resolve from a VERIFIED server token/session, never from body or headers claiming a role. */
  authenticate(): Promise<VerifiedImportIdentity | null>
}

/**
 * Framework-neutral HTTP boundary. Server wiring must enforce body size,
 * rate limits, trusted auth, and database RLS independently.
 */
export async function handleEnterpriseImport(
  body: EnterpriseCaseImportRequest,
  dependencies: ImportHttpDependencies,
  now: Date,
) {
  let identity: VerifiedImportIdentity | null
  try {
    identity = await dependencies.authenticate()
  } catch {
    return publicImportError("UNAUTHENTICATED")
  }
  if (!identity?.context?.userId?.trim()) return publicImportError("UNAUTHENTICATED")
  try {
    if (!body || (validateImportPayloadLimits(body).length > 0 || validateImportRequest(body).length > 0)) {
      return publicImportError("INVALID_REQUEST")
    }
  } catch {
    return publicImportError("INVALID_REQUEST")
  }
  if (!identity.context.organizationId?.trim() || !canPerformEnterpriseAction(identity.context, { organizationId: identity.context.organizationId }, "case:import")) {
    return publicImportError("FORBIDDEN")
  }
  if (body.items.some((item) => item.organizationId !== identity.context.organizationId)) {
    return publicImportError("FORBIDDEN")
  }
  try {
    const result = await commitEnterpriseImport(identity.context, body, now, dependencies)
    return { status: result.status === "created" ? 201 : 200, body: result }
  } catch {
    // Never expose raw DB errors or stack traces to API consumers.
    return publicImportError("TEMPORARILY_UNAVAILABLE")
  }
}
