-- FinSites V6 Database Schema
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New Query → Paste → Run

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
ON CONFLICT (email) DO NOTHING;
