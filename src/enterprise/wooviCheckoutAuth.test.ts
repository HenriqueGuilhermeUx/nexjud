import { describe, expect, it } from "vitest"
import { wooviAuthorizationValue } from "../../supabase/functions/_shared/wooviCheckoutAuth"

describe("NexJud Woovi outbound authorization header", () => {
  it("uses AppID raw, without a Bearer prefix", () => {
    expect(wooviAuthorizationValue("test-app-id")).toBe("test-app-id")
    expect(wooviAuthorizationValue("Bearer test-app-id")).toBe("test-app-id")
    expect(wooviAuthorizationValue("  bearer   test-app-id  ")).toBe("test-app-id")
  })
  it("rejects absent and unsafe header input", () => {
    expect(() => wooviAuthorizationValue(null)).toThrow()
    expect(() => wooviAuthorizationValue("Bearer  ")).toThrow()
    expect(() => wooviAuthorizationValue("anything\r\ninjected")).toThrow()
  })
})
