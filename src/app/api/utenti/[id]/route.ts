import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeGosRole } from '@/utils/gosPermissions';

function getServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Configura NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY in .env.local.'
    );
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

async function resolveActorProfile(
  supabaseServer: ReturnType<typeof getServerSupabaseClient>,
  request: Request,
  body?: Record<string, any>
) {
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : '';

  let actorUserId: string | undefined =
    typeof body?.actorUserId === 'string' && body.actorUserId.trim()
      ? body.actorUserId.trim()
      : undefined;
  let actorEmail: string | undefined =
    typeof body?.actorEmail === 'string' && body.actorEmail.trim()
      ? body.actorEmail.trim()
      : undefined;

  if (bearerToken) {
    const { data: authData, error: authErr } =
      await supabaseServer.auth.getUser(bearerToken);
    if (authErr || !authData?.user) {
      return { error: 'Token di autenticazione non valido o scaduto.', status: 401 as const };
    }
    actorUserId = authData.user.id;
    actorEmail = authData.user.email || actorEmail;
  }

  if (!actorUserId && !actorEmail) {
    return { error: 'Autenticazione richiesta.', status: 401 as const };
  }

  let profile: Record<string, any> | null = null;
  if (actorUserId) {
    const { data: byId } = await supabaseServer
      .from('gos_profiles')
      .select('*')
      .eq('id', actorUserId)
      .maybeSingle();
    profile = byId;
  }

  if (!profile && actorEmail) {
    const { data: byEmail } = await supabaseServer
      .from('gos_profiles')
      .select('*')
      .ilike('email', actorEmail.trim())
      .maybeSingle();
    profile = byEmail;
  }

  if (!profile) {
    return { error: 'Profilo operatore non trovato o non autorizzato.', status: 403 as const };
  }

  const stato = String(profile.stato || profile.status || 'ATTIVO')
    .trim()
    .toUpperCase();
  if (stato === 'SOSPESO' || stato === 'DISATTIVO') {
    return { error: 'Profilo operatore sospeso o disattivato.', status: 403 as const };
  }

  const role = normalizeGosRole(String(profile.ruolo || profile.role || ''));
  return { profile, role, status: 200 as const };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'ID utente mancante.' }, { status: 400 });
    }

    const supabaseServer = getServerSupabaseClient();
    const actor = await resolveActorProfile(supabaseServer, request);
    if ('error' in actor) {
      return NextResponse.json({ error: actor.error }, { status: actor.status });
    }

    const isSelf = String(actor.profile.id) === String(id);
    if (actor.role !== 'superadmin' && !isSelf) {
      return NextResponse.json(
        { error: 'Non hai i permessi per leggere questo profilo.' },
        { status: 403 }
      );
    }

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
    const body = await request.json().catch(() => ({}));
    const supabaseServer = getServerSupabaseClient();

    const actor = await resolveActorProfile(supabaseServer, request, body);
    if ('error' in actor) {
      return NextResponse.json({ error: actor.error }, { status: actor.status });
    }

    if (actor.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Solo i profili superadmin possono modificare un profilo.' },
        { status: 403 }
      );
    }

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

    const mergedPermessi: Record<string, any> =
      updates.permessi && typeof updates.permessi === 'object'
        ? { ...updates.permessi }
        : existing.permessi && typeof existing.permessi === 'object'
          ? { ...existing.permessi }
          : {};

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
      'can_edit_aziende',
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

    if (updates.tab_permissions && typeof updates.tab_permissions === 'object') {
      if ('tab_permissions' in existing) {
        payload.tab_permissions = updates.tab_permissions;
      }
      mergedPermessi.tab_permissions = updates.tab_permissions;
    }

    if (
      updates.azienda_tab_permissions &&
      typeof updates.azienda_tab_permissions === 'object'
    ) {
      if ('azienda_tab_permissions' in existing) {
        payload.azienda_tab_permissions = updates.azienda_tab_permissions;
      }
      mergedPermessi.azienda_tab_permissions = updates.azienda_tab_permissions;
    }

    if (
      ('permessi' in existing && Object.keys(mergedPermessi).length > 0) ||
      (updates.permessi && typeof updates.permessi === 'object')
    ) {
      payload.permessi = mergedPermessi;
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
