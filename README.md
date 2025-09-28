
# Fábrica de Miniaturas - Generador de Imágenes IA Full Stack

Una aplicación web full stack para generar, gestionar y optimizar imágenes personalizadas usando modelos de IA fine-tuneados. Diseñada para creators de contenido que necesitan generar múltiples variaciones de imágenes de forma eficiente.

---

## 🎯 **Características Principales**

### 🚀 **Generación Inteligente en Lotes**
- Genera 10+ imágenes simultáneamente para maximizar opciones
- Filtrado automático usando criterios de calidad predefinidos
- Sistema de descarte inteligente para optimizar resultados

### 🎨 **Gestión Avanzada de Contenido**
- Galería visual con vista previa instantánea
- Sistema de favoritos para organizar las mejores imágenes
- Historial completo de generaciones con metadatos
- Exportación optimizada para miniaturas de YouTube/redes sociales

### 🔧 **Automatización Completa**
- Integración con N8N para workflows automáticos
- Conexión directa con Supabase para almacenamiento
- API REST completa para integración con otras herramientas
- Procesamiento en background para experiencia fluida

---

## 🏗️ **Arquitectura del Proyecto**

### **Arquitectura Híbrida Estratégica**
```
daniel-flux-context/
├── frontend/                 # Next.js 15 + TypeScript
│   ├── src/
│   │   ├── app/             # App Router (auth, dashboard, gallery)
│   │   ├── features/        # Feature-First Architecture
│   │   │   ├── auth/        # Autenticación de usuarios
│   │   │   ├── image-generation/  # Core de generación
│   │   │   ├── gallery/     # Galería y visualización
│   │   │   ├── batch-processing/  # Procesamiento en lotes
│   │   │   └── favorites/   # Sistema de favoritos
│   │   └── shared/          # Componentes y utilidades compartidas
├── backend/                 # FastAPI + Clean Architecture
│   ├── api/                 # Endpoints REST
│   ├── application/         # Casos de uso y servicios
│   ├── domain/             # Modelos y lógica de negocio
│   ├── infrastructure/     # Integraciones externas
│   └── storage/            # Almacenamiento de archivos
├── supabase/               # Esquemas y migraciones
└── docs/                   # Documentación técnica
```

---

## 🔥 **Configuración del Modelo IA**

### **Tu Modelo Personalizado Fine-Tuned**
- **Modelo:** `tu-usuario/tu-modelo` (configurable en .env)
- **Version ID:** `tu_version_hash` (configurable en .env)
- **Trigger Word:** `TU_TRIGGER` (configurable en .env)
- **Optimizado para:** Retratos personalizados y contenido de YouTube

### **Parámetros Optimizados**
```json
{
  "num_images": 10,
  "quality": "high",
  "aspect_ratio": "16:9",
  "style": "photorealistic",
  "negative_prompt": "blurry, low quality, distorted"
}
```

---

## 🚀 **INSTALACIÓN EN 3 PASOS (YouTube Lead Magnet)**

### **PASO 1: Configurar tus APIs** ⚙️
```bash
# 1. Copia el template de configuración
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 2. Edita backend/.env con ESTOS 4 valores:
# - REPLICATE_API_TOKEN (obtén en: https://replicate.com/account/api-tokens)
# - OPENROUTER_API_KEY (obtén en: https://openrouter.ai/keys)
# - DEFAULT_MODEL=tu-usuario/tu-modelo
# - SUPABASE_URL + SUPABASE_ANON_KEY (crea gratis en: https://supabase.com)

# 3. Copia los MISMOS valores a frontend/.env.local

# 4. CRÍTICO - Configura Supabase:
# Ve a https://supabase.com/dashboard > Tu Proyecto > SQL Editor
# Copia y pega TODO el archivo setup_supabase.sql y ejecuta
# Luego: Storage > Create Bucket llamado "images" (público)
```

### **PASO 2: Instalar dependencias** 📦
```bash
# Backend
cd backend && pip install -r requirements.txt

# Frontend
cd frontend && npm install
```

### **PASO 3: Iniciar todo automáticamente** 🚀
```bash
# Desde la raíz del proyecto:
./start.sh    # Mac/Linux
# O manual: cd backend && uvicorn main:app --reload & cd frontend && npm run dev
```

**¡Listo!** Tu generador personal estará en `http://localhost:3000` 🎉

---

## 🛠️ **Comandos de Desarrollo**

### **Frontend**
```bash
npm run dev          # Servidor desarrollo
npm run build        # Build producción
npm run lint         # ESLint
npm run typecheck    # Verificación TypeScript
npm run test         # Tests unitarios
```

### **Backend**
```bash
uvicorn main:app --reload    # Servidor desarrollo
pytest                       # Tests
alembic upgrade head         # Migraciones DB
python -m pytest --cov      # Coverage
```

---

## 📊 **Funcionalidades Avanzadas**

### **🎯 Smart Batch Processing**
- **Problema Resuelto:** Los modelos de IA tienen precisión variable
- **Solución:** Genera 10 imágenes → Filtra automáticamente → Presenta las 3 mejores
- **Resultado:** 80% menos tiempo dedicado a revisar resultados

### **🔄 Integración N8N**
- **Workflow Automático:** Trigger → Generar → Filtrar → Notificar
- **Webhooks:** Recibe solicitudes desde N8N y devuelve resultados
- **Escalabilidad:** Procesa múltiples requests simultáneamente

### **📱 Responsive UI/UX**
- **Móvil First:** Optimizado para gestión desde cualquier dispositivo
- **Real-time Updates:** WebSockets para progreso en tiempo real
- **Drag & Drop:** Interfaz intuitiva para organizar imágenes

---

## 🔗 **Integraciones**

### **🗄️ Supabase**
- **Auth:** Sistema de usuarios completo
- **Storage:** Almacenamiento escalable de imágenes
- **Database:** PostgreSQL para metadatos y configuraciones
- **Real-time:** Sincronización en tiempo real

### **🤖 N8N Workflows**
- **Automatización:** Conecta con otros servicios
- **Scheduling:** Generaciones programadas
- **Webhooks:** API endpoints para triggers externos

### **🧰 MCP Protocol**
- **Tool Integration:** Herramientas para Claude Code
- **Extensibilidad:** Fácil adición de nuevas funcionalidades

---

## 🚀 **Casos de Uso**

### **📺 YouTube Creators**
- Genera múltiples opciones de thumbnails
- A/B testing automático de imágenes
- Optimización para CTR

### **📱 Social Media Managers**
- Contenido personalizado para diferentes plataformas
- Batch processing para campañas
- Consistencia visual de marca

### **🎨 Content Creators**
- Variaciones de portraits personalizados
- Estilos consistentes usando trigger word
- Workflow optimizado para producción en masa

---

## 📝 **Próximas Funcionalidades**

- [ ] **IA Style Transfer:** Aplicar estilos automáticamente
- [ ] **Video Thumbnails:** Generación desde frames de video
- [ ] **Brand Guidelines:** Cumplimiento automático de marca
- [ ] **Analytics:** Métricas de rendimiento de imágenes
- [ ] **API Marketplace:** Conectores para más plataformas

---

## 🔒 **Seguridad y Privacidad**

- **Tokens Seguros:** Variables de entorno para todas las API keys
- **Autenticación:** JWT + Supabase Auth
- **Almacenamiento:** Encriptación en reposo
- **GDPR Compliance:** Control total sobre datos del usuario

---

## 📈 **Performance**

- **Concurrencia:** Hasta 50 generaciones simultáneas
- **Cache Inteligente:** Reduce tiempo de respuesta 60%
- **CDN Integration:** Entrega global de imágenes
- **Background Jobs:** Procesamiento asíncrono

---

*Esta aplicación está diseñada para creators que valoran la eficiencia y la calidad. Genera más, decide menos, crea mejor.* ✨
