import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceOrUserSupabase } from '@/lib/google-calendar';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const userSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      },
    );

    const {
      data: { user },
      error,
    } = await userSupabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const db = getServiceOrUserSupabase(userSupabase);
    const { error: delError } = await db
      .from('gos_google_integrations')
      .delete()
      .eq('user_id', user.id);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ disconnected: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Errore disconnessione';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
