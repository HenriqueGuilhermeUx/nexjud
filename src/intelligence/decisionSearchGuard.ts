/**
 * Monotonic generation guard for asynchronous judicial queries.
 * A late response must never overwrite a newer case, credentials context, or user edits.
 */
export class DecisionSearchGuard {
  private generation = 0

  begin(): number {
    return ++this.generation
  }

  invalidate(): void {
    this.generation++
  }

  isCurrent(generation: number): boolean {
    return generation > 0 && generation === this.generation
  }
}
