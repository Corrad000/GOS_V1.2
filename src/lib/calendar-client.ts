export type GosCalendarItemType = 'FOLLOW_UP' | 'TASK' | 'KRONOS';

export interface SyncCalendarClientInput {
  action?: 'upsert' | 'delete';
  type: GosCalendarItemType;
  title?: string;
  description?: string | null;
  startIso?: string;
  endIso?: string | null;
  table?: 'gos_trattative' | 'gos_tasks' | 'gos_kronos_events';
  recordId?: string;
  googleEventId?: string | null;
}

export async function syncGosCalendarItem(payload: SyncCalendarClientInput): Promise<void> {
  try {
    await fetch('/api/calendar/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non blocca l'operatività GOS se la rete o Google Calendar non sono raggiungibili
  }
}
