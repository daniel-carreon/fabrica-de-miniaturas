# Changelog - Fábrica de Miniaturas

## [2025-09-30] - One-Shot Fix: Production Ready 🚀

### 🔒 Security
- **CRITICAL:** Removed `.mcp.json` from Git tracking (contains sensitive API keys)
- ✅ Verified all sensitive files are in `.gitignore` (`.env`, `.env.local`, `.mcp.json`)
- ✅ No secrets committed to repository

### 🛠️ Fixed
- **React 19 Support:** Upgraded `@testing-library/react` from `15.0.7` → `16.3.0`
  - Now fully compatible with React 19
  - Fixed Vercel deployment blocking error
  - Updated `@types/react` and `@types/react-dom` to `^19.0.0`

### ✨ New Features

#### 1. **Auto Port Detection (Frontend)**
- Created `frontend/scripts/dev-server.js`
- Auto-detects available ports from 3000-3006
- No more "port occupied" errors
- Run: `npm run dev` (auto) or `npm run dev:direct` (manual)

#### 2. **Auto Port Detection (Backend)**
- Created `backend/dev_server.py`
- Auto-detects available ports from 8000-8006
- Run: `python dev_server.py`

#### 3. **Railway Monorepo Setup**
- Added `railway.json` (root + frontend + backend)
- Added `railway.toml` for monorepo configuration
- Added `Procfile` for both services
- Created comprehensive `README_DEPLOYMENT.md` guide

### 📝 Configuration Changes

#### Backend (`main.py`)
- CORS now supports ports 3000-3006 automatically
- Added production URLs for Vercel/Railway
- Dynamic ALLOWED_ORIGINS with list comprehension

#### Frontend (`package.json`)
- Main `dev` script now uses auto-port detection
- Upgraded to Next.js 15.5.4
- React 19 fully supported with proper testing libs

### 📊 Testing Results
- ✅ Frontend running on **http://localhost:3000**
- ✅ Backend running on **http://localhost:8001** (auto-detected)
- ✅ Health check: `/health` endpoint responding
- ✅ CORS configured for all port ranges

### 🚀 Deployment Ready
- Railway configs created for both services
- Vercel dependency conflicts resolved
- Environment variable examples provided
- Security best practices implemented

### 📁 New Files
```
frontend/
├── scripts/dev-server.js    # Auto port detection
├── railway.json             # Railway config
└── Procfile                 # Start command

backend/
├── dev_server.py           # Auto port detection
├── railway.json            # Railway config
└── Procfile                # Start command

/ (root)
├── railway.json            # Monorepo config
├── railway.toml            # Railway settings
├── README_DEPLOYMENT.md    # Deployment guide
└── CHANGELOG.md           # This file
```

### 🔄 Migration Guide

**From old dev commands:**
```bash
# OLD (manual port)
npm run dev        # Could fail if 3000 occupied
uvicorn main:app   # Could fail if 8000 occupied

# NEW (auto port detection)
npm run dev        # Auto finds 3000-3006
python dev_server.py  # Auto finds 8000-8006
```

**Railway Deployment:**
```bash
# Link project
railway link

# Deploy backend
cd backend && railway up

# Deploy frontend
cd frontend && railway up
```

### ⚠️ Breaking Changes
- Main `npm run dev` now uses auto-port script
- Use `npm run dev:direct` for old behavior
- `.mcp.json` removed from Git (recreate locally from example)

### 📚 Documentation
- Added comprehensive Railway deployment guide
- Security checklist for production
- Troubleshooting section for common issues
- Environment variable templates

---

## How to Use

1. **Local Development:**
   ```bash
   # Frontend
   cd frontend && npm run dev

   # Backend
   cd backend && python dev_server.py
   ```

2. **Railway Deployment:**
   - See `README_DEPLOYMENT.md` for complete guide
   - Set environment variables in Railway dashboard
   - Deploy both services from same repo

3. **Security:**
   - Never commit `.env` or `.mcp.json`
   - Use example files as templates
   - Rotate API keys regularly
