"use client"
import Link from "next/link"
import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, ArrowRight, Scan, AlertTriangle, Shield } from "lucide-react"

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

export interface SolutionPageData {
  type: string
  title: string
  subtitle: string
  regulator: string
  iconName: string
  color: string
  heroDescription: string
  keyRegulations: string[]
  complianceChecks: { name: string; severity: "critical" | "major" | "minor"; description: string }[]
  commonIssues: { title: string; description: string }[]
  websitePages: string[]
  whyCompliance: string
}

export function SolutionTemplate({ data }: { data: SolutionPageData }) {
  return (
    <div className="min-h-screen bg-[#030712]" data-testid={`solution-${data.type.toLowerCase()}`}>
      <Navbar />
      <div className="pt-20 pb-16">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <Badge className={`${data.color} text-white text-xs px-2.5 py-0.5`}>{data.regulator}</Badge>
              <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">{data.type}</Badge>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tighter text-white leading-tight mb-4">{data.title}</h1>
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed mb-6">{data.heroDescription}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/audit`}><Button size="lg" className="gap-2 font-semibold bg-blue-600 hover:bg-blue-500 text-white"><Scan className="w-4 h-4" /> Free Compliance Audit</Button></Link>
              <Link href={`/onboarding?types=${data.type}`}><Button size="lg" variant="outline" className="gap-2 font-semibold border-slate-700 text-slate-300 hover:bg-white/5">Start Building <ArrowRight className="w-4 h-4" /></Button></Link>
            </div>
          </motion.div>
        </section>

        {/* Key Regulations */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/60">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
            <motion.div variants={fadeUp} className="mb-10">
              <p className="text-sm font-semibold tracking-wider uppercase text-blue-400 mb-2">Regulatory Requirements</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Key {data.regulator} Compliance Rules</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-4">
              {data.keyRegulations.map((reg, i) => (
                <motion.div key={i} variants={fadeUp} className="flex items-start gap-3 p-5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300 leading-relaxed">{reg}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Compliance Checks */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
            <motion.div variants={fadeUp} className="mb-10">
              <p className="text-sm font-semibold tracking-wider uppercase text-blue-400 mb-2">What We Check</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Compliance Checks for {data.type}</h2>
            </motion.div>
            <div className="space-y-3">
              {data.complianceChecks.map((check, i) => (
                <motion.div key={i} variants={fadeUp} className="flex items-start gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <Shield className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{check.name}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${check.severity === "critical" ? "bg-red-500/15 text-red-400 border-red-500/30" : check.severity === "major" ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-blue-500/15 text-blue-400 border-blue-500/30"}`}>{check.severity}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{check.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Common Issues */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800/60">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
            <motion.div variants={fadeUp} className="mb-10">
              <p className="text-sm font-semibold tracking-wider uppercase text-amber-400 mb-2">Watch Out</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Common Compliance Issues</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-4">
              {data.commonIssues.map((issue, i) => (
                <motion.div key={i} variants={fadeUp} className="p-5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                  <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-amber-400" /><h3 className="text-sm font-semibold text-white">{issue.title}</h3></div>
                  <p className="text-xs text-slate-400 leading-relaxed">{issue.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Website Pages */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ visible: { transition: { staggerChildren: 0.06 } } }}>
            <motion.div variants={fadeUp} className="mb-10">
              <p className="text-sm font-semibold tracking-wider uppercase text-blue-400 mb-2">What You Get</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Recommended Website Pages</h2>
            </motion.div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.websitePages.map((pg, i) => (
                <motion.div key={i} variants={fadeUp} className="flex items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-slate-300">{pg}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center border-t border-slate-800/60">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Ready to Build Your Compliant {data.type} Website?</h2>
          <p className="text-slate-400 mb-8 max-w-lg mx-auto">{data.whyCompliance}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/audit"><Button size="lg" variant="outline" className="gap-2 font-semibold border-slate-700 text-slate-300 hover:bg-white/5"><Scan className="w-4 h-4" /> Free Audit</Button></Link>
            <Link href={`/onboarding?types=${data.type}`}><Button size="lg" className="gap-2 font-semibold bg-blue-600 hover:bg-blue-500 text-white">Get Started <ArrowRight className="w-4 h-4" /></Button></Link>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}
