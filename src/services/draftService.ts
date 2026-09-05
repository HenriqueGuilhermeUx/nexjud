import { supabase } from "@/lib/supabase"

export async function saveDraft({
  userId,
  title,
  draftType,
  caseText,
  focus,
  result,
  caseId,
}: {
  userId: string
  title: string
  draftType: string
  caseText: string
  focus: string
  result: any
  caseId?: string | null
}) {
  const { data, error } = await supabase
    .from("drafts")
    .insert({
      user_id: userId,
      case_id: caseId || null,
      title,
      draft_type: draftType,
      case_text: caseText,
      focus,
      result,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getUserDrafts(userId: string) {
  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function deleteDraft(id: string) {
  const { error } = await supabase
    .from("drafts")
    .delete()
    .eq("id", id)

  if (error) throw error
}
