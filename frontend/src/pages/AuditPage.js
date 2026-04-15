import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scan, Globe, ArrowRight, Loader2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const prefill = searchParams.get("url");
    if (prefill) { setUrl(prefill); handleScan(prefill); }
    // eslint-disable-next-line
  }, []);

  const handleScan = async (scanUrl) => {
    const target = scanUrl || url;
    if (!target.trim()) { toast.error("Please enter a website URL"); return; }
    setScanning(true);
    setProgress(0);
    const phases = ["Connecting to website...", "Analyzing page structure...", "Detecting registrations...", "Running compliance checks...", "Calculating scores..."];
    let pi = 0;
    const interval = setInterval(() => {
      pi = Math.min(pi + 1, phases.length - 1);
      setPhase(phases[pi]);
      setProgress(p => Math.min(p + 18, 90));
    }, 1500);
    try {
      const { data } = await axios.post(`${API}/api/audit/scan`, { url: target });
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => navigate(`/audit/${data.audit_id}`), 500);
    } catch (err) {
      clearInterval(interval);
      setScanning(false);
      toast.error(err.response?.data?.detail || "Failed to scan website. Please try again.");
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary)/0.15)] to-[hsl(var(--accent)/0.15)] flex items-center justify-center mx-auto mb-6">
              <Scan className="w-8 h-8 text-[hsl(var(--primary))]" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 font-[var(--font-heading)]">
              Compliance <span className="text-gradient">Audit</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              Enter your website URL to get an instant compliance score across SEBI, AMFI & IRDAI requirements. We'll detect your business type and check 40+ compliance points.
            </p>
          </motion.div>

          {!scanning ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="glass rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6 text-sm text-muted-foreground">
                  <Globe className="w-4 h-4" />
                  <span>We'll scan your website for regulatory compliance gaps</span>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); handleScan(); }} className="space-y-4">
                  <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourfinancialwebsite.com" className="h-14 text-base px-5" data-testid="audit-url-input" />
                  <Button type="submit" size="lg" className="w-full gap-2 font-semibold text-base h-12" data-testid="audit-submit-btn">
                    <Scan className="w-4 h-4" /> Start Compliance Scan
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground text-center mt-4">Free scan. No registration required.</p>
              </div>
              <div className="mt-8 text-center">
                <p className="text-sm text-muted-foreground mb-3">Don't have a website yet?</p>
                <Button variant="outline" onClick={() => navigate("/plans")} className="gap-2" data-testid="audit-no-website-btn">
                  Start From Scratch <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-8 text-center" data-testid="audit-scanning">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-2 border-[hsl(var(--primary)/0.2)]" />
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[hsl(var(--primary))] animate-spin" />
                <div className="absolute inset-4 rounded-full border-2 border-transparent border-b-[hsl(var(--accent))] animate-spin" style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gradient font-[var(--font-heading)]">{progress}%</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2 font-[var(--font-heading)]">Scanning Website</h3>
              <p className="text-sm text-muted-foreground mb-4">{phase || "Initializing scan..."}</p>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-4 font-mono truncate">{url}</p>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
