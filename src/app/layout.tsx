import './globals.css';
import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { AppShell } from './AppShell';

export const viewport: Viewport = {
  themeColor: '#FF5500',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'GOS 1.2 — Glaring LLP Infrastructure',
  description: 'Strategic & Operation Advisors Infrastructure',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon-192.png',
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GOS 1.2',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#090D16] text-[#E6EAF2] antialiased selection:bg-[#FF5500] selection:text-white"
      >
        <Suspense fallback={children}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
