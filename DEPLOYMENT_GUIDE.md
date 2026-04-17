# FinSites — Vercel Deployment Guide

## Prerequisites
- GitHub repo is PUBLIC (required for Vercel Hobby plan with bot commits)
- Next.js app is at the **repository root** (not in a subdirectory)

## Vercel Settings
1. **Framework Preset**: Next.js
2. **Root Directory**: `.` (leave blank / default)
3. **Build Command**: `next build` (default)
4. **Output Directory**: `.next` (default)
5. **Install Command**: `yarn install` (default)

## Environment Variables (set in Vercel Dashboard)
```
NEXT_PUBLIC_SUPABASE_URL=https://dhoewjvvaimlsxbzsyuk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
EMERGENT_LLM_KEY=<your-emergent-key>
```

## Important Notes
- Do NOT set a custom Root Directory (the app is at repo root)
- Do NOT override the Output Directory
- The `frontend/` and `backend/` directories in the repo are gitignored (only used in the Emergent preview environment)
- All backend logic uses Next.js Server Actions (no separate API server needed)
