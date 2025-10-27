# 🔧 PHASE 1 SETUP - Database Migrations

**Status**: Ready to execute
**Archivos SQL**: 3 migraciones
**Riesgo**: BAJO (nuevas tablas, sin modificar existentes)

---

## 📋 INSTRUCCIONES PASO A PASO

### PASO 1: Abrir Supabase SQL Editor

1. Ve a: **https://supabase.com/dashboard/project/[your-project-id]**
2. Click en **"SQL Editor"** en el sidebar izquierdo
3. Click en **"New Query"**

### PASO 2: Ejecutar Migración 001 - Tabla `conversations`

1. Copia TODO el contenido de: `supabase/migrations/001_create_conversations_table.sql`
2. Pégalo en el SQL Editor
3. Click en **"RUN"** (botón azul esquina superior derecha)
4. **VALIDACIÓN**: Debes ver: ✅ Success (sin errores)

**Qué hace**:
- Crea tabla `conversations` con campos: id, title, created_at, is_favorite, metadata
- Crea 3 índices para performance
- Habilita RLS (Row Level Security)
- Crea función `current_user_id()` para seguridad

### PASO 3: Ejecutar Migración 002 - Tabla `chat_messages`

1. Copia TODO el contenido de: `supabase/migrations/002_create_chat_messages_table.sql`
2. Pégalo en una **NUEVA QUERY** (no la anterior)
3. Click en **"RUN"**
4. **VALIDACIÓN**: ✅ Success

**Qué hace**:
- Crea tabla `chat_messages` con campos: id, conversation_id, role, content, tool_used, tool_result
- FK a conversations (CASCADE delete)
- 4 índices para búsquedas rápidas
- RLS heredada de conversations

### PASO 4: Ejecutar Migración 003 - Tabla `conversation_images`

1. Copia TODO el contenido de: `supabase/migrations/003_create_conversation_images_table.sql`
2. Pégalo en una **NUEVA QUERY**
3. Click en **"RUN"**
4. **VALIDACIÓN**: ✅ Success

**Qué hace**:
- Crea tabla `conversation_images` para linkear imágenes a conversaciones
- Referencias a conversations (CASCADE delete)
- Soporta múltiples fuentes: generated, combined, uploaded, created

---

## ✅ VALIDACIÓN PHASE 1

Después de ejecutar las 3 migraciones, **confirma lo siguiente**:

### En Supabase Dashboard:

1. **Sidebar izquierdo → "Tables"**
   - [ ] ¿Ves `conversations` en la lista?
   - [ ] ¿Ves `chat_messages` en la lista?
   - [ ] ¿Ves `conversation_images` en la lista?

2. **Click en cada tabla** y verifica campos:
   - **conversations**: id, title, created_at, updated_at, is_favorite, metadata, user_id
   - **chat_messages**: id, conversation_id, role, content, tool_used, tool_result, created_at
   - **conversation_images**: id, conversation_id, image_id, image_source, original_url, created_at

3. **Revisa RLS** (mostrar políticas):
   - Sidebar → "RLS" → cada tabla debe mostrar políticas

### En SQL Editor (test queries):

```sql
-- Test 1: Insertar conversación
INSERT INTO conversations (title, user_id)
VALUES ('Test Conversation', 'daniel')
RETURNING *;

-- Test 2: Listar conversaciones
SELECT * FROM conversations WHERE user_id = 'daniel';

-- Test 3: Check índices existen
SELECT indexname FROM pg_indexes
WHERE tablename IN ('conversations', 'chat_messages', 'conversation_images');
```

---

## 🚨 SI ALGO FALLA

### Error: "Already exists"
→ Las tablas ya fueron creadas previamente (OK, paso sin errores)

### Error: "Syntax error"
→ Copiar-pegar incorrecto. Verifica espacios en blanco al inicio

### Error: "Permission denied"
→ El usuario de Supabase no tiene permisos. Contacta al admin del proyecto

### Error: "Foreign key violation"
→ Intentaste insertar datos antes de crear las tablas. Borra y reintenta

---

## 📝 NOTAS IMPORTANTES

1. **RLS está habilitado** - En desarrollo, si quieres deshabilitar:
   ```sql
   ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
   -- Repite para chat_messages y conversation_images
   ```

2. **user_id hardcoded como 'daniel'** - Para futura auth con auth.users

3. **CASCADE DELETE** - Si eliminas una conversación, sus mensajes e imágenes se eliminan automáticamente

4. **Índices optimizados** - Para queries rápidas en:
   - Listar conversaciones por usuario
   - Búsquedas por fecha reciente
   - Búsquedas por favoritos

---

## 🎯 SIGUIENTE PASO

Una vez completes la VALIDACIÓN:

1. Comenta en el chat: "✅ Phase 1 completado - BD lista"
2. Procederemos con **PHASE 2: Backend API**

---

## 📚 REFERENCIAS

- Supabase SQL Editor: https://supabase.com/dashboard/sql
- RLS Documentation: https://supabase.com/docs/guides/auth/row-level-security
- SQLModel (backend): backend/domain/models.py (próximo paso)
