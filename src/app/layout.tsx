'use client';

import './globals.css';
import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import type { Metadata, Viewport } from 'next';

export const viewport: Viewport = {
  themeColor: '#FF5500',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'GOS 1.2 — Glaring LLP Infrastructure',
  description: 'Strategic & Operation Advisors Infrastructure',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GOS 1.2',
  },
};

function NavigationHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [loginTime, setLoginTime] = useState<string>('');
  const [sessionDuration, setSessionDuration] = useState('00:00:00');
  const [currentDate, setCurrentDate] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const isShareRoute = pathname?.startsWith('/share');

  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date().toLocaleDateString('it-IT'));
    setLoginTime(
      new Date().toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    );

    if (isShareRoute) return;

    async function getSessionUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || 'Utente');
        if (session.user.user_metadata?.role) {
          setUserRole(session.user.user_metadata.role);
        }
      }
    }

    getSessionUser();

    const timer = setInterval(() => {
      setSessionDuration((prev) => {
        const parts = prev.split(':').map(Number);
        let s = parts[2] + 1;
        let m = parts[1];
        let h = parts[0];
        if (s >= 60) {
          s = 0;
          m++;
        }
        if (m >= 60) {
          m = 0;
          h++;
        }
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [supabase, isShareRoute]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (pathname === '/' || isShareRoute) return null;

  return (
    <header className="bg-[#050B14] border-b border-[#1E293B] w-full max-w-none shrink-0 p-[10px]">
      <div className="w-full max-w-none flex flex-col md:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3 group cursor-pointer">
            <div className="h-10 w-40 flex items-center">
              <img
                src="https://www.glaring.world/wp-content/uploads/2026/11/Glaring-Logo-S0S-White_Green.png"
                alt="Glaring LLP Logo"
                className="h-9 w-auto object-contain object-left"
              />
            </div>
            <div className="hidden sm:block border-l border-gray-700 pl-3">
              <span className="text-xs font-extrabold tracking-wider text-white uppercase block font-sans">
                GOS 1.2
              </span>
              <span className="text-[8px] text-gray-400 font-sans tracking-widest block uppercase">
                Glaring LLP Infrastructure
              </span>
            </div>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-4 text-xs font-sans">
          <div className="flex items-center gap-2 text-white">
            <span className="font-bold">{userEmail || 'Caricamento...'}</span>
            <span className="px-2 py-0.5 rounded-none text-[9px] font-bold border bg-amber-500/20 text-amber-300 border-amber-500/30">
              {userRole}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-gray-300 text-[11px]">
            <span>{mounted ? currentDate : ''}</span>
            <span>Login: {loginTime}</span>
            <span className="text-amber-400 font-bold">
              Durata: {mounted ? sessionDuration : '00:00:00'}
            </span>
          </div>

          <div className="flex items-center gap-2 border-l border-gray-800 pl-4">
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-300 rounded-none text-xs font-bold transition-all cursor-pointer"
            >
              Log-out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isShareRoute = pathname?.startsWith('/share');

  if (isShareRoute) {
    return <>{children}</>;
  }

  return (
    <div data-gos-layout="app" className="min-h-screen w-full overflow-x-hidden flex flex-col">
      <Suspense fallback={<div className="h-14 bg-[#050B14] w-full" />}>
        <NavigationHeader />
      </Suspense>

      <main className="flex-1 w-full max-w-none p-[10px] flex flex-col">
        {children}
      </main>

      <footer className="bg-[#0F172A] text-gray-300 p-[10px] w-full max-w-none text-xs mt-auto border-t border-[#1E293B] shadow-inner shrink-0">
        <div className="w-full max-w-none flex flex-col md:flex-row justify-between items-center gap-2 text-center md:text-left">
          <div>
            <span className="font-extrabold text-white">GOS 1.2</span> — Strategic &amp; Operation Advisors Infrastructure
          </div>
          <div className="text-gray-400">
            Glaring LLP © 2026 — Tutti i diritti riservati
          </div>
        </div>
      </footer>
    </div>
  );
}

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
          <LayoutShell>{children}</LayoutShell>
        </Suspense>
      </body>
    </html>
  );
}
