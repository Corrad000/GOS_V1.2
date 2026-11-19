'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { ganttService, GanttItem } from '@/services/ganttService';

interface KronosGanttProps {
  projectId: string;
  forceClientMode?: boolean;
}

interface ProjectRole {
  id: string;
  nome: string;
  ruolo?: string;
}

const HOLIDAYS = ['2026-12-08', '2026-12-25', '2026-12-26', '2027-01-01'];
const WEEK = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const diff = (a: string, b: string) =>
  Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000);

const short = (s: string) =>
  parse(s).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

const getMonthYearLabel = (d: Date) =>
  d.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }).toUpperCase();

const getIsoWeekNumber = (d: Date) => {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export function KronosGanttView({ projectId, forceClientMode = false }: KronosGanttProps) {
  const [items, setItems] = useState<GanttItem[]>([]);
  const [projectRoles, setProjectRoles] = useState<ProjectRole[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [clientMode, setClientMode] = useState<boolean>(forceClientMode);
  const [statusBadge, setStatusBadge] = useState<string>(
    'BOZZA – le date sono soggette a conferma ed approvazione Gate'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingOwnerItem, setEditingOwnerItem] = useState<GanttItem | null>(null);

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

  const isReadOnly = clientMode || forceClientMode;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (forceClientMode) {
      setClientMode(true);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'cliente') {
      setClientMode(true);
    }
  }, [forceClientMode]);

  useEffect(() => {
    if (!selectedNote) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedNote(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNote]);

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [ganttData, rolesResProgetto, rolesResProject] = await Promise.all([
        ganttService.getGanttItemsByProject(projectId),
        supabase.from('gos_ruoli').select('*').eq('progetto_id', projectId),
        supabase.from('gos_ruoli').select('*').eq('project_id', projectId),
      ]);

      setItems(ganttData);

      const rolesData = [...(rolesResProgetto.data || []), ...(rolesResProject.data || [])];
      const formattedRoles = rolesData.map((r: any) => ({
        id: r.id || Math.random().toString(),
        nome: r.nome || r.member_name || r.name || 'Senza nome',
        ruolo: r.ruolo || r.role_title || '',
      }));

      const uniqueRoles = Array.from(new Map(formattedRoles.map((r) => [r.id, r])).values());
      setProjectRoles(uniqueRoles as ProjectRole[]);
    } catch (err: any) {
      console.error('Errore caricamento Kronos:', err);
      setErrorMsg(`Errore caricamento dati Gantt: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const handleCopyClientLink = () => {
    const origin = window.location.origin;
    const publicClientUrl = `${origin}/share/kronos/${projectId}`;
    navigator.clipboard.writeText(publicClientUrl);
    alert('Link esterno per il cliente copiato.');
  };

  const datedItems = items.filter((i) => i.type !== 'grp' && i.start_date && i.end_date);
  const minDate = datedItems.length > 0 ? datedItems.map((i) => i.start_date!).sort()[0] : iso(new Date());
  const maxDate =
    datedItems.length > 0 ? datedItems.map((i) => i.end_date!).sort().slice(-1)[0] : iso(addDays(new Date(), 30));

  const totalDays = Math.max(1, diff(minDate, maxDate) + 1);
  const dayList = Array.from({ length: totalDays }, (_, i) => iso(addDays(parse(minDate), i)));

  const todayIso = iso(new Date());
  const operationalItems = items.filter((i) => i.type !== 'grp');
  const totalTasksCount = operationalItems.length;
  const criticalTasksCount = operationalItems.filter((i) => i.crit).length;
  const completedTasksCount = operationalItems.filter((i) => i.end_date && i.end_date < todayIso).length;
  const progressPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  const monthSpans = useMemo(() => {
    if (dayList.length === 0) return [];
    const spans: { label: string; startCol: number; span: number }[] = [];
    dayList.forEach((d, idx) => {
      const label = getMonthYearLabel(parse(d));
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
      const dt = parse(d);
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

  const getLastDate = () => {
    const ends = items.filter((i) => i.end_date).map((i) => i.end_date!).sort();
    return ends.length > 0 ? ends[ends.length - 1] : todayIso;
  };

  const handleAddItem = async (type: GanttItem['type']) => {
    setErrorMsg(null);
    const baseDate = getLastDate();
    const endDate = type === 'task' || type === 'opt' ? iso(addDays(parse(baseDate), 2)) : baseDate;

    const newItemPayload: Omit<GanttItem, 'id' | 'created_at'> = {
      progetto_id: projectId,
      type,
      name:
        type === 'grp'
          ? 'Nuova intestazione gruppo'
          : type === 'ms'
          ? 'Nuova milestone'
          : type === 'gate'
          ? 'GATE – Approvazione'
          : 'Nuova attività operativa',
      owner: type === 'grp' ? undefined : 'Glaring',
      start_date: type === 'grp' ? undefined : baseDate,
      end_date: type === 'grp' ? undefined : endDate,
      crit: type === 'gate',
      note: '',
      position: items.length,
    };

    try {
      const created = await ganttService.createGanttItem(newItemPayload);
      setItems((prev) => [...prev, created]);
    } catch (err: any) {
      setErrorMsg(`Impossibile aggiungere elemento: ${err.message}`);
    }
  };

  const handleUpdateItem = async (id: string, field: keyof GanttItem, value: any) => {
    const currentItem = items.find((i) => i.id === id);
    if (!currentItem) return;

    const updates: Partial<GanttItem> = { [field]: value };

    if (field === 'type') {
      if (value === 'ms' || value === 'gate') {
        updates.end_date = currentItem.start_date;
      }
      if (value === 'gate') {
        updates.crit = true;
      }
    }
    if (field === 'start_date') {
      if (currentItem.type === 'ms' || currentItem.type === 'gate') {
        updates.end_date = value;
      } else if (currentItem.end_date && value > currentItem.end_date) {
        updates.end_date = value;
      }
    }
    if (field === 'end_date' && currentItem.start_date && value < currentItem.start_date) {
      updates.end_date = currentItem.start_date;
    }

    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, ...updates } : item));
      const updated = next.find((item) => item.id === id);
      if (updated) {
        setSelectedNote((curr) => (curr?.item.id === id ? { ...curr, item: updated } : curr));
        setHoveredNote((curr) => (curr?.item.id === id ? { ...curr, item: updated } : curr));
      }
      return next;
    });

    setSavingId(id);

    try {
      await ganttService.updateGanttItem(id, updates);
    } catch (err: any) {
      setErrorMsg(`Errore salvataggio modifica: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updatedList = [...items];
    [updatedList[index], updatedList[targetIndex]] = [updatedList[targetIndex], updatedList[index]];

    const reindexed = updatedList.map((item, idx) => ({ ...item, position: idx }));
    setItems(reindexed);

    try {
      await Promise.all([
        ganttService.updateGanttItem(reindexed[index].id, { position: index }),
        ganttService.updateGanttItem(reindexed[targetIndex].id, { position: targetIndex }),
      ]);
    } catch (err: any) {
      setErrorMsg(`Errore riordinamento: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    const backup = [...items];
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (selectedNote?.item.id === id) setSelectedNote(null);
    if (hoveredNote?.item.id === id) setHoveredNote(null);
    try {
      await ganttService.deleteGanttItem(id);
    } catch (err: any) {
      setItems(backup);
      setErrorMsg(`Errore eliminazione: ${err.message}`);
    }
  };

  return (
    <div
      onClick={() => setSelectedNote(null)}
      className="space-y-6 text-[#e8ecf2] bg-[#15191f] p-6 rounded-3xl shadow-xl border border-[#2a313c]"
    >
      {/* MODALE SELEZIONE RESPONSABILE */}
      {editingOwnerItem && !isReadOnly && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <div className="bg-[#1b212a] border border-[#2a313c] text-[#e8ecf2] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#2a313c] pb-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-[#e8ecf2]">
                Seleziona Responsabile per: <span className="text-[#5b8be6]">{editingOwnerItem.name}</span>
              </h4>
              <button
                onClick={() => setEditingOwnerItem(null)}
                className="text-[#9aa4b2] hover:text-[#e8ecf2] font-bold cursor-pointer text-base"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold text-[#9aa4b2] uppercase tracking-wider pt-1">
                Entità Standard
              </div>
              {['Glaring', 'Cliente', 'Congiunto'].map((std) => (
                <button
                  key={std}
                  type="button"
                  onClick={() => {
                    handleUpdateItem(editingOwnerItem.id, 'owner', std);
                    setEditingOwnerItem(null);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center justify-between ${
                    editingOwnerItem.owner === std
                      ? 'bg-[#1e293b] text-[#5b8be6] border border-[#5b8be6] font-bold'
                      : 'bg-[#15191f] text-[#e8ecf2] hover:bg-[#1b212a] border border-[#2a313c]'
                  }`}
                >
                  <span>{std}</span>
                  {editingOwnerItem.owner === std && <span>✓</span>}
                </button>
              ))}

              <div className="text-[11px] font-bold text-[#f3d98b] uppercase tracking-wider pt-3">
                Membri da Tab Ruoli ({projectRoles.length})
              </div>
              {projectRoles.length > 0 ? (
                projectRoles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      handleUpdateItem(editingOwnerItem.id, 'owner', r.nome);
                      setEditingOwnerItem(null);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between ${
                      editingOwnerItem.owner === r.nome
                        ? 'bg-[#1e293b] text-[#5b8be6] border border-[#5b8be6] font-bold'
                        : 'bg-[#15191f] text-[#e8ecf2] hover:bg-[#1b212a] border border-[#2a313c]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-[#e8ecf2]">{r.nome}</div>
                      {r.ruolo && <div className="text-[10px] text-[#5b8be6] uppercase tracking-wide">{r.ruolo}</div>}
                    </div>
                    {editingOwnerItem.owner === r.nome && <span className="text-[#5b8be6] font-bold">✓</span>}
                  </button>
                ))
              ) : (
                <div className="p-3 bg-[#15191f] rounded-xl text-xs text-[#9aa4b2] italic text-center border border-[#2a313c]">
                  Nessun ruolo inserito nella tab Ruoli di questo progetto.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#2a313c] flex justify-end">
              <button
                type="button"
                onClick={() => setEditingOwnerItem(null)}
                className="px-4 py-2 bg-[#2a313c] hover:bg-[#323b49] text-[#e8ecf2] text-xs font-bold rounded-xl cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER E CONTROLLI */}
      {!forceClientMode && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2a313c] pb-4">
          <div>
            <h3 className="text-base font-bold text-[#e8ecf2] uppercase tracking-wider">
              Kronos · Gantt Operativo & Monitoraggio
            </h3>
            <p className="text-xs text-[#9aa4b2]">
              Pianificazione master di fase, percorso critico, milestone e controllo avanzamento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyClientLink}
              className="px-3 py-1.5 bg-[#5b8be6] hover:bg-[#4a7ad8] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow"
            >
              Copia Link Cliente
            </button>

            <button
              onClick={() => setClientMode(!clientMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                clientMode
                  ? 'bg-[#3a3218] text-[#f3d98b] border-[#5a4c22]'
                  : 'bg-[#1b212a] text-[#e8ecf2] border-[#2a313c] hover:bg-[#222a36]'
              }`}
            >
              {clientMode ? 'Vista Cliente Attiva (Sola Lettura)' : 'Modalità Master (Modifica)'}
            </button>

            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-[#1b212a] hover:bg-[#222a36] text-[#e8ecf2] border border-[#2a313c] rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Stampa / PDF
            </button>
          </div>
        </div>
      )}

      {/* MONITORAGGIO PROGETTO (KPI & AVANZAMENTO) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1b212a] border border-[#2a313c] p-3.5 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#9aa4b2] uppercase tracking-wider">Totale Voci</span>
          <div className="text-lg font-bold text-[#e8ecf2] mt-1">{totalTasksCount}</div>
        </div>
        <div className="bg-[#1b212a] border border-[#2a313c] p-3.5 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#f07a50] uppercase tracking-wider">Percorso Critico</span>
          <div className="text-lg font-bold text-[#f07a50] mt-1">{criticalTasksCount}</div>
        </div>
        <div className="bg-[#1b212a] border border-[#2a313c] p-3.5 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#38c27a] uppercase tracking-wider">Completate (Stima)</span>
          <div className="text-lg font-bold text-[#38c27a] mt-1">
            {completedTasksCount} / {totalTasksCount}
          </div>
        </div>
        <div className="bg-[#1b212a] border border-[#2a313c] p-3.5 rounded-2xl shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#5b8be6] uppercase tracking-wider">Avanzamento Temporale</span>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 bg-[#15191f] h-2 rounded-full overflow-hidden border border-[#2a313c]">
              <div className="bg-[#5b8be6] h-full transition-all" style={{ width: `${progressPercentage}%` }} />
            </div>
            <span className="text-xs font-bold text-[#5b8be6]">{progressPercentage}%</span>
          </div>
        </div>
      </div>

      {/* SELETTORE STATO PIANO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#1b212a] border border-[#2a313c] px-4 py-3 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#9aa4b2]">Stato Piano:</span>
          <span className="text-xs font-medium text-[#e8ecf2] px-2.5 py-1 rounded-xl bg-[#15191f] border border-[#2a313c]">
            {statusBadge}
          </span>
        </div>

        {!isReadOnly && (
          <select
            value={statusBadge}
            onChange={async (e) => {
              const newStatus = e.target.value;
              setStatusBadge(newStatus);
              setSavingId('status');
              try {
                await supabase.from('gos_progetti').update({ stato_piano: newStatus }).eq('id', projectId);
              } catch (err) {
                console.error('Errore aggiornamento stato piano:', err);
              } finally {
                setSavingId(null);
              }
            }}
            className="bg-[#15191f] border border-[#2a313c] px-3 py-1.5 rounded-xl text-xs text-[#e8ecf2] font-medium focus:outline-none focus:border-[#5b8be6] cursor-pointer"
          >
            <option value="BOZZA – le date sono soggette a conferma ed approvazione Gate">Bozza – In definizione</option>
            <option value="ATTIVO – Piano operativo validato ed esecutivo">ATTIVO – Esecutivo</option>
            <option value="APPROVATO GATE – In corso di avanzamento">APPROVATO GATE – In corso</option>
            <option value="COMPLETATO – Chiuso con successo">COMPLETATO</option>
          </select>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300 flex justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* LEGENDA */}
      <div className="flex flex-wrap items-center gap-5 text-xs text-[#9aa4b2] bg-[#1b212a] border border-[#2a313c] px-4 py-2.5 rounded-xl shadow-sm">
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

      {/* MOTORE GRAFICO GANTT */}
      {loading ? (
        <div className="text-xs text-[#9aa4b2] font-mono py-10 text-center">Caricamento Gantt Kronos...</div>
      ) : items.length === 0 ? (
        <div className="bg-[#1b212a] border border-dashed border-[#2a313c] p-8 rounded-2xl text-center text-xs text-[#9aa4b2] shadow-sm">
          Nessuna attività pianificata nel Gantt Kronos.
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#2a313c] rounded-2xl bg-[#15191f] shadow-md">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `320px repeat(${totalDays}, minmax(28px, 1fr))`,
              minWidth: `${320 + totalDays * 28}px`,
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
            {dayList.map((d, i) => {
              const dt = parse(d);
              const isToday = d === todayIso;
              const isWe = ['0', '6'].includes(String(dt.getDay()));
              return (
                <div
                  key={d}
                  style={{
                    gridColumn: i + 2,
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
                  <b style={{ display: 'block', fontSize: '11px', color: isToday ? '#ffffff' : '#e8ecf2' }}>
                    {dt.getDate()}
                  </b>
                  <span>{WEEK[dt.getDay()]}</span>
                </div>
              );
            })}

            {/* RIGHE ELEMENTI */}
            {items.map((t, idx) => {
              const rowIdx = idx + 4;
              const isGroup = t.type === 'grp';
              const wbsCode = wbsMap[t.id || String(idx)] || '';

              if (isGroup) {
                return (
                  <React.Fragment key={t.id || idx}>
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
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.name || '—'}
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

              if (!t.start_date || !t.end_date) return null;

              const s = diff(minDate, t.start_date) + 2;
              const e = diff(minDate, t.end_date) + 3;
              const isPoint = t.type === 'ms' || t.type === 'gate';
              const barColor = t.crit ? '#f07a50' : t.type === 'opt' ? '#5d6878' : '#5b8be6';
              const isSelected = selectedNote?.item.id === t.id;

              const noteHandlers = {
                onMouseEnter: (ev: React.MouseEvent) => {
                  setHoveredNote({ item: t, wbs: wbsCode, x: ev.clientX, y: ev.clientY });
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
                    prev?.item.id === t.id
                      ? null
                      : { item: t, wbs: wbsCode, x: ev.clientX, y: ev.clientY }
                  );
                },
              };

              return (
                <React.Fragment key={t.id || idx}>
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
                      <strong style={{ color: '#9aa4b2', fontWeight: 600, marginRight: '6px' }}>{wbsCode}</strong>
                      {t.name}
                    </span>
                    <small style={{ fontSize: '11px', color: '#9aa4b2', marginTop: '2px' }}>
                      {t.owner || 'Glaring'} · {short(t.start_date)} {t.end_date !== t.start_date ? `– ${short(t.end_date)}` : ''}
                    </small>
                  </div>

                  {/* CELLE GIORNI SFONDO */}
                  {dayList.map((d, i) => {
                    const dt = parse(d);
                    const isWe = ['0', '6'].includes(String(dt.getDay()));
                    const isToday = d === todayIso;
                    const isHoliday = HOLIDAYS.includes(d);

                    return (
                      <div
                        key={d}
                        style={{
                          gridColumn: i + 2,
                          gridRow: rowIdx,
                          background: isToday ? 'rgba(91, 139, 230, 0.15)' : isWe ? '#1d232c' : '#15191f',
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
                        gridColumn: s,
                        gridRow: rowIdx,
                        alignSelf: 'center',
                        justifySelf: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        color: t.type === 'gate' ? '#38c27a' : '#e8ecf2',
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
                        gridColumn: `${s} / ${e}`,
                        gridRow: rowIdx,
                        alignSelf: 'center',
                        height: '16px',
                        borderRadius: '4px',
                        background: barColor,
                        ...(t.type === 'opt'
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
                        {wbsCode} · {t.name}
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
            {hoveredNote.item.owner || 'Glaring'} · {short(hoveredNote.item.start_date!)}
            {hoveredNote.item.end_date !== hoveredNote.item.start_date
              ? ` – ${short(hoveredNote.item.end_date!)}`
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
                {selectedNote.item.owner || 'Glaring'} · {short(selectedNote.item.start_date!)}
                {selectedNote.item.end_date !== selectedNote.item.start_date
                  ? ` – ${short(selectedNote.item.end_date!)}`
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

      {/* EDITOR TABELLARE */}
      {!isReadOnly && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleAddItem('task')}
                className="px-3 py-1.5 bg-[#5b8be6] hover:bg-[#4a7ad8] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + Attività
              </button>
              <button
                onClick={() => handleAddItem('opt')}
                className="px-3 py-1.5 bg-[#5d6878] hover:bg-[#4e5866] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + Opzionale
              </button>
              <button
                onClick={() => handleAddItem('ms')}
                className="px-3 py-1.5 bg-[#1b212a] hover:bg-[#222a36] text-[#e8ecf2] border border-[#2a313c] text-xs font-bold rounded-xl cursor-pointer"
              >
                + Milestone
              </button>
              <button
                onClick={() => handleAddItem('gate')}
                className="px-3 py-1.5 bg-[#38c27a] hover:bg-[#2da968] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                + Gate Decisionale
              </button>
              <button
                onClick={() => handleAddItem('grp')}
                className="px-3 py-1.5 bg-[#2a313c] hover:bg-[#323b49] text-[#e8ecf2] border border-[#2a313c] text-xs font-bold rounded-xl cursor-pointer"
              >
                + Intestazione Gruppo
              </button>
            </div>

            {savingId && <span className="text-xs text-[#5b8be6] font-mono">Salvataggio automatico...</span>}
          </div>

          {items.length > 0 && (
            <div className="overflow-x-auto border border-[#2a313c] rounded-2xl bg-[#1b212a] shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#2a313c] text-[11px] text-[#9aa4b2] bg-[#15191f]">
                    <th className="p-3">Codice</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 min-w-[200px]">Nome Voce</th>
                    <th className="p-3 min-w-[240px]">Responsabile</th>
                    <th className="p-3">Inizio</th>
                    <th className="p-3">Fine</th>
                    <th className="p-3 text-center">Critico</th>
                    <th className="p-3 min-w-[160px]">Note Interne</th>
                    <th className="p-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const isGroup = item.type === 'grp';
                    const isPoint = item.type === 'ms' || item.type === 'gate';
                    const wbsCode = wbsMap[item.id || String(idx)] || '';

                    return (
                      <tr
                        key={item.id || idx}
                        className={`border-b border-[#2a313c]/60 ${
                          isGroup ? 'bg-[#15191f] font-semibold text-[#9aa4b2]' : 'hover:bg-[#15191f]/50 text-[#e8ecf2]'
                        }`}
                      >
                        <td className="p-2 font-mono font-bold text-[#5b8be6] whitespace-nowrap">{wbsCode}</td>

                        <td className="p-2">
                          <select
                            value={item.crit ? 'crit' : item.type}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'crit') {
                                handleUpdateItem(item.id, 'crit', true);
                              } else {
                                handleUpdateItem(item.id, 'crit', false);
                                handleUpdateItem(item.id, 'type', val);
                              }
                            }}
                            className="bg-[#15191f] border border-[#2a313c] px-2 py-1 rounded text-[#e8ecf2] cursor-pointer"
                          >
                            <option value="task">Attività</option>
                            <option value="crit">Percorso critico</option>
                            <option value="opt">Opzionale</option>
                            <option value="ms">Milestone</option>
                            <option value="gate">Gate Decisionale</option>
                            <option value="grp">Intestazione Gruppo</option>
                          </select>
                        </td>

                        <td className="p-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                            className="w-full bg-[#15191f] border border-[#2a313c] px-2.5 py-1 rounded text-[#e8ecf2]"
                          />
                        </td>

                        <td className="p-2">
                          {!isGroup && (
                            <div className="flex items-center gap-1.5 bg-[#15191f] border border-[#2a313c] px-3 py-1.5 rounded-xl">
                              <span className="truncate font-medium text-[#e8ecf2] flex-1" title={item.owner || 'Seleziona...'}>
                                {item.owner || 'Seleziona...'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingOwnerItem(item)}
                                className="px-2 py-0.5 bg-[#1e293b] hover:bg-[#25334a] text-[#5b8be6] border border-[#5b8be6]/40 rounded-lg text-[11px] font-bold cursor-pointer shrink-0"
                                title="Cambia responsabile"
                              >
                                Modifica
                              </button>
                            </div>
                          )}
                        </td>

                        <td className="p-2">
                          {!isGroup && (
                            <input
                              type="date"
                              value={item.start_date || ''}
                              onChange={(e) => handleUpdateItem(item.id, 'start_date', e.target.value)}
                              className="bg-[#15191f] border border-[#2a313c] px-2 py-1 rounded text-[#e8ecf2] font-mono [color-scheme:dark]"
                            />
                          )}
                        </td>

                        <td className="p-2">
                          {!isGroup && (
                            <input
                              type="date"
                              value={item.end_date || ''}
                              disabled={isPoint}
                              onChange={(e) => handleUpdateItem(item.id, 'end_date', e.target.value)}
                              className="bg-[#15191f] border border-[#2a313c] px-2 py-1 rounded text-[#e8ecf2] font-mono [color-scheme:dark] disabled:opacity-40"
                            />
                          )}
                        </td>

                        <td className="p-2 text-center">
                          {!isGroup && (
                            <input
                              type="checkbox"
                              checked={!!item.crit}
                              onChange={(e) => handleUpdateItem(item.id, 'crit', e.target.checked)}
                              className="w-4 h-4 accent-[#f07a50] cursor-pointer"
                            />
                          )}
                        </td>

                        <td className="p-2">
                          <input
                            type="text"
                            value={item.note || ''}
                            onChange={(e) => handleUpdateItem(item.id, 'note', e.target.value)}
                            placeholder={isGroup ? '' : 'Note interne...'}
                            className="w-full bg-[#15191f] border border-[#2a313c] px-2 py-1 rounded text-[#9aa4b2]"
                          />
                        </td>

                        <td className="p-2 text-right whitespace-nowrap space-x-1">
                          <button
                            onClick={() => handleMove(idx, -1)}
                            disabled={idx === 0}
                            className="px-2 py-1 bg-[#15191f] hover:bg-[#222a36] border border-[#2a313c] rounded text-[#9aa4b2] disabled:opacity-30 cursor-pointer"
                            title="Sposta su"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMove(idx, 1)}
                            disabled={idx === items.length - 1}
                            className="px-2 py-1 bg-[#15191f] hover:bg-[#222a36] border border-[#2a313c] rounded text-[#9aa4b2] disabled:opacity-30 cursor-pointer"
                            title="Sposta giù"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-2 py-1 bg-red-950/60 hover:bg-red-900 border border-red-900 rounded text-red-400 cursor-pointer"
                            title="Elimina riga"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
