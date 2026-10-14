import type { EnterpriseCaseImportRequest } from "./apiContracts"
import type { TenantContext } from "./tenantScope"
import { planAuthorizedEnterpriseImport } from "./importAuthorization"
import { createImportAuditRecord } from "./importAudit"
import { createImportReceipt } from "./importReceipt"

/**
 * Pure preparation flow; does not persist cases, emit webhooks or claim success.
 * The server must derive context from a verified identity and commit all
 * persistence (including idempotency and audit) in one database transaction.
 */
export function prepareEnterpriseImport(
  context: TenantContext,
  request: EnterpriseCaseImportRequest,
  now: Date,
) {
  const plan = planAuthorizedEnterpriseImport(context, request)
  const audit = createImportAuditRecord(plan, context.userId, now)
  const receipt = createImportReceipt(plan, audit)
  return { plan, audit, receipt }
}
