# 🚀 Deployment Guide - Fábrica de Miniaturas

## Railway Monorepo Setup

Este proyecto usa **Railway** para deployar tanto frontend como backend desde el mismo repositorio.

### 📋 Arquitectura de Deployment

```
fabrica-de-miniaturas/
├── frontend/          # Next.js App (Servicio 1 - Railway)
│   ├── railway.json   # Config específica frontend
│   └── Procfile       # Start command frontend
├── backend/           # FastAPI App (Servicio 2 - Railway)
│   ├── railway.json   # Config específica backend
│   └── Procfile       # Start command backend
└── railway.toml       # Config general monorepo
```

### 🔧 Setup Inicial en Railway

#### 1. **Crear Proyecto en Railway**
```bash
# Asegúrate de estar autenticado
railway login

# Link al proyecto existente "fabrica-de-miniaturas"
railway link
```

#### 2. **Crear Servicios (2 servicios en 1 proyecto)**

**Servicio 1: Backend (FastAPI)**
- Root Directory: `/backend`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment Variables:
  ```
  OPENROUTER_API_KEY=<tu-key>
  REPLICATE_API_TOKEN=<tu-token>
  FRONTEND_URL=<tu-frontend-railway-url>
  SUPABASE_URL=<tu-supabase-url>
  SUPABASE_KEY=<tu-supabase-key>
  ```

**Servicio 2: Frontend (Next.js)**
- Root Directory: `/frontend`
- Start Command: `npm run start`
- Environment Variables:
  ```
  NEXT_PUBLIC_API_URL=<tu-backend-railway-url>
  NEXT_PUBLIC_SUPABASE_URL=<tu-supabase-url>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-supabase-anon-key>
  ```

#### 3. **Variables de Entorno Críticas**

**Backend (.env)**
```bash
OPENROUTER_API_KEY=sk-or-v1-xxx
REPLICATE_API_TOKEN=r8_xxx
FRONTEND_URL=https://fabrica-frontend.up.railway.app
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
```

**Frontend (.env.local)**
```bash
NEXT_PUBLIC_API_URL=https://fabrica-backend.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### 🏃 Comandos de Deployment

```bash
# Deploy backend
cd backend
railway up

# Deploy frontend
cd frontend
railway up

# Ver logs en tiempo real
railway logs

# Abrir dashboard
railway open
```

### 📊 Monitoreo Post-Deploy

1. **Health Checks**
   - Backend: `https://tu-backend.railway.app/health`
   - Frontend: `https://tu-frontend.railway.app/`

2. **Logs**
   ```bash
   railway logs --service backend
   railway logs --service frontend
   ```

3. **Status**
   ```bash
   railway status
   ```

### 🔒 Security Checklist

- ✅ `.mcp.json` no está trackeado en Git
- ✅ `.env` archivos están en `.gitignore`
- ✅ Variables sensibles solo en Railway dashboard
- ✅ CORS configurado para dominios específicos
- ✅ API keys rotadas regularmente

### 🛠️ Troubleshooting

**Problema:** Puerto ocupado localmente
**Solución:**
```bash
# Frontend (auto-detect 3000-3006)
cd frontend && npm run dev

# Backend (auto-detect 8000-8006)
cd backend && python dev_server.py
```

**Problema:** CORS error en producción
**Solución:** Actualizar `ALLOWED_ORIGINS` en `backend/main.py` con URLs de Railway

**Problema:** Build falla en Railway
**Solución:** Verificar logs y asegurar que `requirements.txt` y `package.json` están actualizados

### 📝 Notas Importantes

1. **Nunca commitear secrets** - usar solo variables de entorno
2. **Testing local** - usar scripts con auto-detección de puertos
3. **Production URLs** - actualizar después de primer deploy
4. **Database migrations** - correr manualmente antes de deploy
