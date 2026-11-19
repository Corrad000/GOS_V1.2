import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
    const actorRole: string = (body?.actorRole || '').toLowerCase();

    if (actorRole !== 'superadmin') {
      return NextResponse.json(
        { error: 'Accesso negato: solo i profili superadmin possono eliminare utenti.' },
        { status: 403 }
      );
    }

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Nessun ID utente selezionato.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Configura NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env.local.' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabaseAdmin
      .from('gos_profiles')
      .delete()
      .in('id', ids)
      .select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const deletedIds = (data || []).map((r: { id: string }) => r.id);
    return NextResponse.json({ deletedIds });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Errore durante la cancellazione del profilo.' },
      { status: 500 }
    );
  }
}
