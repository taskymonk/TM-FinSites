"use client"
import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, useInView } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Shield, BarChart3, Scan, Layers, Users, Zap, ArrowRight, CheckCircle2, ChevronRight, TrendingUp, FileCheck, Palette, Globe } from "lucide-react"

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

function AnimSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  return <motion.div ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className={className}>{children}</motion.div>
}

function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  useEffect(() => {
    if (!inView) return
    let start = 0; const step = Math.max(1, Math.floor(target / 40))
    const timer = setInterval(() => { start += step; if (start >= target) { setCount(target); clearInterval(timer) } else setCount(start) }, 30)
    return () => clearInterval(timer)
  }, [inView, target])
  return <span ref={ref}>{count}{suffix}</span>
}

const BIZ_TYPES = [
  { name: "Mutual Fund Distributor", short: "MFD", reg: "SEBI / AMFI", icon: BarChart3, color: "from-blue-500 to-cyan-400" },
  { name: "Insurance Agent / Broker", short: "Insurance", reg: "IRDAI", icon: Shield, color: "from-emerald-500 to-green-400" },
  { name: "Investment Adviser", short: "RIA", reg: "SEBI", icon: FileCheck, color: "from-teal-500 to-cyan-400" },
  { name: "Portfolio Management", short: "PMS", reg: "SEBI", icon: TrendingUp, color: "from-violet-500 to-purple-400" },
  { name: "Stock Broker / AP", short: "Stock Broker", reg: "SEBI / NSE / BSE", icon: Layers, color: "from-orange-500 to-amber-400" },
  { name: "Specialised Investment Fund", short: "SIF", reg: "SEBI / MF", icon: Zap, color: "from-pink-500 to-rose-400" },
  { name: "NPS Distributor", short: "NPS", reg: "PFRDA", icon: Users, color: "from-indigo-500 to-blue-400" },
]

const FEATURES = [
  { icon: Scan, title: "Smart Compliance Audit", desc: "Scan any existing website instantly. Get a detailed compliance scorecard with 148+ regulatory checks." },
  { icon: Layers, title: "Guided Onboarding Wizard", desc: "Step-by-step data collection with smart validation for all 7 business types and their combinations." },
  { icon: Shield, title: "Auto-Compliance Engine", desc: "Every disclaimer, disclosure, and regulatory requirement baked in automatically. Zero guesswork." },
  { icon: Users, title: "7 Business Types", desc: "MFD, Insurance, RIA, PMS, Stock Broker/AP, SIF, NPS Distributor including valid combinations." },
  { icon: Palette, title: "Modern Design", desc: "Futuristic, responsive, animated websites that build trust and convert prospects into clients." },
  { icon: Globe, title: "Prefill Intelligence", desc: "Already have a website? We scan it and prefill your data automatically into the onboarding." },
]

const FAQ = [
  { q: "Which regulators' requirements do you cover?", a: "We cover SEBI, AMFI, IRDAI, and PFRDA regulations comprehensively including all mandatory disclosures, disclaimers, and registration displays." },
  { q: "Can I have MFD + RIA on the same website?", a: "Yes, with mandatory SIDD compliance. We automatically segregate advisory and distribution sections with proper disclosures." },
  { q: "Do you support Stock Brokers and NPS Distributors?", a: "Yes. We support SEBI-registered stock brokers, authorized persons (APs), and PFRDA-registered NPS distributors with full regulatory compliance." },
  { q: "How long does website setup take?", a: "Depending on your plan: Starter (7 days), Professional (5 days), Enterprise (3 days) after complete data submission." },
  { q: "What about the new SIF framework?", a: "We support SEBI's SIF framework (effective April 2025) with NISM-XXI-A verification, risk band disclosures, and minimum investment displays." },
  { q: "Is my data secure?", a: "All data is encrypted in transit and at rest. We comply with DPDPA 2023 requirements." },
]

export default function LandingPage() {
  const router = useRouter()
  const [auditUrl, setAuditUrl] = useState("")
  const [plans, setPlans] = useState<Array<{ plan_id: string; name: string; price_display: string; description: string; features: string[]; is_popular: boolean; is_contact_us: boolean }>>([])

  useEffect(() => { fetch("/api/plans").then(r => r.json()).then(setPlans).catch(() => {}) }, [])

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* HERO */}
      <section className="relative min-h-screen flex items-center hero-mesh overflow-hidden" data-testid="hero-section">
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary/10 rounded-full blur-[100px] animate-pulse-glow" />
        <div className="absolute bottom-20 left-[5%] w-96 h-96 bg-accent/8 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 backdrop-blur-sm bg-card/30 text-xs font-medium text-muted-foreground mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              SEBI &middot; AMFI &middot; IRDAI &middot; PFRDA Compliant
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6 font-[family-name:var(--font-heading)]">
              Compliant Websites for India&apos;s{" "}
              <span className="text-gradient">Financial Professionals</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-8 leading-relaxed">
              Every SEBI, AMFI, IRDAI &amp; PFRDA regulation built right in. Launch your professional, regulator-aligned website in days. 148+ compliance checks. 7 business types.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/audit"><Button size="lg" className="gap-2 font-semibold text-base px-6" data-testid="hero-free-audit"><Scan className="w-4 h-4" /> Free Compliance Audit</Button></Link>
              <Link href="/plans"><Button size="lg" variant="outline" className="gap-2 font-semibold text-base px-6" data-testid="hero-get-started">Build Your Site <ArrowRight className="w-4 h-4" /></Button></Link>
            </div>
            <div className="flex flex-wrap items-center gap-6 mt-10 text-sm text-muted-foreground">
              {["7 Business Types", "148+ Compliance Checks", "Combination Rules"].map((t) => (
                <span key={t} className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" />{t}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="py-20 lg:py-28 border-t border-border/50">
        <AnimSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-sm uppercase tracking-[0.2em] font-medium text-primary mb-3">Why Compliance Matters</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight font-[family-name:var(--font-heading)]">The Regulatory Gap Is Real</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[{ num: 67, suffix: "%", label: "of financial advisor websites violate at least one regulation" },
              { num: 25, suffix: "L+", label: "in potential penalties for non-compliant disclosures", prefix: "INR " },
              { num: 90, suffix: "%", label: "of prospects check your website before engaging" }
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp} className="text-center p-8 rounded-2xl glass glow-primary hover:-translate-y-1 transition-transform">
                <div className="text-4xl sm:text-5xl font-black text-gradient mb-2 font-[family-name:var(--font-heading)]">
                  {s.prefix || ""}<Counter target={s.num} suffix={s.suffix} />
                </div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </AnimSection>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 lg:py-28 bg-secondary/30">
        <AnimSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-sm uppercase tracking-[0.2em] font-medium text-primary mb-3">Platform Capabilities</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight font-[family-name:var(--font-heading)]">Everything You Need to Go Compliant</h2>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div key={i} variants={fadeUp} className="group p-6 rounded-2xl glass hover:glow-primary hover:-translate-y-1 transition-all duration-300 cursor-default">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 font-[family-name:var(--font-heading)]">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </AnimSection>
      </section>

      {/* BUSINESS TYPES */}
      <section className="py-20 lg:py-28">
        <AnimSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-sm uppercase tracking-[0.2em] font-medium text-primary mb-3">Business Types</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight font-[family-name:var(--font-heading)]">All 7 Financial Professional Categories</h2>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BIZ_TYPES.map((bt, i) => (
              <motion.div key={i} variants={fadeUp} className="group relative p-6 rounded-2xl glass overflow-hidden hover:-translate-y-1 hover:glow-primary transition-all duration-300">
                <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${bt.color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${bt.color} flex items-center justify-center mb-4 opacity-80 group-hover:opacity-100`}>
                  <bt.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold mb-1 font-[family-name:var(--font-heading)]">{bt.name}</h3>
                <p className="text-xs text-muted-foreground font-mono">{bt.reg}</p>
              </motion.div>
            ))}
          </div>
        </AnimSection>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-secondary/30">
        <AnimSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-sm uppercase tracking-[0.2em] font-medium text-primary mb-3">Simple Process</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight font-[family-name:var(--font-heading)]">Three Steps to Your Compliant Website</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {[{ step: "01", title: "Audit Your Site", desc: "Enter your URL or start fresh. 148+ compliance checks detect your business type automatically.", icon: Scan },
              { step: "02", title: "Complete the Wizard", desc: "Guided data collection with smart validation. Prefilled data from audit. 7 business types supported.", icon: FileCheck },
              { step: "03", title: "Get Your Website", desc: "We build and deploy your fully compliant, modern portfolio website. Review, refine, launch.", icon: Globe }
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp} className="relative p-8 rounded-2xl glass text-center">
                <div className="text-6xl font-black text-primary/10 absolute top-4 right-6 font-[family-name:var(--font-heading)]">{s.step}</div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center mx-auto mb-5">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 font-[family-name:var(--font-heading)]">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </AnimSection>
      </section>

      {/* AUDIT CTA */}
      <section className="py-20 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5" />
        <AnimSection className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <motion.div variants={fadeUp}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-4 font-[family-name:var(--font-heading)]">How Compliant Is Your Current Website?</h2>
            <p className="text-muted-foreground mb-8">Enter your website URL for an instant compliance score across SEBI, AMFI, IRDAI &amp; PFRDA requirements.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (auditUrl.trim()) router.push(`/audit?url=${encodeURIComponent(auditUrl.trim())}`) }} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <Input value={auditUrl} onChange={e => setAuditUrl(e.target.value)} placeholder="https://yourwebsite.com" className="flex-1 h-12 text-base" data-testid="landing-audit-input" />
              <Button type="submit" size="lg" className="gap-2 font-semibold whitespace-nowrap" data-testid="landing-audit-submit"><Scan className="w-4 h-4" /> Scan Now</Button>
            </form>
          </motion.div>
        </AnimSection>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 lg:py-28 bg-secondary/30">
        <AnimSection className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-sm uppercase tracking-[0.2em] font-medium text-primary mb-3">Pricing</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight font-[family-name:var(--font-heading)]">Choose Your Plan</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <motion.div key={plan.plan_id} variants={fadeUp} className={`relative p-8 rounded-2xl glass ${plan.is_popular ? "ring-2 ring-primary glow-primary" : ""} hover:-translate-y-1 transition-all duration-300`}>
                {plan.is_popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">Most Popular</div>}
                <h3 className="text-xl font-bold mb-1 font-[family-name:var(--font-heading)]">{plan.name}</h3>
                <p className="text-2xl font-black text-gradient mb-2 font-[family-name:var(--font-heading)]">{plan.price_display}</p>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-2.5 mb-8">
                  {(plan.features || []).map((f: string, j: number) => (
                    <li key={j} className="flex items-start gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" /><span>{f}</span></li>
                  ))}
                </ul>
                <Link href={plan.is_contact_us ? "/plans?enterprise=true" : "/plans"}>
                  <Button variant={plan.is_popular ? "default" : "outline"} className="w-full font-semibold" data-testid={`pricing-${plan.plan_id}`}>
                    {plan.is_contact_us ? "Contact Us" : "Select & Continue"} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimSection>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 lg:py-28">
        <AnimSection className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} className="text-center mb-14">
            <p className="text-sm uppercase tracking-[0.2em] font-medium text-primary mb-3">FAQ</p>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight font-[family-name:var(--font-heading)]">Frequently Asked Questions</h2>
          </motion.div>
          <motion.div variants={fadeUp}>
            <Accordion type="single" collapsible className="space-y-3" data-testid="faq-accordion">
              {FAQ.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="glass rounded-xl px-6 border-0">
                  <AccordionTrigger className="text-left font-medium text-sm hover:no-underline py-4">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">{item.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </AnimSection>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 lg:py-28 bg-secondary/30">
        <AnimSection className="max-w-3xl mx-auto px-4 text-center">
          <motion.div variants={fadeUp}>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-4 font-[family-name:var(--font-heading)]">Ready to Go Compliant?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">Join India&apos;s financial professionals who trust FinSites for compliant web presence.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/audit"><Button size="lg" variant="outline" className="gap-2 font-semibold"><Scan className="w-4 h-4" /> Free Audit</Button></Link>
              <Link href="/plans"><Button size="lg" className="gap-2 font-semibold">Start Building <ArrowRight className="w-4 h-4" /></Button></Link>
            </div>
          </motion.div>
        </AnimSection>
      </section>

      <Footer />
    </div>
  )
}
