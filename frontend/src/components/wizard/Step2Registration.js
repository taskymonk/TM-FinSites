import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, Loader2, Image } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Chandigarh","Puducherry","Ladakh","J&K","Lakshadweep","A&N Islands","Dadra & Nagar Haveli and Daman & Diu"];

function Field({ label, children, required }) {
  return <div><Label className="text-xs mb-1.5 block">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</Label>{children}</div>;
}

export default function Step2Registration({ data, businessTypes, contact, onChange }) {
  const ga = data.group_a || {};
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const update = (group, field, value) => {
    onChange({ [group]: { ...data[group], [field]: value } });
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("File too large. Max 5MB."); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data: result } = await axios.post(`${API}/api/upload/logo`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      update("group_a", "logo_file_id", result.file_id);
      update("group_a", "logo_url", `${API}${result.url}`);
      update("group_a", "logo_filename", result.filename);
      toast.success("Logo uploaded successfully!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally { setUploading(false); }
  };

  return (
    <div data-testid="wizard-step-2" className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 font-[var(--font-heading)]">Registration & Business Details</h2>
        <p className="text-sm text-muted-foreground">Provide your business and registration information. Fields marked * are required.</p>
      </div>

      <Accordion type="multiple" defaultValue={["group-a", ...businessTypes.map(t => `group-${t.toLowerCase()}`)]} className="space-y-3">
        {/* GROUP A - Universal */}
        <AccordionItem value="group-a" className="glass rounded-xl px-6 border-0">
          <AccordionTrigger className="font-semibold font-[var(--font-heading)] hover:no-underline">General Business Information</AccordionTrigger>
          <AccordionContent>
            <div className="grid sm:grid-cols-2 gap-4 pb-4">
              <Field label="Full Legal Name of Business" required><Input value={ga.business_name || contact?.name || ""} onChange={e => update("group_a", "business_name", e.target.value)} placeholder="ABC Financial Services" data-testid="field-business-name" /></Field>
              <Field label="Business Structure" required>
                <Select value={ga.business_structure || ""} onValueChange={v => update("group_a", "business_structure", v)}>
                  <SelectTrigger data-testid="field-business-structure"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{["Individual","Sole Proprietorship","Partnership Firm","LLP","Private Limited Company"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <div className="sm:col-span-2"><Field label="Registered Office Address" required><Textarea value={ga.address || ""} onChange={e => update("group_a", "address", e.target.value)} placeholder="Full address with landmark" rows={2} data-testid="field-address" /></Field></div>
              <Field label="PIN Code" required><Input value={ga.pin_code || ""} onChange={e => update("group_a", "pin_code", e.target.value)} placeholder="400001" maxLength={6} data-testid="field-pin" /></Field>
              <Field label="City" required><Input value={ga.city || ""} onChange={e => update("group_a", "city", e.target.value)} placeholder="Mumbai" data-testid="field-city" /></Field>
              <Field label="State" required>
                <Select value={ga.state || ""} onValueChange={v => update("group_a", "state", v)}>
                  <SelectTrigger data-testid="field-state"><SelectValue placeholder="Select state..." /></SelectTrigger>
                  <SelectContent>{STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Primary Phone" required><Input value={ga.phone || contact?.phone || ""} onChange={e => update("group_a", "phone", e.target.value)} placeholder="+91 XXXXX XXXXX" data-testid="field-phone" /></Field>
              <Field label="Email" required><Input type="email" value={ga.email || contact?.email || ""} onChange={e => update("group_a", "email", e.target.value)} placeholder="contact@business.com" data-testid="field-email" /></Field>
              <Field label="Years in Business"><Input type="number" value={ga.years_in_business || ""} onChange={e => update("group_a", "years_in_business", e.target.value)} placeholder="10" data-testid="field-years" /></Field>
              <Field label="Professional Qualifications"><Input value={ga.qualifications || ""} onChange={e => update("group_a", "qualifications", e.target.value)} placeholder="CA, CFP, CFA, MBA, NISM..." data-testid="field-qualifications" /></Field>
              <div className="sm:col-span-2"><Field label="Professional Bio"><Textarea value={ga.bio || ""} onChange={e => update("group_a", "bio", e.target.value)} placeholder="Describe your professional journey and philosophy..." rows={3} data-testid="field-bio" /></Field></div>
              <Field label="LinkedIn"><Input value={ga.linkedin || ""} onChange={e => update("group_a", "linkedin", e.target.value)} placeholder="https://linkedin.com/in/..." data-testid="field-linkedin" /></Field>
              <Field label="Website (if any)"><Input value={ga.website || ""} onChange={e => update("group_a", "website", e.target.value)} placeholder="https://..." data-testid="field-website" /></Field>
              <div className="sm:col-span-2 glass rounded-lg p-4 mt-2">
                <h4 className="text-sm font-semibold mb-3 font-[var(--font-heading)] flex items-center gap-2"><Image className="w-4 h-4 text-[hsl(var(--primary))]" /> Logo & Branding</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Do you have a logo?">
                    <div className="flex items-center gap-3 h-10"><Switch checked={ga.has_logo || false} onCheckedChange={v => update("group_a", "has_logo", v)} data-testid="field-has-logo" /><span className="text-sm">{ga.has_logo ? "Yes" : "No"}</span></div>
                  </Field>
                  {ga.has_logo && (
                    <div>
                      <Label className="text-xs mb-1.5 block">Upload Logo (PNG, JPG, SVG — max 5MB)</Label>
                      <input type="file" ref={fileRef} onChange={handleLogoUpload} accept="image/*" className="hidden" data-testid="logo-file-input" />
                      {ga.logo_url ? (
                        <div className="flex items-center gap-3">
                          <img src={ga.logo_url} alt="Logo" className="w-12 h-12 rounded-lg object-contain border border-border bg-secondary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-[hsl(var(--accent))]" />{ga.logo_filename || "Logo uploaded"}</p>
                            <button onClick={() => fileRef.current?.click()} className="text-xs text-[hsl(var(--primary))] hover:underline mt-0.5" data-testid="logo-change-btn">Change</button>
                          </div>
                        </div>
                      ) : (
                        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2 w-full" data-testid="logo-upload-btn">
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploading ? "Uploading..." : "Choose Logo File"}
                        </Button>
                      )}
                    </div>
                  )}
                  {ga.has_logo && (
                    <Field label="Brand Primary Color">
                      <div className="flex gap-2"><input type="color" value={ga.brand_primary || "#0055FF"} onChange={e => update("group_a", "brand_primary", e.target.value)} className="w-10 h-10 rounded cursor-pointer" /><Input value={ga.brand_primary || ""} onChange={e => update("group_a", "brand_primary", e.target.value)} className="flex-1 font-mono text-xs" placeholder="#0055FF" data-testid="field-brand-primary" /></div>
                    </Field>
                  )}
                  {ga.has_logo && (
                    <Field label="Brand Accent Color">
                      <div className="flex gap-2"><input type="color" value={ga.brand_accent || "#00E676"} onChange={e => update("group_a", "brand_accent", e.target.value)} className="w-10 h-10 rounded cursor-pointer" /><Input value={ga.brand_accent || ""} onChange={e => update("group_a", "brand_accent", e.target.value)} className="flex-1 font-mono text-xs" placeholder="#00E676" data-testid="field-brand-accent" /></div>
                    </Field>
                  )}
                  {!ga.has_logo && (
                    <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">No worries! We'll design a logo-appropriate header for your website. You can share your logo later or we can help create one.</p></div>
                  )}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* GROUP B - MFD */}
        {businessTypes.includes("MFD") && (
          <AccordionItem value="group-mfd" className="glass rounded-xl px-6 border-0">
            <AccordionTrigger className="font-semibold font-[var(--font-heading)] hover:no-underline">Mutual Fund Distribution Details</AccordionTrigger>
            <AccordionContent>
              <div className="grid sm:grid-cols-2 gap-4 pb-4">
                <Field label="ARN Number" required><Input value={data.group_b?.arn || ""} onChange={e => update("group_b", "arn", e.target.value)} placeholder="ARN-123456" data-testid="field-arn" /></Field>
                <Field label="EUIN Number(s)" required><Input value={data.group_b?.euin || ""} onChange={e => update("group_b", "euin", e.target.value)} placeholder="E123456" data-testid="field-euin" /></Field>
                <Field label="First AMFI Registration Date"><Input type="date" value={data.group_b?.registration_date || ""} onChange={e => update("group_b", "registration_date", e.target.value)} data-testid="field-amfi-date" /></Field>
                <Field label="Key AMC Partnerships"><Input value={data.group_b?.amc_partners || ""} onChange={e => update("group_b", "amc_partners", e.target.value)} placeholder="Empanelled with 30+ AMCs" data-testid="field-amc" /></Field>
                <Field label="AUM Range">
                  <Select value={data.group_b?.aum_range || ""} onValueChange={v => update("group_b", "aum_range", v)}>
                    <SelectTrigger><SelectValue placeholder="Select range..." /></SelectTrigger>
                    <SelectContent>{["Below 1 Cr","1-10 Cr","10-50 Cr","50-100 Cr","100 Cr+"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Families Served"><Input type="number" value={data.group_b?.families_served || ""} onChange={e => update("group_b", "families_served", e.target.value)} placeholder="500" data-testid="field-families" /></Field>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* GROUP C - Insurance */}
        {businessTypes.includes("Insurance") && (
          <AccordionItem value="group-insurance" className="glass rounded-xl px-6 border-0">
            <AccordionTrigger className="font-semibold font-[var(--font-heading)] hover:no-underline">Insurance Details</AccordionTrigger>
            <AccordionContent>
              <div className="grid sm:grid-cols-2 gap-4 pb-4">
                <Field label="IRDAI License Number" required><Input value={data.group_c?.irdai_number || ""} onChange={e => update("group_c", "irdai_number", e.target.value)} placeholder="IRDAI registration number" data-testid="field-irdai" /></Field>
                <Field label="License Type" required>
                  <Select value={data.group_c?.license_type || ""} onValueChange={v => update("group_c", "license_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                    <SelectContent>{["Individual Agent","Corporate Agent","Broker","POSP","Insurance Marketing Firm"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Category"><Input value={data.group_c?.category || ""} onChange={e => update("group_c", "category", e.target.value)} placeholder="Life, General, Health, Composite" data-testid="field-ins-category" /></Field>
                <Field label="Insurer(s) Represented"><Input value={data.group_c?.insurers || ""} onChange={e => update("group_c", "insurers", e.target.value)} placeholder="LIC, HDFC Life, ICICI Prudential..." data-testid="field-insurers" /></Field>
                <Field label="License Valid From"><Input type="date" value={data.group_c?.valid_from || ""} onChange={e => update("group_c", "valid_from", e.target.value)} data-testid="field-ins-from" /></Field>
                <Field label="License Valid To"><Input type="date" value={data.group_c?.valid_to || ""} onChange={e => update("group_c", "valid_to", e.target.value)} data-testid="field-ins-to" /></Field>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* GROUP D - PMS */}
        {businessTypes.includes("PMS") && (
          <AccordionItem value="group-pms" className="glass rounded-xl px-6 border-0">
            <AccordionTrigger className="font-semibold font-[var(--font-heading)] hover:no-underline">PMS Details</AccordionTrigger>
            <AccordionContent>
              <div className="grid sm:grid-cols-2 gap-4 pb-4">
                <Field label="SEBI PMS Registration Number" required><Input value={data.group_d?.sebi_pms || ""} onChange={e => update("group_d", "sebi_pms", e.target.value)} placeholder="INP000XXXXXX" data-testid="field-pms-reg" /></Field>
                <Field label="PMS Type"><Input value={data.group_d?.pms_type || ""} onChange={e => update("group_d", "pms_type", e.target.value)} placeholder="Discretionary / Non-Discretionary / Advisory" data-testid="field-pms-type" /></Field>
                <Field label="Strategy Name"><Input value={data.group_d?.strategy_name || ""} onChange={e => update("group_d", "strategy_name", e.target.value)} placeholder="Multi-cap Growth Strategy" data-testid="field-strategy" /></Field>
                <Field label="Benchmark"><Input value={data.group_d?.benchmark || ""} onChange={e => update("group_d", "benchmark", e.target.value)} placeholder="Nifty 50, BSE 500" data-testid="field-benchmark" /></Field>
                <Field label="Management Fee (% p.a.)"><Input value={data.group_d?.mgmt_fee || ""} onChange={e => update("group_d", "mgmt_fee", e.target.value)} placeholder="2.5" data-testid="field-mgmt-fee" /></Field>
                <Field label="Min Investment (INR)"><Input value={data.group_d?.min_investment || "5000000"} onChange={e => update("group_d", "min_investment", e.target.value)} placeholder="5000000" data-testid="field-pms-min" /></Field>
                <Field label="Principal Officer"><Input value={data.group_d?.principal_officer || ""} onChange={e => update("group_d", "principal_officer", e.target.value)} placeholder="Name, Designation, Contact" data-testid="field-pms-po" /></Field>
                <Field label="Compliance Officer"><Input value={data.group_d?.compliance_officer || ""} onChange={e => update("group_d", "compliance_officer", e.target.value)} placeholder="Name, Designation, Contact" data-testid="field-pms-co" /></Field>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* GROUP E - AIF */}
        {businessTypes.includes("AIF") && (
          <AccordionItem value="group-aif" className="glass rounded-xl px-6 border-0">
            <AccordionTrigger className="font-semibold font-[var(--font-heading)] hover:no-underline">AIF Details</AccordionTrigger>
            <AccordionContent>
              <div className="grid sm:grid-cols-2 gap-4 pb-4">
                <Field label="SEBI AIF Registration Number" required><Input value={data.group_e?.sebi_aif || ""} onChange={e => update("group_e", "sebi_aif", e.target.value)} placeholder="IN/AIF/XX-XX/XXXX/XXXXX" data-testid="field-aif-reg" /></Field>
                <Field label="AIF Category" required>
                  <Select value={data.group_e?.aif_category || ""} onValueChange={v => update("group_e", "aif_category", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{["Category I","Category II","Category III"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Fund/Scheme Name"><Input value={data.group_e?.fund_name || ""} onChange={e => update("group_e", "fund_name", e.target.value)} placeholder="Growth Equity Fund I" data-testid="field-fund-name" /></Field>
                <Field label="Sponsor Name"><Input value={data.group_e?.sponsor || ""} onChange={e => update("group_e", "sponsor", e.target.value)} data-testid="field-sponsor" /></Field>
                <Field label="Investment Manager"><Input value={data.group_e?.investment_manager || ""} onChange={e => update("group_e", "investment_manager", e.target.value)} data-testid="field-inv-manager" /></Field>
                <Field label="Min Investment (INR)"><Input value={data.group_e?.min_investment || "10000000"} onChange={e => update("group_e", "min_investment", e.target.value)} placeholder="10000000" data-testid="field-aif-min" /></Field>
                <Field label="Fund Tenure"><Input value={data.group_e?.fund_tenure || ""} onChange={e => update("group_e", "fund_tenure", e.target.value)} placeholder="7 years" data-testid="field-tenure" /></Field>
                <Field label="Compliance Officer"><Input value={data.group_e?.compliance_officer || ""} onChange={e => update("group_e", "compliance_officer", e.target.value)} data-testid="field-aif-co" /></Field>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* GROUP F - SIF */}
        {businessTypes.includes("SIF") && (
          <AccordionItem value="group-sif" className="glass rounded-xl px-6 border-0">
            <AccordionTrigger className="font-semibold font-[var(--font-heading)] hover:no-underline">SIF Distribution Details</AccordionTrigger>
            <AccordionContent>
              <div className="grid sm:grid-cols-2 gap-4 pb-4">
                <Field label="ARN Number" required><Input value={data.group_f?.arn || data.group_b?.arn || ""} onChange={e => update("group_f", "arn", e.target.value)} placeholder="ARN-123456" data-testid="field-sif-arn" /></Field>
                <Field label="NISM-Series-XXI-A Certified" required>
                  <div className="flex items-center gap-3 h-10"><Switch checked={data.group_f?.nism_certified || false} onCheckedChange={v => update("group_f", "nism_certified", v)} data-testid="field-nism-cert" /><span className="text-sm">{data.group_f?.nism_certified ? "Yes" : "No"}</span></div>
                </Field>
                <div className="sm:col-span-2"><Field label="SIF Strategies"><Textarea value={data.group_f?.strategies || ""} onChange={e => update("group_f", "strategies", e.target.value)} placeholder="Equity long-short, sector rotation..." rows={2} data-testid="field-sif-strategies" /></Field></div>
                <Field label="Associated AMCs"><Input value={data.group_f?.amcs || ""} onChange={e => update("group_f", "amcs", e.target.value)} placeholder="AMC names" data-testid="field-sif-amcs" /></Field>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* GROUP G - RIA */}
        {businessTypes.includes("RIA") && (
          <AccordionItem value="group-ria" className="glass rounded-xl px-6 border-0">
            <AccordionTrigger className="font-semibold font-[var(--font-heading)] hover:no-underline">Investment Adviser Details</AccordionTrigger>
            <AccordionContent>
              <div className="grid sm:grid-cols-2 gap-4 pb-4">
                <Field label="SEBI IA Registration Number" required><Input value={data.group_g?.sebi_ria || ""} onChange={e => update("group_g", "sebi_ria", e.target.value)} placeholder="INA/XXXXXXX" data-testid="field-ria-reg" /></Field>
                <Field label="IA Type" required>
                  <Select value={data.group_g?.ia_type || ""} onValueChange={v => update("group_g", "ia_type", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{["Individual","Non-Individual","Part-time"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Fee Mode" required>
                  <Select value={data.group_g?.fee_mode || ""} onValueChange={v => update("group_g", "fee_mode", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent><SelectItem value="AUA">Assets Under Advice (AUA)</SelectItem><SelectItem value="Fixed Fee">Fixed Fee</SelectItem></SelectContent>
                  </Select>
                </Field>
                <Field label={data.group_g?.fee_mode === "AUA" ? "Fee Rate (% p.a., max 2.5%)" : "Annual Fee (INR, max 1,51,000)"}>
                  <Input value={data.group_g?.fee_rate || ""} onChange={e => update("group_g", "fee_rate", e.target.value)} placeholder={data.group_g?.fee_mode === "AUA" ? "2.0" : "75000"} data-testid="field-ria-fee" />
                </Field>
                <Field label="NISM Certifications"><Input value={data.group_g?.nism_certs || ""} onChange={e => update("group_g", "nism_certs", e.target.value)} placeholder="XA, XB, XC" data-testid="field-ria-nism" /></Field>
                <Field label="Uses AI Tools in Advisory">
                  <div className="flex items-center gap-3 h-10"><Switch checked={data.group_g?.uses_ai || false} onCheckedChange={v => update("group_g", "uses_ai", v)} data-testid="field-ria-ai" /><span className="text-sm">{data.group_g?.uses_ai ? "Yes" : "No"}</span></div>
                </Field>
                {data.group_g?.uses_ai && (
                  <div className="sm:col-span-2"><Field label="AI Usage Description (mandatory disclosure)"><Textarea value={data.group_g?.ai_description || ""} onChange={e => update("group_g", "ai_description", e.target.value)} placeholder="Describe how AI tools are used..." rows={2} data-testid="field-ria-ai-desc" /></Field></div>
                )}
                <Field label="Operates Distribution via SIDD">
                  <div className="flex items-center gap-3 h-10"><Switch checked={data.group_g?.sidd || false} onCheckedChange={v => update("group_g", "sidd", v)} data-testid="field-ria-sidd" /><span className="text-sm">{data.group_g?.sidd ? "Yes" : "No"}</span></div>
                </Field>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}
