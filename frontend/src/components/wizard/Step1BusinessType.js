import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart3, Shield, TrendingUp, Layers, Zap, FileCheck, AlertTriangle } from "lucide-react";

const TYPES = [
  { id: "MFD", name: "Mutual Fund Distributor", reg: "SEBI / AMFI", icon: BarChart3, desc: "AMFI-registered distributor with ARN + EUIN", color: "from-blue-500 to-cyan-400" },
  { id: "Insurance", name: "Insurance Agent / Broker", reg: "IRDAI", icon: Shield, desc: "Licensed insurance intermediary", color: "from-emerald-500 to-green-400" },
  { id: "PMS", name: "Portfolio Management Services", reg: "SEBI", icon: TrendingUp, desc: "SEBI-registered portfolio manager", color: "from-violet-500 to-purple-400" },
  { id: "AIF", name: "Alternative Investment Fund", reg: "SEBI", icon: Layers, desc: "Category I/II/III fund manager", color: "from-orange-500 to-amber-400" },
  { id: "SIF", name: "Specialised Investment Fund", reg: "SEBI / MF", icon: Zap, desc: "SIF distribution with NISM-XXI-A", color: "from-pink-500 to-rose-400" },
  { id: "RIA", name: "Investment Adviser", reg: "SEBI", icon: FileCheck, desc: "SEBI registered investment adviser", color: "from-teal-500 to-cyan-400" },
];

const WARNINGS = {
  "MFD+RIA": "MFD + RIA requires SIDD (Separately Identifiable Department/Division). Advisory clients cannot be charged commission. Sections must be clearly segregated.",
  "RIA+Insurance": "RIA + Insurance requires advisory and distribution segregation with full dual-role disclosure.",
  "RIA+PMS": "RIA + PMS typically requires separate entities. Prominent segregation disclosures will be added.",
};

function getWarnings(selected) {
  const warnings = [];
  if (selected.includes("MFD") && selected.includes("RIA")) warnings.push(WARNINGS["MFD+RIA"]);
  if (selected.includes("RIA") && selected.includes("Insurance")) warnings.push(WARNINGS["RIA+Insurance"]);
  if (selected.includes("RIA") && selected.includes("PMS")) warnings.push(WARNINGS["RIA+PMS"]);
  return warnings;
}

export default function Step1BusinessType({ data, onChange }) {
  const selected = data.business_types || [];
  const warnings = getWarnings(selected);

  const toggle = (id) => {
    const updated = selected.includes(id) ? selected.filter(t => t !== id) : [...selected, id];
    onChange({ business_types: updated });
  };

  return (
    <div data-testid="wizard-step-1">
      <h2 className="text-2xl font-bold mb-2 font-[var(--font-heading)]">Which financial services do you offer?</h2>
      <p className="text-sm text-muted-foreground mb-6">Select all that apply. We'll customize the onboarding and compliance requirements accordingly.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {TYPES.map(t => {
          const isSelected = selected.includes(t.id);
          return (
            <button key={t.id} onClick={() => toggle(t.id)} data-testid={`type-${t.id}`}
              className={`relative text-left p-5 rounded-xl border-2 transition-all duration-200 ${isSelected ? "border-[hsl(var(--primary))] glass glow-primary" : "border-border hover:border-[hsl(var(--primary)/0.3)] glass"}`}>
              <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${t.color} ${isSelected ? "opacity-100" : "opacity-0"} transition-opacity`} />
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center shrink-0 ${isSelected ? "opacity-100" : "opacity-60"}`}>
                  <t.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm font-[var(--font-heading)]">{t.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{t.reg}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
                </div>
              </div>
              {isSelected && <Badge className="absolute top-3 right-3 text-[10px]">Selected</Badge>}
            </button>
          );
        })}
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2" data-testid="combination-warnings">
          {warnings.map((w, i) => (
            <Alert key={i} className="border-yellow-500/30 bg-yellow-500/5">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <AlertDescription className="text-sm">{w}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {selected.length === 0 && <p className="text-sm text-muted-foreground text-center mt-4">Select at least one business type to continue</p>}
    </div>
  );
}
