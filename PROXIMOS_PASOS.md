# 🎯 PRÓXIMOS PASOS - Plan de Acción

**Fecha**: 27 Octubre 2025
**Estado**: Sistema 95% completo
**Tiempo estimado**: 20-30 minutos

---

## 📋 PASO 1: Instalar Pydantic AI (5 minutos)

```bash
# En la carpeta backend
cd /Users/danielcarreon/Documents/AI/software/minifab/backend

# Instalar librería
pip install pydantic-ai

# Validar instalación
python -c "import pydantic_ai; print('✅ Pydantic AI installed:', pydantic_ai.__version__)"
```

**Esperado**: Deberías ver la versión de Pydantic AI impresa.

---

## 📋 PASO 2: Reiniciar Claude Code (1 minuto)

El cambio en `.mcp.json` (removí `--read-only`) necesita que se reinicie Claude Code.

```
1. Cierra Claude Code completamente
2. Abre Claude Code nuevamente
   (el MCP de Supabase se reiniciará con permisos de escritura)
```

---

## 📋 PASO 3: Ejecutar SQL Migrations (5 minutos)

Una vez que Claude Code esté reiniciado, ejecutar las 3 migraciones SQL:

```bash
# Opción A: Usar el MCP de Supabase (automático)
# Yo lo haré automáticamente si confirmas que el MCP está listo

# Opción B: Ejecutar manualmente en Supabase Dashboard
# 1. Abre https://app.supabase.com
# 2. Selecciona tu proyecto: "Minifab"
# 3. Ve a "SQL Editor"
# 4. Copia/pega cada archivo SQL y click RUN:
#    - supabase/migrations/001_create_conversations_table.sql
#    - supabase/migrations/002_create_chat_messages_table.sql
#    - supabase/migrations/003_create_conversation_images_table.sql
```

**Validar**:
```sql
-- En Supabase SQL Editor, ejecuta:
SELECT tablename FROM pg_tables
WHERE schemaname='public'
AND tablename IN ('conversations', 'chat_messages', 'conversation_images');

-- Esperado: 3 filas (3 tablas creadas)
```

---

## 📋 PASO 4: Validar que funciona (10 minutos)

### 4.1: Start Backend

```bash
cd /Users/danielcarreon/Documents/AI/software/minifab/backend

# Terminal 1: Backend
uvicorn main:app --reload --port 8001
```

**Esperado en logs**:
```
INFO:     Uvicorn running on http://0.0.0.0:8001
🚀 Starting backend on port 8001
```

### 4.2: Test Health Endpoint

```bash
# Terminal 2: Test (nueva terminal)
curl http://localhost:8001/api/chat-v2/health

# Esperado:
# {"status":"healthy","service":"chat-v2-pydantic-ai","version":"1.0.0"}
```

### 4.3: Test Creating Conversation

```bash
curl -X POST http://localhost:8001/api/chat-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, help me create a thumbnail",
    "create_conversation": true
  }'

# Esperado:
# {
#   "status": "success",
#   "response": "...",
#   "conversation_id": "550e8400-...",
#   "tool_calls": [],
#   "images": []
# }
```

### 4.4: Start Frontend

```bash
# Terminal 3: Frontend
cd /Users/danielcarreon/Documents/AI/software/minifab/frontend
npm run dev

# Esperado: Frontend runs on http://localhost:3000+
```

### 4.5: Visual Test

1. Abre http://localhost:3000 (o el puerto que muestre)
2. Deberías ver:
   - ✅ Sidebar a la izquierda (ConversationPanel)
   - ✅ Botón "Nueva Conversación"
   - ✅ Título "🚀 Media Dashboard"

3. Click en "Nueva Conversación":
   - ✅ Deberías ver una nueva entrada en el sidebar
   - ✅ Entrada debería tener nombre por defecto

4. En el chat:
   - ✅ Escribe un mensaje
   - ✅ Deberías ver respuesta del agente
   - ✅ Conversación debería guardarse

---

## 📋 PASO 5: Verificar en Base de Datos

```bash
# En Supabase, ejecuta:

SELECT * FROM conversations LIMIT 5;
# Esperado: Ver conversaciones que creaste

SELECT * FROM chat_messages LIMIT 5;
# Esperado: Ver mensajes guardados

SELECT COUNT(*) FROM conversations;
# Esperado: Número > 0
```

---

## ✅ CHECKLIST FINAL

Una vez completes todo arriba, marca esto:

- [ ] ✅ Pydantic AI instalado (`pip install pydantic-ai`)
- [ ] ✅ Claude Code reiniciado (MCP changes applied)
- [ ] ✅ 3 SQL migrations ejecutadas en Supabase
- [ ] ✅ Health check funciona: `GET /api/chat-v2/health` → 200
- [ ] ✅ Puede crear conversación: `POST /api/chat-v2` → conversación_id
- [ ] ✅ Frontend sidebar visible
- [ ] ✅ "Nueva Conversación" funciona
- [ ] ✅ Chat persiste mensajes
- [ ] ✅ Supabase tables tienen datos
- [ ] ✅ Sin errores en logs (backend + frontend)

---

## 🚀 CUANDO TODO FUNCIONA

**Dime**: "Listo, todas las checks pasaron"

Yo procederé con:
1. ✅ Git commit final
2. ✅ Documentación de deploymment
3. ✅ Plan para producción

---

## 🆘 Troubleshooting Rápido

### Error: "Cannot import pydantic_ai"
```bash
pip install pydantic-ai
pip show pydantic-ai  # Confirma que está instalado
```

### Error: "conversations table does not exist"
```bash
# Las SQL migrations no se ejecutaron
# Ve a PASO 3 y ejecuta manualmente en Supabase Dashboard
```

### Error: "CORS error"
```bash
# El backend está en puerto diferente
# Actualiza NEXT_PUBLIC_BACKEND_URL en frontend/.env.local
# Default: http://localhost:8001
```

### Error: "Port already in use"
```bash
# Kill el proceso en ese puerto
lsof -i :8001  # Encuentra PID
kill -9 <PID>  # Mata el proceso
```

### El sidebar no aparece
```bash
# Verifica que ConversationPanel está importado en page.tsx
# Verifica que no hay TypeScript errors
npm run typecheck
```

---

## 📞 SOPORTE

Si algo no funciona:
1. Verifica los logs (frontend + backend)
2. Consulta el `PHASE5_PYDANTIC_AI_SETUP.md` para más detalles
3. Verifica `BUCLE_AGENTICO_COMPLETADO.md` para arquitectura

---

## ⏱️ Timeline Estimado

```
Paso 1 (instalar): 5 min
Paso 2 (reiniciar): 1 min
Paso 3 (SQL migrations): 5 min
Paso 4 (validar): 10 min
Paso 5 (database check): 2 min
─────────────────────────
TOTAL: 23 minutos

Con troubleshooting: ~30 minutos
```

---

*Cuando termines y todo funcione, confirma y procedo con el Git commit final. Tenemos tiempo - la calidad es primero.* 🚀
