import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'Nessun ID azienda fornito per la cancellazione.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Manca NEXT_PUBLIC_SUPABASE_URL nelle variabili d’ambiente.' },
        { status: 500 }
      );
    }

    if (!serviceKey) {
      return NextResponse.json(
        {
          error:
            'Manca SUPABASE_SERVICE_ROLE_KEY in .env.local (riavvia il server Next.js dopo averla aggiunta).',
        },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabaseAdmin
      .from('gos_aziende')
      .delete()
      .in('id', ids)
      .select('id');

    if (error) {
      return NextResponse.json(
        { error: `Errore Supabase su gos_aziende: ${error.message}` },
        { status: 500 }
      );
    }

    const deletedIds = (data || []).map((row: { id: string }) => row.id);

    if (deletedIds.length === 0) {
      return NextResponse.json(
        {
          error: `0 record trovati/eliminati su gos_aziende per gli ID: ${ids.join(', ')}. Verifica che esistano con colonna "id" in public.gos_aziende.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ deletedIds });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Errore interno durante la cancellazione.' },
      { status: 500 }
    );
  }
}
