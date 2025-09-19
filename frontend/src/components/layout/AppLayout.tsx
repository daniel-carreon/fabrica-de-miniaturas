'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ChatAgent from '@/features/chat/components/ChatAgent'
import { LiquidButton } from '@/components/ui/liquid-glass-button'
import { Bot, Settings } from 'lucide-react'
import { SelectedImagesProvider } from '@/shared/contexts/SelectedImagesContext'
import ImageConfigPanel from '@/components/ui/ImageConfigPanel'
import { useImageConfig } from '@/shared/stores/imageConfigStore'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [chatWidth, setChatWidth] = useState(384) // 96 * 4 = 384px (w-96)
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef<number>(0)
  const { config, updateConfig } = useImageConfig()

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const deltaX = e.clientX - dragRef.current
    setChatWidth(prevWidth => {
      const newWidth = Math.max(280, Math.min(800, prevWidth + deltaX)) // Min 280px, Max 800px
      return newWidth
    })
    dragRef.current = e.clientX
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    dragRef.current = e.clientX
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove, handleMouseUp])

  return (
    <SelectedImagesProvider>
      <div className="flex h-screen">
        {/* Chat Sidebar */}
        <div
          className={`${
            isChatOpen ? '' : 'w-0 transition-all duration-300'
          } overflow-hidden bg-black/20 backdrop-blur-sm border-r border-purple-500/20 relative`}
          style={{ width: isChatOpen ? `${chatWidth}px` : '0px' }}
        >
          <div className="p-4 h-full">
            {isChatOpen && <ChatAgent />}
          </div>

          {/* Resize Handle */}
          {isChatOpen && (
            <div
              className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-purple-500/30 to-violet-600/50 hover:w-2 transition-all cursor-col-resize group"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute top-1/2 right-0 transform -translate-y-1/2 w-4 h-8 bg-purple-500/60 rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-0.5 h-4 bg-white/50 rounded"></div>
              </div>
            </div>
          )}
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

                <div className="flex items-center gap-3">
                  {/* Image Configuration Toggle */}
                  <LiquidButton
                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                    variant="space"
                    size="lg"
                    className={`w-12 h-12 rounded-full flex items-center justify-center p-0 ${
                      isConfigOpen ? 'ring-2 ring-purple-400' : ''
                    }`}
                  >
                    <Settings className="w-6 h-6" />
                  </LiquidButton>

                  {/* AI Assistant Toggle - Circular Button */}
                  <LiquidButton
                    onClick={() => setIsChatOpen(!isChatOpen)}
                    variant="space"
                    size="lg"
                    className={`w-12 h-12 rounded-full flex items-center justify-center p-0 ${
                      isChatOpen ? 'ring-2 ring-purple-400' : ''
                    }`}
                  >
                    <Bot className="w-6 h-6" />
                  </LiquidButton>
                </div>
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

        {/* Image Configuration Overlay */}
        {isConfigOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-start justify-center pt-20">
            <div className="w-full max-w-md bg-black/90 backdrop-blur-md border border-purple-500/30 rounded-xl mx-4">
              <div className="p-6 relative">
                {/* Close button */}
                <div className="absolute top-4 right-4 z-10">
                  <LiquidButton
                    onClick={() => setIsConfigOpen(false)}
                    variant="space"
                    size="sm"
                    className="w-8 h-8 rounded-full flex items-center justify-center p-0"
                  >
                    ✕
                  </LiquidButton>
                </div>

                <h3 className="text-lg font-bold text-white mb-4 purple-glow">
                  🎨 Image Configuration
                </h3>

                <ImageConfigPanel
                  config={config}
                  onConfigChange={updateConfig}
                  className=""
                />
              </div>
            </div>
          </div>
        )}

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
    </SelectedImagesProvider>
  )
}