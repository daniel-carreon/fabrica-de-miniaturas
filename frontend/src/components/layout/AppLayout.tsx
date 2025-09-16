'use client'

import { useState } from 'react'
import ChatAgent from '@/features/chat/components/ChatAgent'
import { LiquidButton } from '@/components/ui/liquid-glass-button'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [isChatOpen, setIsChatOpen] = useState(false)

  return (
    <div className="flex h-screen">
      {/* Chat Sidebar */}
      <div className={`transition-all duration-300 ${
        isChatOpen ? 'w-96' : 'w-0'
      } overflow-hidden bg-black/20 backdrop-blur-sm border-r border-purple-500/20`}>
        <div className="p-4 h-full">
          {isChatOpen && <ChatAgent />}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header with Chat Toggle */}
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-md shrink-0">
          <div className="px-4 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white purple-glow">
                  🎯 Daniel Flux Context
                </h1>
                <p className="text-sm text-purple-200 mt-1">
                  AI-powered image generation for YouTube thumbnails
                </p>
              </div>

              {/* Chat Toggle Button */}
              <LiquidButton
                onClick={() => setIsChatOpen(!isChatOpen)}
                variant="space"
                size="lg"
                className="flex items-center gap-2"
              >
                <span className="text-lg">🤖</span>
                <span className="hidden sm:inline">
                  {isChatOpen ? 'Hide' : 'Show'} AI Assistant
                </span>
                <span className="sm:hidden">AI</span>
              </LiquidButton>
            </div>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className={`transition-all duration-300 ${
            isChatOpen ? 'max-w-4xl' : 'max-w-6xl'
          } mx-auto`}>
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Chat Overlay */}
      {isChatOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden">
          <div className="h-full w-full max-w-sm bg-black/90 backdrop-blur-md border-r border-purple-500/20">
            <div className="p-4 h-full relative">
              {/* Close button for mobile */}
              <div className="absolute top-4 right-4 z-10">
                <LiquidButton
                  onClick={() => setIsChatOpen(false)}
                  variant="space"
                  size="sm"
                >
                  ✕
                </LiquidButton>
              </div>
              <ChatAgent />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}