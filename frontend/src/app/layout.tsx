'use client'; // Must be a client component for state and effects

import './globals.css';
import AppLayout from '@/components/layout/AppLayout';
import { useState, useEffect } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  // Use an environment variable for the password. Fallback to 'gemini' for local dev.
  const CORRECT_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || 'gemini';

  const handleLogin = () => {
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem('isAuthenticated', 'true');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPassword('');
    }
  };

  // Check session storage on component mount to stay logged in during the session
  useEffect(() => {
    if (sessionStorage.getItem('isAuthenticated') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Password screen UI
  if (!isAuthenticated) {
    return (
      <html lang="en">
        <body className="min-h-screen" suppressHydrationWarning={true}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100vw',
            height: '100vh',
            background: 'radial-gradient(circle, rgba(23,20,42,1) 0%, rgba(12,10,22,1) 100%)',
            color: 'white',
            fontFamily: 'monospace'
          }}>
            <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '15px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <h1 style={{ marginBottom: '0.5rem', fontSize: '1.5rem', color: '#a78bfa' }}>Authorization Required</h1>
              <p style={{ marginBottom: '2rem', color: '#d1d5db', fontSize: '0.9rem' }}>Please enter the access code.</p>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Access Code"
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: error ? '2px solid #f87171' : '1px solid #4f46e5',
                  background: 'rgba(0,0,0,0.3)',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none',
                  textAlign: 'center',
                  transition: 'border-color 0.2s'
                }}
              />
              <button
                onClick={handleLogin}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#7f5af0',
                  color: 'white',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                Enter
              </button>
            </div>
          </div>
        </body>
      </html>
    );
  }

  // Authenticated view (original layout)
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