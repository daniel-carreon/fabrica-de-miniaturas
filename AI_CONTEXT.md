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

---

# 🚀 **AGENT IMPROVEMENTS ANALYSIS (Septiembre 2024)**

## **PROBLEMAS IDENTIFICADOS CON AGENT ACTUAL**

### **1. ❌ Falta de Visibilidad en Pensamiento del Agente**
**Problema:** El usuario no ve qué está pensando el agente
- El agente está procesando, creando herramientas, ejecutando en backend
- Pero el frontend NO tiene modal que muestre este proceso
- Usuario experimenta: "¿Qué está haciendo?" → confusión → mala UX

**Solución Requerida:**
```typescript
// Frontend: Modal de pensamiento en tiempo real
<ThinkingModal
  isOpen={agentThinking}
  messages={thinkingSteps}
  currentStep={currentToolBeingCalled}
/>
```

- Backend envía eventos SSE (Server-Sent Events) con cada paso
- Tipos de pasos: "analyzing", "calling_tool:generate_images", "executing", "response_ready"
- UI muestra spinner + texto explicativo para cada paso

### **2. ❌ Modelo GPT-4 No Es Óptimo**
**Problema Actual:**
- Modelo: `openai/gpt-4o` (genérico)
- No es la mejor opción para agentic reasoning

**Solución:** Cambiar a **Claude 4.5 Sonnet**
- Razones:
  - Mejor comprensión de instrucciones complejas
  - Superior en tool calling (agentic behavior)
  - Mejor contexto de imágenes seleccionadas
- Método: **OpenRouter** (ya configurado en proyecto)

**Configuración Requerida:**
```env
# backend/.env
OPENROUTER_MODEL=anthropic/claude-4.5-sonnet-20251022
OPENROUTER_API_KEY=sk-or-v1-...
```

**En Pydantic AI:**
```python
from pydantic_ai.models import OpenRouterModel

model = OpenRouterModel(
    name='anthropic/claude-4.5-sonnet-20251022',
    api_key=os.getenv('OPENROUTER_API_KEY'),
    http_referer=os.getenv('FRONTEND_URL', 'http://localhost:3000')
)

agent = Agent(
    model=model,
    system_prompt="...",
    tools=[...],
    retries=2
)
```

### **3. ✅ React-Markdown para Visualizar Respuestas Formateadas**

**Beneficio:** Respuestas del agente renderizadas con formato markdown (listas, bold, código, etc.)

**Instalación:**
```bash
cd frontend
npm install react-markdown remark-gfm
```

**Implementación en ChatMessage:**
```typescript
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === 'assistant') {
    return (
      <div className="assistant-message">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-2xl font-bold" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-xl font-bold" {...props} />,
            p: ({node, ...props}) => <p className="text-gray-800 dark:text-gray-200" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside" {...props} />,
            code: ({node, inline, ...props}) =>
              inline ?
                <code className="bg-gray-200 px-2 py-1 rounded" {...props} /> :
                <code className="bg-gray-900 text-white p-4 rounded block" {...props} />
          }}
        >
          {content}
        </Markdown>
      </div>
    )
  }

  return (
    <div className="user-message">
      <p>{content}</p>
    </div>
  )
}
```

**Caso de Uso:**
```
User: "Genera 3 retratos de DANI sonriendo"

Agent Response (con markdown):
---
Perfecto! He generado 3 retratos de DANI sonriendo. Aquí está lo que hice:

## Proceso de Generación

1. **Detecté** el trigger word "DANI"
2. **Llamé** a la herramienta `generate_images` con:
   - Prompt: "DANI portrait, smiling, professional photo"
   - Num imágenes: 3
   - Modelo: daniel-carreon/danielcarrong:56c9356f

3. **Resultados:** ✅ 3 imágenes generadas exitosamente

## URLs Generadas
- Image 1: https://replicate.delivery/...
- Image 2: https://replicate.delivery/...
- Image 3: https://replicate.delivery/...

---
```

### **4. 🔧 PRP Configuration (Project Runtime Profile)**

**¿Qué es PRP?**
- Archivo de configuración que define el "perfil de ejecución" del proyecto
- Similar a `.vscode/settings.json` pero para Claude Code
- Define comportamiento del asistente IA al trabajar en el proyecto

**Estructura Básica (crear `.claude/PRP`):**
```json
{
  "name": "minifab",
  "version": "1.0.0",
  "description": "Generador de miniaturas con AI agent",
  "rules": {
    "codeStyle": "Pydantic + FastAPI patterns",
    "language": "es-MX",
    "complexity": "high",
    "aiAssistant": {
      "model": "claude-4.5-sonnet",
      "temperature": 0.7,
      "maxTokens": 4096
    }
  },
  "paths": {
    "backend": "backend/",
    "frontend": "frontend/",
    "migrations": "supabase/migrations"
  },
  "tools": {
    "generate_images": {
      "enabled": true,
      "description": "Genera imágenes con Replicate",
      "maxImages": 10
    },
    "combine_images": {
      "enabled": true,
      "description": "Combina 2 imágenes con Nano Banana"
    }
  },
  "constraints": {
    "noHardcodedSecrets": true,
    "useEnvVars": true,
    "minCodeCoverage": 0.8,
    "requireTypeScript": true,
    "requirePydanticModels": true
  }
}
```

### **5. 🎯 Settings.local.json Mejorado**

**Propósito:** Configuración local específica para desarrollo

**Estructura Recomendada:**
```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(npm:*)",
      "Bash(python:*)",
      "Bash(uvicorn:*)",
      "Read(/Users/danielcarreon/Documents/AI/**)",
      "Read(/Users/danielcarreon/.env*)",
      "Skill(agent-builder-pydantic-ai)",
      "Skill(nextjs-16-complete-guide)",
      "WebFetch(*)"
    ],
    "deny": [
      "Write(/Users/danielcarreon/.ssh)",
      "Write(/Users/danielcarreon/.git)"
    ]
  },
  "editor": {
    "theme": "dark",
    "fontSize": 14,
    "fontFamily": "Fira Code"
  },
  "development": {
    "autoFormat": true,
    "autoLint": true,
    "autoTest": false,
    "debugMode": true
  },
  "integrations": {
    "supabase": {
      "enabled": true,
      "projectRef": "${SUPABASE_PROJECT_ID}"
    },
    "openRouter": {
      "enabled": true,
      "model": "anthropic/claude-4.5-sonnet-20251022"
    },
    "replicate": {
      "enabled": true,
      "monitorCosts": true
    }
  },
  "mcpServers": [
    "supabase",
    "chrome-devtools"
  ]
}
```

## **ROADMAP DE IMPLEMENTACIÓN**

### **FASE 1: Agent Thinking Modal** (INMEDIATO)
- [ ] Crear componente `ThinkingModal.tsx`
- [ ] Implementar SSE en backend para eventos de pensamiento
- [ ] Conectar modal a ChatAgent component
- [ ] Mostrar pasos: analyzing → planning → calling_tool → executing

### **FASE 2: Cambiar a Claude 4.5 Sonnet** (INMEDIATO)
- [ ] Actualizar `backend/.env` con modelo antropic
- [ ] Modificar `agents/base_agent.py` para usar OpenRouterModel
- [ ] Testear tool calling con nuevo modelo
- [ ] Comparar respuestas de calidad

### **FASE 3: Integrar React-Markdown** (RÁPIDO)
- [ ] `npm install react-markdown remark-gfm` en frontend
- [ ] Crear `ChatMessage.tsx` con componentes customizados
- [ ] Actualizar `ChatAgent.tsx` para usar nuevo componente
- [ ] Testear con respuestas formateadas

### **FASE 4: Configurar PRP + Settings** (DOCUMENTACIÓN)
- [ ] Crear `.claude/PRP` con especificaciones del proyecto
- [ ] Actualizar `.claude/settings.local.json`
- [ ] Documentar en README.md para otros developers

## **PRIORIZACIÓN**

1. **CRÍTICO:** Agent Thinking Modal (mejor UX)
2. **CRÍTICO:** Claude 4.5 Sonnet (mejor agentic reasoning)
3. **IMPORTANTE:** React-Markdown (mejor visualización)
4. **DOCUMENTACIÓN:** PRP + Settings (mejor DX)

## **NOTAS TÉCNICAS**

### **SSE Implementation (Backend)**
```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import asyncio

router = APIRouter()

@router.post("/chat")
async def chat_endpoint(request: ChatRequest):
    async def event_generator():
        # Paso 1: Analizando
        yield f"data: {json.dumps({'step': 'analyzing', 'text': 'Analizando tu mensaje...'})}\n\n"
        await asyncio.sleep(0.5)

        # Paso 2: Planificando herramientas
        yield f"data: {json.dumps({'step': 'planning', 'text': 'Planificando herramientas a usar...'})}\n\n"
        await asyncio.sleep(0.5)

        # Paso 3: Ejecutando herramienta
        yield f"data: {json.dumps({'step': 'tool_call', 'tool': 'generate_images'})}\n\n"
        result = await agent.run(request.message)

        # Paso 4: Respuesta lista
        yield f"data: {json.dumps({'step': 'response', 'text': result.message})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

### **Frontend Event Listener**
```typescript
const response = await fetch('http://localhost:8000/api/chat', {
  method: 'POST',
  body: JSON.stringify({message, selectedImages})
})

const reader = response.body?.getReader()
while (true) {
  const {done, value} = await reader?.read()
  if (done) break

  const text = new TextDecoder().decode(value)
  const lines = text.split('\n')

  lines.forEach(line => {
    if (line.startsWith('data: ')) {
      const step = JSON.parse(line.slice(6))
      setThinkingStep(step)
    }
  })
}
```

---

**Este análisis será actualizado conforme el proyecto evoluciona. Feedback bienvenido! 🚀**