/** Woovi requires raw AppID/Token in Authorization, never HTTP Bearer. */
export function wooviAuthorizationValue(raw: string | null | undefined): string {
  const token = String(raw || "").trim().replace(/^Bearer\s+/i,"").trim()
  if (!token || /[\r\n]/.test(token)) throw new Error("WOOVI_API_TOKEN não configurado corretamente.")
  return token
}
