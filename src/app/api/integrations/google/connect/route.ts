import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { buildGoogleAuthUrl } from '@/lib/google-calendar';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
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
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const statePayload = Buffer.from(
      JSON.stringify({ uid: user.id, nonce, ts: Date.now() }),
    ).toString('base64url');

    const authUrl = buildGoogleAuthUrl(statePayload);
    return NextResponse.redirect(authUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Errore avvio OAuth Google';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
