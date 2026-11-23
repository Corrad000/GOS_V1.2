import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  deleteGoogleCalendarEvent,
  getServiceOrUserSupabase,
  upsertGoogleCalendarEvent,
  type GosCalendarItemType,
} from '@/lib/google-calendar';

type AllowedSyncTable = 'gos_trattative' | 'gos_tasks' | 'gos_kronos_events';

const ALLOWED_TABLES: ReadonlySet<string> = new Set<AllowedSyncTable>([
  'gos_trattative',
  'gos_tasks',
  'gos_kronos_events',
]);

interface SyncRequestBody {
  action?: 'upsert' | 'delete';
  type?: GosCalendarItemType;
  title?: string;
  description?: string | null;
  startIso?: string;
  endIso?: string | null;
  timeZone?: string;
  googleEventId?: string | null;
  table?: string;
  recordId?: string;
}

export async function POST(request: NextRequest) {
  try {
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
      error: authError,
    } = await userSupabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
    }

    const body = (await request.json()) as SyncRequestBody;
    const action = body.action ?? 'upsert';
    const db = getServiceOrUserSupabase(userSupabase);

    let currentGoogleEventId = body.googleEventId ?? null;
    const validTable =
      body.table && ALLOWED_TABLES.has(body.table) ? (body.table as AllowedSyncTable) : null;

    if (!currentGoogleEventId && validTable && body.recordId) {
      const { data: existingRow } = await db
        .from(validTable)
        .select('google_event_id')
        .eq('id', body.recordId)
        .maybeSingle<{ google_event_id: string | null }>();
      currentGoogleEventId = existingRow?.google_event_id ?? null;
    }

    if (action === 'delete') {
      await deleteGoogleCalendarEvent(db, user.id, currentGoogleEventId);

      if (validTable && body.recordId) {
        await db.from(validTable).update({ google_event_id: null }).eq('id', body.recordId);
      }

      return NextResponse.json({ synced: true, deleted: true });
    }

    if (!body.type || !body.title || !body.startIso) {
      return NextResponse.json(
        { error: 'Parametri obbligatori mancanti: type, title, startIso' },
        { status: 400 },
      );
    }

    const result = await upsertGoogleCalendarEvent(db, user.id, {
      type: body.type,
      title: body.title,
      description: body.description,
      startIso: body.startIso,
      endIso: body.endIso,
      timeZone: body.timeZone ?? 'Europe/Rome',
      googleEventId: currentGoogleEventId,
    });

    if (result.skipped) {
      return NextResponse.json({ synced: false, skipped: true, reason: 'not_connected' });
    }

    if (result.googleEventId && validTable && body.recordId) {
      await db
        .from(validTable)
        .update({ google_event_id: result.googleEventId })
        .eq('id', body.recordId);
    }

    return NextResponse.json({
      synced: true,
      googleEventId: result.googleEventId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Errore sincronizzazione Google Calendar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
