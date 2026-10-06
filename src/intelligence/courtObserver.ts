import type { CourtAdapterHealth } from "./judicialDecisionSchema"
import { courtAdapterRegistry } from "./courtAdapterRegistry"

export interface CourtIncident {
  adapterId: string
  court: string
  severity: "attention" | "critical"
  message: string
  detectedAt: string
  requiresHumanGate: true
}

export async function observeCourtSources(): Promise<{ health: CourtAdapterHealth[]; incidents: CourtIncident[] }> {
  const health = await courtAdapterRegistry.health()
  const incidents = health.filter((item) => item.status !== "healthy").map((item) => ({
    adapterId: item.adapterId,
    court: item.court,
    severity: item.status === "failed" ? "critical" as const : "attention" as const,
    message: item.diagnostic || "A fonte mudou ou apresentou degradação. Revisar o adaptador antes de promover qualquer correção.",
    detectedAt: new Date().toISOString(),
    requiresHumanGate: true as const,
  }))
  return { health, incidents }
}
