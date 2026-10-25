/**
 * FJC IDB snapshot integrity gate. Pure offline SHA-256 verification.
 * Called on the exact, immutable source bytes BEFORE parsing or normalization.
 * A digest alone does not establish license rights, codebook fitness or
 * source authenticity; all of those remain independent review requirements.
 */
export async function verifyFJCSourceDigest(
  sourceBytes: Uint8Array,
  expectedSha256Hex: string,
): Promise<boolean> {
  if (!(sourceBytes instanceof Uint8Array) || sourceBytes.byteLength === 0 ||
      sourceBytes.byteLength > 50_000_000 ||
      typeof expectedSha256Hex !== "string" || !/^[0-9a-fA-F]{64}$/.test(expectedSha256Hex)) {
    throw new Error("Invalid FJC source digest input")
  }
  const content = await crypto.subtle.digest("SHA-256", sourceBytes)
  const actual = Array.from(new Uint8Array(content))
    .map(byte => byte.toString(16).padStart(2, "0")).join("")
  return actual === expectedSha256Hex.toLowerCase()
}
