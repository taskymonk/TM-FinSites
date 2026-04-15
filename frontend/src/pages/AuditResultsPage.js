import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Shield, Globe, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;
const ALL_TYPES = ["MFD", "Insurance", "PMS", "AIF", "SIF", "RIA"];

function ScoreRing({ score, label, size = 100 }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "hsl(var(--accent))" : score >= 40 ? "hsl(40 100% 50%)" : "hsl(0 80% 55%)";
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-[1.5s] ease-out" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-2xl font-black font-[var(--font-heading)]">{score}</span>
      </div>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

export default function AuditResultsPage() {
  const { auditId } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [recheckLoading, setRecheckLoading] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/audit/${auditId}`).then(r => { setAudit(r.data); setSelectedTypes(r.data.detected_business_types || []); setLoading(false); }).catch(() => { toast.error("Audit not found"); setLoading(false); });
  }, [auditId]);

  if (loading) return (
    <div className="min-h-screen"><Navbar /><div className="pt-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></div>
  );
  if (!audit) return (
    <div className="min-h-screen"><Navbar /><div className="pt-32 text-center"><p>Audit not found</p><Button onClick={() => navigate("/audit")} className="mt-4">Try Again</Button></div></div>
  );

  const report = audit.compliance_report || {};
  const checks = report.checks || [];
  const categories = [...new Set(checks.map(c => c.category))];
  const statusIcon = { pass: <CheckCircle2 className="w-4 h-4 text-green-500" />, fail: <XCircle className="w-4 h-4 text-red-500" />, warning: <AlertTriangle className="w-4 h-4 text-yellow-500" /> };
  const grade = report.overall_score >= 80 ? "A" : report.overall_score >= 60 ? "B" : report.overall_score >= 40 ? "C" : report.overall_score >= 20 ? "D" : "F";

  const toggleType = (type) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const handleRecheck = async () => {
    if (selectedTypes.length === 0) { toast.error("Select at least one business type"); return; }
    setRecheckLoading(true);
    try {
      const { data } = await axios.put(`${API}/api/audit/${auditId}/business-type`, { business_types: selectedTypes });
      setAudit(data);
      toast.success("Compliance re-checked with updated business types!");
    } catch { toast.error("Failed to re-check"); }
    finally { setRecheckLoading(false); }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-[var(--font-heading)]">Compliance Audit Report</h1>
              <Badge variant={audit.status === "completed" ? "default" : "destructive"} data-testid="audit-status-badge">{audit.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono flex items-center gap-2"><Globe className="w-3.5 h-3.5" />{audit.url}</p>
          </motion.div>

          {audit.status === "failed" && (
            <div className="glass rounded-2xl p-8 text-center mb-8">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Scan Failed</h3>
              <p className="text-sm text-muted-foreground mb-4">{audit.error || "Could not scan this website."}</p>
              <Button onClick={() => navigate("/audit")} data-testid="audit-retry-btn">Try Again</Button>
            </div>
          )}

          {audit.status === "completed" && (
            <>
              {/* Score Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8" data-testid="audit-scores">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="col-span-2 md:col-span-1 glass rounded-2xl p-6 text-center glow-primary">
                  <div className="text-5xl font-black text-gradient mb-1 font-[var(--font-heading)]">{grade}</div>
                  <div className="text-xs text-muted-foreground">Grade</div>
                </motion.div>
                {[
                  { score: report.overall_score || 0, label: "Overall" },
                  { score: report.technical_score || 0, label: "Technical" },
                  { score: report.content_score || 0, label: "Content" },
                  { score: report.compliance_score || 0, label: "Compliance" },
                ].map((s, i) => (
                  <motion.div key={i} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 * (i + 1) }} className="glass rounded-2xl p-4 flex flex-col items-center relative">
                    <ScoreRing score={s.score} label={s.label} size={80} />
                  </motion.div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="glass rounded-xl p-4 text-center"><span className="text-2xl font-bold text-green-500">{report.passed || 0}</span><p className="text-xs text-muted-foreground">Passed</p></div>
                <div className="glass rounded-xl p-4 text-center"><span className="text-2xl font-bold text-red-500">{report.failed || 0}</span><p className="text-xs text-muted-foreground">Failed</p></div>
                <div className="glass rounded-xl p-4 text-center"><span className="text-2xl font-bold text-yellow-500">{report.warnings || 0}</span><p className="text-xs text-muted-foreground">Warnings</p></div>
              </div>

              {/* Detected Info */}
              <div className="glass rounded-2xl p-6 mb-8" data-testid="audit-detected-info">
                <h3 className="font-semibold mb-4 font-[var(--font-heading)]">Detected Information</h3>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Business Types Detected</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(audit.detected_business_types || []).map(t => <Badge key={t} variant="secondary">{t}</Badge>)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Select types to re-check compliance</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {ALL_TYPES.map(t => (
                        <button key={t} onClick={() => toggleType(t)} data-testid={`recheck-type-${t}`}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedTypes.includes(t) ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]" : "border-border text-muted-foreground hover:border-[hsl(var(--primary)/0.3)]"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={handleRecheck} disabled={recheckLoading} className="gap-2 text-xs" data-testid="recheck-btn">
                      {recheckLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />} Re-check Compliance
                    </Button>
                  </div>
                  <div>
                    {audit.detected_data?.business_name && <div className="mb-3"><p className="text-xs text-muted-foreground">Business Name</p><p className="text-sm font-medium">{audit.detected_data.business_name}</p></div>}
                    {Object.keys(audit.detected_data?.registrations || {}).length > 0 && (
                      <div className="mb-3"><p className="text-xs text-muted-foreground mb-1">Registrations Found</p>
                        {Object.entries(audit.detected_data.registrations).map(([k, v]) => <p key={k} className="text-xs font-mono">{k}: {Array.isArray(v) ? v.join(", ") : v}</p>)}
                      </div>
                    )}
                    {(audit.detected_data?.services_detected || []).length > 0 && (
                      <div><p className="text-xs text-muted-foreground mb-1">Services Detected</p>
                        <div className="flex flex-wrap gap-1">{audit.detected_data.services_detected.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}</div>
                      </div>
                    )}
                    {audit.detected_data?.contact?.emails?.length > 0 && (
                      <div className="mt-2"><p className="text-xs text-muted-foreground">Contact</p><p className="text-xs font-mono">{audit.detected_data.contact.emails[0]}</p></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Compliance Checklist */}
              <div className="space-y-4 mb-8" data-testid="audit-checklist">
                {categories.map(cat => (
                  <div key={cat} className="glass rounded-2xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 font-[var(--font-heading)]"><Shield className="w-4 h-4 text-[hsl(var(--primary))]" />{cat}</h3>
                    <div className="space-y-2">
                      {checks.filter(c => c.category === cat).map((c, i) => (
                        <div key={i} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                          {statusIcon[c.status]}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{c.detail}</p>
                          </div>
                          <Badge variant={c.severity === "critical" ? "destructive" : c.severity === "major" ? "secondary" : "outline"} className="text-[10px] shrink-0">{c.severity}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div className="glass rounded-2xl p-8 text-center glow-primary" data-testid="audit-cta-section">
                <h3 className="text-xl font-bold mb-2 font-[var(--font-heading)]">Fix These Issues — Get a Compliant Website</h3>
                <p className="text-sm text-muted-foreground mb-6">We'll use the data we detected to prefill your onboarding. Review, verify, and let us build your compliant website.</p>
                <Button size="lg" onClick={() => navigate(`/plans?audit_id=${auditId}`)} className="gap-2 font-semibold" data-testid="audit-proceed-btn">
                  Proceed to Plans <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
