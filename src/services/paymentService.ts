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

  if (error) throw error
  if (data?.error) throw new Error(data.error)

  return data
}
