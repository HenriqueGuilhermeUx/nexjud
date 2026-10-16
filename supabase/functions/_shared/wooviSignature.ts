/** Verify Woovi RSA-SHA256 over exact webhook raw bytes, using public key SPKI PEM. */
export async function verifyWooviRsaSignature(
  rawBody: string,
  signatureBase64: string,
  publicKeys: readonly string[],
): Promise<boolean> {
  if (!signatureBase64 || publicKeys.length === 0 || publicKeys.length > 12) return false
  let signature: Uint8Array
  try {
    const binary = atob(signatureBase64.trim())
    signature = Uint8Array.from(binary, char => char.charCodeAt(0))
  } catch { return false }
  const content = new TextEncoder().encode(rawBody)
  for (const pem of publicKeys) {
    try {
      if (!pem.includes("-----BEGIN PUBLIC KEY-----") || !pem.includes("-----END PUBLIC KEY-----")) continue
      const base64 = pem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, "")
      const decoded = atob(base64)
      const spki = Uint8Array.from(decoded, char => char.charCodeAt(0))
      const key = await crypto.subtle.importKey(
        "spki", spki, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false, ["verify"],
      )
      if (await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, content)) return true
    } catch { /* malformed or rotated public key; try the next */ }
  }
  return false
}

export function pickWooviPublicKeys(response: unknown): string[] {
  if (!response || typeof response !== "object" || !("public_keys" in response)) return []
  const entries = (response as { public_keys?: unknown }).public_keys
  if (!Array.isArray(entries)) return []
  return entries.slice(0, 12).map(item => item?.key).filter(
    (key): key is string => typeof key === "string" &&
      key.length < 10000 && key.includes("-----BEGIN PUBLIC KEY-----"),
  )
}
