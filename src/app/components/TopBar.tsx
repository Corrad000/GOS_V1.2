'use client';

import { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, usePathname } from 'next/navigation';

function formatNameFromEmail(email?: string): string {
  if (!email) return 'Utente';
  const localPart = email.split('@')[0] || '';
  return (
    localPart
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
      .trim() || 'Utente'
  );
}

export default function TopBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [greetingName, setGreetingName] = useState<string>('Utente');
  const [loading, setLoading] = useState<boolean>(true);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // Nasconde completamente la Topbar sulle rotte condivise esterne (es. /share/kronos/[id])
  const isShareRoute = pathname?.startsWith('/share');

  useEffect(() => {
    if (isShareRoute) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadCurrentUser() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (active) {
            setGreetingName('Utente');
            setLoading(false);
          }
          return;
        }

        let resolvedName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          formatNameFromEmail(user.email);

        try {
          const { data: profiles } = await supabase
            .from('gos_profiles')
            .select('id, email, full_name, nome');

          if (Array.isArray(profiles)) {
            const matched = profiles.find(
              (p: any) =>
                (user.email &&
                  (p.email || '').toLowerCase() === user.email.toLowerCase()) ||
                p.id === user.id
            );
            if (matched?.full_name || matched?.nome) {
              resolvedName = matched.full_name || matched.nome;
            }
          }
        } catch {
          // Mantiene il fallback derivato dall'utente auth
        }

        if (active) {
          setGreetingName(resolvedName);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCurrentUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadCurrentUser();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, isShareRoute, pathname]);

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
          {loading ? 'Caricamento...' : `Ciao ${greetingName}`}
        </span>

        <button
          onClick={() => router.push('/profile')}
          className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-none text-white font-semibold transition-all cursor-pointer"
        >
          Edit Profile
        </button>

        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800 text-red-300 rounded-none font-semibold transition-all cursor-pointer"
        >
          Log-out
        </button>
      </div>
    </header>
  );
}
