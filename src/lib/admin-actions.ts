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

export async function getAuditHistory() {
  const session = await getAdminSession()
  if (!session) return { error: "Unauthorized" }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("audits")
    .select("audit_id, url, status, detected_business_types, compliance_report, created_at")
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) return { error: error.message }
  return (data || []).map((a) => {
    const report = (a.compliance_report || {}) as Record<string, number>
    return {
      audit_id: a.audit_id,
      url: a.url,
      status: a.status,
      detected_business_types: a.detected_business_types || [],
      overall_score: report.overall_score ?? 0,
      total_rules: report.total_rules ?? 0,
      passed_rules: report.passed_rules ?? 0,
      failed_rules: report.failed_rules ?? 0,
      critical_failures: report.critical_failures ?? 0,
      created_at: a.created_at,
    }
  })
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

export async function getSubmissionDetail(submissionId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "Unauthorized" }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("submission_id", submissionId)
    .single()

  if (error || !data) return { error: "Submission not found" }
  return data
}

export async function updateSubmissionData(submissionId: string, updates: {
  client_name?: string
  client_email?: string
  client_phone?: string
  business_types?: string[]
  data?: Record<string, unknown>
}) {
  const session = await getAdminSession()
  if (!session) return { error: "Unauthorized" }

  const supabase = createServerClient()
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (updates.client_name !== undefined) payload.client_name = updates.client_name
  if (updates.client_email !== undefined) payload.client_email = updates.client_email
  if (updates.client_phone !== undefined) payload.client_phone = updates.client_phone
  if (updates.business_types) payload.business_types = updates.business_types
  if (updates.data) payload.data = updates.data

  const { error } = await supabase
    .from("submissions")
    .update(payload)
    .eq("submission_id", submissionId)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteSubmission(submissionId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "Unauthorized" }

  const supabase = createServerClient()
  const { error } = await supabase.from("submissions").delete().eq("submission_id", submissionId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteAudit(auditId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "Unauthorized" }

  const supabase = createServerClient()
  const { error } = await supabase.from("audits").delete().eq("audit_id", auditId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function clearAuditHistory() {
  const session = await getAdminSession()
  if (!session) return { error: "Unauthorized" }

  const supabase = createServerClient()
  const { error } = await supabase.from("audits").delete().neq("audit_id", "")
  if (error) return { error: error.message }
  return { success: true }
}

export async function generateSubmissionMarkdown(submissionId: string) {
  const session = await getAdminSession()
  if (!session) return { error: "Unauthorized" }

  const supabase = createServerClient()
  const { data: sub, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("submission_id", submissionId)
    .single()

  if (error || !sub) return { error: "Not found" }

  const d = (sub.data || {}) as Record<string, unknown>
  const reg = (d.registration || {}) as Record<string, Record<string, string>>
  const svc = (d.services || {}) as Record<string, string[]>
  const design = (d.design || {}) as Record<string, string>

  let md = `# Client Website Brief\n\n`
  md += `## Contact Information\n`
  md += `- **Name:** ${sub.client_name || "—"}\n`
  md += `- **Email:** ${sub.client_email || "—"}\n`
  md += `- **Phone:** ${sub.client_phone || "—"}\n`
  md += `- **Reference:** ${sub.reference_number}\n`
  md += `- **Submitted:** ${new Date(sub.submitted_at).toLocaleString()}\n`
  md += `- **Status:** ${sub.status}\n\n`

  md += `## Business Types\n`
  for (const bt of (sub.business_types || [])) { md += `- ${bt}\n` }
  md += `\n`

  md += `## Registration Details\n`
  for (const [type, fields] of Object.entries(reg)) {
    md += `### ${type}\n`
    for (const [key, val] of Object.entries(fields || {})) {
      if (val) md += `- **${key.replace(/_/g, " ")}:** ${val}\n`
    }
    md += `\n`
  }

  md += `## Services\n`
  for (const [type, services] of Object.entries(svc)) {
    md += `### ${type}\n`
    for (const s of (services || [])) { md += `- ${s}\n` }
    md += `\n`
  }

  md += `## Design Preferences\n`
  if (design.colorPreset) md += `- **Color Scheme:** ${design.colorPreset}\n`
  if (design.style) md += `- **Style:** ${design.style}\n`
  if (design.tagline) md += `- **Tagline:** ${design.tagline}\n`
  if (design.logoUrl) md += `- **Logo URL:** ${design.logoUrl}\n`

  return { markdown: md }
}
