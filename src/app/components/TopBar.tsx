'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function TopBar() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadCurrentUser() {
      // 1. Prende l'utente correntemente loggato da Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email || '');
      }
      setLoading(false);
    }

    loadCurrentUser();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="bg-gray-950 border-b border-gray-800 px-6 py-3 flex items-center justify-between text-xs text-gray-300">
      <div className="flex items-center gap-4">
        <span className="font-bold text-white tracking-wide">GLARING GOS 1.2</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Email dinamica dell'utente correntemente loggato */}
        <span className="font-mono text-gray-200">
          {loading ? 'Caricamento...' : userEmail}
        </span>

        {/* Bottone Edit Profile dinamico che punta all'ID utente loggato */}
        <button
          onClick={() => router.push('/profile')}
          className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg text-white font-semibold transition-all cursor-pointer"
        >
          Edit Profile
        </button>

        {/* Bottone Log-out con pulizia sessione Supabase */}
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded-lg font-semibold transition-all cursor-pointer"
        >
          Log-out
        </button>
      </div>
    </header>
  );
}
