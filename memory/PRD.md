# FinSites Platform — PRD (V6 Rewrite)

## Problem Statement
Build a marketing platform called FinSites for building compliant websites for Indian financial professionals (MFD, Insurance, PMS, RIA, Stock Broker, SIF, NPS). Features: marketing landing page, website compliance audit tool, plan selection, multi-step onboarding wizard, admin dashboard.

## Architecture (V6)
- **Frontend & Backend (Unified)**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui (base-ui), Framer Motion
- **Database & Auth**: Supabase (PostgreSQL) — all 7 tables live
- **Data Fetching**: Server Actions
- **Compliance Engine**: Cheerio + regex (78 rules, 13 categories)

## What's Been Implemented (April 16, 2026)
- [x] Next.js 15 + Tailwind v4 + shadcn/ui + Supabase (fully configured)
- [x] Dark mode (CSS var-based, uniform dark bg, theme dropdown)
- [x] **Landing page**: Hero, Stats, Features, Business Types (7), How-It-Works, Pricing, FAQ, CTAs
- [x] **Compliance Audit** (`/audit`): 78 rules across 13 categories, editable types + rescan
- [x] **Plans page** (`/plans`): 3 Supabase-backed plans, enterprise dialog
- [x] **5-Step Onboarding Wizard** (`/onboarding`): Types, registration, services, design, review+submit
- [x] **Resume Wizard**: Email lookup to find and restore incomplete sessions
- [x] **Confirmation page** (`/confirmation/[ref]`)
- [x] **Setup page** (`/setup`): Copy-able SQL schema
- [x] **Admin Login** (`/admin/login`): Cookie-based auth
- [x] **Admin Dashboard** (`/admin/dashboard`): Stats cards, tabbed interface:
  - Submissions tab: list, search, filter, status management dropdown
  - Audit History tab: recent scans with scores, detected types, pass/fail/critical counts

## Compliance Engine: 78 Rules, 13 Categories
- Registration & Identity (10 rules)
- Disclaimers & Disclosures (12 rules)
- Contact & Grievance (7 rules)
- Privacy & Legal (6 rules)
- Technical & Security (9 rules)
- Content Quality (10 rules)
- PMS Specific (5 rules)
- SIF Specific (2 rules)
- Stock Broker Specific (5 rules)
- MFD Specific (3 rules)
- RIA Specific (3 rules)
- Insurance Specific (3 rules)
- NPS Specific (3 rules)

## Prioritized Backlog
### P1
- Marketing sub-pages per business type (/solutions/mfd, etc.)
- Dynamic LLM selection for PRD prompt generation
- PDF export for audit reports
- Expand to 148+ rules

### P2
- Email notifications, abandoned lead tracking
- Multi-admin support, analytics dashboard
