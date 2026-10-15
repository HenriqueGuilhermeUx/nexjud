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
      plan,
      customerName,
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
    data.error ||
    JSON.stringify(data)
  )
}

  return data
}

/**
 * Read-only confirmation of the signed-in customer's Pix order (RLS).
 * Only the server-side webhook may mark an order paid.
 */
export async function getPixOrderStatus(orderId: string): Promise<"pending" | "paid"> {
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) {
    throw new Error("Identificador de cobrança inválido.")
  }
  const { data, error } = await supabase
    .from("payment_orders")
    .select("id,status")
    .eq("id", orderId)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Cobrança não disponível nesta sessão.")
  return data.status === "paid" ? "paid" : "pending"
}
