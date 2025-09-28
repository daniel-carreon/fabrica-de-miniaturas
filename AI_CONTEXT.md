# 🤖 AI CONTEXT - Para Asistentes de IA

Este archivo contiene el contexto completo para que otras IAs puedan ayudar a usuarios con este software.

## 📋 **PROPÓSITO DEL SOFTWARE**

Sistema de generación de imágenes personalizadas usando modelos fine-tuned de Replicate + chat agent con herramientas.

**ARQUITECTURA:** Next.js frontend + FastAPI backend + Supabase storage

## 🎯 **SETUP PARA USUARIOS NO-TÉCNICOS**

### **PASO 1: APIs Necesarias (4 valores críticos)**

Usuario necesita obtener:

1. **Replicate API Token**
   - URL: https://replicate.com/account/api-tokens
   - Formato: `r8_...`
   - Costo: Pay-per-use (~$0.01-0.1 per imagen)

2. **OpenRouter API Key**
   - URL: https://openrouter.ai/keys
   - Formato: `sk-or-v1-...`
   - Costo: Pay-per-use (~$0.001 per token)

3. **Su Modelo Fine-tuned**
   - Debe haber entrenado un modelo en Replicate
   - Formato: `usuario/modelo-name:version-hash`
   - Su trigger word personalizada

4. **Supabase Project**
   - URL: https://supabase.com/dashboard (crear proyecto gratis)
   - Necesita: Project URL + Anon Key + Service Key
   - **IMPORTANTE:** Debe ejecutar migraciones SQL

### **CONFIGURACIÓN DE ARCHIVOS**

```bash
# USUARIO EDITA ESTOS 2 ARCHIVOS:
backend/.env          # Valores principales
frontend/.env.local   # Copia los mismos valores
```

**Template backend/.env:**
```env
REPLICATE_API_TOKEN=r8_...
OPENROUTER_API_KEY=sk-or-v1-...
DEFAULT_MODEL=usuario/modelo
DEFAULT_VERSION=version_hash
TRIGGER_WORD=USUARIO
SUPABASE_URL=https://proyecto.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
```

## 🗄️ **SUPABASE DATABASE SETUP**

### **TABLAS CRÍTICAS (usuario debe crear):**

1. **generated_images** - Imágenes generadas con Replicate
2. **combined_images** - Imágenes combinadas con Nano Banana
3. **favorite_images** - Imágenes favoritas del usuario
4. **user_uploads** - Imágenes subidas por usuario
5. **saved_prompts** - Prompts guardados

### **SUPABASE SETUP AUTOMÁTICO (MUY IMPORTANTE):**

**PASO 1: Ejecutar SQL Script**
```bash
# Usuario va a: https://supabase.com/dashboard
# Selecciona su proyecto > SQL Editor > New Query
# Copia y pega COMPLETO el archivo: setup_supabase.sql
# Click "Run" - ¡Se crean todas las tablas automáticamente!
```

**PASO 2: Crear Storage Bucket**
```bash
# Ir a: Storage > Buckets > Create Bucket
# Nombre: "images"
# Público: Sí (importante para mostrar imágenes)
# Se crean automáticamente folders: generated/, combined/, favorites/, uploads/
```

**¿Por qué es crítico?**
- 5 tablas necesarias para funcionamiento
- Políticas RLS configuradas para acceso público (MVP)
- Indexes optimizados para performance
- **Sin esto, la app NO funciona**

**ARCHIVO CLAVE:** `setup_supabase.sql` (copy-paste completo)

## 🛠️ **TECNOLOGÍAS Y DEPENDENCIAS**

### **Backend (FastAPI):**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Puerto:** 8000 (con auto-fallback 8001, 8002)

### **Frontend (Next.js):**
```bash
cd frontend
npm install
npm run dev
```

**Puerto:** 3000 (con auto-fallback 3001, 3002)

## 🤖 **HERRAMIENTAS DEL CHAT AGENT**

### **1. generate_images**
- **API:** Replicate con modelo personalizado usuario
- **Input:** prompt + numImages (1-10)
- **Output:** Array de URLs de imágenes
- **Trigger:** "genera", "crea" + mention del TRIGGER_WORD

### **2. combine_images**
- **API:** OpenRouter con Gemini 2.5 Flash (Nano Banana)
- **Input:** image_urls[] + prompt + num_variations
- **Output:** Imágenes combinadas
- **Trigger:** "combina", "mezcla" + imágenes seleccionadas

### **3. create_images** (nuevo)
- **API:** OpenRouter Gemini 2.5 Flash
- **Input:** prompt + style
- **Output:** Imágenes generales (sin avatar específico)
- **Trigger:** "crear desde cero", no mention de trigger word

## 🔧 **TROUBLESHOOTING COMÚN**

### **Error: "Model not found"**
- Usuario no configuró correctamente DEFAULT_MODEL/DEFAULT_VERSION
- Verificar que el modelo existe en Replicate y está público

### **Error: "Supabase connection failed"**
- URLs/keys incorrectas en .env
- Proyecto Supabase no tiene las tablas creadas
- RLS policies bloqueando acceso

### **Error: "Port already in use"**
- Sistema tiene auto-fallback de puertos
- Verificar archivo `.port` en backend/

### **Error: "API key invalid"**
- Replicate/OpenRouter keys incorrectas o sin créditos
- Verificar formato de keys

## 📁 **ESTRUCTURA DE ARCHIVOS CLAVE**

```
proyecto/
├── backend/
│   ├── .env                 # USUARIO EDITA
│   ├── .env.example         # Template
│   ├── main.py              # FastAPI app
│   ├── api/chat_router.py   # Chat agent + tools
│   └── system_prompts/      # Prompts del agent
├── frontend/
│   ├── .env.local           # USUARIO EDITA
│   ├── .env.example         # Template
│   └── src/app/page.tsx     # UI principal
├── migrations/              # SQL para Supabase
├── start.sh                 # Auto-start script
└── README.md               # Instrucciones usuario
```

## 🎯 **FLUJO TYPICAL DEL USUARIO**

1. **Descarga proyecto** desde GitHub
2. **Configura .env files** con sus APIs y modelo
3. **Crea proyecto Supabase** y ejecuta migraciones
4. **Instala dependencias** (pip + npm)
5. **Ejecuta `./start.sh`** o manualmente los servidores
6. **Abre localhost:3000** y empieza a generar

## 💡 **CONSEJOS PARA IA ASISTANTS**

- **Siempre verificar** que el usuario tiene un modelo fine-tuned propio
- **Supabase setup** es lo más complicado - guiar paso a paso
- **Copy-paste exacto** de configuraciones evita errores
- **Testing inmediato** después de configuración
- **Logs de error** están en consola browser + terminal backend

## 🚨 **ERRORES A EVITAR**

- No asumir que tienen modelos específicos instalados
- No saltar la configuración de Supabase
- No usar config.json (usuario prefiere .env)
- No cambiar puertos sin explicar auto-fallback
- No tocar system prompts sin entender el chat agent

## 📞 **SOPORTE**

Si usuario tiene problemas, revisar en orden:
1. Variables .env correctas
2. Modelos existentes en Replicate
3. Supabase proyecto + migraciones ejecutadas
4. Dependencias instaladas (pip + npm)
5. Puertos disponibles (auto-fallback activo)