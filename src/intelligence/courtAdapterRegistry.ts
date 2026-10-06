import type { CourtAdapter, CourtAdapterHealth } from "./judicialDecisionSchema"

class CourtAdapterRegistry {
  private adapters = new Map<string, CourtAdapter>()

  register(adapter: CourtAdapter) { this.adapters.set(adapter.id, adapter); return adapter }
  get(id: string) { return this.adapters.get(id) }
  list() { return Array.from(this.adapters.values()) }
  async health(): Promise<CourtAdapterHealth[]> { return Promise.all(this.list().map((adapter) => adapter.health())) }
}

export const courtAdapterRegistry = new CourtAdapterRegistry()
