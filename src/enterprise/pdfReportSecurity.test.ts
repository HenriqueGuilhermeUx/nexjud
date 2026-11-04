import { describe, expect, it } from "vitest"
import { escapeReportHtml } from "../services/pdfReport"

describe("printable legal report HTML escaping", () => {
  it("escapes HTML markup and attribute delimiters", () => {
    expect(escapeReportHtml('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
  })
  it("escapes ampersands and quotes without dropping legitimate legal text", () => {
    expect(escapeReportHtml("A & B < C > D 'caso'")).toBe("A &amp; B &lt; C &gt; D &#39;caso&#39;")
  })
  it("handles null and numeric source fields safely", () => {
    expect(escapeReportHtml(null)).toBe("")
    expect(escapeReportHtml(42)).toBe("42")
  })
})
