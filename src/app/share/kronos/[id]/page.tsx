'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ganttService, GanttItem } from '@/services/ganttService';

const HOLIDAYS = ['2026-12-08', '2026-12-25', '2026-12-26', '2027-01-01'];

const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const diffDays = (a: string, b: string) =>
  Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);

const formatShortDate = (s: string) =>
  parseDate(s).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

export default function PublicClientKronosPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [projectTitle, setProjectTitle] = useState<string>('Cronoprogramma Operativo');
  const [projectCode, setProjectCode] = useState<string>('');
  const [items, setItems] = useState<GanttItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const loadPublicGantt = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [projRes, ganttData] = await Promise.all([
        supabase.from('gos_progetti').select('titolo, codice_progetto').eq('id', projectId).single(),
        ganttService.getGanttItemsByProject(projectId),
      ]);

      if (projRes.data) {
        setProjectTitle(projRes.data.titolo || 'Cronoprogramma Operativo');
        setProjectCode(projRes.data.codice_progetto || '');
      }
      setItems(ganttData);
    } catch (err: any) {
      console.error('Errore caricamento vista cliente:', err);
      setErrorMsg('Impossibile caricare il cronoprogramma richiesto.');
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    loadPublicGantt();
  }, [loadPublicGantt]);

  const datedItems = items.filter((i) => i.type !== 'grp' && i.start_date && i.end_date);
  const minDate = datedItems.length > 0 ? datedItems.map((i) => i.start_date!).sort()[0] : null;
  const maxDate = datedItems.length > 0 ? datedItems.map((i) => i.end_date!).sort().slice(-1)[0] : null;
  const totalDays = minDate && maxDate ? Math.max(1, diffDays(minDate, maxDate) + 1) : 0;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* INTESTAZIONE PULITA CON LOGO GLARING E PULSANTE STAMPA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-white font-extrabold tracking-wider text-base flex items-center gap-1.5">
                <span className="text-[#FF5500]">■</span> Glaring <span className="text-xs text-gray-400 font-normal">Advisory</span>
              </span>
              {projectCode && (
                <span className="px-2.5 py-0.5 bg-gray-900 border border-gray-800 text-amber-400 font-mono text-xs font-bold rounded">
                  {projectCode}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {projectTitle}
            </h1>
            <p className="text-xs text-gray-400">
              Pianificazione operativa, milestone e gate decisionali di progetto (Aggiornato in tempo reale).
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white border border-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer self-start md:self-auto shadow-sm flex items-center gap-2"
          >
            🖨️ Stampa / Salva PDF
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* LEGENDA */}
        <div className="flex flex-wrap items-center gap-5 text-xs text-gray-400 bg-gray-900/60 border border-gray-800 px-4 py-2.5 rounded-xl">
          <span className="flex items-center gap-2">
            <i className="w-3.5 h-2.5 rounded-sm bg-blue-500 inline-block" /> Attività
          </span>
          <span className="flex items-center gap-2">
            <i className="w-3.5 h-2.5 rounded-sm bg-orange-500 inline-block" /> Percorso critico
          </span>
          <span className="flex items-center gap-2">
            <i
              className="w-3.5 h-2.5 rounded-sm bg-slate-500 inline-block"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.35) 3px, rgba(255,255,255,0.35) 6px)',
              }}
            />{' '}
            Opzionale
          </span>
          <span className="flex items-center gap-1.5 text-gray-200">
            <span className="text-sm leading-none">◆</span> Milestone
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="text-sm leading-none">◆</span> Gate decisionale
          </span>
          <span className="flex items-center gap-2">
            <i className="w-3.5 h-2.5 rounded-sm bg-gray-800 border border-gray-700 inline-block" /> Weekend
          </span>
          <span className="flex items-center gap-2">
            <i
              className="w-3.5 h-2.5 rounded-sm border border-gray-700 inline-block"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, #1f2937, #1f2937 3px, #374151 3px, #374151 4px)',
              }}
            />{' '}
            Festivo
          </span>
        </div>

        {/* GRAFICO GANTT IN SOLA LETTURA */}
        {loading ? (
          <div className="text-xs text-gray-400 font-mono py-12 text-center">Caricamento cronoprogramma...</div>
        ) : !minDate || !maxDate ? (
          <div className="bg-gray-900/50 border border-dashed border-gray-800 p-10 rounded-2xl text-center text-xs text-gray-400">
            Nessuna attività ancora pubblicata per questo progetto.
          </div>
        ) : (
          <div className="overflow-x-auto border border-gray-800 rounded-2xl bg-gray-900/40 shadow-xl">
            <div style={{ minWidth: `${Math.max(900, 320 + totalDays * 28)}px` }}>
              <div
                className="grid items-center bg-gray-900 border-b border-gray-800 text-[11px] text-gray-400 min-h-[44px]"
                style={{ gridTemplateColumns: `320px repeat(${totalDays}, minmax(28px, 1fr))` }}
              >
                <div className="px-3 py-2 font-bold text-gray-300 border-r border-gray-800 h-full flex items-center">
                  Attività / Responsabile / Date
                </div>
                {Array.from({ length: totalDays }).map((_, idx) => {
                  const d = addDays(parseDate(minDate), idx);
                  const dayName = ['D', 'L', 'M', 'M', 'G', 'V', 'S'][d.getDay()];
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div
                      key={idx}
                      className={`text-center py-1 border-l border-gray-800/80 leading-tight ${
                        isWeekend ? 'bg-gray-950/60 text-gray-500' : ''
                      }`}
                    >
                      <b className="block text-gray-200 text-[11px]">{d.getDate()}</b>
                      <span>{dayName}</span>
                    </div>
                  );
                })}
              </div>

              {items.map((item) => {
                if (item.type === 'grp') {
                  return (
                    <div
                      key={item.id}
                      className="grid items-center bg-gray-900/90 border-t border-gray-800 min-h-[30px]"
                      style={{ gridTemplateColumns: `320px repeat(${totalDays}, minmax(28px, 1fr))` }}
                    >
                      <div className="px-3 py-1 text-xs font-bold text-cyan-400 uppercase tracking-wider border-r border-gray-800">
                        {item.name || '—'}
                      </div>
                      <div style={{ gridColumn: `2 / ${totalDays + 2}` }} className="h-full bg-gray-900/40" />
                    </div>
                  );
                }

                if (!item.start_date || !item.end_date) return null;

                const startCol = diffDays(minDate, item.start_date) + 2;
                const endCol = diffDays(minDate, item.end_date) + 3;

                return (
                  <div
                    key={item.id}
                    className="grid items-center border-t border-gray-800/80 min-h-[38px] relative hover:bg-gray-900/30"
                    style={{ gridTemplateColumns: `320px repeat(${totalDays}, minmax(28px, 1fr))` }}
                  >
                    <div
                      style={{ gridColumn: 1, gridRow: 1 }}
                      className="px-3 py-1.5 text-xs bg-gray-950 border-r border-gray-800 h-full flex flex-col justify-center"
                    >
                      <span className="text-gray-100 font-medium truncate">{item.name}</span>
                      <small className="text-[10px] text-gray-400">
                        {item.owner || 'Team'} · {formatShortDate(item.start_date)}
                        {item.end_date !== item.start_date ? ` – ${formatShortDate(item.end_date)}` : ''}
                      </small>
                    </div>

                    {Array.from({ length: totalDays }).map((_, idx) => {
                      const currentIso = toIso(addDays(parseDate(minDate), idx));
                      const d = parseDate(currentIso);
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      const isHoliday = HOLIDAYS.includes(currentIso);

                      return (
                        <div
                          key={idx}
                          style={{ gridColumn: idx + 2, gridRow: 1 }}
                          className={`h-full min-h-[38px] border-l border-gray-800/60 ${
                            isWeekend ? 'bg-gray-900/70' : ''
                          }`}
                        >
                          {isHoliday && (
                            <div
                              className="w-full h-full opacity-60"
                              style={{
                                backgroundImage:
                                  'repeating-linear-gradient(45deg, #1f2937, #1f2937 4px, #374151 4px, #374151 5px)',
                              }}
                            />
                          )}
                        </div>
                      );
                    })}

                    {item.type === 'ms' || item.type === 'gate' ? (
                      <div
                        style={{ gridColumn: startCol, gridRow: 1 }}
                        className={`justify-self-center self-center text-lg leading-none z-10 select-none ${
                          item.type === 'gate'
                            ? 'text-emerald-400'
                            : item.crit
                            ? 'text-orange-500'
                            : 'text-white'
                        }`}
                        title={`${item.name} (${item.start_date})`}
                      >
                        ◆
                      </div>
                    ) : (
                      <div
                        style={{
                          gridColumn: `${startCol} / ${endCol}`,
                          gridRow: 1,
                          ...(item.type === 'opt'
                            ? {
                                backgroundImage:
                                  'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.35) 4px, rgba(255,255,255,0.35) 7px)',
                              }
                            : {}),
                        }}
                        className={`self-center h-3.5 rounded mx-0.5 z-10 shadow-sm ${
                          item.crit
                            ? 'bg-orange-500'
                            : item.type === 'opt'
                            ? 'bg-slate-500'
                            : 'bg-blue-500'
                        }`}
                        title={`${item.name}: ${item.start_date} → ${item.end_date}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="text-[11px] text-gray-500 text-right pt-2">
          Documento riservato generato da Glaring Advisory System · Per salvare in PDF usa il pulsante Stampa in alto.
        </div>
      </div>
    </main>
  );
}
