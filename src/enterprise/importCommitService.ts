import type { EnterpriseCaseImportRequest } from "./apiContracts"
import type { TenantContext } from "./tenantScope"
import type { ImportPersistence, ImportCommitResult } from "./importPersistenceContract"
import { assertImportCommitInput } from "./importPersistenceContract"
import { canonicalImportPayload, validateImportFingerprint } from "./importFingerprint"
import { prepareEnterpriseImport } from "./prepareImport"

export type ServerImportDependencies = {
  /** Must be backed by a cryptographically secure server-side SHA-256 implementation. */
  sha256(payload: string): Promise<string>
  /** Must perform tenant authorization and persistence in one DB transaction. */
  persistence: ImportPersistence
}

/**
 * Server application service. Caller MUST derive context from verified auth;
 * never accept organization membership or role from request JSON.
 * Does not provide an HTTP endpoint or database implementation by itself.
 */
export async function commitEnterpriseImport(
  context: TenantContext,
  request: EnterpriseCaseImportRequest,
  now: Date,
  dependencies: ServerImportDependencies,
): Promise<ImportCommitResult> {
  const { plan, audit, receipt } = prepareEnterpriseImport(context, request, now)
  const requestFingerprint = await dependencies.sha256(canonicalImportPayload(plan))
  validateImportFingerprint(requestFingerprint)
  const input = { plan, audit, receipt, requestFingerprint }
  assertImportCommitInput(input)
  return dependencies.persistence.commit(input)
}
