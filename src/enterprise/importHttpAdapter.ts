import type { EnterpriseCaseImportRequest } from "./apiContracts"
import type { TenantContext } from "./tenantScope"
import type { ServerImportDependencies } from "./importCommitService"
import { commitEnterpriseImport } from "./importCommitService"
import { publicImportError } from "./importError"
import { validateImportRequest } from "./apiContracts"

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
    validateImportRequest(body)
  } catch {
    return publicImportError("INVALID_REQUEST")
  }
  try {
    const result = await commitEnterpriseImport(identity.context, body, now, dependencies)
    return { status: result.status === "created" ? 201 : 200, body: result }
  } catch {
    // Never expose raw DB errors or stack traces to API consumers.
    return publicImportError("TEMPORARILY_UNAVAILABLE")
  }
}
