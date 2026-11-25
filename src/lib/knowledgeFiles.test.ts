import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase", () => ({ getSupabaseClient: () => null }))

import { knowledgeFilePath } from "./knowledgeFiles"

describe("knowledgeFilePath", () => {
  it("aceita o caminho salvo no formato novo", () => {
    expect(knowledgeFilePath("user-1/123-peticao.pdf")).toBe("user-1/123-peticao.pdf")
  })

  it("extrai o caminho de uma URL pública antiga", () => {
    const legacy =
      "https://zoruralbsxrbsaicihzu.supabase.co/storage/v1/object/public/knowledge-files/user-1/123-peti%C3%A7%C3%A3o.pdf"
    expect(knowledgeFilePath(legacy)).toBe("user-1/123-petição.pdf")
  })

  it("recusa URLs de outros lugares e valores vazios", () => {
    expect(knowledgeFilePath("https://example.com/arquivo.pdf")).toBeNull()
    expect(knowledgeFilePath("")).toBeNull()
    expect(knowledgeFilePath(null)).toBeNull()
  })
})
