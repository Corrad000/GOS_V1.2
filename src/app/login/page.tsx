'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function HomePage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        
        // LOGIN UTENTE ESISTENTE
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      console.error('Errore autenticazione:', err.message);
      setErrorMsg(
        err.message === 'Invalid login credentials'
          ? 'Credenziali non valide. Verifica email e password.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase px-3 py-1 bg-amber-950/40 border border-amber-800/50 rounded-full inline-block">
            GOS-V1.2 · Glaring Operating System
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight uppercase pt-2">
            {isSignUp ? 'Registrazione Nuovo Utente' : 'Accesso Piattaforma'}
          </h1>
          <p className="text-xs text-gray-400">
            {isSignUp ? 'Crea il tuo profilo nel network' : 'Inserisci le tue credenziali per accedere al sistema'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300 text-center">
            {successMsg}
          </div>
        )}
        

        <div className="text-center pt-4 border-t border-gray-800 text-[10px] font-mono text-gray-500">
          Glaring LLP · Sicurezza e crittografia attiva
        </div>

      </div>
    </main>
  );
}
