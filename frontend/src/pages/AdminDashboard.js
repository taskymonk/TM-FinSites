import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Users, FileText, Scan, LogOut, Search, ChevronLeft, ChevronRight, Shield, Mail } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;
const STATUS_COLORS = { submitted: "bg-blue-500", under_review: "bg-yellow-500", payment_pending: "bg-orange-500", payment_received: "bg-green-500", in_production: "bg-purple-500", delivered: "bg-cyan-500", live: "bg-emerald-500", rejected: "bg-red-500", abandoned: "bg-gray-500" };
const STATUS_LABELS = { submitted: "Submitted", under_review: "Under Review", payment_pending: "Payment Pending", payment_received: "Payment Received", in_production: "In Production", delivered: "Delivered", live: "Live", rejected: "Rejected", abandoned: "Abandoned" };
const ALL_STATUSES = Object.keys(STATUS_LABELS);

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState({ status: "", search: "" });

  const fetchStats = async () => {
    try { const { data } = await axios.get(`${API}/api/admin/stats`, { withCredentials: true }); setStats(data); } catch { toast.error("Failed to load stats"); }
  };

  const fetchSubmissions = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      const { data } = await axios.get(`${API}/api/admin/submissions?${params}`, { withCredentials: true });
      setSubmissions(data.submissions || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
    } catch { toast.error("Failed to load submissions"); }
  };

  useEffect(() => { fetchStats(); }, []);
  useEffect(() => { fetchSubmissions(); }, [page, filters]);

  const handleLogout = async () => { await logout(); navigate("/admin/login"); };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="glass-strong border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div>
            <span className="font-bold font-[var(--font-heading)]">FinSites</span>
            <Badge variant="secondary" className="text-[10px]">Admin</Badge>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="admin-logout"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8" data-testid="admin-stats">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center"><FileText className="w-5 h-5 text-blue-500" /></div><div><p className="text-2xl font-bold">{stats.total_submissions}</p><p className="text-xs text-muted-foreground">Total Submissions</p></div></div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center"><Users className="w-5 h-5 text-yellow-500" /></div><div><p className="text-2xl font-bold">{(stats.by_status?.submitted || 0) + (stats.by_status?.under_review || 0)}</p><p className="text-xs text-muted-foreground">Pending Review</p></div></div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-5">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center"><Scan className="w-5 h-5 text-green-500" /></div><div><p className="text-2xl font-bold">{stats.total_audits}</p><p className="text-xs text-muted-foreground">Audits Run</p></div></div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-5">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center"><Mail className="w-5 h-5 text-purple-500" /></div><div><p className="text-2xl font-bold">{stats.enterprise_leads}</p><p className="text-xs text-muted-foreground">Enterprise Leads</p></div></div>
            </motion.div>
          </div>
        )}

        {/* Business Type Breakdown */}
        {stats?.by_type && Object.keys(stats.by_type).length > 0 && (
          <div className="glass rounded-xl p-5 mb-8" data-testid="admin-type-chart">
            <h3 className="font-semibold mb-4 font-[var(--font-heading)] flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[hsl(var(--primary))]" /> By Business Type</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(stats.by_type).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/50">
                  <span className="text-sm font-medium">{type}</span>
                  <Badge>{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4" data-testid="admin-filters">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={filters.search} onChange={e => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }} placeholder="Search by name, email, or reference..." className="pl-9" data-testid="admin-search" />
          </div>
          <Select value={filters.status} onValueChange={v => { setFilters(f => ({ ...f, status: v === "all" ? "" : v })); setPage(1); }}>
            <SelectTrigger className="w-48" data-testid="admin-status-filter"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Statuses</SelectItem>{ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Submissions Table */}
        <div className="glass rounded-xl overflow-hidden" data-testid="admin-submissions-table">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden sm:table-cell">Types</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No submissions found</TableCell></TableRow>
              ) : submissions.map(sub => (
                <TableRow key={sub.submission_id} className="cursor-pointer hover:bg-secondary/30" onClick={() => navigate(`/admin/submissions/${sub.submission_id}`)} data-testid={`submission-row-${sub.submission_id}`}>
                  <TableCell className="font-mono text-xs">{sub.reference_number}</TableCell>
                  <TableCell><div><p className="font-medium text-sm">{sub.client_name || "—"}</p><p className="text-xs text-muted-foreground">{sub.client_email}</p></div></TableCell>
                  <TableCell className="hidden sm:table-cell"><div className="flex flex-wrap gap-1">{(sub.business_types || []).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div></TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{sub.plan?.tier}</Badge></TableCell>
                  <TableCell><Badge className={`${STATUS_COLORS[sub.status] || "bg-gray-500"} text-white text-[10px]`}>{STATUS_LABELS[sub.status] || sub.status}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between mt-4" data-testid="admin-pagination">
            <p className="text-sm text-muted-foreground">{total} total submissions</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="flex items-center text-sm px-2">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
