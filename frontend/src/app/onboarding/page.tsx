"use client"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, ArrowRight, ArrowLeft, Loader2, Shield, BarChart3, FileCheck, TrendingUp, Layers, Zap, Users, Upload, Palette, Send } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { createWizardSession, updateWizardSession, submitWizard, getWizardSession, findSessionsByEmail } from "@/lib/wizard-actions"

const STEPS = ["Business Type", "Registration", "Services", "Design", "Review"]

interface ResumeSession {
  sessionId: string
  businessTypes: string[]
  currentStep: number
  contactName: string
  updatedAt: string
}

const BIZ_TYPES = [
  { id: "MFD", name: "Mutual Fund Distributor", reg: "SEBI / AMFI", icon: BarChart3 },
  { id: "Insurance", name: "Insurance Agent / Broker", reg: "IRDAI", icon: Shield },
  { id: "RIA", name: "Investment Adviser (RIA)", reg: "SEBI", icon: FileCheck },
  { id: "PMS", name: "Portfolio Management", reg: "SEBI", icon: TrendingUp },
  { id: "Stock Broker", name: "Stock Broker / AP", reg: "SEBI / NSE / BSE", icon: Layers },
  { id: "SIF", name: "Specialised Investment Fund", reg: "SEBI / MF", icon: Zap },
  { id: "NPS", name: "NPS Distributor", reg: "PFRDA", icon: Users },
]

const REG_FIELDS: Record<string, Array<{ key: string; label: string; placeholder: string; required?: boolean }>> = {
  MFD: [
    { key: "arn_number", label: "AMFI ARN Number", placeholder: "ARN-12345", required: true },
    { key: "sebi_reg", label: "SEBI Registration (if any)", placeholder: "INZ000123456" },
    { key: "entity_name", label: "Entity / Firm Name", placeholder: "ABC Financial Services", required: true },
  ],
  Insurance: [
    { key: "irdai_license", label: "IRDAI License Number", placeholder: "License No.", required: true },
    { key: "entity_name", label: "Entity / Firm Name", placeholder: "ABC Insurance Brokers", required: true },
    { key: "insurance_type", label: "Type (Agent/Broker/Corporate Agent)", placeholder: "Insurance Agent" },
  ],
  RIA: [
    { key: "sebi_reg", label: "SEBI RIA Registration Number", placeholder: "INA000012345", required: true },
    { key: "entity_name", label: "Entity / Firm Name", placeholder: "ABC Advisory", required: true },
    { key: "basl_membership", label: "BASL Membership Number", placeholder: "BASL-..." },
  ],
  PMS: [
    { key: "sebi_reg", label: "SEBI PMS Registration Number", placeholder: "INP000012345", required: true },
    { key: "entity_name", label: "Entity / Firm Name", placeholder: "ABC Capital", required: true },
    { key: "pms_type", label: "Type (Discretionary/Non-Discretionary)", placeholder: "Discretionary" },
  ],
  "Stock Broker": [
    { key: "sebi_reg", label: "SEBI Registration Number", placeholder: "INZ000123456", required: true },
    { key: "entity_name", label: "Entity / Firm Name", placeholder: "ABC Securities", required: true },
    { key: "exchange_membership", label: "Exchange Membership (NSE/BSE)", placeholder: "NSE: 12345" },
  ],
  SIF: [
    { key: "sebi_reg", label: "SEBI Registration Number", placeholder: "...", required: true },
    { key: "entity_name", label: "Fund Name", placeholder: "ABC Specialised Fund", required: true },
    { key: "nism_cert", label: "NISM-XXI-A Certification", placeholder: "NISM-..." },
  ],
  NPS: [
    { key: "pfrda_reg", label: "PFRDA Registration Number", placeholder: "POP-...", required: true },
    { key: "entity_name", label: "Entity / Firm Name", placeholder: "ABC NPS Services", required: true },
    { key: "pop_type", label: "POP / POP-SP", placeholder: "Point of Presence" },
  ],
}

const SERVICE_OPTIONS: Record<string, string[]> = {
  MFD: ["SIP Planning", "Goal-Based Investing", "Mutual Fund Selection", "Portfolio Review", "Tax-Saving Funds", "Retirement Planning", "Child Education Planning", "Wealth Management"],
  Insurance: ["Life Insurance", "Health Insurance", "Motor Insurance", "Term Plans", "ULIPs", "Corporate Insurance", "Group Insurance", "Claims Assistance"],
  RIA: ["Financial Planning", "Investment Advisory", "Portfolio Construction", "Risk Assessment", "Retirement Planning", "Tax Planning", "Estate Planning", "NRI Advisory"],
  PMS: ["Equity PMS", "Multi-Asset PMS", "Debt PMS", "Thematic Portfolios", "Custom Mandates", "Performance Reporting", "Tax Harvesting"],
  "Stock Broker": ["Equity Trading", "F&O Trading", "Commodity Trading", "Currency Trading", "IPO Services", "Margin Funding", "Research & Advisory", "Algo Trading"],
  SIF: ["SIF Advisory", "Risk Assessment", "NAV Reporting", "Minimum Investment Guidance", "Risk Band Disclosure"],
  NPS: ["NPS Account Opening", "Tier I & II Accounts", "Corporate NPS", "Fund Selection", "Withdrawal Assistance", "Pension Planning"],
}

const COLOR_PRESETS = [
  { name: "Ocean Teal", primary: "#0891b2", accent: "#06b6d4" },
  { name: "Royal Blue", primary: "#2563eb", accent: "#3b82f6" },
  { name: "Forest Green", primary: "#059669", accent: "#10b981" },
  { name: "Sunset Orange", primary: "#ea580c", accent: "#f97316" },
  { name: "Purple Haze", primary: "#7c3aed", accent: "#8b5cf6" },
  { name: "Rose Gold", primary: "#be123c", accent: "#f43f5e" },
]

type WizardData = {
  registration: Record<string, Record<string, string>>
  services: Record<string, string[]>
  design: { colorPreset: string; logoUrl: string; tagline: string; style: string }
}

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const [resumeEmail, setResumeEmail] = useState("")
  const [resumeSessions, setResumeSessions] = useState<ResumeSession[]>([])
  const [resumeLoading, setResumeLoading] = useState(false)

  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [contact, setContact] = useState({ name: "", email: "", phone: "", company: "" })
  const [wizardData, setWizardData] = useState<WizardData>({
    registration: {},
    services: {},
    design: { colorPreset: "Ocean Teal", logoUrl: "", tagline: "", style: "modern" },
  })

  useEffect(() => {
    async function init() {
      const resumeId = searchParams.get("session")
      if (resumeId) {
        const session = await getWizardSession(resumeId)
        if (session) {
          setSessionId(resumeId)
          setStep(session.current_step || 1)
          setSelectedTypes(session.business_types || [])
          setContact((session.contact || {}) as typeof contact)
          setWizardData((session.data || wizardData) as WizardData)
          setLoading(false)
          return
        }
      }

      const planId = searchParams.get("plan") || undefined
      const auditId = searchParams.get("audit") || undefined
      const types = searchParams.get("types")?.split(",").filter(Boolean) || []
      const auditUrl = searchParams.get("url") || ""

      const result = await createWizardSession({ planId, auditId, businessTypes: types })
      if ("sessionId" in result) {
        setSessionId(result.sessionId || null)
        if (types.length) setSelectedTypes(types)
        if (auditUrl) {
          setWizardData((prev) => ({
            ...prev,
            design: { ...prev.design, logoUrl: auditUrl },
          }))
        }
      }
      setLoading(false)
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveAndGo(nextStep: number) {
    if (!sessionId) return
    await updateWizardSession(sessionId, {
      currentStep: nextStep,
      businessTypes: selectedTypes,
      data: wizardData as unknown as Record<string, unknown>,
      contact: contact as unknown as Record<string, unknown>,
    })
    setStep(nextStep)
  }

  function toggleType(id: string) {
    setSelectedTypes((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id])
  }

  function updateReg(typeId: string, key: string, value: string) {
    setWizardData((prev) => ({
      ...prev,
      registration: { ...prev.registration, [typeId]: { ...(prev.registration[typeId] || {}), [key]: value } },
    }))
  }

  function toggleService(typeId: string, service: string) {
    setWizardData((prev) => {
      const current = prev.services[typeId] || []
      const next = current.includes(service) ? current.filter((s) => s !== service) : [...current, service]
      return { ...prev, services: { ...prev.services, [typeId]: next } }
    })
  }

  async function lookupResumeSessions() {
    if (!resumeEmail.trim()) return
    setResumeLoading(true)
    const sessions = await findSessionsByEmail(resumeEmail.trim())
    setResumeSessions(sessions)
    setResumeLoading(false)
    if (sessions.length === 0) toast.info("No incomplete sessions found for this email.")
  }

  async function resumeSession(sid: string) {
    setShowResume(false)
    setLoading(true)
    const session = await getWizardSession(sid)
    if (session) {
      setSessionId(sid)
      setStep(session.current_step || 1)
      setSelectedTypes(session.business_types || [])
      setContact((session.contact || {}) as typeof contact)
      setWizardData((session.data || wizardData) as WizardData)
      toast.success("Session restored! Continue where you left off.")
    } else {
      toast.error("Could not load session.")
    }
    setLoading(false)
  }

  async function handleSubmit() {
    if (!sessionId) return
    setSubmitting(true)
    await updateWizardSession(sessionId, {
      currentStep: 5,
      businessTypes: selectedTypes,
      data: wizardData as unknown as Record<string, unknown>,
      contact: contact as unknown as Record<string, unknown>,
      status: "completed",
    })

    const result = await submitWizard(sessionId)
    setSubmitting(false)

    if ("error" in result) {
      toast.error(result.error || "Submission failed")
      return
    }
    toast.success("Submission successful!")
    router.push(`/confirmation/${result.referenceNumber}`)
  }

  const progressPct = (step / STEPS.length) * 100

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#030712]" data-testid="onboarding-page">
      <Navbar />
      <div className="pt-20 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {STEPS.map((s, i) => (
                <div key={s} className={`flex items-center gap-1.5 text-xs font-medium ${i + 1 <= step ? "text-blue-400" : "text-slate-400"}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${i + 1 < step ? "bg-primary text-blue-400-foreground" : i + 1 === step ? "bg-blue-600/15 text-blue-400 border border-blue-500" : "bg-slate-800 text-slate-400"}`}>
                    {i + 1 < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{s}</span>
                </div>
              ))}
            </div>
            <Progress value={progressPct} className="h-1.5" data-testid="wizard-progress" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>

              {/* STEP 1: Business Type */}
              {step === 1 && (
                <Card className="bg-slate-900 border border-slate-800 rounded-2xl" data-testid="step-1">
                  <CardHeader>
                    <CardTitle className="text-xl">Select Your Business Type(s)</CardTitle>
                    <p className="text-sm text-slate-400">Choose all that apply. We&apos;ll customize your website for each.</p>
                  </CardHeader>
                  <CardContent>
                    {/* Audit Prefill Notice */}
                    {searchParams.get("audit") && selectedTypes.length > 0 && !showResume && (
                      <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2" data-testid="prefill-banner">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <p className="text-xs text-emerald-300">Business types prefilled from your audit. {selectedTypes.length} type{selectedTypes.length > 1 ? "s" : ""} detected: <span className="font-medium text-white">{selectedTypes.join(", ")}</span></p>
                      </div>
                    )}

                    {/* Resume Banner */}
                    {!showResume && step === 1 && !searchParams.get("audit") && (
                      <div className="mb-5 p-3 rounded-xl bg-primary/5 border border-blue-500/20 flex items-center justify-between" data-testid="resume-banner">
                        <p className="text-xs text-slate-400">Already started? <span className="text-white font-medium">Resume where you left off.</span></p>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-blue-400 hover:text-blue-400" onClick={() => setShowResume(true)} data-testid="resume-open-btn">Resume Wizard</Button>
                      </div>
                    )}

                    {showResume && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-5 p-4 rounded-xl bg-slate-900 border border-slate-800" data-testid="resume-panel">
                        <h4 className="text-sm font-medium mb-2">Find Your Session</h4>
                        <div className="flex gap-2 mb-3">
                          <Input value={resumeEmail} onChange={(e) => setResumeEmail(e.target.value)} placeholder="Enter your email" className="bg-slate-800 text-sm" data-testid="resume-email-input"
                            onKeyDown={(e) => e.key === "Enter" && lookupResumeSessions()} />
                          <Button size="sm" onClick={lookupResumeSessions} disabled={resumeLoading || !resumeEmail.trim()} className="text-xs shrink-0" data-testid="resume-lookup-btn">
                            {resumeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Look Up"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setShowResume(false); setResumeSessions([]) }} className="text-xs shrink-0 text-slate-400">Cancel</Button>
                        </div>
                        {resumeSessions.length > 0 && (
                          <div className="space-y-2" data-testid="resume-sessions-list">
                            {resumeSessions.map((s) => (
                              <button key={s.sessionId} onClick={() => resumeSession(s.sessionId)}
                                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-800 hover:border-blue-500/30 transition-all text-left"
                                data-testid={`resume-session-${s.sessionId}`}>
                                <div>
                                  <div className="text-sm font-medium text-white">{s.contactName || "Unnamed"}</div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {s.businessTypes.map((bt) => <Badge key={bt} className="text-[9px] px-1.5 py-0 bg-blue-600/10 text-blue-400 border-blue-500/30">{bt}</Badge>)}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-400">Step {s.currentStep} of 5</div>
                                  <div className="text-[10px] text-slate-400">{new Date(s.updatedAt).toLocaleDateString()}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-3 mb-6">
                      {BIZ_TYPES.map((bt) => {
                        const active = selectedTypes.includes(bt.id)
                        return (
                          <button key={bt.id} onClick={() => toggleType(bt.id)}
                            className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${active ? "border-blue-500 bg-blue-600/10" : "border-slate-800 hover:border-blue-500/30 bg-slate-900"}`}
                            data-testid={`biz-type-${bt.id}`}>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? "bg-blue-600/15" : "bg-slate-800"}`}>
                              <bt.icon className={`w-5 h-5 ${active ? "text-blue-400" : "text-slate-400"}`} />
                            </div>
                            <div>
                              <div className={`text-sm font-medium ${active ? "text-white" : "text-slate-400"}`}>{bt.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{bt.reg}</div>
                            </div>
                            {active && <CheckCircle2 className="w-5 h-5 text-blue-400 ml-auto" />}
                          </button>
                        )
                      })}
                    </div>

                    {/* Contact info */}
                    <div className="border-t border-slate-800 pt-5 mt-2">
                      <h4 className="text-sm font-medium mb-3">Your Contact Details</h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div><Label className="text-xs">Full Name *</Label><Input value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} placeholder="John Doe" className="bg-slate-900" data-testid="contact-name" /></div>
                        <div><Label className="text-xs">Email *</Label><Input type="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} placeholder="john@example.com" className="bg-slate-900" data-testid="contact-email" /></div>
                        <div><Label className="text-xs">Phone</Label><Input value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} placeholder="+91 98765 43210" className="bg-slate-900" data-testid="contact-phone" /></div>
                        <div><Label className="text-xs">Company</Label><Input value={contact.company} onChange={(e) => setContact((c) => ({ ...c, company: e.target.value }))} placeholder="ABC Financial" className="bg-slate-900" data-testid="contact-company" /></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* STEP 2: Registration Details */}
              {step === 2 && (
                <Card className="bg-slate-900 border border-slate-800 rounded-2xl" data-testid="step-2">
                  <CardHeader>
                    <CardTitle className="text-xl">Registration & Compliance Details</CardTitle>
                    <p className="text-sm text-slate-400">Provide your regulatory registration numbers for each business type.</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedTypes.map((typeId) => (
                      <div key={typeId} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800/50">
                        <Badge className="mb-3 bg-blue-600/10 text-blue-400 border-blue-500/30 text-xs">{typeId}</Badge>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {(REG_FIELDS[typeId] || []).map((field) => (
                            <div key={field.key}>
                              <Label className="text-xs">{field.label}{field.required && " *"}</Label>
                              <Input value={wizardData.registration[typeId]?.[field.key] || ""} onChange={(e) => updateReg(typeId, field.key, e.target.value)}
                                placeholder={field.placeholder} className="bg-slate-900" data-testid={`reg-${typeId}-${field.key}`} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* STEP 3: Services */}
              {step === 3 && (
                <Card className="bg-slate-900 border border-slate-800 rounded-2xl" data-testid="step-3">
                  <CardHeader>
                    <CardTitle className="text-xl">Services & Offerings</CardTitle>
                    <p className="text-sm text-slate-400">Select the services you offer for each business type.</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedTypes.map((typeId) => (
                      <div key={typeId} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800/50">
                        <Badge className="mb-3 bg-blue-600/10 text-blue-400 border-blue-500/30 text-xs">{typeId}</Badge>
                        <div className="flex flex-wrap gap-2">
                          {(SERVICE_OPTIONS[typeId] || []).map((svc) => {
                            const active = (wizardData.services[typeId] || []).includes(svc)
                            return (
                              <button key={svc} onClick={() => toggleService(typeId, svc)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${active ? "bg-blue-600/10 border-blue-500/40 text-blue-400" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-blue-500/30"}`}
                                data-testid={`svc-${typeId}-${svc.replace(/\s+/g, "-")}`}>
                                {active && <CheckCircle2 className="w-3 h-3 inline mr-1" />}{svc}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* STEP 4: Design */}
              {step === 4 && (
                <Card className="bg-slate-900 border border-slate-800 rounded-2xl" data-testid="step-4">
                  <CardHeader>
                    <CardTitle className="text-xl">Design Preferences</CardTitle>
                    <p className="text-sm text-slate-400">Choose your website&apos;s visual style.</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <Label className="text-xs mb-2 block">Color Scheme</Label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {COLOR_PRESETS.map((cp) => (
                          <button key={cp.name} onClick={() => setWizardData((d) => ({ ...d, design: { ...d.design, colorPreset: cp.name } }))}
                            className={`p-3 rounded-xl border text-center transition-all ${wizardData.design.colorPreset === cp.name ? "border-blue-500 ring-1 ring-primary/30" : "border-slate-800 hover:border-blue-500/30"}`}
                            data-testid={`color-${cp.name.replace(/\s+/g, "-")}`}>
                            <div className="flex gap-1 justify-center mb-1.5">
                              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cp.primary }} />
                              <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cp.accent }} />
                            </div>
                            <span className="text-[10px] text-slate-400">{cp.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs">Website Tagline</Label>
                        <Input value={wizardData.design.tagline} onChange={(e) => setWizardData((d) => ({ ...d, design: { ...d.design, tagline: e.target.value } }))}
                          placeholder="Your trusted financial partner" className="bg-slate-900" data-testid="design-tagline" />
                      </div>
                      <div>
                        <Label className="text-xs">Style Preference</Label>
                        <div className="flex gap-2 mt-1.5">
                          {["modern", "classic", "minimal"].map((s) => (
                            <button key={s} onClick={() => setWizardData((d) => ({ ...d, design: { ...d.design, style: s } }))}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border capitalize transition-all ${wizardData.design.style === s ? "bg-blue-600/10 border-blue-500/40 text-blue-400" : "bg-slate-900 border-slate-800 text-slate-400"}`}
                              data-testid={`style-${s}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Logo URL (optional)</Label>
                      <div className="flex gap-2 mt-1.5">
                        <Input value={wizardData.design.logoUrl} onChange={(e) => setWizardData((d) => ({ ...d, design: { ...d.design, logoUrl: e.target.value } }))}
                          placeholder="https://yourdomain.com/logo.png" className="bg-slate-900 flex-1" data-testid="design-logo" />
                        <Button variant="outline" size="sm" className="gap-1 text-xs shrink-0" disabled><Upload className="w-3 h-3" /> Upload</Button>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">File upload coming soon. Paste a URL for now.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* STEP 5: Review */}
              {step === 5 && (
                <Card className="bg-slate-900 border border-slate-800 rounded-2xl" data-testid="step-5">
                  <CardHeader>
                    <CardTitle className="text-xl">Review & Submit</CardTitle>
                    <p className="text-sm text-slate-400">Review your details before submitting.</p>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Contact */}
                    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800/50">
                      <h4 className="text-sm font-medium mb-2">Contact</h4>
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div><span className="text-slate-400">Name:</span> <span className="text-white">{contact.name || "—"}</span></div>
                        <div><span className="text-slate-400">Email:</span> <span className="text-white">{contact.email || "—"}</span></div>
                        <div><span className="text-slate-400">Phone:</span> <span className="text-white">{contact.phone || "—"}</span></div>
                        <div><span className="text-slate-400">Company:</span> <span className="text-white">{contact.company || "—"}</span></div>
                      </div>
                    </div>

                    {/* Types */}
                    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800/50">
                      <h4 className="text-sm font-medium mb-2">Business Types</h4>
                      <div className="flex flex-wrap gap-2">{selectedTypes.map((t) => <Badge key={t} className="bg-blue-600/10 text-blue-400 border-blue-500/30 text-xs">{t}</Badge>)}</div>
                    </div>

                    {/* Registration */}
                    {selectedTypes.map((typeId) => (
                      <div key={typeId} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800/50">
                        <h4 className="text-sm font-medium mb-2">{typeId} — Registration</h4>
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          {Object.entries(wizardData.registration[typeId] || {}).filter(([,v]) => v).map(([k, v]) => (
                            <div key={k}><span className="text-slate-400 capitalize">{k.replace(/_/g, " ")}:</span> <span className="text-white">{v}</span></div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* Services */}
                    {selectedTypes.map((typeId) => (wizardData.services[typeId]?.length || 0) > 0 && (
                      <div key={typeId} className="p-4 rounded-xl bg-slate-800/40 border border-slate-800/50">
                        <h4 className="text-sm font-medium mb-2">{typeId} — Services</h4>
                        <div className="flex flex-wrap gap-1.5">{(wizardData.services[typeId] || []).map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div>
                      </div>
                    ))}

                    {/* Design */}
                    <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800/50">
                      <h4 className="text-sm font-medium mb-2">Design</h4>
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div><span className="text-slate-400">Color:</span> <span className="text-white">{wizardData.design.colorPreset}</span></div>
                        <div><span className="text-slate-400">Style:</span> <span className="text-white capitalize">{wizardData.design.style}</span></div>
                        {wizardData.design.tagline && <div className="sm:col-span-2"><span className="text-slate-400">Tagline:</span> <span className="text-white">{wizardData.design.tagline}</span></div>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={() => saveAndGo(step - 1)} disabled={step === 1} className="gap-1.5" data-testid="wizard-prev">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>

            {step < 5 ? (
              <Button onClick={() => saveAndGo(step + 1)}
                disabled={step === 1 && (selectedTypes.length === 0 || !contact.name || !contact.email)}
                className="gap-1.5" data-testid="wizard-next">
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="gap-1.5" data-testid="wizard-submit">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit
              </Button>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
