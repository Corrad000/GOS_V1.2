import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const cleanToken = decodeURIComponent(String(token || '')).trim();

  if (!cleanToken) {
    return NextResponse.json({ error: 'Token mancante' }, { status: 400 });
  }

  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.json({ error: 'Configurazione Supabase mancante' }, { status: 500 });
  }

  const { data, error } = await sb
    .from('gos_kyb_submissions')
    .select('*')
    .eq('token', cleanToken)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 });
  }

  return NextResponse.json({ submission: data }, { status: 200 });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const cleanToken = decodeURIComponent(String(token || '')).trim();

  if (!cleanToken) {
    return NextResponse.json({ error: 'Token mancante' }, { status: 400 });
  }

  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.json({ error: 'Configurazione Supabase mancante' }, { status: 500 });
  }

  const body = await req.json();
  const { error } = await sb
    .from('gos_kyb_submissions')
    .update(body)
    .eq('token', cleanToken);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: refreshed, error: readErr } = await sb
    .from('gos_kyb_submissions')
    .select('*')
    .eq('token', cleanToken)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  return NextResponse.json({ submission: refreshed }, { status: 200 });
}
