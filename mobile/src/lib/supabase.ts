import "react-native-url-polyfill/auto"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://zoruralbsxrbsaicihzu.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvcnVyYWxic3hyYnNhaWNpaHp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTIwMTgsImV4cCI6MjA5NTE2ODAxOH0.nJvwaa_QIYWNKUkL18WHz3fBkS8O6TU3nELLjoauDMw"

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
