'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

interface GosUserProfile {
  id: string;
  email?: string | null;
  full_text_name?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  role?: string | null;
  ruolo?: string | null;
  is_admin?: boolean | null;
  stato?: string | null;
  codice_utente?: string | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<GosUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Stato modale creazione nuovo utente
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState('Junior Associate');
  const [makeAdmin, setMakeAdmin] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const loadUsers = useCallback(async () => {
    const { data: allProfiles, error: fetchError } = await supabase
      .from('gos_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;
    if (allProfiles) setUsers(allProfiles as GosUserProfile[]);
  }, [supabase]);

  useEffect(() => {
    async function checkAdminAndLoadUsers() {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('gos_profiles')
          .select('is_admin, role, ruolo')
          .eq('id', user.id)
          .single();

        const normalized = String(profile?.ruolo || profile?.role || '').toLowerCase();
        const allowed = Boolean(profile?.is_admin) || normalized === 'superadmin';

        if (profileError || !allowed) {
          alert('Accesso negato: area riservata agli amministratori.');
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);
        await loadUsers();
      } catch (err) {
        console.error('Errore caricamento utenti admin:', err);
      } finally {
        setLoading(false);
      }
    }

    checkAdminAndLoadUsers();
  }, [router, supabase, loadUsers]);

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch('/api/utenti/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          companyName,
          role,
          isAdmin: makeAdmin,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Errore durante la creazione dell’utente.');
      }

      if (result?.user) {
        setUsers((prev) => [result.user as GosUserProfile, ...prev]);
      } else {
        await loadUsers();
      }

      setEmail('');
      setPassword('');
      setFullName('');
      setCompanyName('');
      setRole('Junior Associate');
      setMakeAdmin(false);
      setIsCreateOpen(false);
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error ? err.message : 'Impossibile creare l’utente.'
      );
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('gos_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      console.error('Errore aggiornamento ruolo:', err);
      alert('Impossibile aggiornare il ruolo.');
    }
  };

  const handleToggleAdmin = async (userId: string, currentAdminStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('gos_profiles')
        .update({ is_admin: !currentAdminStatus })
        .eq('id', userId);

      if (error) throw error;
      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, is_admin: !currentAdminStatus } : u
        )
      );
    } catch (err) {
      console.error('Errore modifica admin:', err);
      alert('Impossibile modificare i privilegi.');
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-100 p-10 font-mono text-xs flex items-center justify-center">
        VERIFICA CREDENZIALI AMMINISTRATIVE IN CORSO...
      </main>
    );
  }

  if (!isAdmin) return null;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-gray-900 border border-gray-800 text-amber-500 font-mono text-xs font-bold rounded-lg uppercase">
                GOS ADMIN
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">
              Gestione Utenti &amp; Rete Associata
            </h1>
            <p className="text-xs text-gray-400">
              Controllo centralizzato dei profili e dei ruoli di rete.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setIsCreateOpen(true);
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl transition-all cursor-pointer uppercase"
            >
              + Nuovo Utente
            </button>
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
            >
              Torna alla Dashboard
            </button>
          </div>
        </div>

        {isCreateOpen && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-5">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Crea Nuovo Utente
              </h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Chiudi
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1">Nome e Cognome</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Mario Rossi"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome.cognome@glaring.world"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Password iniziale (min. 8 caratteri)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Azienda / Struttura</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Glaring LLP"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1">Ruolo di Rete</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Network Partner">Network Partner</option>
                  <option value="Senior Associate">Senior Associate</option>
                  <option value="Junior Associate">Junior Associate</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  id="make-admin-checkbox"
                  type="checkbox"
                  checked={makeAdmin}
                  onChange={(e) => setMakeAdmin(e.target.checked)}
                  className="rounded border-gray-700 bg-gray-950 text-amber-500"
                />
                <label htmlFor="make-admin-checkbox" className="text-gray-300">
                  Assegna privilegi Admin
                </label>
              </div>

              {createError && (
                <div className="md:col-span-2 text-red-400 bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
                  {createError}
                </div>
              )}

              <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-semibold cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-bold rounded-lg cursor-pointer uppercase"
                >
                  {creating ? 'Creazione...' : 'Crea Utente'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950 text-gray-400 font-mono border-b border-gray-800 uppercase">
                <tr>
                  <th className="p-4">Utente / ID</th>
                  <th className="p-4">Azienda</th>
                  <th className="p-4">Ruolo di Rete</th>
                  <th className="p-4 text-center">Admin</th>
                  <th className="p-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-850/45 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-white">
                        {u.full_text_name || u.full_name || 'Senza Nome'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">{u.id}</div>
                    </td>
                    <td className="p-4 text-gray-300">{u.company_name || 'N/D'}</td>
                    <td className="p-4">
                      <select
                        value={u.role || 'Junior Associate'}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="bg-gray-950 border border-gray-700 text-gray-200 px-3 py-1 rounded-lg text-xs cursor-pointer focus:outline-none"
                      >
                        <option value="Network Partner">Network Partner</option>
                        <option value="Senior Associate">Senior Associate</option>
                        <option value="Junior Associate">Junior Associate</option>
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                          u.is_admin
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-gray-800 text-gray-400 border border-gray-700'
                        }`}
                      >
                        {u.is_admin ? 'Admin' : 'Standard'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleAdmin(u.id, Boolean(u.is_admin))}
                        className="px-3 py-1.5 bg-gray-950 hover:bg-gray-800 text-gray-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border border-gray-700"
                      >
                        {u.is_admin ? 'Revoca Admin' : 'Promuovi Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
