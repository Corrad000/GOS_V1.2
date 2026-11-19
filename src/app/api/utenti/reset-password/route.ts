import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email: string = (body?.email || '').trim();
    const actorRole: string = (body?.actorRole || '').toLowerCase();

    if (actorRole !== 'superadmin') {
      return NextResponse.json(
        { error: 'Accesso negato: solo i profili superadmin possono inviare il reset password.' },
        { status: 403 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: 'Email utente mancante.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { error: 'Variabili Supabase mancanti nell’ambiente.' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, email });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Errore durante l’invio del reset password.' },
      { status: 500 }
    );
  }
}
