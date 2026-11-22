import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UserDashboardView } from '@/app/components/UserDashboardView';
import { SystemActivityWidget } from '@/app/components/SystemActivityWidget';
import Footer from '@/app/components/Footer';
import type { Fase, Voce } from '@/app/utenti/[id]/RiepilogoKanbanDash';
import type { StatoAzione } from '@/modules/offer-builder/card-trattativa';

function normalizzaFaseServer(raw?: string): Fase {
  const v = String(raw || '').toLowerCase().trim();
  if (v.includes('qualif')) return 'qualifica';
  if (v.includes('propost')) return 'proposta';
  if (v.includes('negoz')) return 'negoziazione';
  if (v.includes('chius')) return 'chiusura';
  return 'lead';
}

function calcolaStatoAzioneServer(row: any, now: Date): StatoAzione {
  const raw = String(row?.stato_azione || '').toLowerCase().trim();
  if (raw === 'scaduta' || raw === 'oggi' || raw === 'programmata' || raw === 'senza_azione') {
    return raw;
  }

  const dataProg = row?.azione_programmata_data ? new Date(row.azione_programmata_data) : null;
  if (dataProg && !Number.isNaN(dataProg.getTime())) {
    const stessoGiorno =
      dataProg.getFullYear() === now.getFullYear() &&
      dataProg.getMonth() === now.getMonth() &&
      dataProg.getDate() === now.getDate();
    if (stessoGiorno) return 'oggi';
    if (dataProg.getTime() < now.getTime()) return 'scaduta';
    return 'programmata';
  }

  const haAzione =
    Boolean(row?.azione_necessaria) &&
    String(row.azione_necessaria).trim().toLowerCase() !== 'nessuna azione da fare';

  return haAzione ? 'programmata' : 'senza_azione';
}

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
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/');
  }

  // 2. Legge il profilo dinamico dalla tabella gos_profiles
  const { data: profile } = await supabase
    .from('gos_profiles')
    .select('role, is_admin, email, nome')
    .eq('id', user.id)
    .single();

  const isAdmin =
    profile?.is_admin === true ||
    profile?.role === 'admin' ||
    profile?.role === 'Administrator' ||
    profile?.role === 'amministratore';

  const userRole = isAdmin ? 'admin' : 'user';
  const userName = profile?.nome || profile?.email || user.email || 'Utente Network';

  // 3. Recupero aziende da gos_aziende
  let companiesList: any[] = [];
  const { data: fetchedCompanies, error: compError } = await supabase
    .from('gos_aziende')
    .select('*')
    .order('created_at', { ascending: false });

  if (!compError && fetchedCompanies) {
    companiesList = fetchedCompanies;
  }

  // 4. Recupero trattative da gos_trattative
  const aziendeMap = new Map<string, string>();
  companiesList.forEach((az: any) => {
    if (az?.id) aziendeMap.set(String(az.id), az.ragione_sociale || 'Azienda');
    if (az?.codice_azienda) {
      aziendeMap.set(String(az.codice_azienda), az.ragione_sociale || 'Azienda');
    }
  });

  const { data: fetchedTrattative, error: trattError } = await supabase
    .from('gos_trattative')
    .select('*')
    .order('created_at', { ascending: false });

  const now = new Date();
  const trattativeList: Voce[] =
    !trattError && fetchedTrattative
      ? fetchedTrattative.map((row: any) => {
          const azId = String(row.azienda_id || row.company_id || row.company_code || '');
          return {
            id: String(row.id),
            nome: row.titolo || row.nome || 'Trattativa',
            fase: normalizzaFaseServer(row.fase),
            statoTrattativa: String(row.stato_trattativa || 'attiva').toLowerCase(),
            azienda: {
              id: azId,
              nome: aziendeMap.get(azId) || row.azienda_nome || 'Azienda',
            },
            codiceOfferta: row.codice_offerta || undefined,
            valore: Number(row.valore || 0),
            azioneNecessaria: row.azione_necessaria || 'Nessuna azione definita',
            azioneProgrammata:
              row.azione_programmata_titolo && row.azione_programmata_data
                ? {
                    titolo: row.azione_programmata_titolo,
                    data: row.azione_programmata_data,
                  }
                : null,
            statoAzione: calcolaStatoAzioneServer(row, now),
            scadenzaOriginale: row.scadenza_originale || undefined,
            ultimaModifica: row.ultima_modifica || row.created_at || now.toISOString(),
          };
        })
      : [];

  return (
    <div className="flex min-h-screen w-full flex-col justify-between bg-[#090D16] text-[#E6EAF2]">
      <main className="w-full space-y-6">
        <UserDashboardView
          userId={user.id}
          userRole={userRole}
          userName={userName}
          companies={companiesList}
          trattative={trattativeList}
        />

        <div className="mx-auto max-w-[1440px] px-5 pb-4 md:px-8">
          <SystemActivityWidget />
        </div>
      </main>

      <Footer />
    </div>
  );
}
