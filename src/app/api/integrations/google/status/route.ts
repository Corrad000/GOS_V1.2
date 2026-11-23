import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
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
}

export async function GET() {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('gos_google_integrations')
      .select('google_email, calendar_id, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      connected: Boolean(data),
      googleEmail: data?.google_email ?? null,
      calendarId: data?.calendar_id ?? 'primary',
      updatedAt: data?.updated_at ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Errore imprevisto';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
