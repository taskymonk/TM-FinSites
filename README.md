# FinSites Platform

Compliant website platform for Indian financial professionals (MFD, Insurance, PMS, AIF, SIF, RIA).

## Architecture

- **Frontend**: React + Tailwind + Shadcn/UI + Framer Motion
- **Backend**: FastAPI + MongoDB
- **Storage**: Emergent Object Storage for logo uploads

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
# Create .env with required variables (see .env.example)
uvicorn server:app --reload --port 8001
```

### Frontend
```bash
cd frontend
yarn install
# Set REACT_APP_BACKEND_URL in .env
yarn start
```

## Deployment

### Frontend → Vercel
1. Connect GitHub repo to Vercel
2. Set Root Directory: `frontend`
3. Framework Preset: Create React App
4. Add env: `REACT_APP_BACKEND_URL` = your Render backend URL

### Backend → Render
1. Connect GitHub repo to Render
2. Use `render.yaml` blueprint OR manual setup:
   - Root Directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn server:app --host 0.0.0.0 --port $PORT`
3. Add environment variables (see render.yaml)

### Database → MongoDB Atlas
1. Create free M0 cluster at mongodb.com/atlas
2. Get connection string
3. Set as `MONGO_URL` in Render env vars

## Environment Variables

### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| MONGO_URL | MongoDB connection string | Yes |
| DB_NAME | Database name | Yes |
| JWT_SECRET | JWT signing secret (64+ chars) | Yes |
| ADMIN_EMAIL | Admin login email | Yes |
| ADMIN_PASSWORD | Admin login password | Yes |
| FRONTEND_URL | Frontend URL (for CORS) | Yes |
| EMERGENT_LLM_KEY | For object storage uploads | Yes |
| PRODUCTION | Set "true" for cross-domain cookies | Production |

### Frontend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| REACT_APP_BACKEND_URL | Backend API base URL | Yes |
