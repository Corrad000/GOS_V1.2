import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeGosRole } from '@/utils/gosPermissions';

function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !key) {
    throw new Error(
      'Configura NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env.local.'
    );
  }

  return createClient(supabaseUrl, key, {
    auth: { persistSession: false },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID utente mancante.' }, { status: 400 });
    }

    const supabaseServer = getServerSupabaseClient();
    const { data, error } = await supabaseServer
      .from('gos_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Profilo non trovato in gos_profiles.' },
        { status: 404 }
      );
    }

    let profile = data;
    if (!profile.codice_utente) {
      const code = `USR-${Math.floor(10000 + Math.random() * 90000)}`;
      try {
        const { data: updated } = await supabaseServer
          .from('gos_profiles')
          .update({ codice_utente: code })
          .eq('id', id)
          .select('*')
          .maybeSingle();
        if (updated) profile = updated;
        else profile = { ...profile, codice_utente: code };
      } catch {
        profile = { ...profile, codice_utente: code };
      }
    }

    return NextResponse.json({ profile });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Errore lettura profilo.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const actorRole = normalizeGosRole(String(body?.actorRole || ''));

    if (actorRole !== 'superadmin') {
      return NextResponse.json(
        { error: 'Solo i profili superadmin possono modificare un profilo.' },
        { status: 403 }
      );
    }

    const supabaseServer = getServerSupabaseClient();
    const { data: existing, error: readErr } = await supabaseServer
      .from('gos_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (readErr || !existing) {
      return NextResponse.json(
        { error: readErr?.message || 'Profilo non trovato.' },
        { status: 404 }
      );
    }

    const updates = body?.updates || {};
    const payload: Record<string, any> = {
      codice_utente:
        existing.codice_utente || `USR-${Math.floor(10000 + Math.random() * 90000)}`,
    };

    if (typeof updates.email === 'string') payload.email = updates.email.trim();
    if (typeof updates.stato === 'string') payload.stato = updates.stato;
    if (updates.permessi && typeof updates.permessi === 'object') {
      payload.permessi = updates.permessi;
    }

    if (typeof updates.utente === 'string') {
      if ('full_name' in existing || !('nome' in existing)) {
        payload.full_name = updates.utente.trim();
      }
      if ('nome' in existing) {
        payload.nome = updates.utente.trim();
      }
    }

    if (typeof updates.ruolo === 'string') {
      const normalizedRole = normalizeGosRole(updates.ruolo);
      if ('ruolo' in existing || !('role' in existing)) {
        payload.ruolo = normalizedRole;
      }
      if ('role' in existing) {
        payload.role = normalizedRole;
      }
    }

    const granularKeys = [
      'can_delete_aziende',
      'can_edit_offerte',
      'can_delete_offerte',
      'can_export_data',
      'can_delete_progetti',
      'can_delete_documenti',
      'can_delete_file',
    ] as const;

    for (const key of granularKeys) {
      if (typeof updates[key] === 'boolean' && key in existing) {
        payload[key] = updates[key];
      }
    }

    const { data: updatedProfile, error: updErr } = await supabaseServer
      .from('gos_profiles')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    return NextResponse.json({ profile: updatedProfile });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Errore aggiornamento profilo.' },
      { status: 500 }
    );
  }
}
