"use client"
import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Copy, Database, ExternalLink } from "lucide-react"
import { toast } from "sonner"

const SCHEMA_SQL = `-- FinSites V6 Database Schema
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New Query > Paste > Run

-- ==================== COMPLIANCE RULES ====================
CREATE TABLE IF NOT EXISTS compliance_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id TEXT UNIQUE NOT NULL,
  business_type TEXT NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'major',
  check_type TEXT NOT NULL DEFAULT 'text_search',
  check_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== AUDITS ====================
CREATE TABLE IF NOT EXISTS audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scanning',
  detected_business_types TEXT[] DEFAULT '{}',
  detected_data JSONB DEFAULT '{}',
  compliance_report JSONB DEFAULT '{}',
  raw_text TEXT,
  raw_links TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== PLANS ====================
CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price_display TEXT,
  price_amount INT DEFAULT 0,
  description TEXT,
  business_types_limit INT DEFAULT 1,
  features TEXT[] DEFAULT '{}',
  delivery_days INT DEFAULT 7,
  support_type TEXT DEFAULT 'Email',
  is_contact_us BOOLEAN DEFAULT false,
  is_popular BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== WIZARD SESSIONS ====================
CREATE TABLE IF NOT EXISTS wizard_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  audit_id TEXT,
  plan_id TEXT,
  contact JSONB DEFAULT '{}',
  current_step INT DEFAULT 1,
  status TEXT DEFAULT 'in_progress',
  business_types TEXT[] DEFAULT '{}',
  data JSONB DEFAULT '{}',
  prefilled_from_audit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== SUBMISSIONS ====================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id TEXT UNIQUE NOT NULL,
  session_id TEXT,
  reference_number TEXT UNIQUE NOT NULL,
  audit_id TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  business_types TEXT[] DEFAULT '{}',
  plan JSONB DEFAULT '{}',
  status TEXT DEFAULT 'submitted',
  status_history JSONB[] DEFAULT ARRAY[]::JSONB[],
  data JSONB DEFAULT '{}',
  payment JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== ENTERPRISE CONTACTS ====================
CREATE TABLE IF NOT EXISTS enterprise_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  message TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== ADMIN USERS ====================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ
);

-- ==================== SEED DEFAULT PLANS ====================
INSERT INTO plans (plan_id, name, price_display, price_amount, description, business_types_limit, features, delivery_days, support_type, is_contact_us, is_popular, sort_order) VALUES
('starter', 'Starter', 'Starting at INR 9,999', 9999, 'Perfect for individual practitioners with a single business type', 1, ARRAY['Single business type website','5 core compliance pages','Full regulatory compliance','Standard design template','SSL certificate included','Mobile responsive design','Basic SEO optimization','Email support','7 working days delivery'], 7, 'Email', false, false, 1),
('professional', 'Professional', 'Starting at INR 24,999', 24999, 'Ideal for multi-service firms needing comprehensive compliance', 3, ARRAY['Up to 3 business types','8+ pages with blog & calculators','Full compliance + combination rules','Custom design with brand colors','SSL certificate included','Advanced SEO optimization','Priority email + call support','5 working days delivery'], 5, 'Priority', false, true, 2),
('enterprise', 'Enterprise', 'Custom Quote', 0, 'For large firms & institutions needing bespoke solutions', -1, ARRAY['Unlimited business type combinations','Unlimited pages','Full compliance + ongoing monitoring','Fully bespoke design','White-label option available','API access','Dedicated account manager','3 working days delivery'], 3, 'Dedicated', true, false, 3)
ON CONFLICT (plan_id) DO NOTHING;

-- ==================== RLS POLICIES ====================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE wizard_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprise_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read" ON plans FOR SELECT USING (true);
CREATE POLICY "rules_public_read" ON compliance_rules FOR SELECT USING (true);
CREATE POLICY "audits_all" ON audits FOR ALL USING (true);
CREATE POLICY "sessions_all" ON wizard_sessions FOR ALL USING (true);
CREATE POLICY "submissions_all" ON submissions FOR ALL USING (true);
CREATE POLICY "contacts_all" ON enterprise_contacts FOR ALL USING (true);
CREATE POLICY "admin_all" ON admin_users FOR ALL USING (true);

-- ==================== SEED ADMIN USER ====================
-- Password: admin123 (bcrypt hash)
INSERT INTO admin_users (email, password_hash, name, role) VALUES
('admin@finsites.in', '$2b$12$LJ3m4ys3UYBlv/DKCw/OOu8M7V8g5o5x5b5x5b5x5b5x5b5x5b5x5', 'Admin', 'admin')
ON CONFLICT (email) DO NOTHING;`

const TABLES = [
  { name: "compliance_rules", desc: "Stores the 148+ regulatory check definitions" },
  { name: "audits", desc: "Website audit results and compliance reports" },
  { name: "plans", desc: "Pricing plans (Starter, Professional, Enterprise)" },
  { name: "wizard_sessions", desc: "Multi-step onboarding wizard state" },
  { name: "submissions", desc: "Completed client submissions" },
  { name: "enterprise_contacts", desc: "Enterprise inquiry form submissions" },
  { name: "admin_users", desc: "Admin dashboard authentication" },
]

export default function SetupPage() {
  const [copied, setCopied] = useState(false)

  async function copySchema() {
    try {
      await navigator.clipboard.writeText(SCHEMA_SQL)
      setCopied(true)
      toast.success("SQL schema copied to clipboard!")
      setTimeout(() => setCopied(false), 3000)
    } catch {
      toast.error("Copy failed. Please select and copy manually.")
    }
  }

  return (
    <div className="min-h-screen" data-testid="setup-page">
      <Navbar />
      <div className="pt-20 pb-16">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-card/40 text-xs font-medium text-muted-foreground mb-4">
              <Database className="w-3.5 h-3.5 text-primary" /> Database Setup
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3 font-[family-name:var(--font-heading)]" data-testid="setup-title">
              Supabase Schema Setup
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Run this SQL in your Supabase project to create all required tables, seed data, and security policies.
            </p>
          </div>

          {/* Steps */}
          <Card className="glass mb-8">
            <CardHeader><CardTitle className="text-base text-foreground">Setup Instructions</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {[
                  { step: "1", text: "Open your Supabase Dashboard", link: "https://supabase.com/dashboard" },
                  { step: "2", text: "Navigate to SQL Editor (left sidebar)" },
                  { step: "3", text: "Click 'New Query'" },
                  { step: "4", text: "Copy the SQL below and paste it into the editor" },
                  { step: "5", text: "Click 'Run' (or Ctrl+Enter)" },
                ].map((item) => (
                  <li key={item.step} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">{item.step}</span>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-sm text-foreground">{item.text}</span>
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                          Open <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Tables Overview */}
          <Card className="glass mb-8">
            <CardHeader><CardTitle className="text-base text-foreground">Tables Created</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {TABLES.map((t) => (
                  <div key={t.name} className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border/30">
                    <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <div>
                      <span className="text-sm font-mono font-medium text-foreground">{t.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">3 Seeded Plans</Badge>
                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-xs">RLS Policies</Badge>
                <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 text-xs">Admin User Seed</Badge>
              </div>
            </CardContent>
          </Card>

          {/* SQL Schema */}
          <Card className="glass" data-testid="schema-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-foreground">SQL Schema</CardTitle>
                <Button onClick={copySchema} variant="outline" size="sm" className="gap-1.5 text-xs h-8" data-testid="copy-schema-btn">
                  {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy SQL</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 rounded-xl bg-[oklch(0.08_0.015_260)] text-[oklch(0.82_0.01_260)] text-xs leading-relaxed overflow-x-auto max-h-[500px] overflow-y-auto font-mono border border-border/30" data-testid="schema-code">
                  <code>{SCHEMA_SQL}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
      <Footer />
    </div>
  )
}
