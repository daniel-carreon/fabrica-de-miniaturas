# 🏭 PORT CONFIGURATION STANDARD - SaaS Factory Template

**Status**: ✅ Production-Ready
**Version**: 1.0
**Last Updated**: 27 Oct 2025

---

## 🎯 OBJETIVO

Sistema **ESCALABLE** para múltiples aplicaciones Next.js/FastAPI sin:
- ❌ Hardcoding de puertos en código
- ❌ Parámetros CLI complicados
- ❌ Olvidos de puertos en otras terminales
- ❌ Conflictos entre aplicaciones

**RESULTADO**: 2 simples comandos, sin parámetros adicionales:
```bash
$ npm run dev           # Frontend automático
$ bash backend/dev.sh   # Backend automático
```

---

## 🔄 CÓMO FUNCIONA

### Architecture Pattern

```
┌─────────────────────────────────────────┐
│  .env.local (FUENTE DE VERDAD)          │
│  ┌─────────────────────────────────────┐│
│  │ PORT=3001 (único lugar a editar)    ││
│  │ NEXT_PUBLIC_BACKEND_PORT=8001       ││
│  │ NEXT_PUBLIC_BACKEND_URL=...         ││
│  └─────────────────────────────────────┘│
│                                         │
│  ↓ lee automáticamente                  │
│                                         │
│  scripts/dev-server.js                  │
│  ├─ Busca PORT en .env.local            │
│  ├─ Valida disponibilidad               │
│  └─ Lanza Next.js                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  .env (FUENTE DE VERDAD)                │
│  ┌─────────────────────────────────────┐│
│  │ BACKEND_PORT=8001 (único lugar)     ││
│  │ FRONTEND_URL=http://localhost:3001  ││
│  └─────────────────────────────────────┘│
│                                         │
│  ↓ lee automáticamente                  │
│                                         │
│  backend/dev.sh                         │
│  ├─ Lee BACKEND_PORT de .env            │
│  ├─ Valida disponibilidad               │
│  └─ Lanza uvicorn                       │
└─────────────────────────────────────────┘
```

### Port Pairing Formula

```
Frontend Port      Backend Port
    3001      →      8001
    3002      →      8002
    3003      →      8003
   ...        →       ...
    3006      →      8006

Formula: BACKEND_PORT = 8000 + (FRONTEND_PORT - 3000)
```

**Ventaja**: Determinístico y fácil de recordar

---

## 📋 SETUP PARA NUEVA APLICACIÓN

### 1️⃣ Frontend Setup

```bash
cd your-app/frontend
```

Editar `frontend/.env.local`:

```env
# 🔌 EDIT ONLY THESE TWO LINES
PORT=3001
NEXT_PUBLIC_BACKEND_PORT=8001

# ✅ These are auto-generated from above
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# ... rest of config (API keys, etc)
```

Verificar que `scripts/dev-server.js` existe y está actualizado:
- ✅ Lee `PORT` de `.env.local`
- ✅ Calcula `backendPort = 8000 + (port - 3000)`
- ✅ Pasa a Next.js via `-p $PORT`

**Lanzar**:
```bash
npm run dev
# ✅ Automáticamente corre en puerto 3001
```

---

### 2️⃣ Backend Setup

```bash
cd your-app/backend
```

Editar `backend/.env`:

```env
# 🔌 EDIT ONLY THESE TWO LINES
BACKEND_PORT=8001
FRONTEND_URL="http://localhost:3001"

# ... rest of config (API keys, etc)
```

Verificar que `main.py` existe y lee el puerto:
```python
import os
backend_port = int(os.getenv("BACKEND_PORT", "8000"))
uvicorn.run(app, host="0.0.0.0", port=backend_port)
```

Verificar que `backend/dev.sh` existe:
- ✅ Lee `BACKEND_PORT` de `.env`
- ✅ Verifica disponibilidad del puerto
- ✅ Lanza uvicorn con ese puerto

**Lanzar**:
```bash
bash backend/dev.sh
# ✅ Automáticamente corre en puerto 8001
```

---

## 🔧 CAMBIAR PUERTOS (Para conflictos)

### Escenario: Puerto 3001 ya está ocupado

**ANTES** (Complicado):
```bash
# Terminal 1
PORT=3002 npm run dev
# ¡Espera! Ahora el backend debería ser 8002, pero ¿lo recuerdas?
# Cambiar en 5 lugares diferentes...

# Terminal 2
BACKEND_PORT=8002 FRONTEND_URL=http://localhost:3002 python main.py
# ¡Demasiado manual!
```

**AHORA** (Elegante):
```bash
# 1. Solo editar .env.local
frontend/.env.local:
  PORT=3002

# 2. Solo editar .env
backend/.env:
  BACKEND_PORT=8002
  FRONTEND_URL="http://localhost:3002"

# 3. Lanzar sin parámetros
npm run dev                # Automático ✅
bash backend/dev.sh        # Automático ✅
```

**LISTO**. Sin recordar puertos, sin CLI params.

---

## ✅ CHECKLIST PARA NUEVA APLICACIÓN

```
FRONTEND (.env.local):
  ☐ PORT=3001 (o el puerto deseado)
  ☐ NEXT_PUBLIC_BACKEND_PORT=8001 (=PORT+5000)
  ☐ NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
  ☐ NEXT_PUBLIC_SITE_URL=http://localhost:3001

BACKEND (.env):
  ☐ BACKEND_PORT=8001
  ☐ FRONTEND_URL="http://localhost:3001"

CÓDIGO:
  ☐ frontend/scripts/dev-server.js (lee PORT de .env.local)
  ☐ backend/dev.sh (lee BACKEND_PORT de .env)
  ☐ main.py (lee BACKEND_PORT via os.getenv())
  ☐ portDetection.ts (intenta ports correctos)

LANZAR:
  ☐ npm run dev (sin parámetros)
  ☐ bash backend/dev.sh (sin parámetros)
```

---

## 🚨 TROUBLESHOOTING

### "Port already in use"

```bash
# Ver qué está usando el puerto
lsof -i :3001

# Matar el proceso
kill -9 <PID>

# O cambiar puerto en .env.local:
PORT=3002
# Y en backend/.env:
BACKEND_PORT=8002
FRONTEND_URL="http://localhost:3002"
```

### "Failed to fetch" en frontend

**Causa**: Frontend y backend en puertos desincronizados

**Verificar**:
```bash
# ¿Qué dice el navegador?
http://localhost:3001  # ¿Corre?

# ¿Qué dice el backend?
curl http://localhost:8001/health
# Si falla → backend no está corriendo en 8001

# Checklist:
1. Verificar frontend/.env.local: PORT=3001
2. Verificar backend/.env: BACKEND_PORT=8001
3. Relanzar ambos
```

### "script dev-server.js not found"

Verificar estructura:
```
frontend/
  ├── scripts/
  │   └── dev-server.js  ← Debe existir
  ├── package.json       ← Debe tener: "dev": "node scripts/dev-server.js"
  └── .env.local         ← Debe tener: PORT=3001
```

---

## 📚 ARCHIVOS DEL ESTÁNDAR

| Archivo | Propósito | Editar? |
|---------|-----------|---------|
| `frontend/.env.local` | Config frontend | ✏️ SÍ |
| `frontend/scripts/dev-server.js` | Launcher smart | ✅ No |
| `frontend/package.json` | npm scripts | ✅ No |
| `backend/.env` | Config backend | ✏️ SÍ |
| `backend/dev.sh` | Launcher backend | ✅ No |
| `backend/main.py` | FastAPI app | ✅ No |

---

## 🎯 FLUJO ESTÁNDAR MAÑANA

### Para cualquier aplicación en tu SaaS Factory:

**Paso 1**: Verificar ports en `.env` files
```bash
grep -E "^PORT|^BACKEND_PORT" frontend/.env.local backend/.env
```

**Paso 2**: Lanzar sin parámetros
```bash
# Terminal 1
cd frontend && npm run dev

# Terminal 2
cd backend && bash dev.sh
```

**Paso 3**: Desarrollar sin preocuparte de puertos

---

## 💡 VENTAJAS

✅ **Escalable**: Cientos de apps sin conflictos
✅ **Simple**: Un solo lugar a editar (`.env` files)
✅ **Automático**: Scripts detectan y validan
✅ **Documentado**: Este archivo
✅ **Reutilizable**: Copy/paste a cualquier app
✅ **Determinístico**: Formula clara (3001↔8001)

---

## 🔐 PRODUCCIÓN

Para producción con Railway/Vercel:

```bash
# Railway automáticamente asigna puertos via $PORT
# Nuestro código respeta eso:

# Vercel (frontend)
PORT=$PORT npm run dev

# Railway (backend)
PORT=$PORT uvicorn main:app --host 0.0.0.0 --port $PORT
```

Los scripts automáticamente respetan `$PORT` del entorno.

---

## 📝 HISTÓRICO

| Versión | Cambios |
|---------|---------|
| 1.0 | Estándar inicial creado |

---

*Este archivo es tu BIBLE para porquería de puertos.*
*Copia a todos tus proyectos SaaS.*
