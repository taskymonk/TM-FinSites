"use client"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Scan, CheckCircle2, XCircle, AlertTriangle, Shield, Globe, ArrowRight, Loader2, RefreshCw, Pencil, Download } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { runAudit as runAuditAction, runAuditWithTypes as runAuditWithTypesAction } from "@/lib/actions"
import { generateAuditPDF } from "@/lib/pdf-generator"

const ALL_BIZ_TYPES = ["MFD", "Insurance", "RIA", "PMS", "Stock Broker", "SIF", "NPS"]

interface AuditResult {
  audit_id: string; url: string; status: string; overall_score: number; detected_business_types: string[]
  categories: Record<string, { passed: number; total: number; score: number }>
  total_rules: number; passed_rules: number; failed_rules: number; critical_failures: number; major_failures: number; minor_failures: number
  results: Array<{ rule_id: string; name: string; category: string; severity: string; business_types: string[]; passed: boolean; details: string }>
  scanned_at: string
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444"
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#1E293B" strokeWidth="8" />
        <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1.5s ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white">{score}</span>
        <span className="text-xs text-slate-500">/ 100</span>
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = { critical: "bg-red-500/15 text-red-400 border-red-500/30", major: "bg-amber-500/15 text-amber-400 border-amber-500/30", minor: "bg-blue-500/15 text-blue-400 border-blue-500/30" }
  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${map[severity] || map.minor}`}>{severity}</Badge>
}

export default function AuditPage() {
  const searchParams = useSearchParams()
  const [url, setUrl] = useState(searchParams.get("url") || "")
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState("")
  const [editingTypes, setEditingTypes] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [rescanning, setRescanning] = useState(false)
  const [resultFilter, setResultFilter] = useState<"failed" | "passed" | "all">("failed")

  useEffect(() => {
    const urlParam = searchParams.get("url")
    if (urlParam && !result && !scanning) { setUrl(urlParam); startAudit(urlParam) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startAudit(targetUrl?: string) {
    const scanUrl = (targetUrl || url).trim()
    if (!scanUrl) return
    setScanning(true); setError(""); setResult(null); setEditingTypes(false); setProgress(0)
    const progressTimer = setInterval(() => { setProgress((p) => Math.min(p + Math.random() * 12, 88)) }, 300)
    try {
      const data = await runAuditAction(scanUrl)
      clearInterval(progressTimer)
      if ("error" in data) { setError(data.error as string); setProgress(0) }
      else { setProgress(100); const r = data as AuditResult; setSelectedTypes(r.detected_business_types); setTimeout(() => setResult(r), 400) }
    } catch { clearInterval(progressTimer); setError("Network error. Please try again."); setProgress(0) }
    finally { setScanning(false) }
  }

  async function rescanWithTypes() {
    if (selectedTypes.length === 0 || !url.trim()) return
    setRescanning(true)
    try {
      const data = await runAuditWithTypesAction(url.trim(), selectedTypes)
      if ("error" in data) setError(data.error as string)
      else { setResult(data as AuditResult); setEditingTypes(false) }
    } catch { setError("Rescan failed.") }
    finally { setRescanning(false) }
  }

  const displayResults = result ? (resultFilter === "failed" ? result.results.filter((r) => !r.passed) : resultFilter === "passed" ? result.results.filter((r) => r.passed) : result.results) : []
  const failedCount = result?.results.filter((r) => !r.passed).length || 0
  const passedCount = result?.results.filter((r) => r.passed).length || 0

  // Build prefill link for onboarding
  const onboardingLink = result ? `/onboarding?audit=${result.audit_id}&types=${result.detected_business_types.join(",")}&url=${encodeURIComponent(result.url)}` : "/onboarding"

  return (
    <div className="min-h-screen bg-[#030712]" data-testid="audit-page">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-slate-400 mb-4">
              <Shield className="w-3.5 h-3.5 text-blue-400" /> 78+ Compliance Checks
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tighter mb-3 text-white" data-testid="audit-title">Free Website Compliance Audit</h1>
            <p className="text-slate-400">Enter your website URL for an instant SEBI, AMFI, IRDAI & PFRDA compliance score.</p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); startAudit() }} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto" data-testid="audit-form">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourwebsite.com" className="flex-1 h-12 text-base bg-slate-900 border-slate-700 text-white placeholder:text-slate-500" disabled={scanning} data-testid="audit-url-input" />
            <Button type="submit" size="lg" disabled={scanning || !url.trim()} className="gap-2 font-semibold whitespace-nowrap bg-blue-600 hover:bg-blue-500 text-white" data-testid="audit-submit-btn">
              {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><Scan className="w-4 h-4" /> Scan Now</>}
            </Button>
          </form>
          <AnimatePresence>
            {scanning && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 max-w-xl mx-auto">
                <Progress value={progress} className="h-2" data-testid="audit-progress" />
                <p className="text-xs text-slate-500 text-center mt-2">Scanning website... Checking compliance rules</p>
              </motion.div>
            )}
          </AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 max-w-xl mx-auto p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-start gap-3" data-testid="audit-error">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" /><div><p className="font-medium">Scan Failed</p><p className="opacity-80 mt-1">{error}</p></div>
            </motion.div>
          )}
        </section>

        <AnimatePresence>
          {result && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16" data-testid="audit-results">
              {/* Score + Summary */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="md:col-span-1 bg-slate-900 border-slate-800" data-testid="audit-score-card">
                  <CardContent className="pt-6 text-center">
                    <ScoreRing score={result.overall_score} />
                    <h3 className="font-bold text-lg mt-4 text-white">Compliance Score</h3>
                    <p className="text-sm text-slate-400 mt-1">{result.overall_score >= 80 ? "Good standing" : result.overall_score >= 50 ? "Needs improvement" : "Significant issues found"}</p>
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-slate-500"><Globe className="w-3.5 h-3.5" /><span className="truncate max-w-[200px]">{result.url}</span></div>
                  </CardContent>
                </Card>
                <Card className="md:col-span-2 bg-slate-900 border-slate-800">
                  <CardHeader><CardTitle className="text-base text-white">Summary</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                      {[{ l: "Passed", v: result.passed_rules, c: "text-emerald-400 bg-emerald-500/10" }, { l: "Critical", v: result.critical_failures, c: "text-red-400 bg-red-500/10" }, { l: "Major", v: result.major_failures, c: "text-amber-400 bg-amber-500/10" }, { l: "Minor", v: result.minor_failures, c: "text-blue-400 bg-blue-500/10" }].map((s) => (
                        <div key={s.l} className={`text-center p-3 rounded-xl ${s.c.split(" ")[1]}`}>
                          <div className={`text-2xl font-black ${s.c.split(" ")[0]}`}>{s.v}</div>
                          <div className={`text-xs font-semibold mt-0.5 ${s.c.split(" ")[0]} opacity-80`}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    {/* Detected Types */}
                    <div className="pt-3 border-t border-slate-800" data-testid="detected-types-section">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-medium text-slate-300">Detected Business Types</span>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-slate-400 hover:text-white" onClick={() => setEditingTypes(!editingTypes)} data-testid="edit-types-btn"><Pencil className="w-3 h-3" /> {editingTypes ? "Cancel" : "Edit"}</Button>
                      </div>
                      {!editingTypes ? (
                        <div className="flex flex-wrap gap-2">{result.detected_business_types.map((bt) => <Badge key={bt} className="text-xs bg-blue-500/15 border-blue-500/30 text-blue-400" data-testid={`detected-badge-${bt}`}>{bt}</Badge>)}</div>
                      ) : (
                        <div data-testid="type-editor">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {ALL_BIZ_TYPES.map((bt) => { const a = selectedTypes.includes(bt); return (
                              <button key={bt} onClick={() => setSelectedTypes((p) => a ? p.filter((t) => t !== bt) : [...p, bt])} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${a ? "bg-blue-500/15 border-blue-500/40 text-blue-400" : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"}`} data-testid={`type-toggle-${bt}`}>
                                {a && <CheckCircle2 className="w-3 h-3 inline mr-1" />}{bt}
                              </button>
                            )})}
                          </div>
                          <Button size="sm" onClick={rescanWithTypes} disabled={rescanning || selectedTypes.length === 0} className="gap-1.5 text-xs h-8 bg-blue-600 hover:bg-blue-500 text-white" data-testid="rescan-btn">
                            {rescanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Rescan with Updated Types
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Category Breakdown */}
              <Card className="bg-slate-900 border-slate-800 mb-8" data-testid="audit-categories">
                <CardHeader><CardTitle className="text-base text-white">Category Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(result.categories).map(([cat, data]) => (
                      <div key={cat} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-200 truncate mr-2">{cat}</span>
                          <span className={`text-sm font-bold ${data.score >= 80 ? "text-emerald-400" : data.score >= 50 ? "text-amber-400" : "text-red-400"}`}>{data.score}%</span>
                        </div>
                        <Progress value={data.score} className="h-1.5" />
                        <p className="text-xs text-slate-500 mt-1.5">{data.passed}/{data.total} checks passed</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results - Filter buttons ABOVE as standalone buttons */}
              <div className="mb-8" data-testid="audit-details">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Detailed Results</h3>
                </div>
                <div className="flex gap-2 mb-4" data-testid="audit-result-filters">
                  {([
                    { key: "failed" as const, label: "Failed", count: failedCount, icon: <XCircle className="w-3.5 h-3.5" /> },
                    { key: "passed" as const, label: "Passed", count: passedCount, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
                    { key: "all" as const, label: "All", count: result.results.length, icon: null },
                  ]).map((f) => (
                    <button key={f.key} onClick={() => setResultFilter(f.key)}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${resultFilter === f.key ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"}`}
                      data-testid={`filter-${f.key}`}>
                      {f.icon} {f.label} ({f.count})
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {displayResults.length === 0 ? <p className="text-sm text-slate-500 py-8 text-center bg-slate-900 rounded-xl border border-slate-800">{resultFilter === "failed" ? "No failures found!" : "No results"}</p> :
                  displayResults.map((r, i) => (
                    <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${r.passed ? "bg-emerald-500/5 border-emerald-500/10" : "bg-red-500/5 border-red-500/10"}`}>
                      {r.passed ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap"><span className="text-sm font-medium text-white">{r.name}</span><SeverityBadge severity={r.severity} /><span className="text-[10px] text-slate-500 font-mono">{r.rule_id}</span></div>
                        <p className="text-xs text-slate-400 mt-0.5">{r.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA - Prefilled onboarding link */}
              <div className="mt-8 text-center space-y-3">
                <p className="text-slate-400 mb-4">Ready to fix these compliance issues?</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button size="lg" variant="outline" className="gap-2 font-semibold border-slate-700 text-slate-300 hover:bg-white/5" onClick={() => generateAuditPDF(result)} data-testid="audit-pdf-btn">
                    <Download className="w-4 h-4" /> Download PDF Report
                  </Button>
                  <Link href={onboardingLink}>
                    <Button size="lg" className="gap-2 font-semibold bg-blue-600 hover:bg-blue-500 text-white" data-testid="audit-get-started-btn">
                      Build Your Compliant Site <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  )
}
