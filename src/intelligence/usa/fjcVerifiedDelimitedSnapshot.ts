/**
 * NexJud USA - integrity checked, codebook mapped DELIMITED extract adapter.
 *
 * IMPORTANT: not a claimed native FJC parser. This handles only an explicitly
 * reviewed UTF-8 CSV/TSV conversion from an immutable official snapshot.
 * Raw conversion bytes are hashed and matched before parsing/normalization.
 * No network, data storage or predictive model training.
 */
import { normalizeFJCCivilExtract, type FJCCivilManifest, type FJCNormalizedCivilCase } from "./fjcCivilCohort"
import { verifyFJCSourceDigest } from "./fjcSnapshotDigest"

export type FJCDelimitedManifest = FJCCivilManifest & {
  conversionFormatReviewed: true
  delimiter: "," | "\t"
  /** The digest describes THIS converted file, not an unverified raw download. */
  inputKind: "verified-converted-text"
}

export interface VerifiedFJCDelimitedSnapshot {
  datasetId: string
  sourceSha256: string
  revision: string
  records: FJCNormalizedCivilCase[]
  conversionVerified: true
  /** Original official download/hash lineage must be audited separately. */
  officialOriginalVerified: false
  modelTrained: false
}

function parseDelimited(input: string, delimiter: "," | "\t"): string[][] {
  // Deterministic RFC4180-style quoted cells with escaped quotes, CRLF and LF.
  // Entire file must have consistent column counts; no lossy row skipping.
  const rows: string[][] = []
  let row: string[] = [], field = "", quoted = false, closedQuote = false
  let atStart = true
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') { field += '"'; i++ }
        else { quoted = false; closedQuote = true }
      } else field += ch
      continue
    }
    if (closedQuote && ch !== delimiter && ch !== "\n" && ch !== "\r") {
      throw new Error("Garbage after CSV closing quote")
    }
    if (ch === '"' && atStart) { quoted = true; atStart = false; continue }
    if (ch === '"' || (closedQuote && ch !== delimiter && ch !== "\n" && ch !== "\r")) {
      throw new Error("Invalid CSV quoting")
    }
    if (ch === delimiter) {
      row.push(field); field = ""; atStart = true; closedQuote = false
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r") {
        if (input[i + 1] !== "\n") throw new Error("Invalid CSV line ending")
        i++
      }
      row.push(field); rows.push(row)
      if (rows.length > 10001) throw new Error("CSV batch too large")
      row = []; field = ""; atStart = true; closedQuote = false
    } else {
      field += ch
      if (field.length > 4000) throw new Error("CSV field too large")
      atStart = false
    }
  }
  if (quoted) throw new Error("Unclosed CSV quote")
  // Ignore one terminal newline, but never accept blank rows in the middle.
  if (row.length || field.length || !atStart || closedQuote) {
    row.push(field); rows.push(row)
  }
  if (rows.length < 2) throw new Error("CSV header and rows required")
  return rows
}

export async function loadVerifiedFJCDelimitedSnapshot(
  bytes: Uint8Array,
  manifest: FJCDelimitedManifest,
): Promise<VerifiedFJCDelimitedSnapshot> {
  if (!manifest || manifest.conversionFormatReviewed !== true ||
      manifest.inputKind !== "verified-converted-text" ||
      (manifest.delimiter !== "," && manifest.delimiter !== "\t") ||
      !(bytes instanceof Uint8Array) || bytes.byteLength < 2 ||
      bytes.byteLength > 8_000_000) throw new Error("Unreviewed FJC converted extract")
  if (!(await verifyFJCSourceDigest(bytes, manifest.releaseSha256))) {
    throw new Error("FJC converted extract digest mismatch")
  }
  let text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  if (text.startsWith("\uFEFF")) text = text.slice(1)
  const [header, ...lines] = parseDelimited(text, manifest.delimiter)
  if (header.length > 100 || new Set(header).size !== header.length ||
      header.some(x => !x || x.length > 120 || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(x))) {
    throw new Error("Invalid or duplicate CSV field names")
  }
  const mapped = Object.values(manifest.fields)
  if (mapped.some(field => !header.includes(field))) throw new Error("Missing codebook mapped CSV field")
  const converted = lines.map((cols, i) => {
    if (cols.length !== header.length || cols.every(x => x === "")) {
      throw new Error("Missing/mismatched CSV columns at row " + (i + 2))
    }
    const record: Record<string, unknown> = Object.create(null)
    for (let j = 0; j < header.length; j++) record[header[j]] = cols[j]
    // Per-codebook REVIEW: only the termination date field may be blank;
    // other empty cells remain blank and will fail strict normalization.
    if (record[manifest.fields.terminatedDate] === "") record[manifest.fields.terminatedDate] = null
    return record
  })
  const records = normalizeFJCCivilExtract(converted, manifest)
  return {
    datasetId: manifest.datasetId, revision: manifest.revision,
    sourceSha256: manifest.releaseSha256.toLowerCase(),
    records, conversionVerified: true, officialOriginalVerified: false, modelTrained: false,
  }
}
