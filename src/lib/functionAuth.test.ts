import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({ getSupabaseClient: () => null }))

import { buildUserFunctionHeaders, LOGIN_REQUIRED_MESSAGE } from "./functionAuth"

describe("buildUserFunctionHeaders", () => {
  const anon = "anon-public-key"

  it("usa o token de sessão do usuário como Bearer", () => {
    const headers = buildUserFunctionHeaders("user-session-jwt", anon)
    expect(headers.Authorization).toBe("Bearer user-session-jwt")
    expect(headers.apikey).toBe(anon)
  })

  it("recusa chamar sem sessão", () => {
    expect(() => buildUserFunctionHeaders(undefined, anon)).toThrow(LOGIN_REQUIRED_MESSAGE)
    expect(() => buildUserFunctionHeaders("", anon)).toThrow(LOGIN_REQUIRED_MESSAGE)
  })

  it("nunca manda a anon key como Bearer", () => {
    expect(() => buildUserFunctionHeaders(anon, anon)).toThrow(LOGIN_REQUIRED_MESSAGE)
  })
})
