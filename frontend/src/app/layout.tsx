import type { Metadata } from 'next'
import './globals.css'
import AppLayout from '@/components/layout/AppLayout'

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
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  )
}