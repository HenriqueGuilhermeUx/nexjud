import type { EnterpriseCaseImportRequest } from "./apiContracts"
import type { TenantContext } from "./tenantScope"
import { requireEnterprisePermission } from "./authorization"
import { planEnterpriseImport, type ImportPlan } from "./importPlanner"

/**
 * Application-domain entrypoint. Never trust organizationId supplied by the
 * caller as authentication: derive context from a verified server session.
 */
export function planAuthorizedEnterpriseImport(
  context: TenantContext,
  request: EnterpriseCaseImportRequest,
): ImportPlan {
  if (!context.userId?.trim() || !context.organizationId?.trim()) {
    throw new Error("Sessão autenticada obrigatória.")
  }
  // Check every supplied item before invoking any further import logic.
  if (!request || !Array.isArray(request.items) || request.items.length === 0) {
    throw new Error("Lote vazio.")
  }
  for (const item of request.items) {
    if (!item || typeof item !== "object") {
      throw new Error("Processo inválido no lote.")
    }
    requireEnterprisePermission(context, { organizationId: item.organizationId }, "case:import")
  }
  return planEnterpriseImport(request)
}
