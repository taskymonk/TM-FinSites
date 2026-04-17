# FinSites Platform — PRD (V7)

## Problem Statement
Build a marketing website and onboarding wizard for Indian financial professionals (MFD, Insurance, PMS, RIA, etc.). It scans existing websites for compliance, audits them, prefills an onboarding form, and collects remaining data to generate a PRD for building a fully compliant website.

## Architecture
- Next.js 16 (App Router) + Supabase + OpenAI GPT-4o (via Emergent proxy)
- Tailwind CSS v4, shadcn/ui, Framer Motion, jsPDF
- 148-rule Compliance Engine (Cheerio + regex), 18 categories
- Dark-only theme (#030712 bg, blue-600 accent)
- Deployment: Vercel (Next.js at repo root)

## Directory Structure
```
/ (repo root = Next.js app)
├── src/
│   ├── app/          (App Router pages)
│   ├── components/   (Navbar, Footer, UI components)
│   └── lib/          (Server Actions, Compliance Engine, LLM)
├── public/
├── package.json
├── next.config.ts
├── tsconfig.json
└── ...
```

## All Implemented Features (April 17, 2026)

### Public Pages
- [x] Landing page: Hero, Stats, Features, 7 clickable Business Type cards, How-It-Works, Pricing, FAQ
- [x] 7 Solution Pages: `/solutions/mfd`, `/ria`, `/insurance`, `/pms`, `/stock-broker`, `/sif`, `/nps`
- [x] Navbar: Solutions dropdown with all 7 types, scroll nav, mobile menu
- [x] Footer: Solutions column, Product, Company, Legal
- [x] Compliance Audit (`/audit`): 148 rules, 18 categories, editable types + rescan, PDF download
- [x] Audit-to-Onboarding Prefill (detected types + URL auto-passed)
- [x] Plans (`/plans`): 3 Supabase-backed plans, enterprise dialog
- [x] 5-Step Wizard (`/onboarding`): Types, registration, services, design, review + resume wizard
- [x] Confirmation page (`/confirmation/[ref]`)
- [x] Setup page (`/setup`): Copy-able SQL schema

### Admin Panel
- [x] `/admin` redirects to `/admin/login`
- [x] Login: Single-click auth (cookie-based, hard redirect)
- [x] Dashboard sidebar: Dashboard, Submissions, Audit History, Analytics
- [x] Submissions: Filter, search, view/edit, export Markdown, Generate PRD (LLM), delete
- [x] Audit History: Search, individual delete, clear all
- [x] Analytics: Submission breakdown, business type distribution, audit scores

### Infrastructure (April 17, 2026)
- [x] Directory restructured: Next.js app at repo root for Vercel deployment
- [x] Lucide icon serialization fix (iconName string instead of component reference)
- [x] Compliance engine accuracy improved (enhanced text extraction, link/alt/data-attr parsing)
- [x] CSS fallback for framer-motion SSR (ensures content visible before hydration)
- [x] Clean .gitignore (excludes Emergent-specific dirs: frontend/, backend/)
- [x] Vercel deployment guide updated

## Remaining Backlog
- P1: Verify Vercel deployment works with new root structure (user action: push to GitHub + deploy)
- P2: Email notifications (submission received, status change, abandoned wizard)
- P2: Multi-admin support (invite admins, role-based access)
- P3: Client portal, multi-language, blog/content section
