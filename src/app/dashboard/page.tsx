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

  // 2. Legge il profilo dinamico dalla tabella gos_profiles
  const { data: profile } = await supabase
    .from('gos_profiles')
    .select('role, is_admin, email')
    .eq('id', user.id)
    .single();

  const userRole = profile?.is_admin ? 'admin' : 'advisor';
  const userName = profile?.email || user.email || 'Utente Network';

  // 3. Recupero dinamico e filtrato delle aziende da Supabase
  let companiesList = [];
  
  // Se l'utente è admin vede tutte le aziende, altrimenti solo quelle associate al suo ID (advisor_id)
  const query = profile?.is_admin
    ? supabase.from('companies').select('*')
    : supabase.from('companies').select('*').eq('advisor_id', user.id);

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
