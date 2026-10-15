/**
 * Defensive application-level tenant checks.
 * These checks DO NOT replace database RLS or server authorization.
 */
export type TenantScoped = { organizationId: string }
export type TenantContext = {
  organizationId: string
  userId: string
  role: "owner" | "admin" | "legal" | "reviewer" | "reader"
}

export function assertTenantScope(context: TenantContext, resource: TenantScoped): void {
  if (!context.userId?.trim() || !context.organizationId?.trim()) {
    throw new Error("Contexto de autenticação ou organização ausente.")
  }
  if (!resource.organizationId?.trim() || resource.organizationId !== context.organizationId) {
    throw new Error("Recurso fora do escopo da organização.")
  }
}

export function filterTenantScope<T extends TenantScoped>(
  context: TenantContext,
  resources: readonly T[]
): T[] {
  if (!context.userId?.trim() || !context.organizationId?.trim()) return []
  return resources.filter((resource) => resource.organizationId === context.organizationId)
}
