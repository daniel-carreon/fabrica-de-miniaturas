# 🔌 Dynamic Port Configuration Guide

## Problema Resuelto ✅
**Antes**: Puertos hardcodeados en el código → cambiarlos requería editar archivos
**Ahora**: Puertos dinámicos desde variables de entorno → cambio instantáneo

---

## Quick Start (Lo más común)

### Si quieres usar puertos PERSONALIZADOS:

#### Backend en puerto 8001 y Frontend en 3001:
```bash
# Terminal 1 - Backend (puerto 8001)
cd backend
BACKEND_PORT=8001 FRONTEND_URL="http://localhost:3001" python main.py

# Terminal 2 - Frontend (puerto 3001)
cd frontend
npm run dev -- --port 3001
```

---

## Configuración Detallada

### 📦 Backend (FastAPI)

**Archivo**: `backend/.env`

```env
# Puerto donde corre el backend FastAPI (default: 8000)
BACKEND_PORT=8001

# URL del frontend (donde corre Next.js) - CRITICAL
FRONTEND_URL=http://localhost:3001
```

**Cómo cambiar sin editar código**:
```bash
# Opción 1: Variable de entorno (override)
BACKEND_PORT=9000 python main.py

# Opción 2: Editar .env
vim backend/.env
# Cambiar: BACKEND_PORT=9000
```

**Validar que funciona**:
```bash
curl http://localhost:8001/health
# Output: {"status": "healthy", "backend": "fastapi", "version": "1.0.0"}
```

---

### 🎨 Frontend (Next.js)

**Archivo**: `frontend/.env.local`

```env
# Backend API (donde corre FastAPI) - CRITICAL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001

# Self-reference para cookies/etc (donde corre Next.js) - CRITICAL
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

**Cómo cambiar sin editar código**:
```bash
# Opción 1: CLI flag
npm run dev -- --port 3001

# Opción 2: Variable de entorno
PORT=3001 npm run dev

# Opción 3: Editar .env.local
vim frontend/.env.local
# Cambiar: NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

**Validar que funciona**:
```bash
# Browser: http://localhost:3001
# Debería cargar la app completa
```

---

## 🎯 Matriz de Configuración Común

| Escenario | Backend | Frontend | Backend .env | Frontend .env |
|-----------|---------|----------|--------------|---------------|
| **Default** | 8000 | 3000 | `BACKEND_PORT=8000` | `NEXT_PUBLIC_SITE_URL=http://localhost:3000` |
| **Con conflicto** | 8001 | 3001 | `BACKEND_PORT=8001` | `NEXT_PUBLIC_SITE_URL=http://localhost:3001` |
| **Desarrollo multi** | 8002 | 3002 | `BACKEND_PORT=8002` | `NEXT_PUBLIC_SITE_URL=http://localhost:3002` |
| **Production Railway** | $PORT | URL Railway | Auto detect | Auto detect |

---

## ⚡ Quick Reference Card

```
┌─────────────────────────────────────────────────────────┐
│ Para CAMBIAR PUERTOS de forma dinámica:                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ BACKEND:                                                │
│ $ BACKEND_PORT=8001 python main.py                    │
│ $ FRONTEND_URL=http://localhost:3001                   │
│                                                         │
│ FRONTEND:                                               │
│ $ PORT=3001 npm run dev                                │
│ $ (editar NEXT_PUBLIC_SITE_URL en .env.local)         │
│                                                         │
│ VERIFY:                                                 │
│ $ curl http://localhost:8001/health                    │
│ $ open http://localhost:3001                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 Troubleshooting

### Problema: "Connection refused" en backend
**Solución**: Asegúrate que `FRONTEND_URL` en backend .env apunta al puerto correcto del frontend
```bash
# ❌ INCORRECTO
FRONTEND_URL=http://localhost:3000  # Frontend corre en 3001

# ✅ CORRECTO
FRONTEND_URL=http://localhost:3001
```

### Problema: Frontend no ve el backend
**Solución**: Verifica `NEXT_PUBLIC_BACKEND_URL` en frontend .env.local
```bash
# ❌ INCORRECTO
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000  # Backend corre en 8001

# ✅ CORRECTO
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
```

### Problema: Port já en uso
**Solución**: Encontrar y matar el proceso
```bash
# En qué proceso está el puerto 8001
lsof -i :8001

# Matarlo
kill -9 <PID>
```

---

## 📝 Archivos Modificados

```
✅ backend/main.py
   - Añadido: os.getenv("BACKEND_PORT", "8000")
   - Ahora lee BACKEND_PORT de env vars

✅ backend/.env
   - FRONTEND_URL="http://localhost:3001"
   - BACKEND_PORT=8001

✅ frontend/.env.local
   - NEXT_PUBLIC_BACKEND_URL=http://localhost:8001
   - NEXT_PUBLIC_SITE_URL=http://localhost:3001

✅ backend/.env.example
   - Documentación de BACKEND_PORT y FRONTEND_URL
```

---

## 🔐 CORS es Dinámico

El CORS del backend **YA** soporta puertos 3000-3006 automáticamente:

```python
# backend/main.py - línea 30-31
*[f"http://localhost:{port}" for port in range(3000, 3007)],
*[f"http://127.0.0.1:{port}" for port in range(3000, 3007)],
```

Esto significa que puedes usar ANY puerto entre 3000-3006 para el frontend sin editar nada.

---

## 📚 Referencias

- Backend config: `backend/.env`
- Frontend config: `frontend/.env.local`
- Backend startup: `backend/main.py` (línea 59-61)
- CORS whitelist: `backend/main.py` (línea 22-32)

---

*Actualizado: 27 Oct 2025*
*Estado: ✅ Dinámico y flexible - NUNCA más hardcodear puertos*
