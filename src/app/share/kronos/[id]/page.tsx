'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ganttService, GanttItem } from '@/services/ganttService';

const HOLIDAYS = ['2026-12-08', '2026-12-25', '2026-12-26', '2027-01-01'];
const WEEK = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

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

const getMonthYearLabel = (d: Date) =>
  d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase();

const getIsoWeekNumber = (d: Date) => {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export default function PublicClientKronosPage() {
  const params = useParams();
  const projectId = params?.id as string;

  const [projectTitle, setProjectTitle] = useState<string>('Cronoprogramma Operativo');
  const [projectCode, setProjectCode] = useState<string>('');
  const [items, setItems] = useState<GanttItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [hoveredNote, setHoveredNote] = useState<{
    item: GanttItem;
    wbs: string;
    x: number;
    y: number;
  } | null>(null);

  const [selectedNote, setSelectedNote] = useState<{
    item: GanttItem;
    wbs: string;
    x: number;
    y: number;
  } | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!selectedNote) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNote(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNote]);

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

  const wbsMap = useMemo(() => {
    const map: Record<string, string> = {};
    let groupNum = 0;
    let subNum = 0;

    items.forEach((item, idx) => {
      const key = item.id || String(idx);
      if (item.type === 'grp') {
        groupNum += 1;
        subNum = 0;
        map[key] = String(groupNum);
      } else {
        subNum += 1;
        const prefix = groupNum > 0 ? String(groupNum) : '0';
        map[key] = `${prefix}.${subNum}`;
      }
    });

    return map;
  }, [items]);

  const datedItems = items.filter((i) => i.type !== 'grp' && i.start_date && i.end_date);
  const minDate = datedItems.length > 0 ? datedItems.map((i) => i.start_date!).sort()[0] : null;
  const maxDate = datedItems.length > 0 ? datedItems.map((i) => i.end_date!).sort().slice(-1)[0] : null;
  const totalDays = minDate && maxDate ? Math.max(1, diffDays(minDate, maxDate) + 1) : 0;
  const dayList =
    minDate && totalDays > 0
      ? Array.from({ length: totalDays }, (_, i) => toIso(addDays(parseDate(minDate), i)))
      : [];
  const todayIso = toIso(new Date());

  const monthSpans = useMemo(() => {
    if (dayList.length === 0) return [];
    const spans: { label: string; startCol: number; span: number }[] = [];
    dayList.forEach((d, idx) => {
      const label = getMonthYearLabel(parseDate(d));
      const col = idx + 2;
      const last = spans[spans.length - 1];
      if (last && last.label === label) {
        last.span += 1;
      } else {
        spans.push({ label, startCol: col, span: 1 });
      }
    });
    return spans;
  }, [dayList]);

  const weekSpans = useMemo(() => {
    if (dayList.length === 0) return [];
    const spans: { label: string; startCol: number; span: number }[] = [];
    dayList.forEach((d, idx) => {
      const dt = parseDate(d);
      const weekNo = getIsoWeekNumber(dt);
      const label = `W${weekNo} · ${dt.getFullYear()}`;
      const col = idx + 2;
      const last = spans[spans.length - 1];
      if (last && last.label === label) {
        last.span += 1;
      } else {
        spans.push({ label, startCol: col, span: 1 });
      }
    });
    return spans;
  }, [dayList]);

  return (
    <main
      onClick={() => setSelectedNote(null)}
      className="min-h-screen bg-[#15191f] text-[#e8ecf2] font-sans p-4 sm:p-8"
    >
      <div className="max-w-[1600px] mx-auto space-y-5 bg-[#15191f] border border-[#2a313c] p-6 rounded-3xl shadow-xl">
        {/* INTESTAZIONE PULITA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2a313c] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-[#e8ecf2] font-extrabold tracking-wider text-sm flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#5b8be6] inline-block" />
                Glaring
                <span className="text-xs text-[#9aa4b2] font-normal">Advisory</span>
              </span>
              {projectCode && (
                <span className="px-2.5 py-0.5 bg-[#1b212a] border border-[#2a313c] text-[#f3d98b] font-mono text-xs font-bold rounded-lg">
                  {projectCode}
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-[#e8ecf2] tracking-tight">
              {projectTitle}
            </h1>
            <p className="text-xs text-[#9aa4b2]">
              Pianificazione operativa, milestone e gate decisionali di progetto.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-[#1b212a] hover:bg-[#222a36] text-[#e8ecf2] border border-[#2a313c] rounded-xl text-xs font-bold transition-all cursor-pointer self-start md:self-auto"
          >
            Stampa / PDF
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300">
            {errorMsg}
          </div>
        )}

        {/* LEGENDA PULITA */}
        <div className="flex flex-wrap items-center gap-5 text-xs text-[#9aa4b2] bg-[#1b212a] border border-[#2a313c] px-4 py-2.5 rounded-xl">
          <span className="flex items-center gap-2">
            <i className="w-3.5 h-2.5 rounded-sm bg-[#5b8be6] inline-block" /> Attività
          </span>
          <span className="flex items-center gap-2">
            <i className="w-3.5 h-2.5 rounded-sm bg-[#f07a50] inline-block" /> Percorso critico
          </span>
          <span className="flex items-center gap-2">
            <i className="w-3.5 h-2.5 rounded-sm bg-[#5d6878] inline-block" /> Opzionale
          </span>
          <span className="flex items-center gap-1.5 text-[#e8ecf2]">
            <span className="text-sm leading-none font-bold">◆</span> Milestone
          </span>
          <span className="flex items-center gap-1.5 text-[#38c27a]">
            <span className="text-sm leading-none font-bold text-[#38c27a]">◆</span> Gate decisionale
          </span>
          <span className="flex items-center gap-2">
            <i className="w-3.5 h-2.5 rounded-sm bg-[#1d232c] border border-[#2a313c] inline-block" /> Weekend
          </span>
        </div>

        {/* GRAFICO GANTT IN SOLA LETTURA */}
        {loading ? (
          <div className="text-xs text-[#9aa4b2] font-mono py-12 text-center">
            Caricamento cronoprogramma...
          </div>
        ) : !minDate || !maxDate || dayList.length === 0 ? (
          <div className="bg-[#1b212a] border border-dashed border-[#2a313c] p-10 rounded-2xl text-center text-xs text-[#9aa4b2]">
            Nessuna attività ancora pubblicata per questo progetto.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#2a313c] rounded-2xl bg-[#15191f] shadow-md">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `320px repeat(${totalDays}, minmax(28px, 1fr))`,
                minWidth: `${Math.max(900, 320 + totalDays * 28)}px`,
              }}
            >
              {/* RIGA 1: MESE + ANNO */}
              <div
                style={{
                  gridColumn: 1,
                  gridRow: 1,
                  background: '#171c24',
                  borderRight: '1px solid #2a313c',
                  borderBottom: '1px solid #2a313c',
                  padding: '6px 12px',
                  fontWeight: 700,
                  fontSize: '10px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#9aa4b2',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'sticky',
                  left: 0,
                  zIndex: 30,
                }}
              >
                Periodo / Calendario
              </div>
              {monthSpans.map((m) => (
                <div
                  key={`${m.label}-${m.startCol}`}
                  style={{
                    gridColumn: `${m.startCol} / span ${m.span}`,
                    gridRow: 1,
                    background: '#171c24',
                    borderLeft: '1px solid #2a313c',
                    borderBottom: '1px solid #2a313c',
                    padding: '6px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: '#e8ecf2',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {m.label}
                </div>
              ))}

              {/* RIGA 2: NUMERO SETTIMANA + ANNO */}
              <div
                style={{
                  gridColumn: 1,
                  gridRow: 2,
                  background: '#191f28',
                  borderRight: '1px solid #2a313c',
                  borderBottom: '1px solid #2a313c',
                  padding: '5px 12px',
                  fontWeight: 600,
                  fontSize: '10px',
                  color: '#9aa4b2',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'sticky',
                  left: 0,
                  zIndex: 30,
                }}
              >
                Settimana ISO
              </div>
              {weekSpans.map((w) => (
                <div
                  key={`${w.label}-${w.startCol}`}
                  style={{
                    gridColumn: `${w.startCol} / span ${w.span}`,
                    gridRow: 2,
                    background: '#191f28',
                    borderLeft: '1px solid #2a313c',
                    borderBottom: '1px solid #2a313c',
                    padding: '5px 4px',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#5b8be6',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {w.label}
                </div>
              ))}

              {/* RIGA 3: INTESTAZIONE GIORNI (COLONNA 1 BLOCCATA) */}
              <div
                style={{
                  gridColumn: 1,
                  gridRow: 3,
                  background: '#1b212a',
                  borderRight: '1px solid #2a313c',
                  borderBottom: '1px solid #2a313c',
                  padding: '8px 12px',
                  fontWeight: 'bold',
                  fontSize: '11px',
                  color: '#e8ecf2',
                  display: 'flex',
                  alignItems: 'center',
                  position: 'sticky',
                  left: 0,
                  zIndex: 30,
                }}
              >
                Attività / Responsabile / Date
              </div>

              {dayList.map((d, idx) => {
                const dt = parseDate(d);
                const isToday = d === todayIso;
                const isWe = ['0', '6'].includes(String(dt.getDay()));
                return (
                  <div
                    key={d}
                    style={{
                      gridColumn: idx + 2,
                      gridRow: 3,
                      background: isToday ? '#2563eb' : isWe ? '#1d232c' : '#1b212a',
                      color: isToday ? '#ffffff' : '#9aa4b2',
                      borderLeft: '1px solid #2a313c',
                      borderBottom: '1px solid #2a313c',
                      textAlign: 'center',
                      padding: '6px 0',
                      fontSize: '11px',
                      lineHeight: '1.2',
                    }}
                  >
                    <b
                      style={{
                        display: 'block',
                        fontSize: '11px',
                        color: isToday ? '#ffffff' : '#e8ecf2',
                      }}
                    >
                      {dt.getDate()}
                    </b>
                    <span>{WEEK[dt.getDay()]}</span>
                  </div>
                );
              })}

              {/* RIGHE ELEMENTI */}
              {items.map((item, idx) => {
                const rowIdx = idx + 4;
                const isGroup = item.type === 'grp';
                const wbsCode = wbsMap[item.id || String(idx)] || '';

                if (isGroup) {
                  return (
                    <React.Fragment key={item.id || idx}>
                      <div
                        style={{
                          gridColumn: 1,
                          gridRow: rowIdx,
                          background: '#1b212a',
                          borderRight: '1px solid #2a313c',
                          borderTop: '1px solid #2a313c',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#9aa4b2',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          textTransform: 'uppercase',
                          position: 'sticky',
                          left: 0,
                          zIndex: 20,
                        }}
                      >
                        <span style={{ color: '#5b8be6', fontFamily: 'monospace' }}>{wbsCode}</span>
                        <span
                          style={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.name || '—'}
                        </span>
                      </div>
                      {dayList.map((d, i) => (
                        <div
                          key={d}
                          style={{
                            gridColumn: i + 2,
                            gridRow: rowIdx,
                            background: '#1b212a',
                            borderLeft: '1px solid #2a313c',
                            borderTop: '1px solid #2a313c',
                          }}
                        />
                      ))}
                    </React.Fragment>
                  );
                }

                if (!item.start_date || !item.end_date) return null;

                const startCol = diffDays(minDate, item.start_date) + 2;
                const endCol = diffDays(minDate, item.end_date) + 3;
                const isPoint = item.type === 'ms' || item.type === 'gate';
                const barColor = item.crit
                  ? '#f07a50'
                  : item.type === 'opt'
                  ? '#5d6878'
                  : '#5b8be6';
                const isSelected = selectedNote?.item.id === item.id;

                const noteHandlers = {
                  onMouseEnter: (ev: React.MouseEvent) => {
                    setHoveredNote({ item, wbs: wbsCode, x: ev.clientX, y: ev.clientY });
                  },
                  onMouseMove: (ev: React.MouseEvent) => {
                    setHoveredNote((prev) => (prev ? { ...prev, x: ev.clientX, y: ev.clientY } : null));
                  },
                  onMouseLeave: () => {
                    setHoveredNote(null);
                  },
                  onClick: (ev: React.MouseEvent) => {
                    ev.stopPropagation();
                    setSelectedNote((prev) =>
                      prev?.item.id === item.id
                        ? null
                        : { item, wbs: wbsCode, x: ev.clientX, y: ev.clientY }
                    );
                  },
                };

                return (
                  <React.Fragment key={item.id || idx}>
                    {/* ETICHETTA LATO SINISTRO BLOCCATA */}
                    <div
                      style={{
                        gridColumn: 1,
                        gridRow: rowIdx,
                        background: '#15191f',
                        borderRight: '1px solid #2a313c',
                        borderTop: '1px solid #2a313c',
                        padding: '8px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        minHeight: '38px',
                        position: 'sticky',
                        left: 0,
                        zIndex: 20,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#e8ecf2',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <strong
                          style={{
                            color: '#9aa4b2',
                            fontWeight: 600,
                            marginRight: '6px',
                          }}
                        >
                          {wbsCode}
                        </strong>
                        {item.name}
                      </span>
                      <small style={{ fontSize: '11px', color: '#9aa4b2', marginTop: '2px' }}>
                        {item.owner || 'Glaring'} · {formatShortDate(item.start_date)}
                        {item.end_date !== item.start_date
                          ? ` – ${formatShortDate(item.end_date)}`
                          : ''}
                      </small>
                    </div>

                    {/* CELLE GIORNI SFONDO */}
                    {dayList.map((d, i) => {
                      const dt = parseDate(d);
                      const isWe = ['0', '6'].includes(String(dt.getDay()));
                      const isToday = d === todayIso;
                      const isHoliday = HOLIDAYS.includes(d);

                      return (
                        <div
                          key={d}
                          style={{
                            gridColumn: i + 2,
                            gridRow: rowIdx,
                            background: isToday
                              ? 'rgba(91, 139, 230, 0.15)'
                              : isWe
                              ? '#1d232c'
                              : '#15191f',
                            borderLeft: '1px solid #2a313c',
                            borderTop: '1px solid #2a313c',
                            minHeight: '38px',
                            position: 'relative',
                          }}
                        >
                          {isHoliday && (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                opacity: 0.5,
                                backgroundImage:
                                  'repeating-linear-gradient(45deg, #1d232c, #1d232c 4px, #2a313c 4px, #2a313c 5px)',
                              }}
                            />
                          )}
                        </div>
                      );
                    })}

                    {/* BARRA O MILESTONE COLORATA */}
                    {isPoint ? (
                      <div
                        {...noteHandlers}
                        style={{
                          gridColumn: startCol,
                          gridRow: rowIdx,
                          alignSelf: 'center',
                          justifySelf: 'center',
                          fontSize: '16px',
                          fontWeight: 'bold',
                          color: item.type === 'gate' ? '#38c27a' : '#e8ecf2',
                          zIndex: 10,
                          lineHeight: 1,
                          cursor: 'pointer',
                          transform: isSelected ? 'scale(1.25)' : undefined,
                        }}
                      >
                        ◆
                      </div>
                    ) : (
                      <div
                        {...noteHandlers}
                        style={{
                          gridColumn: `${startCol} / ${endCol}`,
                          gridRow: rowIdx,
                          alignSelf: 'center',
                          height: '16px',
                          borderRadius: '4px',
                          background: barColor,
                          ...(item.type === 'opt'
                            ? {
                                backgroundImage:
                                  'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.25) 4px, rgba(255,255,255,0.25) 8px)',
                              }
                            : {}),
                          zIndex: 10,
                          display: 'flex',
                          alignItems: 'center',
                          padding: '0 6px',
                          boxShadow: isSelected
                            ? '0 0 0 2px #ffffff, 0 2px 6px rgba(0,0,0,0.45)'
                            : '0 1px 3px rgba(0,0,0,0.3)',
                          overflow: 'hidden',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#ffffff',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: 300,
                          }}
                        >
                          {wbsCode} · {item.name}
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* TOOLTIP NOTA AL PASSAGGIO DEL MOUSE */}
        {hoveredNote && !selectedNote && typeof window !== 'undefined' && (
          <div
            style={{
              position: 'fixed',
              top: Math.min(window.innerHeight - 170, hoveredNote.y + 14),
              left: Math.min(window.innerWidth - 320, hoveredNote.x + 14),
              zIndex: 60,
              maxWidth: '300px',
              pointerEvents: 'none',
            }}
            className="bg-[#1b212a] border border-[#2a313c] text-[#e8ecf2] p-3 rounded-xl shadow-2xl space-y-1.5 text-xs"
          >
            <div className="font-bold text-[#e8ecf2] flex items-center gap-1.5">
              <span className="font-mono text-[#5b8be6]">{hoveredNote.wbs}</span>
              <span className="truncate">{hoveredNote.item.name}</span>
            </div>
            <div className="text-[11px] text-[#9aa4b2]">
              {hoveredNote.item.owner || 'Glaring'} · {formatShortDate(hoveredNote.item.start_date!)}
              {hoveredNote.item.end_date !== hoveredNote.item.start_date
                ? ` – ${formatShortDate(hoveredNote.item.end_date!)}`
                : ''}
            </div>
            <div className="pt-1.5 border-t border-[#2a313c] text-[#e8ecf2] whitespace-pre-wrap break-words leading-relaxed">
              {hoveredNote.item.note?.trim() ? (
                hoveredNote.item.note
              ) : (
                <span className="italic text-[#9aa4b2]">Nessuna nota per questa attività.</span>
              )}
            </div>
          </div>
        )}

        {/* SCHEDA NOTA AL CLIC SULLA BARRA */}
        {selectedNote && typeof window !== 'undefined' && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: Math.min(window.innerHeight - 230, Math.max(20, selectedNote.y + 12)),
              left: Math.min(window.innerWidth - 360, Math.max(20, selectedNote.x - 140)),
              zIndex: 70,
              width: '340px',
            }}
            className="bg-[#1b212a] border border-[#5b8be6]/60 text-[#e8ecf2] p-4 rounded-2xl shadow-2xl space-y-2.5 text-xs"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#2a313c] pb-2">
              <div>
                <div className="font-bold text-[#e8ecf2] flex items-center gap-1.5">
                  <span className="font-mono text-[#5b8be6]">{selectedNote.wbs}</span>
                  <span>{selectedNote.item.name}</span>
                </div>
                <div className="text-[11px] text-[#9aa4b2] mt-0.5">
                  {selectedNote.item.owner || 'Glaring'} · {formatShortDate(selectedNote.item.start_date!)}
                  {selectedNote.item.end_date !== selectedNote.item.start_date
                    ? ` – ${formatShortDate(selectedNote.item.end_date!)}`
                    : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNote(null)}
                className="text-[#9aa4b2] hover:text-[#e8ecf2] font-bold cursor-pointer px-1"
              >
                ✕
              </button>
            </div>

            <div className="text-[#e8ecf2] whitespace-pre-wrap break-words leading-relaxed bg-[#15191f] border border-[#2a313c] p-2.5 rounded-xl min-h-[56px]">
              {selectedNote.item.note?.trim() ? (
                selectedNote.item.note
              ) : (
                <span className="italic text-[#9aa4b2]">Nessuna nota inserita.</span>
              )}
            </div>
          </div>
        )}

        <div className="text-[11px] text-[#9aa4b2] text-right pt-1">
          Glaring Advisory · Vista condivisa in sola lettura
        </div>
      </div>
    </main>
  );
}
