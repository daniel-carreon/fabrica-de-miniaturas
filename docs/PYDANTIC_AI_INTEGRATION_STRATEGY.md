# Pydantic AI Integration Strategy for Minifab

**Date**: October 27, 2025
**Status**: Research & Planning Phase
**Next Step**: Implementation of /chat-v2 endpoint

---

## 1. Executive Summary

Pydantic AI is a production-grade Python framework for building generative AI agents with full type safety, automatic tool management, and support for every major LLM provider. It brings the elegance of FastAPI to AI agent development.

**Key Benefits for Minifab**:
- ✅ Type-safe tool definitions (auto-validated)
- ✅ Model-agnostic (works with OpenRouter, OpenAI, Anthropic, Gemini, etc.)
- ✅ Built-in tool calling without manual prompt engineering
- ✅ Structured outputs with Pydantic model validation
- ✅ Observation & monitoring via Pydantic Logfire
- ✅ Durable execution for handling failures

---

## 2. Current Architecture vs. Pydantic AI

### Current Approach (OpenRouter)
```
User Message → FastAPI Endpoint → Raw OpenRouter API Call → Manual JSON Tool Parsing → Response
```

**Challenges**:
- Manual tool definition in system prompt
- Error-prone tool argument parsing
- No type validation of tool responses
- Difficult to refactor or extend tools
- Hard to switch between models

### Pydantic AI Approach
```
User Message → FastAPI Endpoint → Pydantic Agent (Tool Definitions) → LLM → Tool Execution → Structured Response
```

**Benefits**:
- Automatic tool schema generation from Python functions
- Type-safe tool definitions with validation
- Automatic fallback and error handling
- Easy model switching (just change provider string)
- Built-in observation and debugging

---

## 3. Pydantic AI Core Concepts

### 3.1 Agent Definition
```python
from pydantic_ai import Agent

agent = Agent(
    model='anthropic:claude-3-5-sonnet-20241022',  # or 'openai:gpt-4-turbo', etc.
    instructions='You are DANI, an expert miniature thumbnail creator.',
    system_prompt_template='Current user: {user_id}'  # Dynamic context
)
```

### 3.2 Tool Definition (Automatic)
```python
@agent.tool
def generate_images(
    prompt: str,
    count: int = 1,
    model: str = 'flux-dev'
) -> list[dict]:
    """
    Generate images using Replicate.

    Args:
        prompt: Detailed description of what to generate
        count: Number of images to generate (1-8)
        model: Model to use (flux-dev, stable-diffusion, etc.)

    Returns:
        List of image URLs and metadata
    """
    # Implementation here
    pass
```

**Advantages**:
- Docstring automatically becomes tool description
- Parameter types become schema
- Return type is validated
- IDE auto-completion works perfectly

### 3.3 Tool Dependencies (RunContext)
```python
from pydantic_ai import RunContext

@agent.tool
async def combine_images(
    ctx: RunContext[MyDeps],
    image1_url: str,
    image2_url: str,
    prompt: str
) -> dict:
    """Combine two images using Nano Banana."""
    # Access dependencies via ctx
    repo = ctx.deps.conversation_repo
    db = ctx.deps.db_client
```

### 3.4 Structured Agent Response
```python
from pydantic import BaseModel

class AgentResponse(BaseModel):
    reasoning: str
    action: str
    images_generated: int
    next_steps: list[str]

result = agent.run_sync(
    user_input,
    model_settings=ModelSettings(temperature=0.7),
)  # result.data is AgentResponse
```

---

## 4. Integration Plan for Minifab

### 4.1 Phase 1: Create /chat-v2 Endpoint (NEW)
Keep existing `/chat` endpoint working for backward compatibility.

```python
# backend/api/chat_v2_router.py

from pydantic_ai import Agent, RunContext
from domain.models import ChatV2Request, ChatV2Response

class ChatDependencies:
    """Dependencies injected into Pydantic AI agent"""
    def __init__(self, repo: ConversationRepository):
        self.repo = repo
        self.user_id = 'daniel'

chat_agent = Agent[ChatDependencies](
    model='openrouter:gpt-5-mini',  # or 'anthropic:claude-3-5-sonnet'
    instructions=SYSTEM_PROMPT_TEMPLATE,
)

# Tool 1: Generate Images
@chat_agent.tool
async def generate_images(
    ctx: RunContext[ChatDependencies],
    prompt: str,
    count: int = 1,
) -> list[dict]:
    """Generate thumbnail images using Flux Dev with DANI LoRA."""
    # Implementation

# Tool 2: Combine Images
@chat_agent.tool
async def combine_images(
    ctx: RunContext[ChatDependencies],
    image_urls: list[str],
    prompt: str,
) -> dict:
    """Combine multiple images using Nano Banana."""
    # Implementation

# Endpoint
@router.post("/chat-v2", response_model=ChatV2Response)
async def chat_v2(request: ChatV2Request):
    deps = ChatDependencies(repo=global_repo)
    result = await chat_agent.run(
        request.message,
        deps=deps,
        model_settings=ModelSettings(
            temperature=0.7,
            max_tokens=1500
        )
    )
    return ChatV2Response(
        response=result.data['text'],
        images=result.data.get('images', []),
        tool_calls=result.data.get('tool_calls', [])
    )
```

### 4.2 Architecture (Pydantic AI + Minifab)

```
FRONTEND
  ├─ ChatAgent component (uses /chat-v2)
  └─ ConversationPanel (manages conversation state)

BACKEND
  ├─ chat_v2_router.py (NEW - Pydantic AI)
  ├─ conversation_router.py (Existing - CRUD ops)
  ├─ domain/
  │  └─ models.py (Pydantic models)
  ├─ application/
  │  └─ chat_service.py (Pydantic AI agent setup)
  └─ infrastructure/
     └─ conversation_repository.py (Data access)
```

### 4.3 Model Provider Flexibility

```python
# Easy switching between providers
MODELS = {
    'production': 'anthropic:claude-3-5-sonnet-20241022',
    'fast': 'openrouter:gpt-5-mini',
    'vision': 'google:gemini-1.5-pro',
    'local': 'ollama:llama2',
}

# Use environment variable
active_model = os.getenv('LLM_MODEL', MODELS['fast'])
agent = Agent(model=active_model, ...)
```

---

## 5. Tool Calling Strategy with Pydantic AI

### Current Challenge (OpenRouter)
```python
# Manual tool parsing (error-prone)
tool_call = {
    "type": "function",
    "function": {
        "name": "generate_images",
        "arguments": '{"prompt":"...", "count":1}'  # String! Parse manually
    }
}

# We have to:
# 1. Check if arguments is string or object
# 2. Parse JSON if string
# 3. Validate against our schema
# 4. Handle errors gracefully
```

### Pydantic AI Solution
```python
# Tools are just Python functions
@agent.tool
def generate_images(prompt: str, count: int = 1) -> list[dict]:
    # Pydantic AI handles:
    # - Schema generation ✅
    # - Argument parsing ✅
    # - Type validation ✅
    # - Error handling ✅
```

---

## 6. Implementation Roadmap

### Phase 1: Create /chat-v2 Endpoint
```
- [ ] Create chat_v2_router.py with Pydantic AI setup
- [ ] Define tools (generate_images, combine_images)
- [ ] Add dependency injection for repositories
- [ ] Create ChatV2Request/ChatV2Response models
- [ ] Test with simple prompts
- [ ] Test with tool calling
```

### Phase 2: Integrate with Conversation Manager
```
- [ ] Store tool calls in chat_messages table
- [ ] Link images to conversation via conversation_images
- [ ] Add conversation_id to ChatV2Request
- [ ] Update ConversationStore to use /chat-v2
```

### Phase 3: Observability & Monitoring
```
- [ ] Integrate Pydantic Logfire for tracing
- [ ] Add performance metrics
- [ ] Track token usage
- [ ] Monitor tool call success rates
```

### Phase 4: Standardization
```
- [ ] Create @chat-tool decorator for consistency
- [ ] Define standard tool response format
- [ ] Create template for other SaaS Factory projects
```

---

## 7. Backward Compatibility Strategy

### Keep Both Endpoints
```
/api/chat        → Current OpenRouter implementation (keep working)
/api/chat-v2     → New Pydantic AI implementation (NEW)
```

### Migration Path
```
1. Deploy /chat-v2 alongside /chat
2. Frontend tests both endpoints
3. Collect feedback from /chat-v2
4. When stable, update frontend to prefer /chat-v2
5. Keep /chat as fallback indefinitely
```

### Conversation Table Extension
```sql
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS agent_version VARCHAR(10);
-- agent_version = 'v1' for /chat, 'v2' for /chat-v2
-- Allows tracking which agent handled each message
```

---

## 8. OpenRouter Integration with Pydantic AI

### Option 1: Use OpenRouter via Pydantic AI
```python
# Pydantic AI supports OpenRouter as a provider
from pydantic_ai.models.openrouter import OpenRouterModel

agent = Agent(
    model=OpenRouterModel(
        model_id='gpt-5-mini',
        api_key=os.getenv('OPENROUTER_API_KEY')
    ),
    instructions='Be helpful...'
)
```

### Option 2: Use Pydantic AI with Multiple Providers
```python
# Smart provider selection
def get_model():
    if user_needs_vision:
        return 'google:gemini-1.5-pro'
    elif user_needs_speed:
        return 'openrouter:gpt-5-mini'
    else:
        return 'anthropic:claude-3-5-sonnet'

agent = Agent(model=get_model(), ...)
```

---

## 9. Benefits for SaaS Factory Standardization

### Current State
```
- Each SaaS project has different agent setup
- Tool calling implemented differently
- No standard error handling
- Hard to maintain consistency
```

### With Pydantic AI Standard
```
- All projects use same Agent template
- Tools defined consistently
- Error handling automatic
- Easy to share between projects
```

### Example Template for SaaS Factory
```python
# .claude/skills/pydantic-ai-agent/template.py
from pydantic_ai import Agent, RunContext
from typing import Generic, TypeVar

DepsT = TypeVar('DepsT')

class SaaSAgent(Agent[DepsT]):
    """Base agent for all SaaS Factory projects"""

    def __init__(self, system_prompt: str, deps_class: type):
        super().__init__(
            model='openrouter:gpt-5-mini',
            instructions=system_prompt,
        )
        self.deps_class = deps_class

    @staticmethod
    def create_dependency_injector(config: dict) -> DepsT:
        """Override in subclass"""
        raise NotImplementedError
```

---

## 10. Known Limitations & Solutions

| Challenge | Pydantic AI Solution |
|-----------|----------------------|
| Requires Python 3.9+ | ✅ We're on 3.11+ |
| Limited control over prompt | ✅ `system_prompt_template` allows customization |
| Provider pricing differences | ✅ Model switching is trivial |
| Tool output validation | ✅ Automatic via type hints |
| Rate limiting | ⚠️ Need manual implementation |

---

## 11. Next Steps (PHASE 5)

1. **Install Pydantic AI**
   ```bash
   pip install pydantic-ai
   ```

2. **Create chat_v2_router.py**
   - Define Agent with tools
   - Implement generate_images tool
   - Implement combine_images tool

3. **Test /chat-v2 Endpoint**
   - Send simple prompts
   - Test tool calling
   - Verify response format

4. **Integrate with Frontend**
   - Add /chat-v2 option to ChatAgent
   - A/B test both endpoints
   - Monitor performance

5. **Document for SaaS Factory**
   - Create .claude/skills/pydantic-ai-standard/
   - Write reusable templates
   - Document best practices

---

## 12. Conclusion

Pydantic AI brings production-grade tooling to AI agent development. For Minifab, it means:

- ✅ **Type Safety**: Compile-time error detection
- ✅ **Maintainability**: Easy to refactor tools
- ✅ **Scalability**: Automatic handling of complex workflows
- ✅ **Standardization**: Template for all SaaS Factory projects
- ✅ **Flexibility**: Switch models with one line of code

**Timeline**:
- Implementation: 2-3 hours
- Testing: 1 hour
- Integration: 1 hour
- **Total**: ~4-5 hours

---

*This document serves as the foundation for PHASE 5: Implementation of /chat-v2 endpoint with Pydantic AI.*
