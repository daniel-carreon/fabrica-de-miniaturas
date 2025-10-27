# 🍌 GUÍA DE PROMPTS OPTIMIZADOS PARA NANO BANANA

**Modelo:** `google/gemini-2.5-flash-image-preview` (Nano Banana)
**Última actualización:** Octubre 2025
**Basado en:** Análisis de 46 tests comparativos

---

## 🎯 FORTALEZAS DE NANO BANANA (Casos donde gana)

1. ✅ **Image Consistency** - Mantener identidad del sujeto
2. ✅ **Object Removal** - Remover elementos preservando fondo
3. ✅ **Color Changes** - Cambiar colores manteniendo textura
4. ✅ **Material Transformation** - Convertir materiales (ceramic → glass)
5. ✅ **Technical Drawings** - Blueprints con measurements
6. ✅ **Motion Dynamics** - Capturar movimiento (puppies midleap)
7. ✅ **Text Overlays** - Movie posters con texto

---

## ❌ DEBILIDADES DE NANO BANANA (Evitar estos casos)

1. ❌ Lighting changes complejos (golden hour, dramatic lighting)
2. ❌ Physics extremos (water contradictory directions)
3. ❌ Style transfer artístico (oil painting, watercolor)
4. ❌ Weather effects dramáticos (mejor usar GPT-5 Image)

---

## 📋 TEMPLATES DE PROMPTS POR CATEGORÍA

### 1. MINIATURAS DE YOUTUBE (Caso de uso principal)

#### Template Básico
```
Combina estas imágenes para crear una miniatura profesional de YouTube.
Mantén DANI reconocible con lighting consistente.
Background: [descripción del fondo]
Mood: [professional/dynamic/authoritative]
```

#### Ejemplo Real 1: Tech Review
```
Combina DANI sonriendo con fondo de oficina tech moderna.
Lighting: natural window light desde la izquierda.
Mood: professional pero approachable.
Composición: DANI ocupa 60% del frame, fondo 40%.
```

#### Ejemplo Real 2: Tutorial
```
Combina DANI explicando con pantalla de código en background.
Lighting: soft studio lighting en el rostro.
Mood: authoritative pero friendly.
Añade sutil glow effect alrededor de DANI para separarlo del fondo.
```

#### Ejemplo Real 3: Comparación
```
Combina DANI pensativo con split screen de dos productos tecnológicos.
Lighting: dramatic side lighting para crear tensión.
Mood: dynamic y engaging.
Composición: DANI centrado, productos a los lados.
```

---

### 2. COMBINACIONES DE IDENTIDAD + LOCATION

#### Template Optimizado
```
Composite portrait into [location] setting with matching natural lighting and [atmospheric effect].
Preserve facial features and skin tone accuracy.
Ensure realistic shadow physics and depth of field.
```

#### Ejemplo: Parlamento Budapest (Caso real exitoso)
```
Composite DANI portrait into Budapest Parliament waterfront setting.
Matching golden hour lighting with warm tones.
Add subtle mist effects from the river.
Preserve DANI's facial features with studio-quality clarity.
Realistic shadow placement considering sun position.
```

#### Ejemplo: Paisaje Natural
```
Composite DANI into mountain landscape at sunrise.
Natural lighting from low sun angle (golden hour).
Add atmospheric haze in the valleys.
Preserve facial detail while matching outdoor color temperature.
```

---

### 3. PRODUCT PLACEMENT (Fortaleza de Nano Banana)

#### Template para Productos Tech
```
Display [product] naturally in [setting] as prized possession.
Luxury presentation with [lighting_style] lighting.
Realistic shadow placement and surface reflections.
Maintain original product colors and branding.
```

#### Ejemplo: Laptop en Escritorio
```
Display MacBook Pro on minimalist desk setup as centerpiece.
Natural window lighting from the right creating soft shadows.
Maintain silver finish accuracy and Apple logo visibility.
Add subtle reflection on desk surface.
Background: blurred home office environment.
```

---

### 4. CAMBIOS DE COLOR (Especialidad de Nano Banana)

#### Template para Cambios de Color
```
Transform [object] color to [new_color] while preserving:
- Original texture and material properties
- Lighting reflections and highlights
- Shadow accuracy
- Surface details (grain, finish, etc.)
```

#### Ejemplo: Cambiar Ropa
```
Transform hoodie color from black to vibrant purple.
Preserve fabric texture and wrinkles.
Maintain original lighting reflections.
Keep shadow accuracy under the hood.
Preserve all other elements unchanged.
```

---

### 5. REMOVER OBJETOS (Campeón absoluto)

#### Template para Object Removal
```
Remove [object] completely and reconstruct:
- Background pattern/texture underneath
- Natural lighting in the revealed area
- Seamless blending with surroundings
- Accurate perspective if architectural elements involved
```

#### Ejemplo: Remover Furniture
```
Remove coffee table completely from living room.
Reconstruct hardwood floor pattern underneath.
Match natural lighting from windows.
Seamless transition to surrounding rug area.
Preserve all other furniture and decor unchanged.
```

---

### 6. TRANSFORMACIONES DE MATERIAL

#### Template para Material Changes
```
Transform [object] from [current_material] to [new_material] with:
- Realistic refraction (if transparent)
- Accurate surface properties (matte/glossy/reflective)
- Light interaction appropriate to new material
- Preserved object shape and proportions
```

#### Ejemplo: Ceramic to Glass
```
Transform coffee mug from ceramic to clear borosilicate glass.
Show realistic refraction through coffee liquid.
Add subtle reflections of environment on surface.
Maintain mug shape and handle proportions exactly.
Preserve steam rising from hot coffee.
```

---

### 7. MOTION DYNAMICS

#### Template para Motion Effects
```
Add realistic motion to [subject] showing:
- Motion blur on moving parts
- Frozen sharp focus on stationary elements
- Physics-accurate positioning
- Environmental interaction (wind, water, etc.)
```

#### Ejemplo: Action Shot
```
Capture DANI mid-jump in urban parkour scene.
Motion blur on legs and arms in movement.
Sharp focus on facial expression and torso.
Physics-accurate body positioning for jump arc.
Add dust particles kicked up from landing spot.
```

---

### 8. TEXT OVERLAYS (Muy bueno con Nano Banana)

#### Template para Movie Poster Style
```
Create movie poster composition with:
- Title: "[TEXT]" in [font_style] [color]
- Subtitle: "[TEXT]" below title
- Respect perspective and surface placement
- Ensure text readability with proper contrast
```

#### Ejemplo: Canal de YouTube
```
Design thumbnail with bold text overlay:
- Main title: "IS THIS THE BEST?" in thick red Helvetica
- Subtitle: "Honest Review 2025" in white
- Text positioned in upper third following rule of thirds
- Add subtle drop shadow for readability over complex background
- Maintain DANI portrait in lower two-thirds
```

---

## ⚙️ CONFIGURACIONES USERCONFIG RECOMENDADAS

### Configuración 1: Maximum Consistency (Miniaturas)
```json
{
  "character_consistency": "strict",
  "style_preset": "photorealistic",
  "lighting_preference": "studio",
  "mood": "professional",
  "temperature": 0.2,
  "image_quality": "ultra",
  "aspect_ratio": "widescreen"
}
```

### Configuración 2: Creative Freedom (Artístico)
```json
{
  "character_consistency": "flexible",
  "style_preset": "cinematic",
  "lighting_preference": "dramatic",
  "mood": "dynamic",
  "temperature": 0.6,
  "image_quality": "high",
  "aspect_ratio": "landscape"
}
```

### Configuración 3: Portrait Focus
```json
{
  "character_consistency": "strict",
  "preserve_facial_features": true,
  "style_preset": "portrait",
  "lighting_preference": "soft",
  "mood": "friendly",
  "temperature": 0.3,
  "image_quality": "ultra",
  "aspect_ratio": "portrait"
}
```

---

## 🎨 ESTILOS VISUALES DISPONIBLES

### Photorealistic (Default)
**Mejor para:** Miniaturas profesionales, retratos, product shots
**Prompts adicionales:**
- "Studio-quality photography"
- "DSLR camera, 85mm f/1.8"
- "Natural skin tones and accurate color reproduction"

### Cinematic
**Mejor para:** Content dramático, storytelling, reviews épicos
**Prompts adicionales:**
- "Anamorphic lens flare"
- "Film grain texture"
- "Color graded like [película/director]"
- "Shallow depth of field with bokeh background"

### Artistic
**Mejor para:** Contenido creativo, experimental
**Prompts adicionales:**
- "Editorial magazine style"
- "High-fashion photography aesthetic"
- "Bold color contrasts"

### Portrait
**Mejor para:** Headshots, about pages, professional photos
**Prompts adicionales:**
- "Professional headshot quality"
- "Catchlight in eyes"
- "Soft skin rendering without over-smoothing"

---

## 💡 TÉCNICAS AVANZADAS

### Técnica 1: Layered Prompting
Divide prompts complejos en capas:

```
LAYER 1 - Subject: DANI portrait with confident expression
LAYER 2 - Background: Modern tech office with MacBooks visible
LAYER 3 - Lighting: Natural window light from camera left, soft shadows
LAYER 4 - Composition: Rule of thirds, DANI positioned right third
LAYER 5 - Mood: Professional yet approachable for tech audience
```

### Técnica 2: Specific Lighting Control
Nano Banana responde bien a lighting específico:

```
Lighting setup:
- Key light: Soft window light from 45° camera left
- Fill light: Reflected light from white wall camera right
- Rim light: Subtle backlight separating subject from background
- Color temperature: 5500K (daylight balanced)
```

### Técnica 3: Precise Color Specification
```
Color palette:
- Primary: Vibrant tech blue (#2563EB)
- Secondary: Warm orange accent (#F97316)
- Background: Neutral gray (#6B7280)
- Skin tones: Preserve natural warmth
```

---

## 🔥 PROMPTS PROBADOS Y EXITOSOS (Del video)

### 1. Woman + Waterfall (Fallo de Nano Banana - APRENDER)
**Prompt original:** "Composite portrait into waterfall setting with matching natural lighting and mist effects"

**Por qué falló:** Lighting match complejo, colocación física irreal

**Cómo mejorarlo para Nano Banana:**
```
Composite DANI portrait standing ON DRY ROCKS in front of waterfall.
Natural overcast lighting (no harsh shadows).
Subtle mist effects in midground only.
Focus on maintaining DANI's facial features and skin tone.
Realistic footing on stable rock surface.
```

### 2. Puppies + Beach (Victoria de Seed - APRENDER)
**Prompt original:** "Move puppies to sunrise beach with golden hour lighting, sand interaction, and coastal atmosphere"

**Cómo optimizarlo para Nano Banana:**
```
Place golden retriever puppies on beach sand at golden hour.
Maintain original puppy fur texture and coloring exactly.
Add realistic paw prints in wet sand.
Warm golden sunlight from low sun angle.
Preserve puppy proportions and cuteness factor.
Simplified background: soft focus ocean and sky.
```

### 3. FedEx Truck + City (Victoria de Nano Banana - REPETIR)
**Prompt ganador:** "Position delivery truck naturally in urban environment with traffic context and realistic shadows"

**Por qué ganó:** Consistency strength, realistic shadows

**Formula exitosa:**
```
Position [object] naturally in [environment] with:
- Realistic shadow direction from [light_source]
- Environmental context (traffic, pedestrians, etc.)
- Matching color temperature
- Accurate perspective and scale
- Preserved original [object] branding/details
```

### 4. Sage Green Cabinets (Victoria de Nano Banana - REPETIR)
**Prompt ganador:** "Recolor cabinets to sage green while maintaining wood grain texture and hardware details"

**Formula exitosa:**
```
Recolor [object] to [new_color] while maintaining:
- Original surface texture (wood grain, fabric weave, etc.)
- Hardware and fixture details unchanged
- Lighting reflections adjusted to new color
- Shadow accuracy preserved
- All other elements in scene unchanged
```

---

## 🎯 CASOS DE USO ESPECÍFICOS PARA FÁBRICA DE MINIATURAS

### Caso 1: Review de Producto Tech
```
Combina DANI sosteniendo [producto] con fondo de escritorio tech minimalista.
DANI posicionado en right third del frame.
Producto visible y en foco, mostrando logo y características clave.
Lighting: soft natural light desde ventana simulada.
Add subtle blur en background para hacer DANI y producto pop.
Mood: authoritative tech reviewer.
```

### Caso 2: Tutorial Explainer
```
Combina DANI con expresión explicativa con diagrama/pantalla en background.
DANI en left third, mirando hacia el contenido (right side).
Background: screen capture o diagram relacionado al tutorial.
Lighting: even studio lighting en DANI para máxima claridad.
Add subtle arrow o highlight visual desde DANI hacia el contenido.
Mood: educational y approachable.
```

### Caso 3: Comparación A/B
```
Combina DANI centrado con [Opción A] en left side y [Opción B] en right side.
DANI con expresión pensativa, brazos cruzados.
Lighting: neutral para no favorecer ningún lado.
Add VS text overlay entre las opciones (bold red).
Composition: triángulo visual (DANI apex, opciones base).
Mood: analytical y objective.
```

### Caso 4: Click-worthy Thumbnail
```
Combina close-up de DANI con expresión shocked/surprised con background dramático.
DANI ocupa 70% del frame (rule of thirds ignored para impact).
Background: contrasting color o situación relevante al video.
Lighting: dramatic side lighting para crear shadows y depth.
Add text overlay space en top third.
Mood: dynamic y engaging (high energy).
```

---

## 📊 CHEAT SHEET DE LIGHTING

| Lighting Style | Mejor Para | Prompt Keywords |
|---------------|-----------|-----------------|
| **Studio** | Professional headshots, product shots | "even lighting", "soft shadows", "studio setup" |
| **Natural** | Outdoor scenes, lifestyle content | "window light", "daylight", "golden hour" |
| **Dramatic** | Reviews controversiales, storytelling | "side lighting", "hard shadows", "chiaroscuro" |
| **Soft** | Friendly content, approachable vibe | "diffused light", "overcast", "soft shadows" |

---

## 🎨 CHEAT SHEET DE MOOD

| Mood | Mejor Para | Visual Cues |
|------|-----------|-------------|
| **Professional** | Corporate, B2B, serious topics | Neutral expression, formal posture, clean background |
| **Casual** | Vlogs, behind-scenes, personal | Relaxed posture, smile, informal setting |
| **Dynamic** | Action, excitement, reveals | Movement, energy, bold colors |
| **Authoritative** | Expert reviews, analysis | Confident pose, direct gaze, minimal distractions |
| **Friendly** | Tutorials, beginner content | Warm smile, open posture, inviting background |

---

## 🚀 WORKFLOW RECOMENDADO

### Paso 1: Genera imágenes base
```
Chat: "Genera 5 retratos de DANI tech reviewer con diferentes expresiones"
```

### Paso 2: Selecciona mejor portrait
Elige el retrato con mejor expresión/lighting para tu miniatura

### Paso 3: Busca/genera background
Usa create_images para fondos genéricos o sube imagen específica

### Paso 4: Combina con prompt optimizado
```
Selecciona: [portrait DANI] + [background]
Chat: [Usa uno de los templates de arriba]
```

### Paso 5: Itera si necesario
Si no queda perfecto, ajusta:
- Temperature (más bajo = más conservador)
- Lighting keywords
- Composition specifics

---

## ⚡ TIPS RÁPIDOS

1. **Sé específico con lighting direction**: "from camera left" mejor que "good lighting"
2. **Menciona qué preservar**: "preserve facial features" asegura consistency
3. **Define mood explícitamente**: Nano Banana responde bien a mood keywords
4. **Usa aspect ratios apropiados**: widescreen para YT, square para IG, portrait para TikTok
5. **Mantén temperature bajo (0.2-0.4)** para miniaturas consistentes
6. **Para text overlays**, especifica font, color, size, y positioning
7. **Evita prompts que requieran physics complejos** (debilidad de Nano Banana)
8. **Para remover objetos**, describe qué debe aparecer debajo
9. **Batch testing**: Genera 3-5 variaciones cambiando solo temperature
10. **Guarda prompts exitosos**: Crea tu propia librería de formulas ganadoras

---

## 🔧 DEBUGGING PROMPTS

Si el resultado no es bueno:

### Problema: DANI no se ve reconocible
**Solución:**
```
Add to prompt: "Strict preservation of DANI's facial features, skin tone, and identity markers"
Config: character_consistency: "strict"
```

### Problema: Lighting no match
**Solución:**
```
Simplify lighting: "Soft even lighting throughout the entire image"
Avoid: Complex multi-source lighting descriptions
```

### Problema: Elementos no deseados aparecen
**Solución:**
```
Add: "No additional objects or elements beyond those specified"
Add: "Clean minimal composition"
```

### Problema: Colores se ven raros
**Solución:**
```
Add: "Preserve natural color accuracy and skin tones"
Add: "Color grading: neutral, no heavy filters"
```

---

**RECUERDA:** Nano Banana es **campeón en consistency**. Úsalo cuando necesites mantener identidad DANI reconocible. Para lighting dramático complejo, considera GPT-5 Image.

---

*Última actualización: Octubre 2025*
*Basado en análisis de 46 tests comparativos de modelos de image editing*
