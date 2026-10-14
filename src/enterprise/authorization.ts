import type { TenantContext, TenantScoped } from "./tenantScope"
import { assertTenantScope } from "./tenantScope"

export type EnterprisePermission =
  | "case:read"
  | "case:write"
  | "case:import"
  | "case:review"
  | "webhook:manage"
  | "member:manage"

const ROLE_PERMISSIONS: Record<TenantContext["role"], readonly EnterprisePermission[]> = {
  owner: ["case:read", "case:write", "case:import", "case:review", "webhook:manage", "member:manage"],
  admin: ["case:read", "case:write", "case:import", "webhook:manage", "member:manage"],
  legal: ["case:read", "case:write", "case:import"],
  reviewer: ["case:read", "case:review"],
  reader: ["case:read"],
}

/** Domain-level guard; the API and database MUST enforce authorization independently. */
export function canPerformEnterpriseAction(
  context: TenantContext,
  resource: TenantScoped,
  permission: EnterprisePermission,
): boolean {
  try {
    assertTenantScope(context, resource)
    return ROLE_PERMISSIONS[context.role]?.includes(permission) ?? false
  } catch {
    return false
  }
}

export function requireEnterprisePermission(
  context: TenantContext,
  resource: TenantScoped,
  permission: EnterprisePermission,
): void {
  if (!canPerformEnterpriseAction(context, resource, permission)) {
    throw new Error("Acesso não autorizado à operação Enterprise.")
  }
}
