import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, ChevronRight, Loader2, Send, Phone, Mail, User } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || '';
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function PlanSelectionPage() {
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showContact, setShowContact] = useState(false);
  const [showEnterprise, setShowEnterprise] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [enterprise, setEnterprise] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auditId = searchParams.get("audit_id");

  useEffect(() => {
    axios.get(`${API}/api/plans`).then(r => setPlans(r.data)).catch(() => toast.error("Failed to load plans"));
    if (searchParams.get("enterprise") === "true") setShowEnterprise(true);
  }, [searchParams]);

  const handleSelectPlan = (plan) => {
    if (plan.is_contact_us) { setShowEnterprise(true); return; }
    setSelectedPlan(plan);
    setShowContact(true);
  };

  const handleStartOnboarding = async () => {
    if (!contact.name || !contact.email || !contact.phone) { toast.error("Please fill all fields"); return; }
    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/api/wizard/start`, {
        plan_id: selectedPlan.plan_id, contact_name: contact.name, contact_email: contact.email, contact_phone: contact.phone, audit_id: auditId || null,
      });
      navigate(`/onboarding/${data.session_id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to start onboarding");
    } finally { setSubmitting(false); }
  };

  const handleEnterpriseSubmit = async () => {
    if (!enterprise.name || !enterprise.email || !enterprise.phone) { toast.error("Please fill required fields"); return; }
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/contact/enterprise`, enterprise);
      toast.success("Thank you! Our team will contact you within 24 hours.");
      setShowEnterprise(false);
    } catch { toast.error("Failed to submit. Please try again."); } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 font-[var(--font-heading)]">
              Choose Your <span className="text-gradient">Plan</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">Select a plan to begin your onboarding. No payment required now — our team will connect with you after you complete the process.</p>
            {auditId && (
              <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full glass text-xs text-[hsl(var(--accent))]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Audit data will be prefilled into your onboarding
              </div>
            )}
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6" data-testid="plans-grid">
            {plans.map((plan) => (
              <motion.div key={plan.plan_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`relative p-8 rounded-2xl glass ${plan.is_popular ? "ring-2 ring-[hsl(var(--primary))] glow-primary" : ""} hover:-translate-y-1 transition-all duration-300`}>
                {plan.is_popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-xs font-semibold">Most Popular</div>}
                <h3 className="text-xl font-bold mb-1 font-[var(--font-heading)]">{plan.name}</h3>
                <p className="text-2xl font-black text-gradient mb-2 font-[var(--font-heading)]">{plan.price_display}</p>
                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                <ul className="space-y-2.5 mb-8">
                  {(plan.features || []).map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-[hsl(var(--accent))] shrink-0 mt-0.5" /><span>{f}</span></li>
                  ))}
                </ul>
                <Button variant={plan.is_popular ? "default" : "outline"} className="w-full font-semibold" onClick={() => handleSelectPlan(plan)} data-testid={`select-plan-${plan.plan_id}`}>
                  {plan.is_contact_us ? "Contact Us" : "Select & Continue"} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">All plans include: Full regulatory compliance &middot; SSL certificate &middot; Mobile responsive &middot; SEO optimized &middot; 1 year hosting</p>
        </div>
      </div>

      {/* Contact Info Modal */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="sm:max-w-md" data-testid="contact-modal">
          <DialogHeader>
            <DialogTitle className="font-[var(--font-heading)]">Almost There!</DialogTitle>
            <DialogDescription>Enter your details to start the onboarding wizard for the <strong>{selectedPlan?.name}</strong> plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-xs mb-1.5 flex items-center gap-1.5"><User className="w-3 h-3" />Full Name</Label><Input value={contact.name} onChange={e => setContact(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" data-testid="contact-name" /></div>
            <div><Label className="text-xs mb-1.5 flex items-center gap-1.5"><Mail className="w-3 h-3" />Email</Label><Input type="email" value={contact.email} onChange={e => setContact(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com" data-testid="contact-email" /></div>
            <div><Label className="text-xs mb-1.5 flex items-center gap-1.5"><Phone className="w-3 h-3" />Phone</Label><Input value={contact.phone} onChange={e => setContact(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" data-testid="contact-phone" /></div>
            <Button onClick={handleStartOnboarding} disabled={submitting} className="w-full font-semibold" data-testid="start-onboarding-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Continue to Onboarding
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enterprise Contact Modal */}
      <Dialog open={showEnterprise} onOpenChange={setShowEnterprise}>
        <DialogContent className="sm:max-w-md" data-testid="enterprise-modal">
          <DialogHeader>
            <DialogTitle className="font-[var(--font-heading)]">Enterprise Inquiry</DialogTitle>
            <DialogDescription>Our team will contact you within 24 hours to discuss your bespoke requirements.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label className="text-xs">Full Name *</Label><Input value={enterprise.name} onChange={e => setEnterprise(p => ({ ...p, name: e.target.value }))} placeholder="Your name" data-testid="enterprise-name" /></div>
            <div><Label className="text-xs">Email *</Label><Input type="email" value={enterprise.email} onChange={e => setEnterprise(p => ({ ...p, email: e.target.value }))} placeholder="email@company.com" data-testid="enterprise-email" /></div>
            <div><Label className="text-xs">Phone *</Label><Input value={enterprise.phone} onChange={e => setEnterprise(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" data-testid="enterprise-phone" /></div>
            <div><Label className="text-xs">Company</Label><Input value={enterprise.company} onChange={e => setEnterprise(p => ({ ...p, company: e.target.value }))} placeholder="Company name" data-testid="enterprise-company" /></div>
            <div><Label className="text-xs">Message</Label><Textarea value={enterprise.message} onChange={e => setEnterprise(p => ({ ...p, message: e.target.value }))} placeholder="Tell us about your requirements..." rows={3} data-testid="enterprise-message" /></div>
            <Button onClick={handleEnterpriseSubmit} disabled={submitting} className="w-full font-semibold" data-testid="enterprise-submit-btn">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Send Inquiry
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
