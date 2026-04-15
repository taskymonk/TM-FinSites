import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Copy, ExternalLink, Clock, CreditCard, Hammer, Eye, Rocket } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || '';

const STEPS_INFO = [
  { icon: Eye, label: "Review", desc: "Our team reviews your submission for completeness", time: "24-48 hours" },
  { icon: CreditCard, label: "Payment", desc: "We'll contact you with payment details", time: "After review" },
  { icon: Hammer, label: "Build", desc: "Your compliant website goes into production", time: "Per plan" },
  { icon: Rocket, label: "Launch", desc: "You review, we refine, then we launch!", time: "Final step" },
];

export default function ConfirmationPage() {
  const { submissionId } = useParams();
  const [sub, setSub] = useState(null);

  useEffect(() => {
    axios.get(`${API}/api/status/${submissionId}`).then(r => setSub(r.data)).catch(() => toast.error("Submission not found"));
  }, [submissionId]);

  const copyRef = () => {
    navigator.clipboard.writeText(sub?.reference_number || "");
    toast.success("Reference number copied!");
  };

  if (!sub) return <div className="min-h-screen"><Navbar /><div className="pt-32 flex justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-10">
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--accent)/0.15)] flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-[hsl(var(--accent))]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 font-[var(--font-heading)]" data-testid="confirmation-title">
              Submission <span className="text-gradient">Successful!</span>
            </h1>
            <p className="text-muted-foreground">Your website request has been submitted. Here's what happens next.</p>
          </motion.div>

          {/* Reference Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6 mb-8 glow-primary" data-testid="confirmation-ref">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">Reference Number</p>
              <button onClick={copyRef} className="flex items-center gap-1 text-xs text-[hsl(var(--primary))] hover:underline"><Copy className="w-3 h-3" /> Copy</button>
            </div>
            <p className="text-3xl font-black font-mono text-gradient mb-4">{sub.reference_number}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Client:</span> <span className="font-medium">{sub.client_name}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge>{sub.status}</Badge></div>
              <div><span className="text-muted-foreground">Plan:</span> <Badge variant="secondary">{sub.plan?.tier}</Badge></div>
              <div><span className="text-muted-foreground">Types:</span> {sub.business_types?.map(t => <Badge key={t} variant="outline" className="mr-1 text-[10px]">{t}</Badge>)}</div>
            </div>
          </motion.div>

          {/* What Happens Next */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6 mb-8">
            <h3 className="font-semibold mb-6 font-[var(--font-heading)]">What Happens Next</h3>
            <div className="space-y-6">
              {STEPS_INFO.map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${i === 0 ? "bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))]" : "bg-secondary text-muted-foreground"}`}>
                      <s.icon className="w-5 h-5" />
                    </div>
                    {i < STEPS_INFO.length - 1 && <div className="w-px h-6 bg-border mt-1" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                    <p className="text-xs text-[hsl(var(--primary))] mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{s.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3">
            <Link to={`/status/${sub.submission_id}`}>
              <Button variant="outline" className="gap-2" data-testid="track-status-btn"><ExternalLink className="w-4 h-4" /> Track Status</Button>
            </Link>
            <Link to="/"><Button className="gap-2" data-testid="back-home-btn">Back to Home</Button></Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
