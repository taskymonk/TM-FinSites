# FinSites Deployment Guide — Vercel + Render + MongoDB Atlas

## Overview

```
┌──────────────────────┐     ┌──────────────────────────┐
│   VERCEL (Free)       │     │   RENDER (Free Tier)      │
│   React Frontend      │────▶│   FastAPI Backend          │
│   finsites.vercel.app │     │   finsites-api.onrender.com│
└──────────────────────┘     └───────────┬──────────────┘
                                         │
                             ┌───────────▼──────────────┐
                             │  MONGODB ATLAS (Free)     │
                             │  512MB, Shared Cluster     │
                             └──────────────────────────┘
```

---

## Step 1: Push Code to GitHub

### From Emergent Platform (Easiest)
1. On Emergent dashboard, click **"Save to GitHub"** button
2. Choose repository name: `finsites`
3. Select visibility: Public or Private
4. Click Save — code is pushed automatically

### Manual Push (If needed)
```bash
cd /app
git init
git add -A
git commit -m "FinSites platform - initial commit"
git remote add origin https://github.com/YOUR_USERNAME/finsites.git
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up MongoDB Atlas (Free)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → **Sign Up / Sign In**

2. **Create a Free Cluster:**
   - Click "Build a Database"
   - Select **M0 FREE** tier
   - Choose provider: AWS
   - Choose region: Mumbai (ap-south-1) — closest to India
   - Cluster name: `finsites-cluster`
   - Click "Create Deployment"

3. **Create Database User:**
   - Username: `finsites_admin`
   - Password: Generate a strong password → **SAVE THIS**
   - Click "Create User"

4. **Set Network Access:**
   - Click "Add IP Address"
   - Click **"Allow Access from Anywhere"** (0.0.0.0/0) — needed for Render
   - Click "Confirm"

5. **Get Connection String:**
   - Click "Connect" → "Drivers"
   - Copy the connection string. It looks like:
   ```
   mongodb+srv://finsites_admin:<password>@finsites-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - Replace `<password>` with the password you created
   - **SAVE THIS** — you'll need it for Render

---

## Step 3: Deploy Backend on Render (Free)

1. Go to [render.com](https://render.com) → Sign up with GitHub

2. **New → Web Service**

3. **Connect your GitHub repo** (`finsites`)

4. **Configure:**
   | Setting | Value |
   |---------|-------|
   | Name | `finsites-api` |
   | Root Directory | `backend` |
   | Runtime | Python |
   | Build Command | `pip install -r requirements.txt` |
   | Start Command | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
   | Plan | **Free** |

5. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):

   | Key | Value |
   |-----|-------|
   | `MONGO_URL` | `mongodb+srv://finsites_admin:<password>@finsites-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority` |
   | `DB_NAME` | `finsites` |
   | `JWT_SECRET` | Generate 64 random chars: run `python3 -c "import secrets; print(secrets.token_hex(32))"` |
   | `ADMIN_EMAIL` | `admin@finsites.in` (or your email) |
   | `ADMIN_PASSWORD` | Your strong admin password |
   | `FRONTEND_URL` | `https://finsites.vercel.app` (update after Vercel deploy) |
   | `EMERGENT_LLM_KEY` | `sk-emergent-2E0Dc05AcCf7931F71` |
   | `PRODUCTION` | `true` |
   | `PYTHON_VERSION` | `3.11.0` |

6. Click **"Create Web Service"**

7. Wait for build + deploy (~3-5 minutes)

8. **Copy your Render URL**: `https://finsites-api.onrender.com`

9. **Test it:**
   ```
   curl https://finsites-api.onrender.com/api/plans
   ```
   Should return 3 plans JSON.

> **Note:** Free Render services sleep after 15 minutes of inactivity. First request after sleep takes ~30 seconds. This is normal for free tier.

---

## Step 4: Deploy Frontend on Vercel (Free)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub

2. Click **"Add New → Project"**

3. **Import your GitHub repo** (`finsites`)

4. **Configure:**
   | Setting | Value |
   |---------|-------|
   | Root Directory | `frontend` |
   | Framework Preset | Create React App |
   | Build Command | `yarn build` |
   | Output Directory | `build` |

5. **Add Environment Variable:**

   | Key | Value |
   |-----|-------|
   | `REACT_APP_BACKEND_URL` | `https://finsites-api.onrender.com` (your Render URL from Step 3) |

6. Click **"Deploy"**

7. Wait ~2 minutes for build

8. **Your site is live!** URL: `https://finsites.vercel.app` (or similar)

---

## Step 5: Update CORS (Important!)

After both are deployed, update the Render environment variable:

1. Go to Render Dashboard → `finsites-api` → Environment
2. Update `FRONTEND_URL` to your actual Vercel URL (e.g., `https://finsites.vercel.app`)
3. Click "Save Changes" — Render will auto-redeploy

---

## Step 6: Verify Everything Works

1. **Frontend**: Visit `https://finsites.vercel.app`
   - Landing page loads with pricing from API
   - Theme toggle works

2. **Audit Tool**: Go to `/audit` → scan any financial website

3. **Admin Login**: Go to `/admin/login`
   - Email: the ADMIN_EMAIL you set
   - Password: the ADMIN_PASSWORD you set

4. **Full Flow**: Plans → Select plan → Wizard → Submit → Confirmation

---

## Custom Domain (Optional)

### Vercel Custom Domain
1. Vercel Dashboard → Settings → Domains
2. Add your domain: `finsites.in`
3. Update DNS records as instructed by Vercel
4. HTTPS is automatic

### Render Custom Domain
1. Render Dashboard → Settings → Custom Domains
2. Add: `api.finsites.in`
3. Update DNS CNAME record
4. Update `REACT_APP_BACKEND_URL` in Vercel to `https://api.finsites.in`

---

## Cost Summary

| Service | Plan | Monthly Cost |
|---------|------|-------------|
| Vercel (Frontend) | Hobby | **Free** |
| Render (Backend) | Free | **Free** |
| MongoDB Atlas (DB) | M0 | **Free** (512MB) |
| **Total** | | **$0/month** |

### Free Tier Limitations
- **Render**: Server sleeps after 15min idle, ~30s cold start on wake
- **MongoDB Atlas**: 512MB storage, shared cluster
- **Vercel**: 100GB bandwidth/month, 6000 build minutes/month

### When to Upgrade
- Getting consistent traffic → Render Starter ($7/mo) for always-on
- Hitting 512MB database → Atlas M2 ($9/mo)
- Both are very affordable for a growing SaaS

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS error in browser | Check `FRONTEND_URL` in Render matches your Vercel URL exactly |
| Login not working (cookies) | Ensure `PRODUCTION=true` is set in Render env |
| Audit scan timeout | Render free tier has 30s request timeout — most scans finish in 10-15s |
| Blank page on Vercel | Ensure `vercel.json` exists in `frontend/` directory |
| API returns 503 | Render server is waking from sleep — wait 30s and retry |
| MongoDB connection error | Check Atlas IP allowlist includes 0.0.0.0/0 |
