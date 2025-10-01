import './globals.css';
import AppLayout from '@/components/layout/AppLayout';
import PasswordGate from './password-gate';

export const metadata = {
  title: 'Fábrica de Miniaturas',
  description: 'AI-powered thumbnail generator with DANI LoRA',
  icons: {
    icon: '/favicon.ico',
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