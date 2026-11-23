'use client';

import React, { useContext, useEffect, useState } from 'react';
import { CalendarSyncContext } from './CalendarSyncProvider';

interface CalendarLogEntry {
  id?: string;
  timestamp?: string;
  quando?: string;
  title?: string;
  titolo?: string;
  type?: string;
  status?: string;
  detail?: string;
  dettaglio?: string;
}

interface CalendarSyncContextValue {
  logs?: CalendarLogEntry[];
  syncLogs?: CalendarLogEntry[];
  clearLogs?: () => void;
}

export function CalendarLogToolbarButton() {
  const ctx = useContext(CalendarSyncContext) as CalendarSyncContextValue | null;
  const [open, setOpen] = useState(false);

  const rawLogs: CalendarLogEntry[] = Array.isArray(ctx?.logs)
    ? ctx.logs
    : Array.isArray(ctx?.syncLogs)
      ? ctx.syncLogs
      : [];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
      >
        Log Calendario ({rawLogs.length})
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Registro Sincronizzazioni Calendario
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Storico operazioni Google Calendar nella sessione corrente
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Chiudi registro"
                className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer px-1.5 py-0.5 rounded-lg hover:bg-gray-800"
              >
                ✕
              </button>
            </div>

            {rawLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950 p-6 text-center text-xs text-gray-400">
                Nessuna sincronizzazione registrata in questa sessione.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-800/80 rounded-xl border border-gray-800 bg-gray-950">
                {rawLogs.map((entry, idx) => (
                  <div key={entry.id ?? idx} className="p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white">
                        {entry.title || entry.titolo || 'Evento calendario'}
                      </span>
                      <span className="font-mono text-[10px] text-[#FF5500] uppercase">
                        {entry.status || entry.type || 'SYNC'}
                      </span>
                    </div>
                    {(entry.detail || entry.dettaglio) && (
                      <p className="text-[11px] text-gray-400">
                        {entry.detail || entry.dettaglio}
                      </p>
                    )}
                    {(entry.timestamp || entry.quando) && (
                      <p className="text-[10px] font-mono text-gray-500">
                        {entry.timestamp || entry.quando}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-800">
              {typeof ctx?.clearLogs === 'function' && rawLogs.length > 0 ? (
                <button
                  type="button"
                  onClick={() => ctx.clearLogs?.()}
                  className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Svuota Log
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CalendarLogToolbarButton;
