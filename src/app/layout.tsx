import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/components/Toast';
import PWARegistry from '@/components/PWARegistry';
import { AppErrorBoundary } from '@/components/ErrorBoundary';

import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://reelist.netlify.app'),
  title: 'Reelist. — Your Cinematic Watchlist',
  description:
    'Transform Instagram Reels into a curated movie watchlist. Discover, track, and never miss a recommendation again.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#020617',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="h-full bg-background text-slate-100 font-sans antialiased selection:bg-amber-500/20 selection:text-amber-200">
        <PWARegistry />
        <AuthProvider>
          <ToastProvider>
            <AppErrorBoundary>
              {children}
            </AppErrorBoundary>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
