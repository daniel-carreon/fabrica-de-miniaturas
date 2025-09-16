import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Daniel Flux Context',
  description: 'AI-powered image generation for YouTube thumbnails',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen" suppressHydrationWarning={true}>
        <header className="border-b border-white/10 bg-black/20 backdrop-blur-md">
          <div className="container mx-auto px-4 py-6">
            <h1 className="text-3xl font-bold text-white purple-glow">
              🎯 Daniel Flux Context
            </h1>
            <p className="text-sm text-purple-200 mt-1">
              AI-powered image generation for YouTube thumbnails
            </p>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}