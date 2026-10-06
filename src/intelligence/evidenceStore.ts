import type { JudicialDecisionEvidence } from "./judicialDecisionSchema"

export interface EvidenceStore {
  put(items: JudicialDecisionEvidence[]): Promise<void>
  findByCourt(court: string): Promise<JudicialDecisionEvidence[]>
  findByProcess(processNumber: string): Promise<JudicialDecisionEvidence[]>
}

export class MemoryEvidenceStore implements EvidenceStore {
  private items = new Map<string, JudicialDecisionEvidence>()
  async put(items: JudicialDecisionEvidence[]) { items.forEach((item) => this.items.set(item.id, item)) }
  async findByCourt(court: string) { return [...this.items.values()].filter((item) => item.court === court) }
  async findByProcess(processNumber: string) { return [...this.items.values()].filter((item) => item.processNumber === processNumber) }
}

export const evidenceStore = new MemoryEvidenceStore()
