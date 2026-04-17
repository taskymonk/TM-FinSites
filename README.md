# FinSites Platform 

Compliant website platform for Indian financial professionals (MFD, Insurance, PMS, AIF, SIF, RIA).

## Architecture (Vercel-Only)

Everything runs on a single Vercel deployment:
- **Frontend**: React (CRA) — static build
- **API**: Python serverless functions in `frontend/api/`
- **Storage**: GitHub repository as database (JSON files in `data/`)
- **No external database, no separate backend server**

## How It Works

```
Vercel (Free)
├── React Frontend (static)
├── Python Serverless API (/api/*)
└── GitHub API → data/ directory (JSON files)
```

## Deployment on Vercel

1. Connect this GitHub repo to Vercel
2. Set Root Directory: `frontend`
3. Framework Preset: Create React App
4. Add Environment Variables:

| Variable | Value |
|----------|-------|
| `GITHUB_TOKEN` | GitHub PAT with Contents read/write on this repo |
| `GITHUB_REPO` | `your-username/TM-FinSites` |
| `JWT_SECRET` | Random 64-char hex string |
| `ADMIN_EMAIL` | `admin@finsites.in` |
| `ADMIN_PASSWORD` | Your admin password |

5. Deploy!

## Data Storage

All data lives as JSON files in the `data/` directory of this repo:
- `data/plans.json` — Pricing plans (edit directly on GitHub)
- `data/submissions/` — Client submissions
- `data/sessions/` — Wizard sessions
- `data/audits/` — Audit scan results
- `data/contacts/` — Enterprise inquiries

The serverless API reads/writes these files via the GitHub Contents API.

## Local Development

```bash
cd frontend
yarn install
yarn start
```

The frontend uses `REACT_APP_BACKEND_URL` when set (for local dev with separate backend).
On Vercel, it's not set, so API calls use relative paths (`/api/*`).
