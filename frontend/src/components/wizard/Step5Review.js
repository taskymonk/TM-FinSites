import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, Palette, Users, Shield } from "lucide-react";

const STYLE_NAMES = { modern_minimal: "Modern Minimal", professional_corporate: "Professional Corporate", warm_approachable: "Warm & Approachable", bold_dynamic: "Bold & Dynamic", luxury_premium: "Luxury Premium" };
const TYPE_PAGES = {
  MFD: ["Disclaimer (AMFI/SEBI)", "Commission Disclosure"],
  Insurance: ["Insurance Disclaimer (IRDAI)", "Insurer Information"],
  PMS: ["PMS Disclosure Document", "Fee Structure Page"],
  AIF: ["Private Placement Notice", "Investment Strategy"],
  SIF: ["SIF Risk Disclosure", "NISM Certification"],
  RIA: ["Advisory Fee Disclosure", "MITC Summary", "AI Disclosure"],
};

function Section({ icon: Icon, title, children }) {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2 font-[var(--font-heading)]"><Icon className="w-4 h-4 text-[hsl(var(--primary))]" />{title}</h3>
      {children}
    </div>
  );
}

export default function Step5Review({ data, businessTypes, session }) {
  const s2 = data.step_2 || {};
  const s3 = data.step_3 || {};
  const s4 = data.step_4 || {};
  const ga = s2.group_a || {};
  const basePages = ["Home", "About", "Services", "Contact", "Disclaimer & Disclosures", "Privacy Policy", "Grievance Redressal"];
  const extraPages = [];
  if (s3.has_blog) extraPages.push("Blog / Resources");
  if (s3.has_faq) extraPages.push("FAQ");
  businessTypes.forEach(t => { (TYPE_PAGES[t] || []).forEach(p => extraPages.push(p)); });

  return (
    <div data-testid="wizard-step-5" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 font-[var(--font-heading)]">Review Your Submission</h2>
        <p className="text-sm text-muted-foreground">Please review all information before submitting. You can go back to edit any section.</p>
      </div>

      <Section icon={Shield} title="Business Information">
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div><span className="text-muted-foreground">Business Name:</span> <span className="font-medium">{ga.business_name || "—"}</span></div>
          <div><span className="text-muted-foreground">Structure:</span> <span className="font-medium">{ga.business_structure || "—"}</span></div>
          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{ga.email || "—"}</span></div>
          <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{ga.phone || "—"}</span></div>
          <div className="sm:col-span-2"><span className="text-muted-foreground">Address:</span> <span className="font-medium">{ga.address || "—"}, {ga.city || ""} {ga.state || ""} {ga.pin_code || ""}</span></div>
        </div>
        <div className="mt-3">
          <span className="text-sm text-muted-foreground">Business Types: </span>
          {businessTypes.map(t => <Badge key={t} variant="secondary" className="mr-1">{t}</Badge>)}
        </div>
        <div className="mt-2">
          <span className="text-sm text-muted-foreground">Plan: </span>
          <Badge>{session?.plan_id || "—"}</Badge>
        </div>
      </Section>

      {/* Registration Numbers */}
      <Section icon={FileText} title="Registration Details">
        <div className="space-y-1 text-sm font-mono">
          {s2.group_b?.arn && <p>ARN: {s2.group_b.arn}</p>}
          {s2.group_b?.euin && <p>EUIN: {s2.group_b.euin}</p>}
          {s2.group_c?.irdai_number && <p>IRDAI: {s2.group_c.irdai_number}</p>}
          {s2.group_d?.sebi_pms && <p>SEBI PMS: {s2.group_d.sebi_pms}</p>}
          {s2.group_e?.sebi_aif && <p>SEBI AIF: {s2.group_e.sebi_aif}</p>}
          {s2.group_g?.sebi_ria && <p>SEBI IA: {s2.group_g.sebi_ria}</p>}
          {!s2.group_b?.arn && !s2.group_c?.irdai_number && !s2.group_d?.sebi_pms && !s2.group_e?.sebi_aif && !s2.group_g?.sebi_ria && <p className="text-muted-foreground">No registrations provided yet</p>}
        </div>
      </Section>

      <Section icon={Users} title="Services & Content">
        <div className="space-y-2 text-sm">
          {s3.target_audience?.length > 0 && <div><span className="text-muted-foreground">Target Audience:</span> <span>{s3.target_audience.join(", ")}</span></div>}
          {s3.value_proposition && <div><span className="text-muted-foreground">Value Proposition:</span> <span>{s3.value_proposition}</span></div>}
          {s3.primary_cta && <div><span className="text-muted-foreground">Primary CTA:</span> <span>{s3.primary_cta}</span></div>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {s3.has_blog && <Badge variant="outline">Blog</Badge>}
            {s3.has_faq && <Badge variant="outline">FAQ</Badge>}
            {s3.has_newsletter && <Badge variant="outline">Newsletter</Badge>}
            {(s3.calculators || []).map(c => <Badge key={c} variant="outline">{c}</Badge>)}
          </div>
        </div>
      </Section>

      <Section icon={Palette} title="Design">
        <div className="space-y-2 text-sm">
          <div><span className="text-muted-foreground">Style:</span> <span className="font-medium">{STYLE_NAMES[s4.design_style] || "Not selected"}</span></div>
          <div><span className="text-muted-foreground">Priority:</span> <span className="font-medium capitalize">{s4.priority || "Not selected"}-first</span></div>
          <div><span className="text-muted-foreground">Animation:</span> <span className="font-medium capitalize">{s4.animation_level || "Not selected"}</span></div>
          {s4.has_brand_colors && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Colors:</span>
              {[s4.color_primary, s4.color_secondary, s4.color_accent].filter(Boolean).map((c, i) => (
                <div key={i} className="flex items-center gap-1"><div className="w-5 h-5 rounded border" style={{ background: c }} /><span className="font-mono text-xs">{c}</span></div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* Pages to be generated */}
      <Section icon={FileText} title="Pages to be Generated">
        <div className="grid sm:grid-cols-2 gap-1">
          {[...basePages, ...extraPages].map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm py-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(var(--accent))]" />{p}
            </div>
          ))}
        </div>
      </Section>

      <div className="glass rounded-xl p-6 border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.02)]">
        <p className="text-sm"><CheckCircle2 className="w-4 h-4 text-[hsl(var(--accent))] inline mr-2" />By submitting, I confirm that all information provided is accurate and I authorize FinSites to use this data for building my compliant website.</p>
      </div>
    </div>
  );
}
