# FinSites Platform — PRD (V6 Rewrite)

## Problem Statement
Build a marketing platform called FinSites for building compliant websites for Indian financial professionals (MFD, Insurance, PMS, RIA, Stock Broker, SIF, NPS). Features: marketing landing page, website compliance audit tool, plan selection, multi-step onboarding wizard, admin dashboard.

## Architecture (V6)
- **Frontend & Backend (Unified)**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui (base-ui), Framer Motion
- **Database & Auth**: Supabase (PostgreSQL) — all 7 tables live
- **Data Fetching**: Server Actions
- **Compliance Engine**: Cheerio + regex (28 rules, 7 categories)

## What's Been Implemented (April 16, 2026)
- [x] Next.js 15 + Tailwind v4 + shadcn/ui
- [x] Supabase fully configured — tables, plans, admin seeded
- [x] Dark mode properly fixed (CSS var-based, uniform dark bg)
- [x] Theme toggle dropdown (Light/Dark/System)
- [x] **Landing page**: Hero, Stats, Features, Business Types, How-It-Works, Pricing, FAQ, CTAs
- [x] **Compliance Audit** (`/audit`): URL scanning, score ring, categories, editable types + rescan
- [x] **Plans page** (`/plans`): 3 plans from Supabase, enterprise dialog
- [x] **Setup page** (`/setup`): Copy-able SQL schema
- [x] **5-Step Onboarding Wizard** (`/onboarding`): Types, registration, services, design, review+submit
- [x] **Resume Wizard**: Email lookup to find and restore incomplete sessions
- [x] **Confirmation page** (`/confirmation/[ref]`): Reference number, next steps
- [x] **Admin Login** (`/admin/login`): Email/password auth with httpOnly cookie
- [x] **Admin Dashboard** (`/admin/dashboard`): Stats cards (submissions, sessions, audits, enterprise), submissions list, search, filter, status management with dropdown

## Prioritized Backlog
### P0
- Expand Compliance Engine to 148+ rules

### P1
- Marketing sub-pages per business type (/solutions/mfd, etc.)
- Dynamic LLM selection for PRD prompt generation
- PDF export for audit reports

### P2
- Email notifications, abandoned lead tracking
- Multi-admin support, analytics dashboard
