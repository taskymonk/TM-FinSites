import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  if (user) { navigate("/admin"); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Please enter email and password"); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate("/admin");
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Invalid credentials");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 hero-mesh noise-overlay">
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-sm">
        <div className="glass rounded-2xl p-8 glow-primary">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--primary)/0.15)] to-[hsl(var(--accent)/0.15)] flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-[hsl(var(--primary))]" />
            </div>
            <h1 className="text-2xl font-bold font-[var(--font-heading)]">Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-1">FinSites Administration</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-xs mb-1.5 block">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@finsites.in" autoComplete="email" data-testid="admin-email" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Password</Label>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" data-testid="admin-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full font-semibold" data-testid="admin-login-btn">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Sign In
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
