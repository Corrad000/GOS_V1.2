'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // LOGIN UTENTE ESISTENTE
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Errore autenticazione:', err.message);
      if (err.message === 'Invalid login credentials') {
        setErrorMsg('Credenziali non valide o accesso non autorizzato.');
      } else {
        setErrorMsg(err.message || "Errore durante l'accesso.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
        
        {/* Header Identità GOS */}
        <div className="text-center space-y-2">
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase px-3 py-1 bg-amber-950/40 border border-amber-800/50 rounded-full inline-block">
            GOS-V1.2 · Glaring Operating System
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase pt-2">
            Accesso Piattaforma
          </h1>
          <p className="text-xs text-gray-400">
            Inserisci le tue credenziali per accedere al sistema
          </p>
        </div>

        {/* Notifica Errore */}
        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-400 text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Form di Autenticazione */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Email Istituzionale</label>
            <input
              type="email"
              placeholder="nome@glaring.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 px-3.5 py-3 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 px-3.5 py-3 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer disabled:opacity-50 uppercase tracking-wider"
          >
            {loading ? 'Elaborazione...' : 'Accedi al Sistema'}
          </button>
        </form>

        {/* Footer Minimal */}
        <div className="text-center pt-4 border-t border-gray-800 text-[10px] font-mono text-gray-500">
          Glaring LLP · Sicurezza e crittografia attiva
        </div>

      </div>
    </main>
  );
}
