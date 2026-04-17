# FinSites Platform — PRD (V6)

## Architecture
- Next.js 15 (App Router) + Supabase + OpenAI GPT-4o (via Emergent proxy)
- Tailwind CSS v4, shadcn/ui, Framer Motion, jsPDF
- 148-rule Compliance Engine (Cheerio + regex), 18 categories
- Dark-only theme (#030712 bg, blue-600 accent)

## All Implemented Features (April 17, 2026)

### Public Pages
- [x] Landing page: Hero, Stats, Features, 7 clickable Business Type cards (linked to /solutions/*), How-It-Works, Pricing, FAQ
- [x] 7 Solution Pages: `/solutions/mfd`, `/ria`, `/insurance`, `/pms`, `/stock-broker`, `/sif`, `/nps`
- [x] Navbar: Solutions dropdown with all 7 types, scroll nav, mobile menu
- [x] Footer: Solutions column, Product, Company, Legal
- [x] Compliance Audit (`/audit`): 148 rules, 18 categories, editable types + rescan, PDF download, top-level filter buttons
- [x] Audit-to-Onboarding Prefill (detected types + URL auto-passed)
- [x] Plans (`/plans`): 3 Supabase-backed plans, enterprise dialog
- [x] 5-Step Wizard (`/onboarding`): Types, registration, services, design, review + resume wizard
- [x] Confirmation page (`/confirmation/[ref]`)
- [x] Setup page (`/setup`): Copy-able SQL schema

### Admin Panel
- [x] `/admin` redirects to `/admin/login`
- [x] Login: Single-click auth (cookie-based, hard redirect)
- [x] Dashboard sidebar: Dashboard, Submissions, Audit History, Analytics
- [x] Submissions: Filter buttons, search, view/edit detail, export Markdown, Generate PRD (LLM), delete
- [x] Audit History: Search, individual delete, clear all
- [x] Analytics: Submission breakdown, business type distribution, audit scores, quick metrics

## Remaining Backlog
- P2: Email notifications (submission received, status change, abandoned wizard)
- P2: Multi-admin support (invite admins, role-based access)
- P3: Client portal, multi-language, blog/content section
