import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveGosPermissions } from '@/utils/gosPermissions';

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

    const actorUserId: string | undefined = body?.actorUserId;
    const actorEmail: string | undefined = body?.actorEmail;

    if (actorUserId || actorEmail) {
      let profileRow: Record<string, any> | null = null;

      if (actorUserId) {
        const { data: byId } = await supabaseAdmin
          .from('gos_profiles')
          .select('*')
          .eq('id', actorUserId)
          .maybeSingle();
        profileRow = byId;
      }

      if (!profileRow && actorEmail) {
        const { data: byEmail } = await supabaseAdmin
          .from('gos_profiles')
          .select('*')
          .ilike('email', actorEmail.trim())
          .maybeSingle();
        profileRow = byEmail;
      }

      if (!profileRow) {
        return NextResponse.json(
          { error: 'Profilo utente non autorizzato per la cancellazione aziende.' },
          { status: 403 }
        );
      }

      const resolvedRole = profileRow.ruolo || profileRow.role || 'user Guest';
      const perms = resolveGosPermissions({
        ...profileRow,
        ruolo: resolvedRole,
      });

      if (!perms.canDeleteAziende) {
        return NextResponse.json(
          { error: 'Permesso insufficiente per eliminare aziende (can_delete_aziende).' },
          { status: 403 }
        );
      }
    }

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
