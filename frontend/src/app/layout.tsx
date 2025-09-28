import './globals.css';
import AppLayout from '@/components/layout/AppLayout';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen" suppressHydrationWarning={true}>
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}