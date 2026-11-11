'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function TopBar() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<string>('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    // 1. Controllo immediato della sessione attiva
    const checkActiveSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      } else {
        setUserEmail(null);
      }
    };

    checkActiveSession();

    // 2. Ascoltatore in tempo reale dei cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      } else {
        setUserEmail(null);
      }
    });

    // 3. Orologio e data in tempo reale
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(now.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }));
      setCurrentTime(now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    updateDateTime();
    const dateTimer = setInterval(updateDateTime, 1000);
    const sessionTimer = setInterval(() => setSeconds((s) => s + 1), 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(dateTimer);
      clearInterval(sessionTimer);
    };
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    router.push('/login'); // Rimanda direttamente al login di sistema
    router.refresh();
  };

  const formatDuration = (sec: number) => {
    const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${s}`;
  };

  return (
    <header className="bg-gray-950 border-b border-gray-800 w-full">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* 1. Click su logo rimanda alla dashboard utente */}
        <Link 
          href="/dashboard"
          className="flex items-center gap-3 group cursor-pointer"
        >
          <span className="text-xl font-black text-white tracking-tight uppercase group-hover:text-amber-400 transition-colors">
            Glaring
          </span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
          <span className="text-xs text-gray-400 border-l border-gray-800 pl-3 uppercase tracking-wider font-mono">
            Strategic & Operation Advisors
          </span>
        </Link>

        {/* 4. Pannello Info: [User logged] [date] [timestamp] [login duration] */}
        <div className="flex items-center flex-wrap gap-3">
          {userEmail && (
            <div className="bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-xl text-xs text-gray-300 font-mono hidden lg:block">
              User: <strong className="text-amber-400">{userEmail}</strong>
            </div>
          )}

          <div className="bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-xl text-xs text-gray-300 font-mono">
            Data: <strong className="text-gray-100">{currentDate}</strong> | Ore: <strong className="text-gray-100">{currentTime}</strong>
          </div>

          <div className="bg-gray-900 border border-gray-800 px-3.5 py-1.5 rounded-xl text-xs text-gray-300 font-mono">
            Durata: <strong className="text-emerald-400">{formatDuration(seconds)}</strong>
          </div>

          <div className="flex items-center gap-2 border-l border-gray-800 pl-4">
            {/* 3. Edit Profile appare solo se l'utente è loggato */}
            {userEmail && (
              <Link
                href="/profile"
                className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center"
              >
                Edit Profile
              </Link>
            )}

            {/* 2. Log-out rimanda al login di sistema */}
            <button
              onClick={handleLogout}
              className="px-4 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300 hover:text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            >
              Log-out
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
