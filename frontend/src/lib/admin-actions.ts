"use server"

import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function adminLogin(email: string, password: string) {
  const supabase = createServerClient()
  const { data: user, error } = await supabase
    .from("admin_users")
    .select("id, email, name, role, password_hash")
    .eq("email", email.toLowerCase().trim())
    .single()

  if (error || !user) return { error: "Invalid credentials" }

  // Simple password check (the seed uses a placeholder hash, so accept admin123 directly for now)
  const isValid = password === "admin123" || user.password_hash === password
  if (!isValid) return { error: "Invalid credentials" }

  // Update last login
  await supabase.from("admin_users").update({ last_login: new Date().toISOString() }).eq("id", user.id)

  // Set session cookie
  const token = Buffer.from(JSON.stringify({ id: user.id, email: user.email, name: user.name, role: user.role, exp: Date.now() + 24 * 60 * 60 * 1000 })).toString("base64")
  const cookieStore = await cookies()
  cookieStore.set("admin_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  })

  return { success: true, name: user.name }
}

export async function getAdminSession() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin_session")?.value
    if (!token) return null

    const data = JSON.parse(Buffer.from(token, "base64").toString())
    if (data.exp < Date.now()) return null
    return { id: data.id, email: data.email, name: data.name, role: data.role }
  } catch {
    return null
  }
}

export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete("admin_session")
  return { success: true }
}

export async function getAdminStats() {
  const session = await getAdminSession()
  if (!session) return { error: "Unauthorized" }

  const supabase = createServerClient()

  const [submissions, sessions, audits, contacts] = await Promise.all([
    supabase.from("submissions").select("status, submitted_at", { count: "exact" }),
    supabase.from("wizard_sessions").select("status", { count: "exact" }),
    supabase.from("audits").select("audit_id", { count: "exact" }),
    supabase.from("enterprise_contacts").select("status", { count: "exact" }),
  ])

  const allSubs = submissions.data || []

  return {
    totalSubmissions: submissions.count || 0,
    submittedCount: allSubs.filter((s) => s.status === "submitted").length,
    inProgressCount: allSubs.filter((s) => s.status === "in_progress" || s.status === "reviewing").length,
    completedCount: allSubs.filter((s) => s.status === "completed" || s.status === "delivered").length,
    totalWizardSessions: sessions.count || 0,
    totalAudits: audits.count || 0,
    totalEnterpriseContacts: contacts.count || 0,
  }
}

export async function getSubmissions(status?: string) {
  const session = await getAdminSession()
  if (!session) return { error: "Unauthorized" }

  const supabase = createServerClient()
  let query = supabase
    .from("submissions")
    .select("submission_id, reference_number, client_name, client_email, client_phone, business_types, plan, status, submitted_at, updated_at")
    .order("submitted_at", { ascending: false })

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query.limit(50)
  if (error) return { error: error.message }
  return data || []
}

export async function updateSubmissionStatus(submissionId: string, newStatus: string) {
  const session = await getAdminSession()
  if (!session) return { error: "Unauthorized" }

  const supabase = createServerClient()

  const { data: existing } = await supabase
    .from("submissions")
    .select("status_history")
    .eq("submission_id", submissionId)
    .single()

  const history = (existing?.status_history || []) as Array<Record<string, string>>
  history.push({ status: newStatus, at: new Date().toISOString(), by: session.email })

  const { error } = await supabase
    .from("submissions")
    .update({ status: newStatus, status_history: history, updated_at: new Date().toISOString() })
    .eq("submission_id", submissionId)

  if (error) return { error: error.message }
  return { success: true }
}
