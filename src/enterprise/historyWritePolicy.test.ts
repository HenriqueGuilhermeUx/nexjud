import { describe, expect, it } from "vitest"
import { historyUserIdForSearch } from "../intelligence/historyWritePolicy"

describe("Decision Intelligence — history writes require explicit opt-in", () => {
  it("does not persist a lookup by default", () => {
    expect(historyUserIdForSearch(false, "logged-in-user")).toBeUndefined()
  })
  it("does not persist without an authorized session", () => {
    expect(historyUserIdForSearch(true)).toBeUndefined()
    expect(historyUserIdForSearch(true, "  ")).toBeUndefined()
  })
  it("returns user ID only after explicit opt-in", () => {
    expect(historyUserIdForSearch(true, " user-id ")).toBe("user-id")
  })
})
