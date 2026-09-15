import { useEffect } from "react"
import type { Session } from "@supabase/supabase-js"

export function useNexOfficeLegalSync(session: Session | null) {
  const enabled = import.meta.env.VITE_NEXOFFICE_ENABLED === "true" && import.meta.env.VITE_NEXOFFICE_LEGAL_SIGNALS_ENABLED === "true"

  useEffect(() => {
    if (!enabled || !session?.access_token || !session.user?.id) return
    const day = new Date().toISOString().slice(0, 10)
    const key = `nexjud:nexoffice:legal-signals:${session.user.id}:${day}`
    if (window.localStorage.getItem(key) === "synced") return

    let cancelled = false
    const sync = async () => {
      try {
        const response = await fetch("/api/nexoffice/legal-signals", {
          method: "POST",
          headers: {
            authorization: `Bearer ${session.access_token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({}),
        })
        const payload = await response.json().catch(() => ({}))
        if (!cancelled && response.ok && payload?.synced === true) window.localStorage.setItem(key, "synced")
      } catch {
        // Silent by design: operational telemetry must never block NexJud usage.
      }
    }
    void sync()
    return () => { cancelled = true }
  }, [enabled, session?.access_token, session?.user?.id])
}
