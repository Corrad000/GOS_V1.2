'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function checkAdminAndLoadUsers() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('gos_profiles')
          .select('is_admin, role, full_text_name')
          .eq('id', user.id)
          .single();

        if (profileError || !profile?.is_admin) {
          alert('Accesso negato: area riservata agli amministratori.');
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);

        const { data: allProfiles, error: fetchError } = await supabase
          .from('gos_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        if (allProfiles) setUsers(allProfiles);

      } catch (err) {
        console.error('Errore caricamento utenti admin:', err);
      } finally {
        setLoading(false);
      }
    }

    checkAdminAndLoadUsers();
  }, [router, supabase]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('gos_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
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
      setUsers(users.map(u => u.id === userId ? { ...u, is_admin: !currentAdminStatus } : u));
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
              Gestione Utenti & Rete Associata
            </h1>
            <p className="text-xs text-gray-400">Controllo centralizzato dei profili e dei ruoli di rete.</p>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
          >
            Torna alla Dashboard
          </button>
        </div>

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
                      <div className="font-semibold text-white">{u.full_text_name || 'Senza Nome'}</div>
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
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${u.is_admin ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                        {u.is_admin ? 'Admin' : 'Standard'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleToggleAdmin(u.id, u.is_admin)}
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
