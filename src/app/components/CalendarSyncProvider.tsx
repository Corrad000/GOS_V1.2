'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { syncGosCalendarItem, type SyncCalendarClientInput } from '@/lib/calendar-client';

export type CalendarSyncMode = 'ask' | 'auto' | 'off';

export interface CalendarSyncLogEntry {
  id: string;
  timestamp: string;
  type: SyncCalendarClientInput['type'];
  title: string;
  dateLabel: string;
  status: 'SENT' | 'SKIPPED' | 'ERROR';
  detail?: string;
}

interface PendingSyncRequest {
  payload: SyncCalendarClientInput;
  resolve: (result: { synced: boolean; modeUsed: CalendarSyncMode }) => void;
}

export interface CalendarSyncContextValue {
  mode: CalendarSyncMode;
  setMode: (nextMode: CalendarSyncMode) => void;
  logs: CalendarSyncLogEntry[];
  clearLogs: () => void;
  logOpen: boolean;
  setLogOpen: (open: boolean) => void;
  promptDateSync: (
    payload: SyncCalendarClientInput,
  ) => Promise<{ synced: boolean; modeUsed: CalendarSyncMode }>;
  deleteCalendarEvent: (payload: SyncCalendarClientInput) => Promise<void>;
}

const STORAGE_KEY = 'gos_gcal_sync_mode_v1';

export const CalendarSyncContext = createContext<CalendarSyncContextValue | null>(null);

function formatDateForUi(iso?: string | null): string {
  if (!iso) return 'Data non impostata';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CalendarSyncProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<CalendarSyncMode>('ask');
  const [logs, setLogs] = useState<CalendarSyncLogEntry[]>([]);
  const [logOpen, setLogOpen] = useState(false);
  const [pending, setPending] = useState<PendingSyncRequest | null>(null);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const queueRef = useRef<PendingSyncRequest[]>([]);
  const pendingRef = useRef<PendingSyncRequest | null>(null);
  pendingRef.current = pending;

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as CalendarSyncMode | null;
      if (saved === 'ask' || saved === 'auto' || saved === 'off') {
        setModeState(saved);
      }
    } catch {
      // Ignora errori storage
    }
  }, []);

  const setMode = useCallback((nextMode: CalendarSyncMode) => {
    setModeState(nextMode);
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // Ignora errori storage
    }
  }, []);

  const appendLog = useCallback(
    (
      payload: SyncCalendarClientInput,
      status: CalendarSyncLogEntry['status'],
      detail?: string,
    ) => {
      const entry: CalendarSyncLogEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toLocaleTimeString('it-IT', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        type: payload.type,
        title: payload.title || payload.recordId || 'Elemento GOS',
        dateLabel: formatDateForUi(payload.startIso),
        status,
        detail,
      };
      setLogs((prev) => [entry, ...prev].slice(0, 30));
    },
    [],
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const flushNextInQueue = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    setRememberChoice(false);
    setSubmitting(false);
    setPending(next);
  }, []);

  const executeRemoteSync = useCallback(
    async (payload: SyncCalendarClientInput): Promise<boolean> => {
      try {
        const res = await fetch('/api/calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            action: payload.action ?? 'upsert',
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          synced?: boolean;
          skipped?: boolean;
          error?: string;
        };

        if (!res.ok || data.error) {
          appendLog(payload, 'ERROR', data.error || `HTTP ${res.status}`);
          return false;
        }

        if (data.skipped) {
          appendLog(payload, 'SKIPPED', 'Google Calendar non collegato');
          return false;
        }

        appendLog(payload, 'SENT', 'Sincronizzato su Google Calendar');
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Errore di rete';
        appendLog(payload, 'ERROR', msg);
        return false;
      }
    },
    [appendLog],
  );

  const promptDateSync = useCallback(
    (payload: SyncCalendarClientInput): Promise<{ synced: boolean; modeUsed: CalendarSyncMode }> => {
      if (mode === 'off') {
        appendLog(payload, 'SKIPPED', 'Modalità "Solo GOS" attiva');
        return Promise.resolve({ synced: false, modeUsed: 'off' });
      }

      if (mode === 'auto') {
        return executeRemoteSync({ ...payload, action: 'upsert' }).then((synced) => ({
          synced,
          modeUsed: 'auto',
        }));
      }

      return new Promise((resolve) => {
        const item: PendingSyncRequest = {
          payload: { ...payload, action: 'upsert' },
          resolve,
        };

        if (!pendingRef.current) {
          setRememberChoice(false);
          setSubmitting(false);
          setPending(item);
        } else {
          queueRef.current.push(item);
        }
      });
    },
    [mode, appendLog, executeRemoteSync],
  );

  const deleteCalendarEvent = useCallback(
    async (payload: SyncCalendarClientInput): Promise<void> => {
      await syncGosCalendarItem({ ...payload, action: 'delete' });
      appendLog({ ...payload, action: 'delete' }, 'SENT', 'Rimosso da Google Calendar');
    },
    [appendLog],
  );

  const handleConfirmSend = async () => {
    if (!pending) return;
    setSubmitting(true);
    if (rememberChoice) {
      setMode('auto');
    }
    const ok = await executeRemoteSync(pending.payload);
    const currentResolve = pending.resolve;
    flushNextInQueue();
    currentResolve({ synced: ok, modeUsed: rememberChoice ? 'auto' : 'ask' });
  };

  const handleSkipSend = () => {
    if (!pending) return;
    if (rememberChoice) {
      setMode('off');
    }
    appendLog(pending.payload, 'SKIPPED', 'Salvato solo sul GOS');
    const currentResolve = pending.resolve;
    flushNextInQueue();
    currentResolve({ synced: false, modeUsed: rememberChoice ? 'off' : 'ask' });
  };

  const value = useMemo<CalendarSyncContextValue>(
    () => ({
      mode,
      setMode,
      logs,
      clearLogs,
      logOpen,
      setLogOpen,
      promptDateSync,
      deleteCalendarEvent,
    }),
    [mode, setMode, logs, clearLogs, logOpen, promptDateSync, deleteCalendarEvent],
  );

  return (
    <CalendarSyncContext.Provider value={value}>
      {children}

      {pending && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Sincronizzazione data con Google Calendar"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
        >
          <div className="w-full max-w-md rounded-2xl border border-[#2A3A66] bg-[#0B132B] p-5 text-[#E6EAF2] shadow-2xl">
            <div className="text-[11px] font-bold uppercase tracking-widest text-[#FF7A3D]">
              Google Calendar · {pending.payload.type}
            </div>
            <h3 className="mt-1 text-base font-bold text-white">
              Vuoi collegare questa data al tuo Google Calendar?
            </h3>
            <p className="mt-2 rounded-lg border border-[#1B2540] bg-[#111E42] p-3 text-xs leading-relaxed text-[#D5DCEB]">
              <strong className="block text-sm text-white">
                {pending.payload.title || 'Attività GOS'}
              </strong>
              <span className="mt-1 block text-[#8A94A8]">
                Data: <strong className="text-[#E6EAF2]">{formatDateForUi(pending.payload.startIso)}</strong>
              </span>
            </p>

            <label className="mt-3.5 flex cursor-pointer items-center gap-2 text-xs text-[#B9C3D9]">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="h-4 w-4 rounded border-[#2A3A66] bg-[#090D16] accent-[#FF5500]"
              />
              <span>Ricorda questa scelta per le prossime date</span>
            </label>

            <div className="mt-4 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={handleSkipSend}
                className="rounded-lg border border-[#2A3A66] bg-[#111E42] px-3.5 py-2 text-xs font-semibold text-[#E6EAF2] hover:bg-[#1B2540] disabled:opacity-50"
              >
                Solo sul GOS
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmSend}
                className="rounded-lg bg-[#FF5500] px-4 py-2 text-xs font-bold text-white hover:bg-[#FF7A3D] disabled:opacity-50"
              >
                {submitting ? 'Invio…' : 'Invia a Google Calendar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {logOpen && (
        <aside
          aria-label="Log sincronizzazioni Google Calendar"
          className="fixed bottom-5 right-5 z-40 w-full max-w-sm rounded-2xl border border-[#2A3A66] bg-[#0B132B] p-4 text-[#E6EAF2] shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-[#1B2540] pb-2.5">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-white">
                Log Calendario GOS
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#8A94A8]">
                <span>Modalità:</span>
                {(['ask', 'auto', 'off'] as CalendarSyncMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded px-1.5 py-0.5 font-semibold ${
                      mode === m
                        ? 'bg-[#FF5500] text-white'
                        : 'bg-[#111E42] text-[#8A94A8] hover:text-white'
                    }`}
                  >
                    {m === 'ask' ? 'Chiedi' : m === 'auto' ? 'Auto' : 'Off'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearLogs}
                className="text-[11px] text-[#8A94A8] hover:text-white"
              >
                Svuota
              </button>
              <button
                type="button"
                onClick={() => setLogOpen(false)}
                className="rounded border border-[#2A3A66] px-2 py-0.5 text-xs text-[#E6EAF2] hover:bg-[#111E42]"
              >
                Chiudi
              </button>
            </div>
          </div>

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#8A94A8]">
                Nessuna operazione registrata in questa sessione.
              </p>
            ) : (
              logs.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg border border-[#1B2540] bg-[#111E42] p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-semibold text-white">{entry.title}</span>
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        entry.status === 'SENT'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : entry.status === 'ERROR'
                            ? 'bg-red-500/15 text-red-400'
                            : 'bg-slate-500/20 text-slate-300'
                      }`}
                    >
                      {entry.status === 'SENT'
                        ? 'INVIATO'
                        : entry.status === 'ERROR'
                          ? 'ERRORE'
                          : 'SOLO GOS'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-[#8A94A8]">
                    {entry.timestamp} · {entry.type} · {entry.dateLabel}
                  </div>
                  {entry.detail && (
                    <div className="mt-0.5 text-[11px] text-[#B9C3D9]">{entry.detail}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </aside>
      )}
    </CalendarSyncContext.Provider>
  );
}

export function useCalendarSync() {
  const ctx = useContext(CalendarSyncContext);
  if (!ctx) {
    throw new Error('useCalendarSync deve essere usato dentro CalendarSyncProvider');
  }
  return ctx;
}
