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

  // 3. Recupero dinamico e filtrato delle aziende dalla tabella corretta gos_aziende
  let companiesList = [];
  
  // Se l'admin vede tutto, altrimenti filtra per advisor (se la colonna esiste, altrimenti mostra tutte o filtra per advisor_nome)
  const query = profile?.is_admin
    ? supabase.from('gos_aziende').select('*').order('created_at', { ascending: false })
    : supabase.from('gos_aziende').select('*').order('created_at', { ascending: false });

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
