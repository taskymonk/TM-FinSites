"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, LogOut, FileText, Users, BarChart3, Mail, Loader2, Search, RefreshCw, ChevronDown, Globe, Scan } from "lucide-react"
import { toast } from "sonner"
import { getAdminSession, adminLogout, getAdminStats, getSubmissions, updateSubmissionStatus, getAuditHistory } from "@/lib/admin-actions"

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

function ScoreDot({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-400" : score >= 50 ? "bg-yellow-400" : "bg-red-400"
  return <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
}

export default function AdminDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [audits, setAudits] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [auditSearch, setAuditSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("submissions")

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const session = await getAdminSession()
    if (!session) { router.push("/admin/login"); return }
    setAdmin(session)

    const [statsResult, subsResult, auditsResult] = await Promise.all([
      getAdminStats(),
      getSubmissions(),
      getAuditHistory(),
    ])
    if (statsResult && !("error" in statsResult)) setStats(statsResult)
    if (Array.isArray(subsResult)) setSubmissions(subsResult)
    if (Array.isArray(auditsResult)) setAudits(auditsResult)
    setLoading(false)
  }

  async function handleLogout() {
    await adminLogout()
    router.push("/admin/login")
  }

  async function handleFilterChange(newFilter: string) {
    setFilter(newFilter)
    const result = await getSubmissions(newFilter)
    if (Array.isArray(result)) setSubmissions(result)
  }

  async function handleStatusChange(submissionId: string, newStatus: string) {
    setUpdatingId(submissionId)
    const result = await updateSubmissionStatus(submissionId, newStatus)
    if ("error" in result) {
      toast.error(result.error)
    } else {
      toast.success("Status updated")
      setSubmissions((prev) => prev.map((s) => s.submission_id === submissionId ? { ...s, status: newStatus } : s))
    }
    setUpdatingId(null)
  }

  const filteredSubs = submissions.filter((s) =>
    !search || s.client_name?.toLowerCase().includes(search.toLowerCase()) || s.reference_number?.toLowerCase().includes(search.toLowerCase()) || s.client_email?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredAudits = audits.filter((a) =>
    !auditSearch || a.url?.toLowerCase().includes(auditSearch.toLowerCase()) || a.detected_business_types?.some((t) => t.toLowerCase().includes(auditSearch.toLowerCase()))
  )

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="min-h-screen" data-testid="admin-dashboard">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <span className="text-sm font-bold">FinSites Admin</span>
              <span className="text-xs text-muted-foreground ml-2">{admin?.name}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-xs text-muted-foreground" data-testid="admin-logout">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="admin-stats">
            {[
              { label: "Submissions", value: stats.totalSubmissions, icon: FileText, color: "text-blue-400" },
              { label: "Wizard Sessions", value: stats.totalWizardSessions, icon: Users, color: "text-green-400" },
              { label: "Audits Run", value: stats.totalAudits, icon: BarChart3, color: "text-yellow-400" },
              { label: "Enterprise Inquiries", value: stats.totalEnterpriseContacts, icon: Mail, color: "text-purple-400" },
            ].map((s) => (
              <Card key={s.label} className="glass" data-testid={`stat-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-black text-foreground">{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs: Submissions + Audit History */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4" data-testid="admin-tabs">
            <TabsTrigger value="submissions" className="gap-1.5 text-xs" data-testid="tab-submissions">
              <FileText className="w-3.5 h-3.5" /> Submissions ({submissions.length})
            </TabsTrigger>
            <TabsTrigger value="audits" className="gap-1.5 text-xs" data-testid="tab-audits">
              <Scan className="w-3.5 h-3.5" /> Audit History ({audits.length})
            </TabsTrigger>
          </TabsList>

          {/* Submissions Tab */}
          <TabsContent value="submissions">
            <Card className="glass" data-testid="submissions-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base">Submissions</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." className="pl-8 h-8 w-48 text-xs bg-secondary" data-testid="admin-search" />
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {["all", "submitted", "reviewing", "in_progress", "completed"].map((f) => (
                        <Button key={f} variant={filter === f ? "default" : "ghost"} size="sm" className="h-7 text-[10px] px-2 capitalize"
                          onClick={() => handleFilterChange(f)} data-testid={`filter-${f}`}>
                          {f.replace("_", " ")}
                        </Button>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="h-7" onClick={loadData} data-testid="refresh-btn">
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredSubs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No submissions found</p>
                ) : (
                  <div className="space-y-2">
                    {filteredSubs.map((sub) => (
                      <div key={sub.submission_id} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/40 border border-border/50" data-testid={`sub-${sub.submission_id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">{sub.client_name || "Unnamed"}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{sub.reference_number}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{sub.client_email}</span>
                            {sub.client_phone && <span>{sub.client_phone}</span>}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(sub.business_types || []).map((bt) => <Badge key={bt} className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">{bt}</Badge>)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="relative group">
                            <Badge className={`${STATUS_COLORS[sub.status] || STATUS_COLORS.submitted} text-[10px] cursor-pointer capitalize`} data-testid={`status-badge-${sub.submission_id}`}>
                              {sub.status.replace("_", " ")} <ChevronDown className="w-3 h-3 ml-0.5 inline" />
                            </Badge>
                            <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-36 rounded-lg border border-border bg-popover p-1 shadow-lg z-50" data-testid={`status-dropdown-${sub.submission_id}`}>
                              {STATUS_OPTS.map((opt) => (
                                <button key={opt} onClick={() => handleStatusChange(sub.submission_id, opt)}
                                  disabled={updatingId === sub.submission_id}
                                  className={`block w-full text-left px-3 py-1.5 text-xs rounded-md capitalize transition-colors ${sub.status === opt ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"}`}>
                                  {opt.replace("_", " ")}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1">{new Date(sub.submitted_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit History Tab */}
          <TabsContent value="audits">
            <Card className="glass" data-testid="audit-history-card">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base">Audit History</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} placeholder="Search URL or type..." className="pl-8 h-8 w-56 text-xs bg-secondary" data-testid="audit-history-search" />
                    </div>
                    <Button variant="outline" size="sm" className="h-7" onClick={loadData}>
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredAudits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">No audits found</p>
                ) : (
                  <div className="space-y-2">
                    {filteredAudits.map((audit) => (
                      <div key={audit.audit_id} className="flex items-center gap-4 p-4 rounded-xl bg-secondary/40 border border-border/50" data-testid={`audit-row-${audit.audit_id}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">{audit.url}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(audit.detected_business_types || []).map((bt) => (
                              <Badge key={bt} className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">{bt}</Badge>
                            ))}
                            {audit.detected_business_types.length === 0 && <span className="text-[10px] text-muted-foreground">No type detected</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0 space-y-1">
                          <div className="flex items-center gap-2 justify-end">
                            <ScoreDot score={audit.overall_score} />
                            <span className={`text-lg font-black ${audit.overall_score >= 80 ? "text-green-400" : audit.overall_score >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                              {audit.overall_score}
                            </span>
                            <span className="text-[10px] text-muted-foreground">/ 100</span>
                          </div>
                          <div className="flex items-center gap-2 justify-end text-[10px] text-muted-foreground">
                            <span className="text-green-400">{audit.passed_rules}P</span>
                            <span className="text-red-400">{audit.failed_rules}F</span>
                            {audit.critical_failures > 0 && <span className="text-red-500 font-bold">{audit.critical_failures}C</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{new Date(audit.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
