# FinSites Platform — PRD (V6)

## Problem Statement
Marketing platform for Indian financial professionals (MFD, Insurance, PMS, RIA, Stock Broker, SIF, NPS). Features: compliance audit, onboarding wizard, admin dashboard.

## Architecture
- Next.js 15 (App Router) + Supabase (PostgreSQL)
- Tailwind CSS v4, shadcn/ui, Framer Motion
- Server Actions for data fetching
- Compliance Engine: Cheerio + regex (78 rules, 13 categories)
- **DARK-ONLY** theme (#030712 bg, blue-600 accent, slate palette)

## Implemented (April 17, 2026)
- [x] Landing page (Hero, Stats, Features, Business Types, How-It-Works, Pricing, FAQ)
- [x] Compliance Audit (`/audit`): 78 rules, 13 categories, editable types + rescan
- [x] Plans (`/plans`): 3 Supabase-backed plans, enterprise dialog
- [x] 5-Step Wizard (`/onboarding`): Types, registration, services, design, review
- [x] Resume Wizard (email lookup for incomplete sessions)
- [x] Confirmation page (`/confirmation/[ref]`)
- [x] Setup page (`/setup`): Copy-able SQL schema
- [x] Admin Login (`/admin/login`): Cookie-based auth
- [x] Admin Dashboard (`/admin/dashboard`): Stats, Submissions + Audit History tabs
- [x] **UI/UX Rework**: Dark-only mode, removed theme toggle, deep midnight blue bg, royal blue accents, consistent dark cards (slate-900), no light sections

## Backlog
- P1: Marketing sub-pages per business type, Dynamic LLM for PRD, PDF audit export, Expand to 148+ rules
- P2: Email notifications, multi-admin, analytics dashboard
