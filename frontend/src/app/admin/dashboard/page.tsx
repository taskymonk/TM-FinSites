"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Shield, LogOut, FileText, Users, BarChart3, Mail, Loader2, Search, RefreshCw, ChevronDown, Globe, Scan, Trash2, Eye, Download, Pencil, X, Home, Copy, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import {
  getAdminSession, adminLogout, getAdminStats, getSubmissions, updateSubmissionStatus,
  getAuditHistory, deleteAudit, clearAuditHistory, getSubmissionDetail, updateSubmissionData,
  deleteSubmission, generateSubmissionMarkdown
} from "@/lib/admin-actions"

interface AdminUser { id: string; email: string; name: string; role: string }
interface Stats { totalSubmissions: number; submittedCount: number; inProgressCount: number; completedCount: number; totalWizardSessions: number; totalAudits: number; totalEnterpriseContacts: number }
interface Submission { submission_id: string; reference_number: string; client_name: string; client_email: string; client_phone: string; business_types: string[]; plan: Record<string, string>; status: string; submitted_at: string; updated_at: string }
interface AuditRecord { audit_id: string; url: string; status: string; detected_business_types: string[]; overall_score: number; total_rules: number; passed_rules: number; failed_rules: number; critical_failures: number; created_at: string }

const STATUS_OPTS = ["submitted", "reviewing", "in_progress", "design_ready", "revision", "completed", "delivered"]
const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  reviewing: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  in_progress: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  design_ready: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  revision: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  completed: "bg-green-500/15 text-green-400 border-green-500/30",
  delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "submissions", label: "Submissions", icon: FileText },
  { id: "audits", label: "Audit History", icon: Scan },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState("dashboard")
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [auditSearch, setAuditSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Submission detail
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailData, setDetailData] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ client_name: "", client_email: "", client_phone: "" })

  // Markdown viewer
  const [mdOpen, setMdOpen] = useState(false)
  const [mdContent, setMdContent] = useState("")

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{ type: string; id?: string; message: string } | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const session = await getAdminSession()
    if (!session) { router.push("/admin/login"); return }
    setAdmin(session)
    const [statsResult, subsResult, auditsResult] = await Promise.all([getAdminStats(), getSubmissions(), getAuditHistory()])
    if (statsResult && !("error" in statsResult)) setStats(statsResult)
    if (Array.isArray(subsResult)) setSubmissions(subsResult)
    if (Array.isArray(auditsResult)) setAudits(auditsResult)
    setLoading(false)
  }

  async function handleFilterChange(f: string) {
    setFilter(f)
    const result = await getSubmissions(f)
    if (Array.isArray(result)) setSubmissions(result)
  }

  async function handleStatusChange(subId: string, status: string) {
    setUpdatingId(subId)
    const r = await updateSubmissionStatus(subId, status)
    if ("error" in r) toast.error(r.error)
    else { toast.success("Status updated"); setSubmissions((p) => p.map((s) => s.submission_id === subId ? { ...s, status } : s)) }
    setUpdatingId(null)
  }

  async function openDetail(subId: string) {
    setDetailLoading(true); setDetailOpen(true); setEditing(false)
    const r = await getSubmissionDetail(subId)
    if ("error" in r) { toast.error(r.error as string); setDetailOpen(false) }
    else {
      setDetailData(r as Record<string, unknown>)
      setEditForm({ client_name: (r as Record<string, string>).client_name || "", client_email: (r as Record<string, string>).client_email || "", client_phone: (r as Record<string, string>).client_phone || "" })
    }
    setDetailLoading(false)
  }

  async function saveEdit() {
    if (!detailData) return
    const r = await updateSubmissionData(detailData.submission_id as string, editForm)
    if ("error" in r) toast.error(r.error)
    else {
      toast.success("Updated"); setEditing(false)
      setDetailData({ ...detailData, ...editForm })
      setSubmissions((p) => p.map((s) => s.submission_id === detailData.submission_id ? { ...s, ...editForm } : s))
    }
  }

  async function viewMarkdown(subId: string) {
    const r = await generateSubmissionMarkdown(subId)
    if ("error" in r) toast.error(r.error as string)
    else { setMdContent(r.markdown as string); setMdOpen(true) }
  }

  async function handleConfirm() {
    if (!confirmAction) return
    if (confirmAction.type === "delete_submission" && confirmAction.id) {
      const r = await deleteSubmission(confirmAction.id)
      if ("error" in r) toast.error(r.error)
      else { toast.success("Deleted"); setSubmissions((p) => p.filter((s) => s.submission_id !== confirmAction.id)); setDetailOpen(false) }
    } else if (confirmAction.type === "delete_audit" && confirmAction.id) {
      const r = await deleteAudit(confirmAction.id)
      if ("error" in r) toast.error(r.error)
      else { toast.success("Deleted"); setAudits((p) => p.filter((a) => a.audit_id !== confirmAction.id)) }
    } else if (confirmAction.type === "clear_audits") {
      const r = await clearAuditHistory()
      if ("error" in r) toast.error(r.error)
      else { toast.success("History cleared"); setAudits([]) }
    }
    setConfirmAction(null)
  }

  const filteredSubs = submissions.filter((s) => !search || [s.client_name, s.reference_number, s.client_email].some((v) => v?.toLowerCase().includes(search.toLowerCase())))
  const filteredAudits = audits.filter((a) => !auditSearch || a.url?.toLowerCase().includes(auditSearch.toLowerCase()) || a.detected_business_types?.some((t) => t.toLowerCase().includes(auditSearch.toLowerCase())))

  if (loading) return <div className="min-h-screen bg-[#030712] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>

  return (
    <div className="min-h-screen bg-[#030712] flex" data-testid="admin-dashboard">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-slate-800 bg-slate-950 flex flex-col" data-testid="admin-sidebar">
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div>
          <span className="text-sm font-bold text-white">FinSites</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setPage(item.id)}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${page === item.id ? "bg-blue-600/10 text-blue-400" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              data-testid={`nav-${item.id}`}>
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center gap-2 px-3 mb-2">
            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">{admin?.name?.[0] || "A"}</div>
            <div className="flex-1 min-w-0"><div className="text-xs font-medium text-slate-300 truncate">{admin?.name}</div><div className="text-[10px] text-slate-500 truncate">{admin?.email}</div></div>
          </div>
          <button onClick={async () => { await adminLogout(); router.push("/admin/login") }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-colors" data-testid="admin-logout">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-6">

          {/* DASHBOARD */}
          {page === "dashboard" && stats && (
            <>
              <h1 className="text-xl font-bold text-white mb-6">Dashboard</h1>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-testid="admin-stats">
                {[
                  { label: "Submissions", value: stats.totalSubmissions, icon: FileText, color: "text-blue-400", click: () => setPage("submissions") },
                  { label: "Wizard Sessions", value: stats.totalWizardSessions, icon: Users, color: "text-emerald-400" },
                  { label: "Audits Run", value: stats.totalAudits, icon: BarChart3, color: "text-amber-400", click: () => setPage("audits") },
                  { label: "Enterprise Inquiries", value: stats.totalEnterpriseContacts, icon: Mail, color: "text-purple-400" },
                ].map((s) => (
                  <Card key={s.label} className="bg-slate-900 border-slate-800 cursor-pointer hover:border-slate-700 transition-colors" onClick={s.click} data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <CardContent className="pt-5 pb-5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center"><s.icon className={`w-5 h-5 ${s.color}`} /></div>
                      <div><div className="text-2xl font-black text-white">{s.value}</div><div className="text-xs text-slate-400">{s.label}</div></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {/* Recent Submissions */}
              <Card className="bg-slate-900 border-slate-800">
                <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base text-white">Recent Submissions</CardTitle><Button variant="ghost" size="sm" className="text-xs text-slate-400" onClick={() => setPage("submissions")}>View All <ChevronRight className="w-3 h-3 ml-1" /></Button></div></CardHeader>
                <CardContent>
                  {submissions.slice(0, 5).map((sub) => (
                    <div key={sub.submission_id} className="flex items-center justify-between py-3 border-b border-slate-800/50 last:border-0">
                      <div>
                        <span className="text-sm font-medium text-white">{sub.client_name || "Unnamed"}</span>
                        <span className="text-[10px] font-mono text-slate-500 ml-2">{sub.reference_number}</span>
                      </div>
                      <Badge className={`${STATUS_COLORS[sub.status] || STATUS_COLORS.submitted} text-[10px] capitalize`}>{sub.status.replace("_", " ")}</Badge>
                    </div>
                  ))}
                  {submissions.length === 0 && <p className="text-sm text-slate-500 text-center py-6">No submissions yet</p>}
                </CardContent>
              </Card>
            </>
          )}

          {/* SUBMISSIONS PAGE */}
          {page === "submissions" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-white">Submissions</h1>
                <div className="flex items-center gap-2">
                  <div className="relative"><Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 w-48 text-xs bg-slate-900 border-slate-700 text-white" data-testid="admin-search" /></div>
                  <Button variant="outline" size="sm" className="h-8 border-slate-700 text-slate-400" onClick={loadData} data-testid="refresh-btn"><RefreshCw className="w-3 h-3" /></Button>
                </div>
              </div>
              {/* Filter buttons as top-level bar */}
              <div className="flex gap-2 mb-5 flex-wrap" data-testid="submissions-filters">
                {["all", "submitted", "reviewing", "in_progress", "completed", "delivered"].map((f) => (
                  <Button key={f} variant={filter === f ? "default" : "ghost"} size="sm" className={`h-8 text-xs px-3 capitalize ${filter === f ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white bg-slate-800/50"}`}
                    onClick={() => handleFilterChange(f)} data-testid={`filter-${f}`}>{f.replace("_", " ")}</Button>
                ))}
              </div>
              <div className="space-y-2">
                {filteredSubs.length === 0 ? <p className="text-sm text-slate-500 text-center py-16">No submissions found</p> :
                filteredSubs.map((sub) => (
                  <div key={sub.submission_id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors" data-testid={`sub-${sub.submission_id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1"><span className="text-sm font-medium text-white">{sub.client_name || "Unnamed"}</span><span className="text-[10px] font-mono text-slate-500">{sub.reference_number}</span></div>
                      <div className="flex items-center gap-3 text-xs text-slate-400"><span>{sub.client_email}</span>{sub.client_phone && <span>{sub.client_phone}</span>}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">{(sub.business_types || []).map((bt) => <Badge key={bt} className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/30">{bt}</Badge>)}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="relative group">
                        <Badge className={`${STATUS_COLORS[sub.status] || STATUS_COLORS.submitted} text-[10px] cursor-pointer capitalize`}>{sub.status.replace("_", " ")} <ChevronDown className="w-3 h-3 ml-0.5 inline" /></Badge>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-36 rounded-lg border border-slate-700 bg-slate-900 p-1 shadow-lg z-50">
                          {STATUS_OPTS.map((opt) => (
                            <button key={opt} onClick={() => handleStatusChange(sub.submission_id, opt)} disabled={updatingId === sub.submission_id}
                              className={`block w-full text-left px-3 py-1.5 text-xs rounded-md capitalize transition-colors ${sub.status === opt ? "bg-slate-800 text-white font-medium" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>{opt.replace("_", " ")}</button>
                          ))}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-white" onClick={() => openDetail(sub.submission_id)} data-testid={`view-${sub.submission_id}`}><Eye className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-400" onClick={() => viewMarkdown(sub.submission_id)} data-testid={`md-${sub.submission_id}`}><Download className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-red-400" onClick={() => setConfirmAction({ type: "delete_submission", id: sub.submission_id, message: `Delete submission ${sub.reference_number}?` })} data-testid={`del-${sub.submission_id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* AUDIT HISTORY PAGE */}
          {page === "audits" && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold text-white">Audit History</h1>
                <div className="flex items-center gap-2">
                  <div className="relative"><Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" /><Input value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} placeholder="Search URL or type..." className="pl-8 h-8 w-56 text-xs bg-slate-900 border-slate-700 text-white" data-testid="audit-history-search" /></div>
                  <Button variant="outline" size="sm" className="h-8 border-slate-700 text-slate-400" onClick={loadData}><RefreshCw className="w-3 h-3" /></Button>
                  {audits.length > 0 && (
                    <Button variant="outline" size="sm" className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10 gap-1 text-xs"
                      onClick={() => setConfirmAction({ type: "clear_audits", message: "Clear all audit history? This cannot be undone." })} data-testid="clear-audits-btn">
                      <Trash2 className="w-3 h-3" /> Clear All
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {filteredAudits.length === 0 ? <p className="text-sm text-slate-500 text-center py-16">No audits found</p> :
                filteredAudits.map((audit) => (
                  <div key={audit.audit_id} className="flex items-center gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors" data-testid={`audit-row-${audit.audit_id}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1"><Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" /><span className="text-sm font-medium text-white truncate">{audit.url}</span></div>
                      <div className="flex flex-wrap gap-1 mt-1.5">{(audit.detected_business_types || []).map((bt) => <Badge key={bt} className="text-[9px] px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/30">{bt}</Badge>)}{audit.detected_business_types.length === 0 && <span className="text-[10px] text-slate-500">No type detected</span>}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className={`text-lg font-black ${audit.overall_score >= 80 ? "text-emerald-400" : audit.overall_score >= 50 ? "text-amber-400" : "text-red-400"}`}>{audit.overall_score}</span>
                        <span className="text-[10px] text-slate-500 ml-1">/ 100</span>
                        <div className="flex items-center gap-2 justify-end text-[10px] text-slate-500"><span className="text-emerald-400">{audit.passed_rules}P</span><span className="text-red-400">{audit.failed_rules}F</span></div>
                      </div>
                      <div className="text-[10px] text-slate-500">{new Date(audit.created_at).toLocaleDateString()}</div>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-red-400" onClick={() => setConfirmAction({ type: "delete_audit", id: audit.audit_id, message: "Delete this audit?" })}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Submission Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-700 text-white max-h-[85vh] overflow-y-auto" data-testid="detail-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Submission Details
              {detailData && <span className="text-xs font-mono text-slate-500">{(detailData as Record<string, string>).reference_number}</span>}
            </DialogTitle>
            <DialogDescription className="text-slate-400">View and edit submission data</DialogDescription>
          </DialogHeader>
          {detailLoading ? <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div> :
          detailData && (() => {
            const d = detailData as Record<string, unknown>
            const data = (d.data || {}) as Record<string, unknown>
            const reg = (data.registration || {}) as Record<string, Record<string, string>>
            const svc = (data.services || {}) as Record<string, string[]>
            const design = (data.design || {}) as Record<string, string>
            return (
              <div className="space-y-5">
                {/* Contact - Editable */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-white">Contact</h4>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-slate-400 hover:text-white" onClick={() => setEditing(!editing)} data-testid="edit-contact-btn">
                      {editing ? <><X className="w-3 h-3" /> Cancel</> : <><Pencil className="w-3 h-3" /> Edit</>}
                    </Button>
                  </div>
                  {editing ? (
                    <div className="space-y-3">
                      <div><Label className="text-xs text-slate-400">Name</Label><Input value={editForm.client_name} onChange={(e) => setEditForm((f) => ({ ...f, client_name: e.target.value }))} className="bg-slate-900 border-slate-700 text-white" data-testid="edit-name" /></div>
                      <div><Label className="text-xs text-slate-400">Email</Label><Input value={editForm.client_email} onChange={(e) => setEditForm((f) => ({ ...f, client_email: e.target.value }))} className="bg-slate-900 border-slate-700 text-white" data-testid="edit-email" /></div>
                      <div><Label className="text-xs text-slate-400">Phone</Label><Input value={editForm.client_phone} onChange={(e) => setEditForm((f) => ({ ...f, client_phone: e.target.value }))} className="bg-slate-900 border-slate-700 text-white" data-testid="edit-phone" /></div>
                      <Button size="sm" onClick={saveEdit} className="bg-blue-600 hover:bg-blue-500 text-white text-xs" data-testid="save-edit-btn">Save Changes</Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                      <div><span className="text-slate-500">Name:</span> <span className="text-white">{d.client_name as string || "—"}</span></div>
                      <div><span className="text-slate-500">Email:</span> <span className="text-white">{d.client_email as string || "—"}</span></div>
                      <div><span className="text-slate-500">Phone:</span> <span className="text-white">{d.client_phone as string || "—"}</span></div>
                      <div><span className="text-slate-500">Status:</span> <Badge className={`${STATUS_COLORS[d.status as string] || STATUS_COLORS.submitted} text-[10px] capitalize ml-1`}>{(d.status as string)?.replace("_", " ")}</Badge></div>
                    </div>
                  )}
                </div>
                {/* Business Types */}
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                  <h4 className="text-sm font-semibold text-white mb-2">Business Types</h4>
                  <div className="flex flex-wrap gap-1.5">{((d.business_types || []) as string[]).map((bt) => <Badge key={bt} className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">{bt}</Badge>)}</div>
                </div>
                {/* Registration */}
                {Object.keys(reg).length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <h4 className="text-sm font-semibold text-white mb-2">Registration Details</h4>
                    {Object.entries(reg).map(([type, fields]) => (
                      <div key={type} className="mb-3 last:mb-0">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] mb-1.5">{type}</Badge>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">{Object.entries(fields || {}).filter(([,v]) => v).map(([k, v]) => <div key={k}><span className="text-slate-500 capitalize">{k.replace(/_/g, " ")}:</span> <span className="text-white">{v}</span></div>)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Services */}
                {Object.keys(svc).length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <h4 className="text-sm font-semibold text-white mb-2">Services</h4>
                    {Object.entries(svc).map(([type, services]) => (services || []).length > 0 && (
                      <div key={type} className="mb-3 last:mb-0">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] mb-1.5">{type}</Badge>
                        <div className="flex flex-wrap gap-1.5">{services.map((s) => <Badge key={s} variant="outline" className="text-xs border-slate-600 text-slate-300">{s}</Badge>)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Design */}
                {design && Object.values(design).some((v) => v) && (
                  <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <h4 className="text-sm font-semibold text-white mb-2">Design</h4>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      {design.colorPreset && <div><span className="text-slate-500">Color:</span> <span className="text-white">{design.colorPreset}</span></div>}
                      {design.style && <div><span className="text-slate-500">Style:</span> <span className="text-white capitalize">{design.style}</span></div>}
                      {design.tagline && <div className="col-span-2"><span className="text-slate-500">Tagline:</span> <span className="text-white">{design.tagline}</span></div>}
                    </div>
                  </div>
                )}
                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs border-slate-700 text-slate-300" onClick={() => viewMarkdown(d.submission_id as string)} data-testid="detail-md-btn"><Download className="w-3 h-3" /> Export Markdown</Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setConfirmAction({ type: "delete_submission", id: d.submission_id as string, message: `Delete ${(d as Record<string, string>).reference_number}?` })} data-testid="detail-delete-btn"><Trash2 className="w-3 h-3" /> Delete</Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Markdown Viewer */}
      <Dialog open={mdOpen} onOpenChange={setMdOpen}>
        <DialogContent className="sm:max-w-2xl bg-slate-900 border-slate-700 text-white max-h-[85vh] overflow-y-auto" data-testid="md-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">Client Website Brief (Markdown)
              <Button size="sm" variant="outline" className="text-xs border-slate-700 text-slate-300 gap-1" onClick={() => { navigator.clipboard.writeText(mdContent); toast.success("Copied!") }} data-testid="copy-md-btn"><Copy className="w-3 h-3" /> Copy</Button>
            </DialogTitle>
          </DialogHeader>
          <pre className="p-4 rounded-xl bg-[#0a0f1a] text-slate-300 text-xs leading-relaxed overflow-x-auto font-mono border border-slate-800 whitespace-pre-wrap" data-testid="md-content">{mdContent}</pre>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm bg-slate-900 border-slate-700 text-white" data-testid="confirm-dialog">
          <DialogHeader><DialogTitle>Confirm Action</DialogTitle><DialogDescription className="text-slate-400">{confirmAction?.message}</DialogDescription></DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white" onClick={handleConfirm} data-testid="confirm-action-btn">Confirm</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
