import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Clock, Search, ArrowRight } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const STATUS_STEPS = ["submitted", "under_review", "payment_pending", "payment_received", "in_production", "delivered", "live"];
const STATUS_LABELS = { submitted: "Submitted", under_review: "Under Review", payment_pending: "Payment Pending", payment_received: "Payment Received", in_production: "In Production", delivered: "Delivered", live: "Live", rejected: "Rejected", abandoned: "Abandoned" };
const STATUS_COLORS = { submitted: "bg-blue-500", under_review: "bg-yellow-500", payment_pending: "bg-orange-500", payment_received: "bg-green-500", in_production: "bg-purple-500", delivered: "bg-cyan-500", live: "bg-emerald-500", rejected: "bg-red-500", abandoned: "bg-gray-500" };

export default function StatusPage() {
  const { submissionId } = useParams();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(!!submissionId);
  const [searchId, setSearchId] = useState("");

  useEffect(() => {
    if (submissionId) fetchStatus(submissionId);
  }, [submissionId]);

  const fetchStatus = async (id) => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/status/${id}`);
      setSub(data);
    } catch { toast.error("Submission not found. Check your reference number."); setSub(null); }
    finally { setLoading(false); }
  };

  const handleSearch = (e) => { e.preventDefault(); if (searchId.trim()) fetchStatus(searchId.trim()); };
  const currentIdx = STATUS_STEPS.indexOf(sub?.status || "");

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 font-[var(--font-heading)]">Track Your <span className="text-gradient">Submission</span></h1>
            <p className="text-muted-foreground">Enter your submission ID or reference number to check the status.</p>
          </motion.div>

          {/* Search */}
          {!submissionId && (
            <form onSubmit={handleSearch} className="flex gap-3 max-w-md mx-auto mb-10">
              <Input value={searchId} onChange={e => setSearchId(e.target.value)} placeholder="FS-2026-00001 or submission ID" className="flex-1" data-testid="status-search-input" />
              <Button type="submit" className="gap-2" data-testid="status-search-btn"><Search className="w-4 h-4" /> Search</Button>
            </form>
          )}

          {loading && <div className="flex justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}

          {sub && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {/* Status Header */}
              <div className="glass rounded-2xl p-6 mb-8" data-testid="status-header">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Reference</p>
                    <p className="text-2xl font-black font-mono">{sub.reference_number}</p>
                  </div>
                  <Badge className={`${STATUS_COLORS[sub.status] || "bg-gray-500"} text-white text-sm px-3 py-1`} data-testid="status-badge">{STATUS_LABELS[sub.status] || sub.status}</Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground block">Client</span><span className="font-medium">{sub.client_name}</span></div>
                  <div><span className="text-muted-foreground block">Plan</span><Badge variant="secondary">{sub.plan?.tier}</Badge></div>
                  <div><span className="text-muted-foreground block">Types</span><div className="flex flex-wrap gap-1">{sub.business_types?.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}</div></div>
                  <div><span className="text-muted-foreground block">Submitted</span><span className="font-medium">{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "—"}</span></div>
                </div>
              </div>

              {/* Progress Pipeline */}
              <div className="glass rounded-2xl p-6 mb-8" data-testid="status-pipeline">
                <h3 className="font-semibold mb-6 font-[var(--font-heading)]">Progress</h3>
                <div className="flex items-center justify-between mb-8 overflow-x-auto">
                  {STATUS_STEPS.map((s, i) => (
                    <div key={s} className="flex items-center">
                      <div className="flex flex-col items-center min-w-[60px]">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i <= currentIdx ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]" : "bg-secondary text-muted-foreground"}`}>
                          {i <= currentIdx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-1 text-center whitespace-nowrap">{STATUS_LABELS[s]}</span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && <div className={`w-6 sm:w-12 h-0.5 ${i < currentIdx ? "bg-[hsl(var(--accent))]" : "bg-secondary"}`} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Status History */}
              {sub.status_history?.length > 0 && (
                <div className="glass rounded-2xl p-6" data-testid="status-history">
                  <h3 className="font-semibold mb-4 font-[var(--font-heading)]">Activity Log</h3>
                  <div className="space-y-3">
                    {[...sub.status_history].reverse().map((h, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <div className="flex flex-col items-center"><div className="w-2 h-2 rounded-full bg-[hsl(var(--primary))] mt-1.5" />{i < sub.status_history.length - 1 && <div className="w-px flex-1 bg-border" />}</div>
                        <div className="pb-3">
                          <p className="font-medium">{STATUS_LABELS[h.status] || h.status}</p>
                          {h.note && <p className="text-muted-foreground text-xs">{h.note}</p>}
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{new Date(h.at).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {!sub && !loading && !submissionId && (
            <div className="text-center mt-10">
              <p className="text-sm text-muted-foreground mb-4">Don't have a reference number yet?</p>
              <Link to="/plans"><Button variant="outline" className="gap-2">Get Started <ArrowRight className="w-4 h-4" /></Button></Link>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
