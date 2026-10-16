import { describe, expect, it } from "vitest"
import { pickWooviPublicKeys, verifyWooviRsaSignature } from "../../supabase/functions/_shared/wooviSignature"

describe("Woovi RSA-SHA256 public-key webhook verification", () => {
  it("verifies raw body and rejects altered data, signatures and malformed keys", async () => {
    const pair = await crypto.subtle.generateKey(
      { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048,
        publicExponent: new Uint8Array([1,0,1]), hash: "SHA-256" },
      true, ["sign", "verify"],
    )
    const publicDer = await crypto.subtle.exportKey("spki", pair.publicKey)
    const pem = "-----BEGIN PUBLIC KEY-----\n" +
      Buffer.from(publicDer).toString("base64") +
      "\n-----END PUBLIC KEY-----"
    const body = '{"event":"OPENPIX:CHARGE_COMPLETED","charge":{"status":"COMPLETED"}}'
    const signed = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, new TextEncoder().encode(body))
    const signature = Buffer.from(signed).toString("base64")
    expect(await verifyWooviRsaSignature(body,signature,[pem])).toBe(true)
    expect(await verifyWooviRsaSignature(body+" ",signature,[pem])).toBe(false)
    expect(await verifyWooviRsaSignature(body,"not-base64??",[pem])).toBe(false)
    expect(await verifyWooviRsaSignature(body,signature,["unsafe PEM"])).toBe(false)
    expect(await verifyWooviRsaSignature(body,signature,[])).toBe(false)
  })
  it("only accepts the expected public key list envelope", () => {
    const key="-----BEGIN PUBLIC KEY-----\nABC\n-----END PUBLIC KEY-----"
    expect(pickWooviPublicKeys({public_keys:[{key}]})).toEqual([key])
    expect(pickWooviPublicKeys({public_keys:[{key:123}]})).toEqual([])
    expect(pickWooviPublicKeys({public_keys:"not-an-array"})).toEqual([])
    expect(pickWooviPublicKeys(null)).toEqual([])
  })
})
