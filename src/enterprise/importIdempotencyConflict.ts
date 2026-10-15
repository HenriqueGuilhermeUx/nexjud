/** Server-only signal emitted after an atomic, tenant-scoped fingerprint mismatch. */
export class ImportIdempotencyConflict extends Error {
  readonly code = "IDEMPOTENCY_CONFLICT" as const

  constructor() {
    super("Idempotency key reused with a different request fingerprint.")
    this.name = "ImportIdempotencyConflict"
  }
}
