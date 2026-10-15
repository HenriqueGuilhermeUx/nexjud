// Shared, fail-closed backend selection for NexJud's native Expo clients.
export type BackendMode = "production" | "preview" | "development"
type Config = { mode: string | undefined; stageUrl?: string; stageKey?: string; productionUrl: string; productionKey: string }
export function resolveBackend(config: Config): { url: string; key: string; mode: BackendMode } {
  const mode = config.mode || "production"
  if (mode === "production") return { url: config.productionUrl, key: config.productionKey, mode }
  if (mode !== "preview" && mode !== "development") throw new Error("Ambiente NexJud desconhecido")
  const url = (config.stageUrl || "").trim()
  const key = (config.stageKey || "").trim()
  if (!url || !key) throw new Error("Supabase de homologação não configurado")
  const local = mode === "development" && /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\/?$/i.test(url)
  if (!url.startsWith("https://") && !local) throw new Error("Homologação exige HTTPS")
  if (new URL(url).hostname === new URL(config.productionUrl).hostname || key === config.productionKey) {
    throw new Error("Teste não pode conectar ao Supabase de produção")
  }
  return { url, key, mode }
}
