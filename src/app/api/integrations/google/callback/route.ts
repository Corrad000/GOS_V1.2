import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { exchangeCodeForTokens, getServiceOrUserSupabase } from '@/lib/google-calendar';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const dashboardUrl = new URL('/dashboard', origin);

  try {
    const { searchParams } = request.nextUrl;
    const oauthError = searchParams.get('error');
    const code = searchParams.get('code');
    const stateParam = searchParams.get('state');

    if (oauthError) {
      dashboardUrl.searchParams.set('gcal', 'error');
      dashboardUrl.searchParams.set('reason', oauthError);
      return NextResponse.redirect(dashboardUrl);
    }

    if (!code || !stateParam) {
      dashboardUrl.searchParams.set('gcal', 'error');
      dashboardUrl.searchParams.set('reason', 'missing_params');
      return NextResponse.redirect(dashboardUrl);
    }

    let stateUserId: string | null = null;
    try {
      const parsed = JSON.parse(
        Buffer.from(stateParam, 'base64url').toString('utf8'),
      ) as { uid?: string };
      stateUserId = parsed.uid ?? null;
    } catch {
      stateUserId = null;
    }

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
    } = await userSupabase.auth.getUser();

    const targetUserId = user?.id ?? stateUserId;
    if (!targetUserId) {
      return NextResponse.redirect(new URL('/', origin));
    }

    const tokens = await exchangeCodeForTokens(code);
    const db = getServiceOrUserSupabase(userSupabase);

    const { data: existing } = await db
      .from('gos_google_integrations')
      .select('refresh_token')
      .eq('user_id', targetUserId)
      .maybeSingle<{ refresh_token: string }>();

    const finalRefreshToken = tokens.refresh_token || existing?.refresh_token;
    if (!finalRefreshToken) {
      dashboardUrl.searchParams.set('gcal', 'error');
      dashboardUrl.searchParams.set('reason', 'missing_refresh_token');
      return NextResponse.redirect(dashboardUrl);
    }

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const { error: upsertError } = await db.from('gos_google_integrations').upsert(
      {
        user_id: targetUserId,
        google_email: tokens.email,
        access_token: tokens.access_token,
        refresh_token: finalRefreshToken,
        expires_at: expiresAt,
        calendar_id: 'primary',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    if (upsertError) {
      dashboardUrl.searchParams.set('gcal', 'error');
      dashboardUrl.searchParams.set('reason', 'db_save_failed');
      return NextResponse.redirect(dashboardUrl);
    }

    dashboardUrl.searchParams.set('gcal', 'connected');
    return NextResponse.redirect(dashboardUrl);
  } catch {
    dashboardUrl.searchParams.set('gcal', 'error');
    dashboardUrl.searchParams.set('reason', 'callback_exception');
    return NextResponse.redirect(dashboardUrl);
  }
}
