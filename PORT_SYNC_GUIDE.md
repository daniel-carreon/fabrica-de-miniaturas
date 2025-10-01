# 🔄 Port Synchronization System

## Problema Resuelto
**Frontend y backend necesitan puertos correspondientes:**
- Frontend 3000 → Backend 8000 ✅
- Frontend 3001 → Backend 8001 ✅
- Frontend 3002 → Backend 8002 ✅

## 🎯 Lógica Implementada

### Formula Matemática
```
backend_port = 8000 + (frontend_port - 3000)
frontend_port = 3000 + (backend_port - 8000)
```

### Ejemplos
```
Frontend 3000 → Backend 8000
Frontend 3001 → Backend 8001
Frontend 3002 → Backend 8002
...hasta...
Frontend 3006 → Backend 8006
```

## 🚀 Uso Correcto

### Opción 1: Orden Recomendado (Backend primero)
```bash
# Terminal 1: Backend
cd backend
python dev_server.py
# Output: 🚀 Starting FastAPI on port 8000...
#         💡 Expected frontend port: 3000

# Terminal 2: Frontend
cd frontend
npm run dev
# Output: 🚀 Starting Next.js on port 3000...
#         💡 Expected backend port: 8000
```

### Opción 2: Frontend primero (también funciona)
```bash
# Terminal 1: Frontend
cd frontend
npm run dev
# Output: 🚀 Starting Next.js on port 3000...
#         💡 Expected backend port: 8000
#         Run: cd ../backend && python dev_server.py

# Terminal 2: Seguir instrucción
cd ../backend && python dev_server.py
```

## 🎨 Output Visual

### Frontend Startup
```
🚀 Starting Next.js on port 3000...
💡 Expected backend port: 8000
   Run: cd ../backend && python dev_server.py

   ▲ Next.js 15.5.4
   - Local:        http://localhost:3000
   - Network:      http://192.168.1.64:3000
```

### Backend Startup
```
🚀 Starting FastAPI on port 8000...
💡 Expected frontend port: 3000
   Frontend should be at: http://localhost:3000

INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

## 📝 Nuevos Comandos

### Frontend
```bash
npm run dev          # Auto-port + sync (RECOMENDADO)
npm run dev:direct   # Next.js default sin auto-port
```

### Backend
```bash
backend-dev          # Alias (funciona desde cualquier carpeta backend/)
python dev_server.py # Comando directo
uvicorn main:app     # ❌ NO usar (puerto hardcodeado)
```

## 🔧 Configuración Interna

### Frontend (`scripts/dev-server.js`)
```javascript
const port = await findAvailablePort();  // 3000-3006
const backendPort = 8000 + (port - 3000); // Sync logic

env: {
  PORT: port.toString(),
  NEXT_PUBLIC_API_URL: `http://localhost:${backendPort}`
}
```

### Backend (`dev_server.py`)
```python
port = find_available_port()  # 8000-8006
frontend_port = 3000 + (port - 8000)  # Sync logic

os.environ['PORT'] = str(port)
os.environ['FRONTEND_PORT'] = str(frontend_port)
```

### CORS Dinámico (`backend/main.py`)
```python
ALLOWED_ORIGINS = [
    "https://fabrica-de-miniaturas.vercel.app",
    *[f"http://localhost:{port}" for port in range(3000, 3007)],
    *[f"http://127.0.0.1:{port}" for port in range(3000, 3007)],
]
```

## 🐛 Troubleshooting

### Problema: Puertos desincronizados
```bash
# Frontend en 3000, backend en 8001 (ERROR)
# Solución: Matar ambos y reiniciar
pkill -f "next dev"
pkill -f uvicorn
npm run dev          # Debería usar 3000
python dev_server.py # Debería usar 8000
```

### Problema: "Address already in use"
```bash
# Ver qué está usando el puerto
lsof -i :3000
lsof -i :8000

# Matar proceso específico
kill -9 <PID>

# O usar auto-port (salta al siguiente disponible)
npm run dev          # 3000 ocupado → 3001 automático
python dev_server.py # 8000 ocupado → 8001 automático
```

### Problema: ChunkLoadError en Next.js
**Causa:** Procesos zombie de Next.js en puertos viejos

**Solución:**
```bash
# Matar TODOS los Next.js
pkill -f "next dev"
pkill -f "node.*dev-server"

# Limpiar cache de Next.js
rm -rf .next

# Reiniciar limpio
npm run dev
```

### Problema: Frontend usa 3003 (saltó 3001, 3002)
**Causa:** Procesos zombie en 3001 y 3002

**Solución:**
```bash
# Ver todos los puertos ocupados
lsof -i :3000,3001,3002,3003 | grep LISTEN

# Matar todos
pkill -f "next dev"

# Verificar limpieza
lsof -i :3000 | grep LISTEN || echo "✅ Puerto libre"

# Reiniciar
npm run dev  # Ahora debería usar 3000
```

## 🎯 Testing de Sincronización

### Escenario 1: Puertos por defecto
```bash
# Ambos libres
npm run dev          → 3000 ✅
python dev_server.py → 8000 ✅
curl http://localhost:3000  # Frontend OK
curl http://localhost:8000/health  # Backend OK
```

### Escenario 2: Puerto 3000 ocupado
```bash
# 3000 ocupado por otro proceso
npm run dev          → 3001 ✅ (fallback)
python dev_server.py → 8001 ✅ (sync automático)
curl http://localhost:3001  # Frontend OK
curl http://localhost:8001/health  # Backend OK
```

### Escenario 3: Múltiples instancias
```bash
# Primera instancia
npm run dev          → 3000 ✅
python dev_server.py → 8000 ✅

# Segunda instancia (otro proyecto)
cd otro-proyecto/frontend && npm run dev → 3001 ✅
cd otro-proyecto/backend && python dev_server.py → 8001 ✅
```

## 📊 Ventajas del Sistema

✅ **No más errores EADDRINUSE**
✅ **Sincronización automática frontend-backend**
✅ **Feedback visual de puertos esperados**
✅ **Soporte múltiples instancias simultáneas**
✅ **Workflow consistente entre proyectos**

## 🔄 Actualización .zshrc

**Alias agregados:**
```bash
# Claude Code setup (sin copiar .git)
alias claude-setup='rsync -av --exclude=".git" ~/.claude-template/ .'

# Backend auto-port
alias backend-dev='python dev_server.py'
```

**Recargar:**
```bash
source ~/.zshrc
```

## 📚 Best Practices

### ✅ DO
- Usar `npm run dev` (no `next dev`)
- Usar `python dev_server.py` (no `uvicorn main:app`)
- Verificar output de puertos esperados
- Matar procesos zombie antes de reiniciar

### ❌ DON'T
- NO usar comandos directos (`next dev`, `uvicorn`)
- NO hardcodear puertos en configs
- NO ignorar warnings de puertos ocupados
- NO correr múltiples instancias sin sync

---

**Documentación actualizada:** 2025-10-01
**Versión:** 2.0 (Port Sync System)
