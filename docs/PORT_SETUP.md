# 🚀 Auto-Fallback Port System

## ✅ Problema Resuelto

Implementé un sistema de fallback automático para evitar conflictos de puertos cuando ya tienes servicios corriendo en los puertos por defecto.

## 🔧 Cómo Funciona

### Backend (FastAPI)
- **Puertos**: 8000 → 8001 → 8002 → 8003 → 8004
- **Detección automática**: Encuentra el primer puerto disponible
- **Archivo de estado**: Crea `.port` con el puerto actual

### Frontend (Next.js)
- **Puertos**: 3000 → 3001 → 3002 → etc. (Next.js automático)
- **Detección backend**: Prueba puertos 8000-8004 automáticamente
- **Comunicación dinámica**: Se conecta al puerto correcto sin configuración

## 🚀 Comandos de Inicio

### Opción 1: Script Automático (Recomendado)
```bash
./start.sh
```
Inicia ambos servicios con detección automática de puertos.

### Opción 2: Manual
```bash
# Backend con auto-fallback
cd backend && python start_server.py

# Frontend (en otra terminal)
cd frontend && npm run dev
```

### Opción 3: Individual
```bash
# Solo backend
cd backend && uvicorn main:app --reload --port 8001

# Solo frontend
cd frontend && npm run dev
```

## 🔍 Verificación

```bash
# Verificar backend disponible
curl http://localhost:8001/health

# Verificar frontend
# Next.js te dirá el puerto en la terminal
```

## ⚙️ Configuración Manual (Opcional)

Si quieres forzar un puerto específico:

```bash
# Frontend (.env.local)
NEXT_PUBLIC_BACKEND_PORT=8001

# Backend
uvicorn main:app --reload --port 8001
```

## 🎯 Beneficios

- ✅ **Sin conflictos**: Funciona aunque tengas otros servicios corriendo
- ✅ **Zero config**: No necesitas cambiar configuraciones manualmente
- ✅ **Desarrollo rápido**: Solo ejecuta `./start.sh` y listo
- ✅ **Error-resistant**: Si falla un puerto, prueba el siguiente automáticamente

## 🐛 Troubleshooting

### Frontend no conecta al backend
```bash
# Verificar que ambos están corriendo
ps aux | grep -E "(uvicorn|next)"

# Verificar el puerto del backend
cat backend/.port

# Verificar conectividad
curl http://localhost:[PUERTO]/health
```

### Backend no inicia
```bash
# Verificar puertos ocupados
lsof -i :8000-8004

# Usar puerto específico
cd backend && uvicorn main:app --reload --port 8005
```

## 📁 Archivos Modificados

- `backend/start_server.py` - Script de auto-fallback
- `frontend/src/shared/lib/portDetection.ts` - Detección dinámica
- `frontend/src/features/chat/components/ChatAgent.tsx` - Uso automático
- `start.sh` - Script de inicio conjunto
- `backend/main.py` - CORS para múltiples puertos

¡Listo para desarrollo sin interrupciones! 🎉