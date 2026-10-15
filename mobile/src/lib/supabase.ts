import "react-native-url-polyfill/auto"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"
import { resolveBackend } from "./backendConfig"

const supabaseUrl = "https://zoruralbsxrbsaicihzu.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcnVyYWxic3hyYnNhaWNpaHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTIwMTgsImV4cCI6MjA5NTE2ODAxOH0.nJvwaa_QIYWNKUkL18WHz3fBkS8O6TU3nELLjoauDMw"

const backend = resolveBackend({
  mode: process.env.EXPO_PUBLIC_NEXJUD_ENV,
  stageUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  stageKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  productionUrl: supabaseUrl,
  productionKey: supabaseAnonKey,
})
export const supabase = createClient(backend.url, backend.key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
