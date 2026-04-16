"use server"

import { createServerClient } from "@/lib/supabase/server"

export async function createWizardSession(data: {
  planId?: string
  auditId?: string
  businessTypes?: string[]
}) {
  const supabase = createServerClient()
  const sessionId = `wiz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const { error } = await supabase.from("wizard_sessions").insert({
    session_id: sessionId,
    plan_id: data.planId || null,
    audit_id: data.auditId || null,
    business_types: data.businessTypes || [],
    current_step: 1,
    status: "in_progress",
    data: {},
    prefilled_from_audit: !!data.auditId,
  })

  if (error) return { error: error.message }
  return { sessionId }
}

export async function getWizardSession(sessionId: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("wizard_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single()

  if (error || !data) return null
  return data
}

export async function updateWizardSession(sessionId: string, updates: {
  currentStep?: number
  businessTypes?: string[]
  data?: Record<string, unknown>
  contact?: Record<string, unknown>
  status?: string
}) {
  const supabase = createServerClient()

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.currentStep !== undefined) updatePayload.current_step = updates.currentStep
  if (updates.businessTypes) updatePayload.business_types = updates.businessTypes
  if (updates.data) updatePayload.data = updates.data
  if (updates.contact) updatePayload.contact = updates.contact
  if (updates.status) updatePayload.status = updates.status

  const { error } = await supabase
    .from("wizard_sessions")
    .update(updatePayload)
    .eq("session_id", sessionId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function submitWizard(sessionId: string) {
  const supabase = createServerClient()

  const { data: session, error: fetchErr } = await supabase
    .from("wizard_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .single()

  if (fetchErr || !session) return { error: "Session not found" }

  const submissionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const refNum = `FS-${Date.now().toString(36).toUpperCase().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  const contact = (session.contact || {}) as Record<string, string>

  const { error: insertErr } = await supabase.from("submissions").insert({
    submission_id: submissionId,
    session_id: sessionId,
    reference_number: refNum,
    audit_id: session.audit_id,
    client_name: contact.name || "",
    client_email: contact.email || "",
    client_phone: contact.phone || "",
    business_types: session.business_types || [],
    plan: { plan_id: session.plan_id },
    status: "submitted",
    status_history: [{ status: "submitted", at: new Date().toISOString() }],
    data: session.data || {},
  })

  if (insertErr) return { error: insertErr.message }

  await supabase
    .from("wizard_sessions")
    .update({ status: "completed", updated_at: new Date().toISOString() })
    .eq("session_id", sessionId)

  return { referenceNumber: refNum, submissionId }
}
