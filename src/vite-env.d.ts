/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_INFOSIMPLES_TOKEN: string
  readonly VITE_CNP_API_CREDENTIAL: string
  readonly VITE_ZAPSIGN_API_TOKEN: string
  readonly VITE_CNJ_API_KEY: string
  readonly VITE_ESCAVADOR_API_KEY: string
  readonly VITE_NEXOFFICE_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
