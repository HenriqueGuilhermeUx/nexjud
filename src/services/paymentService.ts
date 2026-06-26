import { supabase } from "@/lib/supabase"
import { PlanType } from "@/services/subscriptionService"

export async function createPixCheckout({
  userId,
  plan,
  customerName,
  customerEmail,
  taxId,
}: {
  userId: string
  plan: PlanType
  customerName?: string
  customerEmail: string
  taxId?: string
}) {
  const { data, error } = await supabase.functions.invoke("create-pix-checkout", {
    body: {
      userId,
      plan,
      customerName,
      customerEmail,
      taxId,
    },
  })

  if (error) {
  console.error("Erro Edge Function:", error)
  throw new Error(error.message || JSON.stringify(error))
}

if (data?.error) {
  console.error("Erro Woovi:", data)
  throw new Error(
    data.raw?.error ||
    data.raw?.message ||
    data.error ||
    JSON.stringify(data)
  )
}

  return data
}
