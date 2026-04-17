# FinSites Platform — PRD (V6)

## Problem Statement
Marketing platform for Indian financial professionals. Compliance audit, onboarding wizard, admin dashboard.

## Architecture
- Next.js 15 (App Router) + Supabase
- Tailwind CSS v4, shadcn/ui, Framer Motion
- Server Actions, Cheerio compliance engine (78 rules, 13 categories)
- Dark-only theme (#030712 bg, blue-600 accent)

## Implemented (April 17, 2026)
- [x] Landing page (Hero, Stats, Features, Business Types, How-It-Works, Pricing, FAQ)
- [x] Compliance Audit (`/audit`): 78 rules, 13 categories, editable types + rescan
- [x] Plans (`/plans`): 3 Supabase-backed plans, enterprise dialog
- [x] 5-Step Wizard (`/onboarding`): Types, registration, services, design, review
- [x] Resume Wizard (email lookup for incomplete sessions)
- [x] Confirmation page (`/confirmation/[ref]`)
- [x] Setup page (`/setup`): Copy-able SQL schema
- [x] Dark-only UI (no theme toggle)
- [x] **Admin Dashboard** (`/admin/dashboard`):
  - Left sidebar navigation (Dashboard, Submissions, Audit History)
  - Dashboard: Stats cards + recent submissions
  - Submissions: Top-level filter buttons, search, view/edit detail dialog, export Markdown, delete
  - Audit History: Search, individual delete, clear all history
  - Submission detail: Edit contact info, view registration/services/design data, export as client brief MD

## Backlog
- P1: Marketing sub-pages per business type, Dynamic LLM for PRD, PDF audit export, Expand to 148+ rules
- P2: Email notifications, multi-admin, analytics dashboard
