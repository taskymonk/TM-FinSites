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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Scan, CheckCircle2, XCircle, AlertTriangle, Shield, Globe, ArrowRight, Loader2, Info } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { runAudit as runAuditAction } from "@/lib/actions"

interface AuditResult {
  audit_id: string
  url: string
  status: string
  overall_score: number
  detected_business_types: string[]
  categories: Record<string, { passed: number; total: number; score: number }>
  total_rules: number
  passed_rules: number
  failed_rules: number
  critical_failures: number
  major_failures: number
  minor_failures: number
  results: Array<{
    rule_id: string; name: string; category: string; severity: string
    business_types: string[]; passed: boolean; details: string
  }>
  scanned_at: string
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-500" : score >= 50 ? "text-yellow-500" : "text-red-500"
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className={color}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-black ${color}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    critical: { cls: "bg-red-500/15 text-red-500 border-red-500/30", label: "Critical" },
    major: { cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30", label: "Major" },
    minor: { cls: "bg-blue-500/15 text-blue-500 border-blue-500/30", label: "Minor" },
  }
  const s = map[severity] || map.minor
  return <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${s.cls}`}>{s.label}</Badge>
}

export default function AuditPage() {
  const searchParams = useSearchParams()
  const [url, setUrl] = useState(searchParams.get("url") || "")
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const urlParam = searchParams.get("url")
    if (urlParam && !result && !scanning) {
      setUrl(urlParam)
      startAudit(urlParam)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startAudit(targetUrl?: string) {
    const scanUrl = (targetUrl || url).trim()
    if (!scanUrl) return
    setScanning(true)
    setError("")
    setResult(null)
    setProgress(0)

    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 12, 88))
    }, 300)

    try {
      const data = await runAuditAction(scanUrl)
      clearInterval(progressTimer)

      if ("error" in data) {
        setError(data.error as string)
        setProgress(0)
      } else {
        setProgress(100)
        setTimeout(() => setResult(data as AuditResult), 400)
      }
    } catch {
      clearInterval(progressTimer)
      setError("Network error. Please try again.")
      setProgress(0)
    } finally {
      setScanning(false)
    }
  }

  const failedResults = result?.results.filter((r) => !r.passed) || []
  const passedResults = result?.results.filter((r) => r.passed) || []

  return (
    <div className="min-h-screen" data-testid="audit-page">
      <Navbar />
      <div className="pt-20 pb-16">
        {/* Input Section */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-card/30 text-xs font-medium text-muted-foreground mb-4">
              <Shield className="w-3.5 h-3.5 text-primary" /> 148+ Compliance Checks
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 font-[family-name:var(--font-heading)]" data-testid="audit-title">
              Free Website Compliance Audit
            </h1>
            <p className="text-muted-foreground">Enter your website URL for an instant SEBI, AMFI, IRDAI & PFRDA compliance score.</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); startAudit() }}
            className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto" data-testid="audit-form">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourwebsite.com"
              className="flex-1 h-12 text-base" disabled={scanning} data-testid="audit-url-input" />
            <Button type="submit" size="lg" disabled={scanning || !url.trim()} className="gap-2 font-semibold whitespace-nowrap" data-testid="audit-submit-btn">
              {scanning ? <><Loader2 className="w-4 h-4 animate-spin" /> Scanning...</> : <><Scan className="w-4 h-4" /> Scan Now</>}
            </Button>
          </form>

          {/* Progress Bar */}
          <AnimatePresence>
            {scanning && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 max-w-xl mx-auto">
                <Progress value={progress} className="h-2" data-testid="audit-progress" />
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Scanning website... Checking compliance rules across all categories
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-6 max-w-xl mx-auto p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive flex items-start gap-3" data-testid="audit-error">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div><p className="font-medium">Scan Failed</p><p className="text-destructive/80 mt-1">{error}</p></div>
            </motion.div>
          )}
        </section>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.section initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
              className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16" data-testid="audit-results">

              {/* Score Overview */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <Card className="md:col-span-1 glass" data-testid="audit-score-card">
                  <CardContent className="pt-6 text-center">
                    <ScoreRing score={result.overall_score} />
                    <h3 className="font-bold text-lg mt-4">Compliance Score</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {result.overall_score >= 80 ? "Good standing" : result.overall_score >= 50 ? "Needs improvement" : "Significant issues found"}
                    </p>
                    <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground">
                      <Globe className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[200px]">{result.url}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 glass">
                  <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                      <div className="text-center p-3 rounded-xl bg-green-500/10">
                        <div className="text-2xl font-black text-green-500">{result.passed_rules}</div>
                        <div className="text-xs text-muted-foreground">Passed</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-red-500/10">
                        <div className="text-2xl font-black text-red-500">{result.critical_failures}</div>
                        <div className="text-xs text-muted-foreground">Critical</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-yellow-500/10">
                        <div className="text-2xl font-black text-yellow-500">{result.major_failures}</div>
                        <div className="text-xs text-muted-foreground">Major</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-blue-500/10">
                        <div className="text-2xl font-black text-blue-500">{result.minor_failures}</div>
                        <div className="text-xs text-muted-foreground">Minor</div>
                      </div>
                    </div>

                    {result.detected_business_types.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">Detected:</span>
                        {result.detected_business_types.map((bt) => (
                          <Badge key={bt} variant="outline" className="text-xs bg-primary/10 border-primary/30 text-primary">{bt}</Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Category Breakdown */}
              <Card className="glass mb-8" data-testid="audit-categories">
                <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(result.categories).map(([cat, data]) => (
                      <div key={cat} className="p-4 rounded-xl bg-secondary/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium truncate mr-2">{cat}</span>
                          <span className={`text-sm font-bold ${data.score >= 80 ? "text-green-500" : data.score >= 50 ? "text-yellow-500" : "text-red-500"}`}>{data.score}%</span>
                        </div>
                        <Progress value={data.score} className="h-1.5" />
                        <p className="text-xs text-muted-foreground mt-1.5">{data.passed}/{data.total} checks passed</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Results */}
              <Card className="glass" data-testid="audit-details">
                <CardHeader><CardTitle className="text-base">Detailed Results</CardTitle></CardHeader>
                <CardContent>
                  <Tabs defaultValue="failed">
                    <TabsList className="mb-4" data-testid="audit-tabs">
                      <TabsTrigger value="failed" className="gap-1.5 text-xs">
                        <XCircle className="w-3.5 h-3.5" /> Failed ({failedResults.length})
                      </TabsTrigger>
                      <TabsTrigger value="passed" className="gap-1.5 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Passed ({passedResults.length})
                      </TabsTrigger>
                      <TabsTrigger value="all" className="gap-1.5 text-xs">
                        <Info className="w-3.5 h-3.5" /> All ({result.results.length})
                      </TabsTrigger>
                    </TabsList>

                    {(["failed", "passed", "all"] as const).map((tab) => {
                      const items = tab === "failed" ? failedResults : tab === "passed" ? passedResults : result.results
                      return (
                        <TabsContent key={tab} value={tab} className="space-y-2">
                          {items.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-8 text-center">
                              {tab === "failed" ? "No failures found!" : "No results"}
                            </p>
                          ) : items.map((r, i) => (
                            <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${r.passed ? "bg-green-500/5" : "bg-red-500/5"}`}>
                              {r.passed ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{r.name}</span>
                                  <SeverityBadge severity={r.severity} />
                                  <span className="text-[10px] text-muted-foreground font-mono">{r.rule_id}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{r.details}</p>
                              </div>
                            </div>
                          ))}
                        </TabsContent>
                      )
                    })}
                  </Tabs>
                </CardContent>
              </Card>

              {/* CTA */}
              <div className="mt-8 text-center">
                <p className="text-muted-foreground mb-4">Ready to fix these compliance issues?</p>
                <Link href="/plans">
                  <Button size="lg" className="gap-2 font-semibold" data-testid="audit-get-started-btn">
                    Build Your Compliant Site <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  )
}
