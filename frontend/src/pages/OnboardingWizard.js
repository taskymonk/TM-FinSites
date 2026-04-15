import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save, Loader2, CheckCircle2 } from "lucide-react";
import Step1BusinessType from "@/components/wizard/Step1BusinessType";
import Step2Registration from "@/components/wizard/Step2Registration";
import Step3Services from "@/components/wizard/Step3Services";
import Step4Design from "@/components/wizard/Step4Design";
import Step5Review from "@/components/wizard/Step5Review";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || '';
const STEPS = ["Business Type", "Registration Details", "Services & Content", "Design Preferences", "Review & Submit"];

export default function OnboardingWizard() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [step, setStep] = useState(1);
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/wizard/${sessionId}`)
      .then(r => { setSession(r.data); setData(r.data.data || {}); setStep(r.data.current_step || 1); setLoading(false); })
      .catch(() => { toast.error("Session not found"); navigate("/plans"); });
  }, [sessionId, navigate]);

  const saveStep = async (stepNum, stepData) => {
    setSaving(true);
    try {
      const { data: updated } = await axios.put(`${API}/api/wizard/${sessionId}/step/${stepNum}`, { data: stepData });
      setSession(updated);
      setData(updated.data || {});
      return true;
    } catch { toast.error("Failed to save progress"); return false; } finally { setSaving(false); }
  };

  const goNext = async () => {
    const stepData = data[`step_${step}`] || {};
    const saved = await saveStep(step, stepData);
    if (saved && step < 5) setStep(step + 1);
  };

  const goPrev = () => { if (step > 1) setStep(step - 1); };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await saveStep(5, data.step_5 || {});
      const { data: result } = await axios.post(`${API}/api/wizard/${sessionId}/submit`);
      toast.success("Submission successful!");
      navigate(`/confirmation/${result.submission_id}`);
    } catch (err) { toast.error(err.response?.data?.detail || "Submission failed"); } finally { setSaving(false); }
  };

  const updateStepData = (stepNum, newData) => {
    setData(prev => ({ ...prev, [`step_${stepNum}`]: { ...prev[`step_${stepNum}`], ...newData } }));
  };

  const businessTypes = data.step_1?.business_types || session?.business_types || [];

  if (loading) return (
    <div className="min-h-screen"><Navbar /><div className="pt-32 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></div>
  );

  return (
    <div className="min-h-screen pb-24">
      <Navbar />
      <div className="pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Progress */}
          <div className="mb-8" data-testid="wizard-progress">
            <div className="flex items-center justify-between mb-3">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i + 1 < step ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]" : i + 1 === step ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "bg-secondary text-muted-foreground"}`}>
                    {i + 1 < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  {i < STEPS.length - 1 && <div className={`hidden sm:block w-12 lg:w-20 h-0.5 mx-1 ${i + 1 < step ? "bg-[hsl(var(--accent))]" : "bg-secondary"}`} />}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">Step {step} of 5: <span className="font-medium text-foreground">{STEPS[step - 1]}</span></p>
            {session?.prefilled_from_audit && step <= 2 && (
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-[hsl(var(--accent))]">
                <CheckCircle2 className="w-3 h-3" /> Data prefilled from audit. Please verify and update.
              </div>
            )}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
              {step === 1 && <Step1BusinessType data={data.step_1 || {}} onChange={(d) => updateStepData(1, d)} />}
              {step === 2 && <Step2Registration data={data.step_2 || {}} businessTypes={businessTypes} contact={session?.contact} onChange={(d) => updateStepData(2, d)} />}
              {step === 3 && <Step3Services data={data.step_3 || {}} businessTypes={businessTypes} onChange={(d) => updateStepData(3, d)} />}
              {step === 4 && <Step4Design data={data.step_4 || {}} onChange={(d) => updateStepData(4, d)} />}
              {step === 5 && <Step5Review data={data} businessTypes={businessTypes} session={session} />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border z-40">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
              <Button variant="ghost" onClick={goPrev} disabled={step === 1 || saving} data-testid="wizard-back-btn">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <div className="flex gap-2">
                {step < 5 ? (
                  <Button onClick={goNext} disabled={saving} className="gap-2 font-semibold" data-testid="wizard-next-btn">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save & Continue <ArrowRight className="w-4 h-4" /></>}
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={saving} className="gap-2 font-semibold bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent)/0.9)] text-[hsl(var(--accent-foreground))]" data-testid="wizard-submit-btn">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Submit Application</>}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
