'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Reindirizzamento diretto alla dashboard advisor funzionante
      router.push('/advisor');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Errore durante l\'autenticazione.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-lg mx-auto shadow-lg shadow-blue-500/20">
          G
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Accesso GOS V1.2</h1>
        <p className="text-xs text-gray-400">Glaring Operating System · Autenticazione Riservata</p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-400">Email Aziendale / Personale</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="nome@glaring.com"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-400">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/20"
        >
          {loading ? 'Accesso in corso...' : 'Accedi al Sistema'}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-gray-800/80">
        <Link href="/" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
          ← Torna alla Home / Hub Principale
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 flex flex-col items-center justify-center p-6 font-sans">
      <Suspense fallback={<div className="text-gray-400 text-sm">Caricamento in corso...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
