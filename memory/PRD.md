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

## What's Been Implemented (April 16, 2026)
- [x] Next.js 15 App Router project with Tailwind v4, shadcn/ui
- [x] Supabase client utilities + schema SQL
- [x] Dark/Light theme with improved dark mode contrast (raised card bg, border, muted-foreground lightness; stat labels use color-matched text)
- [x] Navbar, Footer, Theme toggle (with hydration fix)
- [x] **Landing page**: Hero, Problem Stats, Features (6), Business Types (7), How-It-Works, Pricing (3 plans), FAQ (6 items), CTAs
- [x] **Free Compliance Audit** (`/audit`): URL input, scanning via server action, score ring, summary, category breakdown, detailed results (tabs)
- [x] **Editable business types**: Toggle chips for all 7 types, "Rescan with Updated Types" button re-runs engine with user selection
- [x] **Compliance Engine**: 28 rules, 7 categories, supports both auto-detect and user-override modes
- [x] **Plans page** (`/plans`): 3 plan cards, enterprise contact dialog
- [x] **Setup page** (`/setup`): Copy-able Supabase SQL schema, setup instructions, tables overview
- [x] Server Actions: fetchPlans, runAudit, runAuditWithTypes, submitEnterpriseContact
- [x] Fallback plan data when Supabase not configured

## Pending: Supabase Schema Execution
User needs to run SQL at `/setup` page or from `/app/supabase_schema.sql` in Supabase SQL Editor.

## Prioritized Backlog
### P0 (Critical)
- Supabase schema execution by user
- Onboarding Wizard V2 (multi-step for 7 business types)
- Compliance Engine V2 (expand to 148+ rules)
- Admin authentication (Supabase Auth)

### P1 (High)
- Marketing sub-pages per business type
- Admin dashboard
- Dynamic LLM selection for PRD generation
- PDF export for audit reports

### P2 (Medium)
- Email notifications, abandoned lead tracking
- Multi-admin support, analytics dashboard

## Next Tasks
1. User confirms Supabase schema execution
2. Build Onboarding Wizard with Supabase persistence
3. Expand Compliance Engine to 148+ rules
4. Add admin authentication + dashboard
