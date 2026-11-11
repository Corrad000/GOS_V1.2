import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UserDashboardView } from '@/app/components/UserDashboardView';

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  // 1. Verifica l'utente autenticato dal server
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    redirect('/');
  }

  // 2. Legge il profilo dinamico dalla tabella gos_profiles (incluso nome e ruolo esteso)
  const { data: profile } = await supabase
    .from('gos_profiles')
    .select('role, is_admin, email, nome')
    .eq('id', user.id)
    .single();

  // Determina in modo sicuro se è admin in base a is_admin o ai vari valori possibili della colonna role
  const isAdmin = profile?.is_admin === true || 
                  profile?.role === 'admin' || 
                  profile?.role === 'Administrator' || 
                  profile?.role === 'amministratore';

  const userRole = isAdmin ? 'admin' : 'user';
  const userName = profile?.nome || profile?.email || user.email || 'Utente Network';

  // 3. Recupero dinamico e filtrato delle aziende dalla tabella corretta gos_aziende
  let companiesList = [];
  
  const query = supabase
    .from('gos_aziende')
    .select('*')
    .order('created_at', { ascending: false });

  const { data: fetchedCompanies, error: compError } = await query;

  if (!compError && fetchedCompanies) {
    companiesList = fetchedCompanies;
  }

  return (
    <UserDashboardView
      userRole={userRole}
      userName={userName}
      companies={companiesList}
    />
  );
}
