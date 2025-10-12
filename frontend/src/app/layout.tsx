import './globals.css';
import AppLayout from '@/components/layout/AppLayout';
import PasswordGate from './password-gate';

export const metadata = {
  title: 'Fábrica de Miniaturas - AI Thumbnail Generator',
  description: 'Generador de miniaturas con IA usando DANI LoRA y herramientas conversacionales',
  manifest: '/manifest.json',
  themeColor: '#9D4EDD',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Fábrica',
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen" suppressHydrationWarning={true}>
        <PasswordGate>
          <AppLayout>
            {children}
          </AppLayout>
        </PasswordGate>
      </body>
    </html>
  );
}