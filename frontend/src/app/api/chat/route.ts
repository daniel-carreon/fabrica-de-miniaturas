import { NextRequest, NextResponse } from 'next/server'

interface ChatRequest {
  message: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: string
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

    const { message, messages = [] }: ChatRequest = parsed

    if (!message?.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    console.log('🤖 Processing chat request:', message)
    console.log('📜 Message history length:', messages.length)

    // Prepare messages for OpenRouter (convert to OpenAI format)
    const openRouterMessages: OpenRouterMessage[] = [
      {
        role: 'system',
        content: `You are a helpful AI assistant that specializes in image generation and processing. You can help users with:

- Generating images using AI models (especially personalized images with "DANI" trigger word)
- Combining multiple images into single compositions
- Managing and organizing image files
- Creating thumbnails optimized for YouTube
- Searching and retrieving files from storage

You are part of a web application called "Daniel Flux Context" that helps create personalized images for content creation.

Be concise, helpful, and focus on practical solutions. When users ask about image generation or editing, provide clear guidance.`
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
        max_tokens: 500,
        temperature: 0.7,
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
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

    // Extract assistant's response
    const assistantResponse = data.choices?.[0]?.message?.content || 'I apologize, but I could not generate a response.'

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