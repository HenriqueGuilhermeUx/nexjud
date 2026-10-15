import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

// Production signing and submission must remain unavailable on feature branches.
// Avoid a YAML parser here: assert the explicit GitHub job-level conditions,
// which are evaluated before secret-bearing build steps start.
const wf = (name: string) =>
  readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8")

describe("NexJud native release workflows respect production boundaries", () => {
  it("permits EAS preview but requires main + manual confirmation for production", () => {
    const s = wf("eas-build-companion.yml")
    expect(s).toContain("confirm_production:")
    expect(s).toContain("github.ref == 'refs/heads/main' && inputs.profile == 'production' && inputs.confirm_production == true")
    expect(s).toContain("inputs.profile == 'preview' ||")
    expect(s).toContain("eas build --platform android --profile")
  })
  it("disallows local Google Play signed artifact generation from the feature branch", () => {
    const s = wf("nexjud-mobile-local-apk-aab.yml")
    expect(s).toContain("if: ${{ github.ref == 'refs/heads/main' }}")
    expect(s).toContain("Configure fixed Play upload signing")
  })
  it("disallows both store jobs unless main and manual confirmation", () => {
    const s = wf("store-builds.yml")
    expect(s).toContain("confirm_production:")
    const jobConditions = s.match(/if: \${{ github.ref == 'refs\/heads\/main' && inputs.confirm_production == true && /g)
    expect(jobConditions?.length).toBe(2)
    expect(s).toContain("inputs.submit_ios")
  })
  it("blocks Apple certificate issuance and TestFlight upload from feature branches", () => {
    const s = wf("nexjud-ios-api-sign.yml")
    expect(s).toContain("if: ${{ github.ref == 'refs/heads/main' }}")
    expect(s).toContain("Generate new NexJud distribution identity once")
    expect(s).toContain("Upload NexJud to TestFlight")
  })
})
