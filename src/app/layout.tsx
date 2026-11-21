import './globals.css';
import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { AppShell } from './AppShell';

const FAVICON_URL = 'https://www.glaring.world/wp-content/uploads/2026/10/fav.png?v=3';

export const viewport: Viewport = {
  themeColor: '#FF5500',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'GOS 1.2 — Glaring LLP Infrastructure',
  description: 'Strategic & Operation Advisors Infrastructure',
  manifest: '/manifest.webmanifest?v=3',
  icons: {
    icon: FAVICON_URL,
    shortcut: FAVICON_URL,
    apple: FAVICON_URL,
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
        className="bg-[#050B14] text-white antialiased min-h-screen w-full overflow-x-hidden flex flex-col selection:bg-orange-600 selection:text-white"
      >
        <Suspense fallback={children}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
