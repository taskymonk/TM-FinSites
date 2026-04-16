"use client"
import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CheckCircle2, ChevronRight, ArrowRight, Zap, Loader2 } from "lucide-react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { fetchPlans, submitEnterpriseContact } from "@/lib/actions"

interface Plan {
  plan_id: string
  name: string
  price_display: string
  description: string
  features: string[]
  is_popular: boolean
  is_contact_us: boolean
}

export default function PlansPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showEnterprise, setShowEnterprise] = useState(searchParams.get("enterprise") === "true")
  const [enterpriseForm, setEnterpriseForm] = useState({ name: "", email: "", phone: "", company: "", message: "" })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchPlans().then((data) => { setPlans(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  function selectPlan(plan: Plan) {
    if (plan.is_contact_us) {
      setShowEnterprise(true)
      return
    }
    // Navigate to wizard with plan selected
    router.push(`/onboarding?plan=${plan.plan_id}`)
  }

  async function submitEnterprise(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await submitEnterpriseContact(enterpriseForm)
      toast.success("Thank you! Our team will reach out within 24 hours.")
      setShowEnterprise(false)
      setEnterpriseForm({ name: "", email: "", phone: "", company: "", message: "" })
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen" data-testid="plans-page">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-card/30 text-xs font-medium text-muted-foreground mb-4">
              <Zap className="w-3.5 h-3.5 text-primary" /> Transparent Pricing
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4 font-[family-name:var(--font-heading)]" data-testid="plans-title">
              Choose Your Plan
            </h1>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Every plan includes full regulatory compliance. Pick the one that fits your business.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {plans.map((plan, i) => (
                <motion.div key={plan.plan_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className={`relative h-full glass ${plan.is_popular ? "ring-2 ring-primary glow-primary" : ""} hover:-translate-y-1 transition-all duration-300`} data-testid={`plan-card-${plan.plan_id}`}>
                    {plan.is_popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                        Most Popular
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xl font-[family-name:var(--font-heading)]">{plan.name}</CardTitle>
                      <p className="text-2xl font-black text-gradient font-[family-name:var(--font-heading)]">{plan.price_display}</p>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </CardHeader>
                    <CardContent className="flex flex-col h-full">
                      <ul className="space-y-2.5 mb-8 flex-1">
                        {(plan.features || []).map((f, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Button onClick={() => selectPlan(plan)} variant={plan.is_popular ? "default" : "outline"}
                        className="w-full font-semibold" data-testid={`plan-select-${plan.plan_id}`}>
                        {plan.is_contact_us ? "Contact Us" : "Select & Continue"} <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}

          {/* Features comparison note */}
          <div className="mt-16 text-center">
            <h3 className="text-lg font-semibold mb-3">All Plans Include</h3>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
              {["Full Regulatory Compliance", "Mobile Responsive Design", "SSL Certificate", "Basic SEO", "1 Year Hosting"].map((f) => (
                <span key={f} className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-accent" />{f}</span>
              ))}
            </div>
          </div>

          {/* Audit CTA */}
          <div className="mt-16 text-center p-8 rounded-2xl glass max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-2">Not sure which plan you need?</h3>
            <p className="text-sm text-muted-foreground mb-4">Run a free compliance audit on your current website first.</p>
            <Button variant="outline" className="gap-2 font-semibold" onClick={() => router.push("/audit")} data-testid="plans-audit-cta">
              Free Audit First <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </section>
      </div>

      {/* Enterprise Dialog */}
      <Dialog open={showEnterprise} onOpenChange={setShowEnterprise}>
        <DialogContent className="sm:max-w-md" data-testid="enterprise-dialog">
          <DialogHeader>
            <DialogTitle>Enterprise Inquiry</DialogTitle>
            <DialogDescription>Tell us about your needs and our team will prepare a custom quote.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitEnterprise} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="ent-name" className="text-xs">Name</Label>
                <Input id="ent-name" required value={enterpriseForm.name} onChange={(e) => setEnterpriseForm((f) => ({ ...f, name: e.target.value }))} data-testid="enterprise-name" /></div>
              <div><Label htmlFor="ent-email" className="text-xs">Email</Label>
                <Input id="ent-email" type="email" required value={enterpriseForm.email} onChange={(e) => setEnterpriseForm((f) => ({ ...f, email: e.target.value }))} data-testid="enterprise-email" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="ent-phone" className="text-xs">Phone</Label>
                <Input id="ent-phone" value={enterpriseForm.phone} onChange={(e) => setEnterpriseForm((f) => ({ ...f, phone: e.target.value }))} data-testid="enterprise-phone" /></div>
              <div><Label htmlFor="ent-company" className="text-xs">Company</Label>
                <Input id="ent-company" value={enterpriseForm.company} onChange={(e) => setEnterpriseForm((f) => ({ ...f, company: e.target.value }))} data-testid="enterprise-company" /></div>
            </div>
            <div><Label htmlFor="ent-msg" className="text-xs">Message</Label>
              <Textarea id="ent-msg" rows={3} value={enterpriseForm.message} onChange={(e) => setEnterpriseForm((f) => ({ ...f, message: e.target.value }))} data-testid="enterprise-message" /></div>
            <Button type="submit" className="w-full font-semibold" disabled={submitting} data-testid="enterprise-submit">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Submit Inquiry
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  )
}
