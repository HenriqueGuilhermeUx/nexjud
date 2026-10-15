import { describe, expect, it } from "vitest"
import { extractLocalCourtText, validateLocalCourtFile } from "../intelligence/localCourtText"

describe("NexJud local judicial document import — offline and unverified", () => {
  it("accepts TXT/Markdown with browser-compatible MIME, not PDF/HTML", () => {
    expect(validateLocalCourtFile("decisao.TXT", "text/plain", 100).ok).toBe(true)
    expect(validateLocalCourtFile("fundamento.md", "", 100).ok).toBe(true)
    expect(validateLocalCourtFile("decisao.pdf", "application/pdf", 100).ok).toBe(false)
    expect(validateLocalCourtFile("decisao.html", "text/html", 100).ok).toBe(false)
    expect(validateLocalCourtFile("script.txt", "application/javascript", 100).ok).toBe(false)
  })
  it("rejects empty, oversized and invalid-size files before reading", () => {
    expect(validateLocalCourtFile("decisao.txt", "text/plain", 0).ok).toBe(false)
    expect(validateLocalCourtFile("decisao.txt", "text/plain", 128 * 1024 + 1).ok).toBe(false)
    expect(validateLocalCourtFile("decisao.txt", "text/plain", Number.NaN).ok).toBe(false)
  })
  it("preserves literal reasoning and normalizes BOM and line endings", () => {
    const result=extractLocalCourtText("\uFEFFFundamentação judicial literal.\r\nConclusão fundamentada.")
    expect(result).toEqual({ ok:true, text:"Fundamentação judicial literal.\nConclusão fundamentada." })
  })
  it("rejects binary content, short text or unbounded documents", () => {
    expect(extractLocalCourtText("some\u0000binary").ok).toBe(false)
    expect(extractLocalCourtText("Andamento").ok).toBe(false)
    expect(extractLocalCourtText("A".repeat(12001)).ok).toBe(false)
  })
})
