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
- [x] Compliance Audit (`/audit`): 78 rules, 13 categories, editable types + rescan, **top-level filter buttons** (Failed/Passed/All)
- [x] **Audit-to-Onboarding Prefill**: CTA passes detected types + URL to wizard, green prefill banner confirms
- [x] Plans (`/plans`): 3 Supabase-backed plans, enterprise dialog
- [x] 5-Step Wizard (`/onboarding`): Types, registration, services, design, review. Resume wizard. Audit prefill.
- [x] Confirmation page (`/confirmation/[ref]`)
- [x] Setup page (`/setup`): Copy-able SQL schema
- [x] Admin Dashboard (`/admin/dashboard`):
  - Left sidebar (Dashboard, Submissions, Audit History)
  - **Top-level filter buttons** on submissions
  - View/edit submission detail dialog
  - Export as Markdown (client website brief)
  - Delete submissions/audits, clear all history

## Backlog
- P1: Marketing sub-pages per business type, Dynamic LLM for PRD, PDF audit export, Expand to 148+ rules
- P2: Email notifications, multi-admin, analytics dashboard
