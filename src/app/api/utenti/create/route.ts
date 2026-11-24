import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { normalizeGosRole } from '@/utils/gosPermissions';

function getAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Configura NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

async function resolveAuthenticatedActor(
  request: Request,
  adminClient: ReturnType<typeof getAdminSupabaseClient>
) {
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  let userId: string | undefined;

  if (bearerToken) {
    const { data, error } = await adminClient.auth.getUser(bearerToken);
    if (error || !data?.user) {
      return { error: 'Token non valido o scaduto.', status: 401 as const };
    }
    userId = data.user.id;
  } else {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) {
      return { error: 'Configurazione Supabase mancante.', status: 500 as const };
    }

    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(supabaseUrl, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Sola lettura in route handler
        },
      },
    });

    const { data, error } = await supabaseAuth.auth.getUser();
    if (error || !data?.user) {
      return { error: 'Autenticazione richiesta.', status: 401 as const };
    }
    userId = data.user.id;
  }

  const { data: profile, error: profileError } = await adminClient
    .from('gos_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: 'Profilo operatore non trovato.', status: 403 as const };
  }

  const stato = String(profile.stato || 'ATTIVO').trim().toUpperCase();
  if (stato === 'SOSPESO' || stato === 'DISATTIVO') {
    return { error: 'Profilo operatore sospeso o disattivato.', status: 403 as const };
  }

  const normalizedRole = normalizeGosRole(String(profile.ruolo || profile.role || ''));
  const hasAdminFlag = Boolean(profile.is_admin);

  if (normalizedRole !== 'superadmin' && !hasAdminFlag) {
    return { error: 'Permessi insufficienti per creare utenti.', status: 403 as const };
  }

  return { profile, status: 200 as const };
}

export async function POST(request: Request) {
  try {
    const adminClient = getAdminSupabaseClient();
    const actor = await resolveAuthenticatedActor(request, adminClient);
    if ('error' in actor) {
      return NextResponse.json({ error: actor.error }, { status: actor.status });
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const rawRole = typeof body?.role === 'string' ? body.role.trim() : 'Junior Associate';
    const rawStato =
      typeof body?.stato === 'string' && body.stato.trim()
        ? body.stato.trim().toUpperCase()
        : 'ATTIVO';

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Email non valida.' }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: 'La password iniziale deve avere almeno 8 caratteri.' },
        { status: 400 }
      );
    }

    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const nome = nameParts[0] || email.split('@')[0];
    const cognome = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
    const normalizedRole = normalizeGosRole(rawRole);
    const isAdmin = normalizedRole === 'superadmin';

    const { data: createdAuth, error: createAuthError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName || nome,
          nome,
          cognome,
          role: rawRole,
          ruolo: normalizedRole,
        },
      });

    if (createAuthError || !createdAuth?.user) {
      return NextResponse.json(
        { error: createAuthError?.message || 'Impossibile creare l’account utente.' },
        { status: 400 }
      );
    }

    const newUserId = createdAuth.user.id;
    const codiceUtente = `USR-${Math.floor(10000 + Math.random() * 90000)}`;

    const { data: upsertedProfile, error: profileUpsertError } = await adminClient
      .from('gos_profiles')
      .upsert(
        {
          id: newUserId,
          email,
          nome,
          cognome,
          role: rawRole,
          ruolo: normalizedRole,
          is_admin: isAdmin,
          stato: rawStato,
          codice_utente: codiceUtente,
        },
        { onConflict: 'id' }
      )
      .select('*')
      .single();

    if (profileUpsertError) {
      return NextResponse.json(
        {
          error: `Account creato in Auth ma errore sincronizzazione profilo: ${profileUpsertError.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: upsertedProfile }, { status: 201 });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Errore imprevisto durante la creazione utente.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
