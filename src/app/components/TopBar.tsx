'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, usePathname } from 'next/navigation';

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Nasconde completamente la Topbar sulle rotte condivise esterne (es. /share/kronos/[id])
  const isShareRoute = pathname?.startsWith('/share');

  useEffect(() => {
    if (isShareRoute) {
      setLoading(false);
      return;
    }

    async function loadCurrentUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email || '');
      }
      setLoading(false);
    }

    loadCurrentUser();
  }, [supabase, isShareRoute]);

  if (isShareRoute) {
    return null;
  }

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
        <span className="font-mono text-gray-200">
          {loading ? 'Caricamento...' : userEmail}
        </span>

        <button
          onClick={() => router.push('/profile')}
          className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-lg text-white font-semibold transition-all cursor-pointer"
        >
          Edit Profile
        </button>

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
