import { NextRequest, NextResponse } from 'next/server'

interface ChatRequest {
  message: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
  }>
  selectedImages?: Array<{
    id: string
    url: string
    prompt?: string
  }>
}

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Receiving chat request...')

    const body = await request.text()
    console.log('📥 Raw body:', body)

    const parsed = JSON.parse(body)
    console.log('📋 Parsed JSON:', parsed)

    const { message, messages = [], selectedImages = [] }: ChatRequest = parsed

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    console.log('🤖 Processing chat request:', message)
    console.log('📜 Message history length:', messages.length)

    // Prepare context for selected images
    let selectedImagesContext = ''
    if (selectedImages.length > 0) {
      selectedImagesContext = `\n\nCURRENT SELECTED IMAGES:\n${selectedImages.map((img, i) =>
        `${i + 1}. ID: ${img.id}\n   URL: ${img.url}\n   Prompt: ${img.prompt || 'N/A'}`
      ).join('\n')}`
    }

    // Prepare messages for OpenRouter with tool calling capabilities
    const openRouterMessages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are a specialized AI assistant for image generation and processing. You have access to powerful tools:

🎨 AVAILABLE TOOLS:
1. generate_images - Generate personalized images with DANI LoRA model
2. combine_images - Combine multiple images using Nano Banana AI

📋 CURRENT CONTEXT:${selectedImagesContext}

🔑 IMPORTANT RULES:
- When user asks to generate images, use generate_images tool
- When user asks to combine images and there are selected images, use combine_images tool
- DANI trigger word is automatically added to generated images
- Be concise and action-oriented
- All images are automatically optimized to WebP format

You are part of "Daniel Flux Context" - a professional image generation system for content creators.`
      },
      // Add recent conversation history (last 10 messages)
      ...messages.slice(-10).map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ]

    console.log('📤 Sending to OpenRouter:', {
      model: 'gpt-5-mini',
      messagesCount: openRouterMessages.length
    })

    // Call OpenRouter API
    const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Daniel Flux Context'
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: openRouterMessages,
        max_tokens: 1500, // Increased for tool arguments
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_images',
              description: 'Generate personalized images using DANI fine-tuned model',
              parameters: {
                type: 'object',
                properties: {
                  prompt: {
                    type: 'string',
                    description: 'The image generation prompt (DANI will be automatically added)'
                  },
                  count: {
                    type: 'integer',
                    description: 'Number of images to generate (1-10)',
                    minimum: 1,
                    maximum: 10,
                    default: 4
                  }
                },
                required: ['prompt']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'combine_images',
              description: 'Combine multiple selected images using Nano Banana AI',
              parameters: {
                type: 'object',
                properties: {
                  combination_prompt: {
                    type: 'string',
                    description: 'Instructions for how to combine the images'
                  },
                  image_urls: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'URLs of images to combine (from selected images)'
                  }
                },
                required: ['combination_prompt', 'image_urls']
              }
            }
          }
        ],
        tool_choice: 'auto'
      })
    })

    if (!openRouterResponse.ok) {
      const errorData = await openRouterResponse.text()
      console.error('❌ OpenRouter API error:', {
        status: openRouterResponse.status,
        statusText: openRouterResponse.statusText,
        body: errorData
      })

      throw new Error(`OpenRouter API error: ${openRouterResponse.status} ${openRouterResponse.statusText}`)
    }

    const data = await openRouterResponse.json()
    console.log('✅ OpenRouter response received')

    const choice = data.choices?.[0]
    const message = choice?.message

    // Check if AI wants to use tools
    if (message?.tool_calls && message.tool_calls.length > 0) {
      console.log('🛠️ AI requested tool usage:', message.tool_calls.map(tc => tc.function.name))

      const toolCall = message.tool_calls[0]
      const functionName = toolCall.function.name
      const functionArgs = JSON.parse(toolCall.function.arguments)

      if (functionName === 'generate_images') {
        // Redirect to generate API
        const generateResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: functionArgs.prompt,
            count: functionArgs.count || 4
          })
        })

        const generateResult = await generateResponse.json()

        if (generateResult.success) {
          return NextResponse.json({
            response: `✅ Generated ${generateResult.data.images.length} images with prompt: "${functionArgs.prompt}"\n\nImages are being automatically optimized to WebP format and will appear in your gallery shortly.`,
            tool_used: 'generate_images',
            tool_result: generateResult.data,
            usage: data.usage,
            model: data.model
          })
        } else {
          return NextResponse.json({
            response: `❌ Failed to generate images: ${generateResult.error}`,
            tool_used: 'generate_images',
            tool_error: generateResult.error,
            usage: data.usage,
            model: data.model
          })
        }
      }

      if (functionName === 'combine_images') {
        // Use Nano Banana via OpenRouter for combination
        const combineResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
            'X-Title': 'Daniel Flux Context - Combine Images'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: `${functionArgs.combination_prompt}\n\nPlease combine these images according to the instructions.`
              }
            ],
            max_tokens: 1000
          })
        })

        if (combineResponse.ok) {
          const combineResult = await combineResponse.json()
          const combinedImageUrl = combineResult.choices?.[0]?.message?.content || null

          if (combinedImageUrl) {
            // Save to combined_images table
            const saveResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/combined`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                images: [{
                  id: `combined_${Date.now()}`,
                  url: combinedImageUrl,
                  prompt: functionArgs.combination_prompt,
                  timestamp: Date.now()
                }],
                sourceImages: selectedImages,
                combinationSession: `session_${Date.now()}`,
                modelUsed: 'nano-banana'
              })
            })

            const saveResult = await saveResponse.json()

            if (saveResult.success) {
              return NextResponse.json({
                response: `✅ Successfully combined ${selectedImages.length} images!\n\nPrompt: "${functionArgs.combination_prompt}"\n\nThe combined image is being optimized to WebP format and will appear in your gallery shortly.`,
                tool_used: 'combine_images',
                tool_result: {
                  combined_url: combinedImageUrl,
                  source_images: selectedImages,
                  save_result: saveResult.data
                },
                usage: data.usage,
                model: data.model
              })
            }
          }
        }

        return NextResponse.json({
          response: `❌ Failed to combine images. Please try again or check if the selected images are valid.`,
          tool_used: 'combine_images',
          tool_error: 'Combination failed',
          usage: data.usage,
          model: data.model
        })
      }
    }

    // Regular chat response (no tools used)
    const assistantResponse = message?.content || 'I apologize, but I could not generate a response.'

    console.log('🎯 Assistant response:', assistantResponse.substring(0, 100) + '...')

    return NextResponse.json({
      response: assistantResponse,
      usage: data.usage,
      model: data.model
    })

  } catch (error) {
    console.error('❌ Chat API error:', error)

    return NextResponse.json(
      {
        error: 'Failed to process chat request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}