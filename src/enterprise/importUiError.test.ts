import { describe, expect, it } from "vitest"
import { enterpriseImportErrorMessage } from "./importUiError"

describe("Enterprise import failure UX", () => {
  it.each([
    [400, "Revise"],
    [401, "login"],
    [403, "permissão"],
    [404, "ainda não"],
    [409, "Conflito"],
    [413, "lote"],
    [429, "mesma chave"],
    [503, "mesma chave"],
  ])("maps HTTP %i to a safe actionable explanation", (status, snippet) => {
    expect(enterpriseImportErrorMessage({ context: { status } })).toContain(snippet)
  })
  it("does not show raw server error or sensitive internal details", () => {
    const result = enterpriseImportErrorMessage({
      message: "secret:actor=uuid password=hidden",
      context: { status: 503, internalToken: "should-not-be-shown" },
    })
    expect(result).not.toContain("secret")
    expect(result).not.toContain("password")
    expect(result).not.toContain("should-not-be-shown")
  })
  it("does not claim success on a network failure", () => {
    expect(enterpriseImportErrorMessage({ message: "network unavailable" }))
      .toContain("Nenhum sucesso foi confirmado")
  })
  it("preserves a cautious message for unknown error statuses", () => {
    expect(enterpriseImportErrorMessage({ context: { status: 502 } }))
      .toContain("não foi confirmada")
  })
})
