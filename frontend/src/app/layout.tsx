import './globals.css';
import AppLayout from '@/components/layout/AppLayout';
import PasswordGate from './password-gate';
import { Roboto_Slab } from 'next/font/google';

// 🎨 Configuración de fuentes - Roboto Slab para elegancia minimalista
const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '900'], // 900 = Black
  variable: '--font-roboto-slab',
  display: 'swap',
});

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
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
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
    <html lang="en" className={robotoSlab.variable}>
      <body className={`min-h-screen ${robotoSlab.className}`} suppressHydrationWarning={true}>
        <PasswordGate>
          <AppLayout>
            {children}
          </AppLayout>
        </PasswordGate>
      </body>
    </html>
  );
}