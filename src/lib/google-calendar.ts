import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

export type GosCalendarItemType = 'FOLLOW_UP' | 'TASK' | 'KRONOS';

export interface CalendarSyncPayload {
  type: GosCalendarItemType;
  title: string;
  description?: string | null;
  startIso: string;
  endIso?: string | null;
  timeZone?: string;
  googleEventId?: string | null;
  calendarId?: string;
}

export interface GoogleIntegrationRow {
  user_id: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  calendar_id: string;
}

function getGoogleEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Variabili GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REDIRECT_URI mancanti in .env.local',
    );
  }

  return { clientId, clientSecret, redirectUri };
}

export function getServiceOrUserSupabase(userSupabase: SupabaseClient): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceKey) {
    return createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return userSupabase;
}

export function buildGoogleAuthUrl(state: string): string {
  const { clientId, redirectUri } = getGoogleEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: CALENDAR_SCOPES.join(' '),
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  email: string | null;
}> {
  const { clientId, clientSecret, redirectUri } = getGoogleEnv();

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Errore scambio token Google: ${text}`);
  }

  const tokenData = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  let email: string | null = null;
  try {
    const infoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (infoRes.ok) {
      const info = (await infoRes.json()) as { email?: string };
      email = info.email ?? null;
    }
  } catch {
    email = null;
  }

  return {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in ?? 3600,
    email,
  };
}

async function ensureValidAccessToken(
  db: SupabaseClient,
  integration: GoogleIntegrationRow,
): Promise<string> {
  const expiresAtMs = new Date(integration.expires_at).getTime();
  const stillValid = Number.isFinite(expiresAtMs) && expiresAtMs - Date.now() > 60_000;

  if (stillValid) {
    return integration.access_token;
  }

  const { clientId, clientSecret } = getGoogleEnv();
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Impossibile aggiornare il token Google Calendar: ${text}`);
  }

  const refreshed = (await res.json()) as {
    access_token: string;
    expires_in?: number;
  };

  const nextExpiresAt = new Date(
    Date.now() + (refreshed.expires_in ?? 3600) * 1000,
  ).toISOString();

  await db
    .from('gos_google_integrations')
    .update({
      access_token: refreshed.access_token,
      expires_at: nextExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', integration.user_id);

  return refreshed.access_token;
}

function buildGoogleEventBody(payload: CalendarSyncPayload) {
  const timeZone = payload.timeZone || 'Europe/Rome';
  const startDate = new Date(payload.startIso);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error('Data di inizio evento non valida');
  }

  const endDate = payload.endIso
    ? new Date(payload.endIso)
    : new Date(startDate.getTime() + 30 * 60 * 1000);

  const validEnd =
    !Number.isNaN(endDate.getTime()) && endDate.getTime() > startDate.getTime()
      ? endDate
      : new Date(startDate.getTime() + 30 * 60 * 1000);

  const prefixMap: Record<GosCalendarItemType, string> = {
    FOLLOW_UP: '[GOS Follow-up]',
    TASK: '[GOS Task]',
    KRONOS: '[GOS Kronos]',
  };

  return {
    summary: `${prefixMap[payload.type]} ${payload.title}`.trim(),
    description: payload.description ?? 'Sincronizzato automaticamente da GOS 1.2',
    start: { dateTime: startDate.toISOString(), timeZone },
    end: { dateTime: validEnd.toISOString(), timeZone },
  };
}

export async function upsertGoogleCalendarEvent(
  db: SupabaseClient,
  userId: string,
  payload: CalendarSyncPayload,
): Promise<{ googleEventId: string | null; skipped?: boolean }> {
  const { data: integration, error } = await db
    .from('gos_google_integrations')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<GoogleIntegrationRow>();

  if (error || !integration) {
    return { googleEventId: null, skipped: true };
  }

  const accessToken = await ensureValidAccessToken(db, integration);
  const calendarId = encodeURIComponent(payload.calendarId || integration.calendar_id || 'primary');
  const body = JSON.stringify(buildGoogleEventBody(payload));

  if (payload.googleEventId) {
    const patchRes = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(payload.googleEventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body,
      },
    );

    if (patchRes.ok) {
      const updated = (await patchRes.json()) as { id: string };
      return { googleEventId: updated.id };
    }
  }

  const createRes = await fetch(`${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Errore creazione evento su Google Calendar: ${errText}`);
  }

  const created = (await createRes.json()) as { id: string };
  return { googleEventId: created.id };
}

export async function deleteGoogleCalendarEvent(
  db: SupabaseClient,
  userId: string,
  googleEventId: string | null | undefined,
  calendarIdParam?: string,
): Promise<void> {
  if (!googleEventId) return;

  const { data: integration } = await db
    .from('gos_google_integrations')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<GoogleIntegrationRow>();

  if (!integration) return;

  const accessToken = await ensureValidAccessToken(db, integration);
  const calendarId = encodeURIComponent(calendarIdParam || integration.calendar_id || 'primary');

  await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/${encodeURIComponent(googleEventId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
}
