'use client';

import './globals.css';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [userName] = useState('Corrado Pinna');
  const [userRole] = useState<'Administrator' | 'Network Partner' | 'Senior Advisor' | 'Junior Advisor'>('Administrator');
  const [loginTime] = useState('09:15:20');
  const [sessionDuration, setSessionDuration] = useState('00:42:15');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    setMounted(true);
    setCurrentDate(new Date().toLocaleDateString('it-IT'));

    const timer = setInterval(() => {
      setSessionDuration(prev => {
        const parts = prev.split(':').map(Number);
        let s = parts[2] + 1;
        let m = parts[1];
        let h = parts[0];
        if (s >= 60) { s = 0; m++; }
        if (m >= 60) { m = 0; h++; }
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const roleBadgeColors = {
    'Administrator': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Network Partner': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Senior Advisor': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Junior Advisor': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  return (
    <html lang="it" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-[#050B14] text-white antialiased min-h-screen flex flex-col selection:bg-orange-600 selection:text-white">
        
        {/* TOP BAR */}
        <header className="bg-[#050B14] h-[80px] text-white px-6 w-full shadow-md flex items-center border-b border-[#1E293B] shrink-0">
          <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-2">
            
            {/* Logo ufficiale */}
            <div className="flex items-center gap-3">
              <Link href="/admin" className="flex items-center gap-3 group cursor-pointer">
                <div className="h-12 w-44 flex items-center">
                  <img
                    src="https://www.glaring.world/wp-content/uploads/2026/11/Glaring-Logo-S0S-White_Green.png"
                    alt="Glaring LLP Logo"
                    className="h-11 w-auto object-contain object-left"
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

            {/* Info utente e sessione */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-sans">
              <div className="flex items-center gap-2 text-white">
                <span className="font-bold">{userName}</span>
                <span className={`px-2 py-0.5 rounded-none text-[9px] font-bold border ${roleBadgeColors[userRole]}`}>
                  {userRole}
                </span>
              </div>

              {/* Dati temporali renderizzati solo dopo il mount lato client per evitare hydration mismatch */}
              <div className="hidden lg:flex items-center gap-4 text-gray-300 text-[11px]">
                <span>{mounted ? currentDate : 'Caricamento...'}</span>
                <span>Login: {loginTime}</span>
                <span className="text-amber-400 font-bold">Durata: {mounted ? sessionDuration : '00:42:15'}</span>
              </div>

              <div className="flex items-center gap-2 border-l border-gray-800 pl-4">
                <Link
                  href="/profile"
                  className="px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-gray-200 rounded-none text-xs font-bold transition-all cursor-pointer flex items-center"
                >
                  Edit Profile
                </Link>
                <button
                  onClick={() => {
                    if (confirm('Vuoi effettuare il logout dal sistema GOS?')) {
                      window.location.href = '/login';
                    }
                  }}
                  className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 text-red-300 rounded-none text-xs font-bold transition-all cursor-pointer"
                >
                  Log-out
                </button>
              </div>
            </div>

          </div>
        </header>

        {/* CONTENUTO PRINCIPALE */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          {children}
        </main>

        {/* FOOTER */}
        <footer className="bg-[#0F172A] text-gray-300 py-4 px-6 text-xs mt-auto border-t border-[#1E293B] shadow-inner shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-2 text-center md:text-left">
            <div>
              <span className="font-extrabold text-white">GOS 1.0</span> — Strategic & Operation Advisors Infrastructure
            </div>
            <div className="text-gray-400">
              Glaring LLP © 2026 — Tutti i diritti riservati
            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}
