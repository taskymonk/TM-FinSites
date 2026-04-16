# FinSites Platform — PRD (V6 Rewrite)

## Problem Statement
Build a marketing platform called FinSites for building compliant websites for Indian financial professionals (MFD, Insurance, PMS, RIA, Stock Broker, SIF, NPS). Features: marketing landing page, website compliance audit tool (148+ rules), plan selection, multi-step onboarding wizard, admin dashboard, dynamic LLM integration for PRD generation.

## Architecture (V6)
- **Frontend & Backend (Unified)**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui (base-ui), Framer Motion
- **Database & Auth**: Supabase (PostgreSQL) — schema executed, all tables live
- **Data Fetching**: Server Actions (NOT /api routes — K8s ingress routes /api to old Python backend)
- **Compliance Engine**: Cheerio-based HTML parsing with regex rule matching
- **Deployment**: Next.js dev on port 3000 via supervisor

## What's Been Implemented (April 16, 2026)
- [x] Next.js 15 App Router project with Tailwind v4, shadcn/ui
- [x] Supabase fully configured — all 7 tables live, plans seeded
- [x] Dark mode properly fixed (body uses CSS var, uniform dark bg, no light sections)
- [x] Theme toggle dropdown (Light/Dark/System selector)
- [x] Navbar, Footer with all navigation links
- [x] **Landing page**: Hero, Problem Stats, Features (6), Business Types (7), How-It-Works, Pricing, FAQ, CTAs
- [x] **Free Compliance Audit** (`/audit`): URL scanning, score ring, summary, categories, detailed results, editable business types + rescan
- [x] **Compliance Engine**: 28 rules, 7 categories, auto-detect + user-override modes
- [x] **Plans page** (`/plans`): 3 plan cards from Supabase, enterprise contact dialog
- [x] **Setup page** (`/setup`): Copy-able SQL schema, setup instructions
- [x] **5-Step Onboarding Wizard** (`/onboarding`): Business type selection, registration details (per type), services, design preferences, review & submit. Supabase session persistence.
- [x] **Confirmation page** (`/confirmation/[ref]`): Reference number, next steps, navigation
- [x] Server Actions: fetchPlans, runAudit, runAuditWithTypes, submitEnterpriseContact, createWizardSession, updateWizardSession, submitWizard

## Prioritized Backlog
### P0 (Critical)
- Admin authentication (Supabase Auth)
- Admin dashboard (submissions list, status management)
- Expand Compliance Engine to 148+ rules

### P1 (High)
- Marketing sub-pages per business type (/solutions/mfd, /solutions/ria)
- Dynamic LLM selection for PRD prompt generation
- PDF export for audit reports

### P2 (Medium)
- Email notifications, abandoned lead tracking
- Multi-admin support, analytics dashboard

## Next Tasks
1. Admin auth + dashboard
2. Expand Compliance Engine to 148+ rules
3. Marketing sub-pages per business type
