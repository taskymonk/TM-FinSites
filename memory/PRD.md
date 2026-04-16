# FinSites Platform — PRD (V6 Rewrite)

## Problem Statement
Build a marketing platform called FinSites for building compliant websites for Indian financial professionals (MFD, Insurance, PMS, RIA, Stock Broker, SIF, NPS). Features: marketing landing page, website compliance audit tool (148+ rules), plan selection, multi-step onboarding wizard, admin dashboard, dynamic LLM integration for PRD generation.

## Architecture (V6)
- **Frontend & Backend (Unified)**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui (base-ui), Framer Motion
- **Database & Auth**: Supabase (PostgreSQL) — schema at `/app/supabase_schema.sql`
- **Data Fetching**: Server Actions (NOT /api routes — K8s ingress routes /api to old Python backend)
- **Compliance Engine**: Cheerio-based HTML parsing with regex rule matching
- **Deployment**: Next.js dev on port 3000 via supervisor

## User Personas
1. **Financial Professional (Client)**: MFD/Insurance/PMS/RIA/Stock Broker/SIF/NPS professional needing a compliant website
2. **Admin**: FinSites team managing submissions, updating statuses
3. **Prospect**: Visitor exploring the platform, running free audits

## Core Requirements
- Marketing landing page showcasing the platform (7 sections)
- Website audit tool scanning for SEBI/AMFI/IRDAI/PFRDA compliance (28+ rules, 7 categories)
- Plan selection (Starter/Professional/Enterprise)
- Multi-step onboarding wizard (future)
- Admin dashboard (future)
- Light/Dark/System theme toggle

## What's Been Implemented (April 16, 2026 — V6 Session 1)
- [x] Next.js 15 App Router project initialized with Tailwind v4, shadcn/ui
- [x] Supabase client utilities (browser + server)
- [x] Supabase schema SQL generated (`/app/supabase_schema.sql`)
- [x] Custom theme with oklch colors (dark/light), glass-morphism effects
- [x] Navbar with scroll navigation, mobile menu, theme toggle
- [x] Footer with product/company/legal links
- [x] Landing page: Hero, Problem Stats, Features (6), Business Types (7), How-It-Works (3 steps), Pricing (3 plans), FAQ (6 items), CTAs
- [x] Free Compliance Audit page: URL input, real-time scanning via server action, score ring, summary cards, category breakdown, detailed results with tabs (Failed/Passed/All), severity badges
- [x] Compliance Engine: 28 rules across 7 categories (Registration, Disclaimers, Contact, Privacy, Technical, Content Quality, PMS/SIF/Stock Broker specifics)
- [x] Plans page: 3 plan cards with features, enterprise contact dialog
- [x] Server Actions for data fetching (fetchPlans, runAudit, submitEnterpriseContact)
- [x] Fallback plan data when Supabase is not configured
- [x] Next.js config with allowed origins for server actions

## Pending: Supabase Schema Execution
User needs to run `/app/supabase_schema.sql` in Supabase SQL Editor to create tables (plans, audits, compliance_rules, wizard_sessions, submissions, enterprise_contacts, admin_users).

## Prioritized Backlog
### P0 (Critical)
- Supabase schema execution by user
- Onboarding Wizard V2 (multi-step data collection for 7 business types)
- Compliance Engine V2 (expand to 148+ rules)
- Admin authentication (Supabase Auth)

### P1 (High)
- Marketing sub-pages per business type (/solutions/mfd, /solutions/ria, etc.)
- Admin dashboard (submissions, status management)
- Dynamic LLM selection for PRD prompt generation
- PDF export for audit reports

### P2 (Medium)
- Email notifications
- Abandoned lead tracking
- Multi-admin support
- Analytics dashboard

### P3 (Nice to Have)
- LLM-powered conversational wizard mode
- Re-scan audit capability
- Client portal
- Multi-language support

## Next Tasks
1. User to confirm Supabase schema execution
2. Build Onboarding Wizard with Supabase session persistence
3. Expand Compliance Engine to 148+ rules
4. Add admin authentication
5. Build admin dashboard
