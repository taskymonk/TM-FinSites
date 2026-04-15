import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const AUDIENCES = ["Salaried Professionals","Business Owners","HNIs / UHNIs","NRIs","Retirees","Women Investors","Young Professionals","Families","Corporate / Institutional"];
const CALCULATORS = ["SIP Calculator","Retirement Calculator","Insurance Need Calculator","Goal Planner","EMI Calculator"];

function Field({ label, children, required }) {
  return <div><Label className="text-xs mb-1.5 block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>{children}</div>;
}

export default function Step3Services({ data, businessTypes, onChange }) {
  const update = (field, value) => onChange({ [field]: value });
  const toggleArr = (field, item) => {
    const arr = data[field] || [];
    update(field, arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);
  };

  return (
    <div data-testid="wizard-step-3" className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2 font-[var(--font-heading)]">Services, Content & Value Proposition</h2>
        <p className="text-sm text-muted-foreground">Tell us about your services and what makes you unique. This will shape your website's content.</p>
      </div>

      {/* Target Audience */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 font-[var(--font-heading)]">Target Audience</h3>
        <div className="flex flex-wrap gap-2">
          {AUDIENCES.map(a => (
            <button key={a} onClick={() => toggleArr("target_audience", a)} data-testid={`audience-${a.toLowerCase().replace(/\s/g,'-')}`}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${(data.target_audience || []).includes(a) ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" : "border-border text-muted-foreground hover:border-[hsl(var(--primary)/0.3)]"}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Value Proposition */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 font-[var(--font-heading)]">Value Proposition</h3>
        <Field label="What's the ONE thing that sets you apart?" required>
          <Textarea value={data.value_proposition || ""} onChange={e => update("value_proposition", e.target.value)} placeholder="Describe your unique philosophy or approach..." rows={3} data-testid="field-value-prop" />
        </Field>
      </div>

      {/* Process */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 font-[var(--font-heading)]">Client Engagement Process</h3>
        <Field label="How does a client typically engage with you?">
          <Textarea value={data.process || ""} onChange={e => update("process", e.target.value)} placeholder="E.g., Discovery call -> Risk profiling -> Proposal -> Onboarding -> Ongoing review" rows={3} data-testid="field-process" />
        </Field>
      </div>

      {/* Social Proof */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 font-[var(--font-heading)]">Trust Indicators</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Clients/Families Served"><Input value={data.clients_served || ""} onChange={e => update("clients_served", e.target.value)} placeholder="500+" data-testid="field-clients" /></Field>
          <Field label="Years of Experience"><Input value={data.experience_years || ""} onChange={e => update("experience_years", e.target.value)} placeholder="15" data-testid="field-experience" /></Field>
          <Field label="Awards / Media Mentions"><Input value={data.awards || ""} onChange={e => update("awards", e.target.value)} placeholder="List any recognition..." data-testid="field-awards" /></Field>
          <Field label="Professional Memberships"><Input value={data.memberships || ""} onChange={e => update("memberships", e.target.value)} placeholder="CFP, CFA, FPSB..." data-testid="field-memberships" /></Field>
        </div>
      </div>

      {/* Content Preferences */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 font-[var(--font-heading)]">Content Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Blog / Resources Section</Label>
            <Switch checked={data.has_blog || false} onCheckedChange={v => update("has_blog", v)} data-testid="field-blog" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">FAQ Section</Label>
            <Switch checked={data.has_faq || false} onCheckedChange={v => update("has_faq", v)} data-testid="field-faq" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Newsletter Signup</Label>
            <Switch checked={data.has_newsletter || false} onCheckedChange={v => update("has_newsletter", v)} data-testid="field-newsletter" />
          </div>
          <div>
            <Label className="text-xs mb-2 block">Calculators Desired</Label>
            <div className="flex flex-wrap gap-2">
              {CALCULATORS.map(c => (
                <button key={c} onClick={() => toggleArr("calculators", c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${(data.calculators || []).includes(c) ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]" : "border-border text-muted-foreground"}`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Strategy */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-semibold mb-4 font-[var(--font-heading)]">Call-to-Action Strategy</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Primary CTA" required>
            <Select value={data.primary_cta || ""} onValueChange={v => update("primary_cta", v)}>
              <SelectTrigger data-testid="field-cta"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{["Book a Consultation","Schedule a Call","WhatsApp Us","Get Started","Contact Form","Custom"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="WhatsApp Number (if applicable)"><Input value={data.whatsapp || ""} onChange={e => update("whatsapp", e.target.value)} placeholder="+91 XXXXX XXXXX" data-testid="field-whatsapp" /></Field>
          <Field label="Calendly / Booking Link"><Input value={data.booking_link || ""} onChange={e => update("booking_link", e.target.value)} placeholder="https://calendly.com/..." data-testid="field-booking" /></Field>
        </div>
      </div>
    </div>
  );
}
