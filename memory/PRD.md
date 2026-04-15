# FinSites Platform — PRD

## Problem Statement
Build a marketing platform called FinSites for building compliant websites for Indian financial professionals (MFD, Insurance, PMS, AIF, SIF, RIA). Features: marketing landing page, website compliance audit tool, plan selection, multi-step onboarding wizard, admin dashboard, client status tracking. Futuristic dark theme with Light/Dark/System toggle.

## Architecture
- Frontend: React + Tailwind + Shadcn/UI + Framer Motion
- Backend: FastAPI + MongoDB
- Auth: JWT with httpOnly cookies (admin only)
- Audit Engine: BeautifulSoup + httpx (web scraping, regex-based compliance detection)
- No LLM — structured wizard with predefined flows

## User Personas
1. **Financial Professional (Client)**: MFD/Insurance/PMS/AIF/SIF/RIA professional needing a compliant website
2. **Admin**: FinSites team managing submissions, updating statuses, configuring plans
3. **Prospect**: Visitor exploring the platform, running free audits

## Core Requirements
- Marketing landing page showcasing the platform
- Website audit tool scanning for SEBI/AMFI/IRDAI compliance (40+ checks)
- Plan selection (Starter/Professional/Enterprise) — commitment, not payment
- 5-step onboarding wizard (Business Type → Registration Details → Services → Design → Review)
- Admin dashboard (stats, submissions, status management, payment tracking)
- Public status tracking page
- Light/Dark/System theme toggle

## What's Been Implemented (April 2026)
- [x] Full backend API (auth, audit, wizard, admin, plans, status, enterprise contact)
- [x] Marketing landing page (hero, problem stats, features, business types, how-it-works, pricing, FAQ, CTAs)
- [x] Website audit tool (URL scanning, compliance scoring, business type detection)
- [x] Plan selection page (3 tiers, contact modal, enterprise inquiry form)
- [x] 5-step onboarding wizard with dynamic forms per business type (Groups A-G)
- [x] Admin dashboard (stats cards, submissions table, filters, search, pagination)
- [x] Admin submission detail (tabbed view, status management, payment recording)
- [x] Confirmation page with reference number and "what happens next"
- [x] Status tracking page with pipeline visualization
- [x] Light/Dark/System theme toggle
- [x] Admin seeding, plan seeding, MongoDB indexes
- [x] JWT authentication with httpOnly cookies

## Prioritized Backlog
### P0 (Critical)
- None — core MVP complete

### P1 (High)
- Email notifications (submission confirmation, status updates, payment reminders)
- PDF export for audit reports
- Abandoned lead tracking (users who start but don't finish wizard)
- Data validation improvements (registration number format checks on frontend)

### P2 (Medium)
- Google Social Login (admin configurable)
- Multi-admin support with roles
- Export submissions to CSV/Excel
- Bulk status updates
- Analytics dashboard (conversion funnel, audit-to-submission rates)

### P3 (Nice to Have)
- LLM-powered conversational wizard mode
- Re-scan audit capability
- Client portal for managing their own submission
- Webhook notifications for status changes
- Multi-language support

## Next Tasks
1. Add email notification system (SendGrid/Resend)
2. Implement abandoned lead capture from plan selection dropoffs
3. Add registration number format validation on frontend
4. Build PDF export for audit reports
5. Configure Google OAuth for admin (admin-configurable integrations panel)
