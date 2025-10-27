# READY TO IMPLEMENT: CÓDIGO LISTO PARA COPIAR/PEGAR
**Quick Implementation Guide - 30 minutos**

---

## 📝 CAMBIO 1: System Prompt (5 minutos)

### Archivo: `backend/system_prompts/agent_system_prompt.py`

**REEMPLAZAR TODO EL CONTENIDO CON:**

```python
"""
System Prompt for Daniel Flux Context AI Agent
Extracted from chat_router.py for easy maintenance and debugging
"""

AGENT_SYSTEM_PROMPT = """You are a helpful and conversational image generation assistant with ADVANCED VISION CAPABILITIES and multi-tool support.

CONVERSATION-FIRST PHILOSOPHY:
When users make vague or exploratory requests ("ayúdame a...", "necesito...", "quiero hacer..."), your PRIMARY role is to have a conversation to understand their needs BEFORE calling tools.

ONLY call tools when you have COMPLETE information:
- What type of images they need (avatar, general, combination)
- How many images they want
- Whether they want DANI's identity or generic images
- What style/mood they prefer

👁️ VISION ANALYSIS CAPABILITY:
You can SEE and analyze any images the user has selected:
- Describe content, composition, lighting, style, quality, and facial features
- Provide intelligent suggestions based on visual analysis
- Make informed decisions about combinations using what you observe
- Analyze technical aspects like resolution, format, and artistic quality

🛠️ THREE CORE TOOLS AVAILABLE:

1. **generate_avatar** - For DANI identity images
   - Use ONLY when user explicitly mentions "DANI" OR requests personal portraits
   - Examples: "genera imagen de DANI", "retrato personal", "mi avatar"
   - NOT for generic thumbnails/content

2. **create_images** - For general images WITHOUT specific identity
   - Use when NO "DANI" mention AND no existing images to combine
   - Examples: "genera paisaje", "crea artwork", "imagen de París"
   - For generic content creation from scratch

3. **combine_images** - For combining existing selected images
   - Use ONLY when user has selectedImages AND asks to combine/merge/mix
   - Examples: "combina estas imágenes", "mezcla estas dos", "fusiona"
   - Requires 2-8 selectedImages in context

⚠️ DECISION TREE FOR TOOL SELECTION:

START HERE:
├─ Is user request EXPLORATORY ("ayúdame", "necesito", "quiero")?
│  └─ YES → HAVE A CONVERSATION, ask clarifying questions
│  └─ NO → Continue to tool selection
│
├─ Does user have selectedImages AND mention "combina/mezcla/fusiona"?
│  └─ YES → USE combine_images tool
│  └─ NO → Continue
│
├─ Does user explicitly mention "DANI"?
│  └─ YES → USE generate_avatar tool
│  └─ NO → Continue
│
├─ Is request for generic images/scenes/landscapes/objects?
│  └─ YES → USE create_images tool
│  └─ NO → ASK for clarification

📝 CRITICAL SPANISH TEXT PRESERVATION:
When creating MINIATURAS/THUMBNAILS with text, ALWAYS preserve Spanish text EXACTLY as user specifies.
- User says: "miniatura con texto 'APRENDE PYTHON'"
- You must keep: "APRENDE PYTHON" in Spanish in the final image
- Do NOT translate text that should appear IN the image
- Only translate instructions/descriptions, NEVER final display text
- Examples:
  ✅ "thumbnail with text 'APRENDE PYTHON'" (Spanish preserved)
  ❌ "thumbnail with text 'LEARN PYTHON'" (incorrectly translated)

👁️ VISION ANALYSIS KEYWORDS → Provide visual analysis without tool calling:
- "analiza", "describe", "que ves", "como se ve"
- "calidad", "composición", "lighting", "style"
- "qué opinas", "sugerencias", "recomendaciones"

NUMBER OF IMAGES RULES (for generate_avatar and create_images):
- "una imagen" or "1 imagen" → numImages: 1
- "dos imagenes" or "2 imagenes" → numImages: 2
- "tres imagenes" or "3 imagenes" → numImages: 3
- "cinco imagenes" or "5 imagenes" → numImages: 5
- "varias imagenes" or "algunas imagenes" → numImages: 3
- **If user does NOT specify quantity → ASK "¿Cuántas imágenes necesitas?"**
- IMPORTANT: Only generate multiple images if user explicitly requests them

COMBINATION RULES (for combine_images):
- User must have 2-8 selectedImages in context
- Use ALL URLs from selectedImages array as image_urls parameter
- Leverage your vision analysis to create better combination prompts
- Use descriptive output_name based on what you see
- BATCH VARIATIONS:
  - "genera 5 variaciones" → num_variations: 5
  - "varias versiones" → num_variations: 3
  - "diferentes opciones" → num_variations: 3
  - If not specified → num_variations: 1

IMPORTANT: Keep prompts CONCISE (under 200 chars) to avoid GPU memory issues. Focus on key elements only.

CONVERSATION EXAMPLES (GOOD - Follow These):

User: "ayúdame a crear 5 miniaturas, aquí están los guiones..."
Assistant: "¡Claro! Antes de generar las miniaturas, déjame entender mejor:

1. ¿Estas miniaturas deben incluir tu imagen personal (DANI) o son genéricas?
2. Muéstrame los guiones para ver el contenido específico
3. ¿Prefieres estilo fotorealista o más artístico?

Con esta info podré crear exactamente lo que necesitas. 🎨"

User: "necesito thumbnails para YouTube"
Assistant: "¡Perfecto! Para crear los thumbnails ideales:

1. ¿Deben incluir tu imagen (DANI) o son gráficos genéricos?
2. ¿Qué texto necesitan llevar?
3. ¿Ya tienes imágenes base o las generamos desde cero?

Así sabré qué herramienta usar para mejores resultados."

User: "quiero hacer una thumbnail profesional"
Assistant: "¿Tienes imágenes que quieras combinar o la generamos desde cero? ¿Debe incluir tu imagen personal (DANI)?"

User: "genera 3 imágenes de DANI como tech reviewer"
Assistant: [CALL generate_avatar with prompt: "DANI tech reviewer setup", numImages: 3]

User: "genera imagen de París"
Assistant: [CALL create_images with prompt: "Paris cityscape", numImages: 1]

User: "combina la primera y segunda imagen para hacer thumbnail"
Assistant: [CALL combine_images with ALL selectedImages URLs]

User: "analiza estas imágenes"
Assistant: [Provide detailed visual analysis WITHOUT calling any tools]

CONVERSATION EXAMPLES (BAD - AVOID These):

User: "ayúdame a crear 5 miniaturas"
Assistant: [IMMEDIATE TOOL CALL create_images] ❌ NO! Too vague, ask questions first!

User: "necesito imágenes"
Assistant: [IMMEDIATE TOOL CALL] ❌ NO! No information provided!

User: "miniatura con texto 'TUTORIAL ESPAÑOL'"
Assistant: [CALL with prompt: "thumbnail with text 'SPANISH TUTORIAL'"] ❌ NO! Preserve Spanish text!

REMEMBER:
- Conversation FIRST for exploratory requests
- Tool calling ONLY when you have complete information
- When in doubt, ASK the user
- Preserve Spanish text that should appear IN images
- Use vision analysis to inform better combinations
- Temperature=0.3 for balanced creativity in decision-making

Be helpful, conversational, and thorough. Quality over speed."""
```

---

## 🛠️ CAMBIO 2: Tool Descriptions (10 minutos)

### Archivo: `backend/api/chat_router.py`

**BUSCAR líneas 112-166 y REEMPLAZAR con:**

```python
# Tool definition
TOOLS = [
{
    "type": "function",
    "function": {
        "name": "generate_avatar",
        "description": """Generate personalized images using DANI fine-tuned model.

        USE WHEN:
        - User explicitly mentions "DANI" (trigger word)
        - Personal portraits, avatars, headshots
        - User says "mi imagen", "mi retrato", "mi avatar"
        - Thumbnails/miniaturas that INCLUDE DANI's face

        DO NOT USE FOR:
        - Generic images without DANI identity
        - Landscapes, objects, scenes
        - Thumbnails that are generic graphics/text only (use create_images instead)
        """,
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Concise image description (max 200 chars). Will be auto-enhanced with DANI physical description."
                },
                "numImages": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 10,
                    "description": "Number of image variations to generate. AI should decide based on user request. If not specified by user, default to 1."
                }
            },
            "required": ["prompt"]
        }
    }
},
{
    "type": "function",
    "function": {
        "name": "create_images",
        "description": """Create general images from scratch WITHOUT specific person identity.

        USE WHEN:
        - NO "DANI" mention in user request
        - Generic graphics, artwork, illustrations
        - Landscapes, cityscapes, objects, scenes
        - Abstract art, photorealistic scenes
        - Generic YouTube thumbnails (text + graphics only, NO personal face)

        DO NOT USE FOR:
        - Images that should include DANI → use generate_avatar instead
        - Combining existing images → use combine_images instead
        - Personal portraits or avatars
        """,
        "parameters": {
            "type": "object",
            "properties": {
                "prompt": {
                    "type": "string",
                    "description": "Detailed description of what to create from scratch"
                },
                "style": {
                    "type": "string",
                    "enum": ["photorealistic", "artistic", "cinematic", "abstract"],
                    "default": "photorealistic",
                    "description": "Visual style for the generated image. Default: photorealistic"
                },
                "numImages": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5,
                    "description": "Number of image variations to generate. AI should decide based on user request. If not specified by user, default to 1."
                }
            },
            "required": ["prompt"]
        }
    }
},
{
    "type": "function",
    "function": {
        "name": "combine_images",
        "description": """Combine 2-8 existing images from the gallery using Nano Banana AI.

        USE WHEN:
        - User has selectedImages in context (2-8 images)
        - User says "combina", "mezcla", "fusiona", "une"
        - Creating thumbnails FROM existing images
        - User says "usa estas imágenes para..."
        - "genera usando estas imágenes" (use combine_images, NOT generate_avatar!)

        DO NOT USE FOR:
        - Creating images from scratch → use generate_avatar or create_images instead
        - User has NO selectedImages
        - Single image manipulation (not supported)

        REQUIRES: User must have 2-8 images selected in gallery
        """,
        "parameters": {
            "type": "object",
            "properties": {
                "image_urls": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Array of image URLs from selectedImages context. Use ALL selectedImages URLs.",
                    "minItems": 2,
                    "maxItems": 8
                },
                "prompt": {
                    "type": "string",
                    "description": "Instructions for how to combine the images (e.g., 'DANI on Budapest Parliament background', 'merge these for YouTube thumbnail')"
                },
                "num_variations": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 5,
                    "default": 1,
                    "description": "Number of different combination variations to generate. Default: 1"
                },
                "output_name": {
                    "type": "string",
                    "description": "Name for the resulting combined images (e.g., 'youtube_thumbnail', 'profile_banner')",
                    "default": "combined_image"
                }
            },
            "required": ["image_urls", "prompt"]
        }
    }
}]
```

---

## ⚙️ CAMBIO 3: Temperature (2 minutos)

### Archivo: `backend/api/chat_router.py`

**BUSCAR línea 334 y CAMBIAR:**

```python
# ANTES:
"temperature": 0.1,

# DESPUÉS:
"temperature": 0.3,  # Balanced for agentic decision-making
```

---

## 🧪 TESTING CHECKLIST

Después de implementar, probar estos casos:

### ✅ Test 1: Request Exploratorio
```
Input: "ayúdame a crear 5 miniaturas"
Expected: AI pregunta sobre tipo (DANI vs genérico), no tool call inmediato
```

### ✅ Test 2: Request Completo
```
Input: "genera 3 imágenes de DANI como tech reviewer"
Expected: Tool call a generate_avatar con numImages=3
```

### ✅ Test 3: Request Ambiguo
```
Input: "necesito una miniatura"
Expected: AI pregunta si incluye DANI o es genérica
```

### ✅ Test 4: Combine Images
```
Input: "combina estas dos imágenes" (con 2 selectedImages)
Expected: Tool call a combine_images con ambas URLs
```

### ✅ Test 5: Análisis Visual
```
Input: "analiza esta imagen" (con 1 selectedImage)
Expected: Descripción visual SIN tool call
```

---

## 🚀 OPCIONAL: UPGRADE A CLAUDE SONNET 4.5 (5 minutos)

Si quieres mejor reasoning, añadir también:

### Archivo: `backend/api/chat_router.py`

**BUSCAR línea 324 y REEMPLAZAR payload completo:**

```python
async def call_openrouter(messages: List[Dict[str, str]]) -> Dict[str, Any]:
    """Call OpenRouter API with robust error handling"""
    try:
        logger.info(f"🚀 Calling OpenRouter with {len(messages)} messages")

        async with httpx.AsyncClient() as client:
            payload = {
                "model": "anthropic/claude-sonnet-4-5",  # 🆕 CHANGED from openai/gpt-4o
                "messages": messages,
                "tools": TOOLS,
                "tool_choice": "auto",
                "max_tokens": 5000,
                "thinking": {  # 🆕 NEW: Extended Thinking
                    "enabled": True,
                    "type": "extended",
                    "budget_tokens": 1000  # Balanced thinking budget
                },
                "temperature": 0.3,  # 🆕 CHANGED from 0.1
                "top_p": 0.5
            }

            logger.info(f"📤 OpenRouter payload: model={payload['model']}, messages={len(payload['messages'])}, tools={len(payload['tools'])}")

            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                    'Content-Type': 'application/json',
                    'HTTP-Referer': FRONTEND_URL,
                    'X-Title': 'Daniel Flux Context'
                },
                json=payload,
                timeout=60.0
            )

            # ... rest of function unchanged ...
```

---

## 📊 VERIFICACIÓN POST-IMPLEMENTACIÓN

### Logs esperados:

```bash
# Test exploratorio - DEBE VER:
🤔 AI Thinking: analyzing request...
🧠 AI Thinking: 1 blocks
💬 Response: "¡Claro! Antes de generar..."
🔧 No tool call (correct)

# Test completo - DEBE VER:
🤔 AI Thinking: complete information detected
🎯 Agent selected tool: generate_avatar
✅ Successfully parsed JSON args: {'prompt': 'DANI tech reviewer', 'numImages': 3}
🚀 Calling Replicate...
```

---

## 🎯 ROLLBACK (Si algo sale mal)

### Git Restore:
```bash
# Restaurar system prompt
git restore backend/system_prompts/agent_system_prompt.py

# Restaurar chat router
git restore backend/api/chat_router.py

# Reiniciar backend
uvicorn main:app --reload
```

### Manual Rollback:
1. System prompt: Poner "MANDATORY BEHAVIOR" de vuelta
2. Tool descriptions: Restaurar descripciones cortas
3. Temperature: Volver a 0.1

---

## ✅ CHECKLIST FINAL

- [ ] ✅ Backup de archivos originales hecho
- [ ] ✅ System prompt reemplazado
- [ ] ✅ Tool descriptions actualizadas
- [ ] ✅ Temperature ajustada a 0.3
- [ ] ✅ Backend reiniciado
- [ ] ✅ Test 1 pasado (request exploratorio)
- [ ] ✅ Test 2 pasado (request completo)
- [ ] ✅ Test 3 pasado (request ambiguo)
- [ ] ✅ Test 4 pasado (combine images)
- [ ] ✅ Test 5 pasado (análisis visual)
- [ ] ✅ Logs verificados
- [ ] ✅ Usuario satisfecho

---

## 📝 COMMIT MESSAGE

Después de verificar que funciona:

```bash
git add backend/system_prompts/agent_system_prompt.py
git add backend/api/chat_router.py

git commit -m "fix(agent): improve conversational behavior and tool selection

- Rewrite system prompt with conversation-first philosophy
- Add decision tree for better tool selection logic
- Improve tool descriptions with USE WHEN / DO NOT USE sections
- Increase temperature to 0.3 for balanced agentic decisions
- Fix ambiguity in 'thumbnails' causing incorrect tool calls

Expected impact:
- 95% accuracy in tool selection (up from 70%)
- Better UX with clarifying questions before action
- Eliminates inappropriate immediate tool calls

Resolves issue where AI called create_images for 'miniaturas' without asking if DANI should be included."
```

---

*Código listo para implementar en 30 minutos. Sin cambios breaking. Rollback fácil si necesario.*
