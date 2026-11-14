'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export interface SubTaskItem {
  id: string;
  title: string;
  assignee: string;
  startDate: string;
  endDate: string;
  status: 'COMPLETATO' | 'IN_CORSO' | 'PIANIFICATO';
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  assignee: string;
  startDate: string;
  endDate: string;
  estimatedBudget: number;
  actualCost: number;
  priority: 'ALTA' | 'MEDIA' | 'BASSA';
  status: 'COMPLETATO' | 'IN_CORSO' | 'PIANIFICATO';
  subtasks: SubTaskItem[];
}

interface TaskScheduleProps {
  projectId: string;
}

// Conversione stati/priorità tra UI e DB Supabase
const mapDbStatusToUi = (stato?: string): 'COMPLETATO' | 'IN_CORSO' | 'PIANIFICATO' => {
  if (stato === 'completato') return 'COMPLETATO';
  if (stato === 'in_corso') return 'IN_CORSO';
  return 'PIANIFICATO';
};

const mapUiStatusToDb = (status: 'COMPLETATO' | 'IN_CORSO' | 'PIANIFICATO'): string => {
  if (status === 'COMPLETATO') return 'completato';
  if (status === 'IN_CORSO') return 'in_corso';
  return 'da_fare';
};

const mapDbPriorityToUi = (priorita?: string): 'ALTA' | 'MEDIA' | 'BASSA' => {
  if (priorita === 'alta') return 'ALTA';
  if (priorita === 'bassa') return 'BASSA';
  return 'MEDIA';
};

const mapUiPriorityToDb = (priority: 'ALTA' | 'MEDIA' | 'BASSA'): string => {
  if (priority === 'ALTA') return 'alta';
  if (priority === 'BASSA') return 'bassa';
  return 'media';
};

export function TaskScheduleView({ projectId }: TaskScheduleProps) {
  const [currency, setCurrency] = useState<string>('EUR');
  const [currencySymbol, setCurrencySymbol] = useState<string>('€');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [savingTask, setSavingTask] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Form nuovo task principale
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newBudget, setNewBudget] = useState<number>(1000);
  const [newActual, setNewActual] = useState<number>(0);
  const [newPriority, setNewPriority] = useState<'ALTA' | 'MEDIA' | 'BASSA'>('MEDIA');

  // Form inserimento subtask
  const [activeSubtaskInput, setActiveSubtaskInput] = useState<string | null>(null);
  const [subTitle, setSubTitle] = useState('');
  const [subAssignee, setSubAssignee] = useState('');
  const [subStart, setSubStart] = useState('');
  const [subEnd, setSubEnd] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Caricamento reale dei task e subtask da Supabase
  const fetchTasks = useCallback(async () => {
    if (!projectId) return;
    setLoadingTasks(true);
    setErrorBanner(null);

    try {
      const { data, error } = await supabase
        .from('gos_tasks')
        .select('*')
        .eq('progetto_id', projectId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const rows = data || [];
      const parentRows = rows.filter((r: any) => !r.parent_task_id);
      const childRows = rows.filter((r: any) => r.parent_task_id);

      const structuredTasks: TaskItem[] = parentRows.map((p: any) => ({
        id: p.id,
        title: p.titolo || '',
        description: p.descrizione || '',
        assignee: p.assegnato_a || '',
        startDate: p.data_inizio || '',
        endDate: p.data_fine || '',
        estimatedBudget: Number(p.costo_budget || 0),
        actualCost: Number(p.costo_reale || 0),
        priority: mapDbPriorityToUi(p.priorita),
        status: mapDbStatusToUi(p.stato),
        subtasks: childRows
          .filter((c: any) => c.parent_task_id === p.id)
          .map((c: any) => ({
            id: c.id,
            title: c.titolo || '',
            assignee: c.assegnato_a || '',
            startDate: c.data_inizio || '',
            endDate: c.data_fine || '',
            status: mapDbStatusToUi(c.stato),
          })),
      }));

      setTasks(structuredTasks);
    } catch (err: any) {
      console.error('Errore caricamento task da Supabase:', err);
      setErrorBanner(`Errore caricamento task: ${err.message || 'Verifica connessione o permessi RLS.'}`);
    } finally {
      setLoadingTasks(false);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCurrencyChange = (val: string) => {
    setCurrency(val);
    if (val === 'EUR') setCurrencySymbol('€');
    else if (val === 'USD') setCurrencySymbol('$');
    else if (val === 'GBP') setCurrencySymbol('£');
    else if (val === 'CHF') setCurrencySymbol('CHF');
    else setCurrencySymbol('€');
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const diffTime = new Date(end).getTime() - new Date(start).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  // --- CALCOLO GIORNI TOTALI NETTI (MERGE INTERVALS SENZA SOVRAPPOSIZIONI) ---
  const calculateTotalNetDays = () => {
    const allIntervals: { start: number; end: number }[] = [];

    tasks.forEach((t) => {
      if (t.startDate && t.endDate) {
        allIntervals.push({ start: new Date(t.startDate).getTime(), end: new Date(t.endDate).getTime() });
      }
      t.subtasks.forEach((s) => {
        if (s.startDate && s.endDate) {
          allIntervals.push({ start: new Date(s.startDate).getTime(), end: new Date(s.endDate).getTime() });
        }
      });
    });

    if (allIntervals.length === 0) return 0;

    allIntervals.sort((a, b) => a.start - b.start);

    const merged: { start: number; end: number }[] = [];
    let current = { ...allIntervals[0] };

    for (let i = 1; i < allIntervals.length; i++) {
      const next = allIntervals[i];
      if (next.start <= current.end) {
        current.end = Math.max(current.end, next.end);
      } else {
        merged.push(current);
        current = { ...next };
      }
    }
    merged.push(current);

    let totalNetDays = 0;
    merged.forEach((interval) => {
      const diffTime = interval.end - interval.start;
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      totalNetDays += days > 0 ? days : 1;
    });

    return totalNetDays;
  };

  // --- SALVATAGGIO NUOVO TASK PRINCIPALE SU SUPABASE ---
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSavingTask(true);
    setErrorBanner(null);

    try {
      const payload = {
        progetto_id: projectId,
        parent_task_id: null,
        titolo: newTitle.trim(),
        descrizione: newDescription.trim() || null,
        assegnato_a: newAssignee.trim() || null,
        data_inizio: newStartDate || null,
        data_fine: newEndDate || null,
        costo_budget: Number(newBudget) || 0,
        costo_reale: Number(newActual) || 0,
        priorita: mapUiPriorityToDb(newPriority),
        stato: 'da_fare',
      };

      const { data, error } = await supabase
        .from('gos_tasks')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const createdTask: TaskItem = {
        id: data.id,
        title: data.titolo,
        description: data.descrizione || '',
        assignee: data.assegnato_a || '',
        startDate: data.data_inizio || '',
        endDate: data.data_fine || '',
        estimatedBudget: Number(data.costo_budget || 0),
        actualCost: Number(data.costo_reale || 0),
        priority: mapDbPriorityToUi(data.priorita),
        status: mapDbStatusToUi(data.stato),
        subtasks: [],
      };

      setTasks((prev) => [...prev, createdTask]);
      setNewTitle('');
      setNewDescription('');
      setNewAssignee('');
      setNewStartDate('');
      setNewEndDate('');
      setNewBudget(1000);
      setNewActual(0);
      setNewPriority('MEDIA');
      setIsAdding(false);
    } catch (err: any) {
      console.error('Errore salvataggio task:', err);
      setErrorBanner(`Impossibile salvare il task: ${err.message}`);
    } finally {
      setSavingTask(false);
    }
  };

  // --- AGGIORNAMENTO CAMPO TASK PRINCIPALE SU SUPABASE ---
  const updateTaskField = async (id: string, field: keyof TaskItem, value: any) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

    const dbUpdate: Record<string, any> = {};
    if (field === 'title') dbUpdate.titolo = value;
    else if (field === 'description') dbUpdate.descrizione = value || null;
    else if (field === 'assignee') dbUpdate.assegnato_a = value || null;
    else if (field === 'startDate') dbUpdate.data_inizio = value || null;
    else if (field === 'endDate') dbUpdate.data_fine = value || null;
    else if (field === 'estimatedBudget') dbUpdate.costo_budget = Number(value) || 0;
    else if (field === 'actualCost') dbUpdate.costo_reale = Number(value) || 0;
    else if (field === 'priority') dbUpdate.priorita = mapUiPriorityToDb(value);
    else if (field === 'status') dbUpdate.stato = mapUiStatusToDb(value);

    try {
      const { error } = await supabase.from('gos_tasks').update(dbUpdate).eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error('Errore aggiornamento task:', err);
      setErrorBanner(`Errore aggiornamento task: ${err.message}`);
    }
  };

  // --- ELIMINAZIONE TASK PRINCIPALE SU SUPABASE ---
  const deleteTask = async (id: string) => {
    const previous = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      const { error } = await supabase.from('gos_tasks').delete().eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      console.error('Errore eliminazione task:', err);
      setTasks(previous);
      setErrorBanner(`Errore eliminazione task: ${err.message}`);
    }
  };

  // --- SALVATAGGIO NUOVO SUBTASK SU SUPABASE ---
  const handleAddSubtask = async (taskId: string) => {
    if (!subTitle.trim()) return;
    setSavingTask(true);
    setErrorBanner(null);

    try {
      const payload = {
        progetto_id: projectId,
        parent_task_id: taskId,
        titolo: subTitle.trim(),
        assegnato_a: subAssignee.trim() || null,
        data_inizio: subStart || null,
        data_fine: subEnd || null,
        stato: 'da_fare',
        priorita: 'media',
        costo_budget: 0,
        costo_reale: 0,
      };

      const { data, error } = await supabase
        .from('gos_tasks')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const createdSub: SubTaskItem = {
        id: data.id,
        title: data.titolo,
        assignee: data.assegnato_a || '',
        startDate: data.data_inizio || '',
        endDate: data.data_fine || '',
        status: mapDbStatusToUi(data.stato),
      };

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, createdSub] } : t))
      );

      setSubTitle('');
      setSubAssignee('');
      setSubStart('');
      setSubEnd('');
      setActiveSubtaskInput(null);
    } catch (err: any) {
      console.error('Errore salvataggio subtask:', err);
      setErrorBanner(`Impossibile salvare il subtask: ${err.message}`);
    } finally {
      setSavingTask(false);
    }
  };

  // --- AGGIORNAMENTO CAMPO SUBTASK SU SUPABASE ---
  const updateSubtaskField = async (taskId: string, subId: string, field: keyof SubTaskItem, value: any) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubs = t.subtasks.map((s) => (s.id === subId ? { ...s, [field]: value } : s));
          return { ...t, subtasks: updatedSubs };
        }
        return t;
      })
    );

    const dbUpdate: Record<string, any> = {};
    if (field === 'title') dbUpdate.titolo = value;
    else if (field === 'assignee') dbUpdate.assegnato_a = value || null;
    else if (field === 'startDate') dbUpdate.data_inizio = value || null;
    else if (field === 'endDate') dbUpdate.data_fine = value || null;
    else if (field === 'status') dbUpdate.stato = mapUiStatusToDb(value);

    try {
      const { error } = await supabase.from('gos_tasks').update(dbUpdate).eq('id', subId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Errore aggiornamento subtask:', err);
      setErrorBanner(`Errore aggiornamento subtask: ${err.message}`);
    }
  };

  // --- ELIMINAZIONE SUBTASK SU SUPABASE ---
  const deleteSubtask = async (taskId: string, subId: string) => {
    const previous = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, subtasks: t.subtasks.filter((s) => s.id !== subId) } : t))
    );

    try {
      const { error } = await supabase.from('gos_tasks').delete().eq('id', subId);
      if (error) throw error;
    } catch (err: any) {
      console.error('Errore eliminazione subtask:', err);
      setTasks(previous);
      setErrorBanner(`Errore eliminazione subtask: ${err.message}`);
    }
  };

  // --- CALCOLI CRUSCOTTO KPI ---
  const totalNetDays = calculateTotalNetDays();
  const totalEstimatedBudget = tasks.reduce((acc, t) => acc + t.estimatedBudget, 0);
  const totalActualCost = tasks.reduce((acc, t) => acc + t.actualCost, 0);
  const budgetDifference = totalEstimatedBudget - totalActualCost;

  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETATO').length;
  const activeTasksCount = tasks.filter((t) => t.status === 'IN_CORSO' || t.status === 'PIANIFICATO').length;

  let totalSubtasksCount = 0;
  let completedSubtasksCount = 0;
  let activeSubtasksCount = 0;

  tasks.forEach((t) => {
    totalSubtasksCount += t.subtasks.length;
    completedSubtasksCount += t.subtasks.filter((s) => s.status === 'COMPLETATO').length;
    activeSubtasksCount += t.subtasks.filter((s) => s.status === 'IN_CORSO' || s.status === 'PIANIFICATO').length;
  });

  const totalItems = totalTasksCount + totalSubtasksCount;
  const completedItems = completedTasksCount + completedSubtasksCount;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* HEADER, SELETTORE VALUTA E PULSANTE NUOVO TASK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Cronoprogramma & Task Operativi</h3>
          <p className="text-xs text-gray-400">Pianificazione temporale, monitoraggio budget e subtask ({projectId}).</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-gray-400 font-bold">Valuta:</span>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="EUR" className="bg-gray-900">EUR (€)</option>
              <option value="USD" className="bg-gray-900">USD ($)</option>
              <option value="GBP" className="bg-gray-900">GBP (£)</option>
              <option value="CHF" className="bg-gray-900">CHF</option>
            </select>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
          >
            {isAdding ? 'Annulla' : '+ Nuovo Task'}
          </button>
        </div>
      </div>

      {errorBanner && (
        <div className="p-4 bg-red-950/70 border border-red-800 rounded-xl text-xs text-red-300 flex items-center justify-between">
          <span>⚠️ {errorBanner}</span>
          <button onClick={() => setErrorBanner(null)} className="text-red-400 hover:text-white font-bold ml-4 cursor-pointer">✕</button>
        </div>
      )}

      {/* CRUSCOTTO DI RIEPILOGO KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-950 border border-gray-800 p-5 rounded-2xl space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Giorni Totali Programma</span>
          <div className="text-2xl font-extrabold text-white font-mono">
            {totalNetDays} <span className="text-xs text-gray-400 font-normal">Giorni netti</span>
          </div>
          <div className="text-[10px] text-gray-500">Durata unificata (date sovrapposte escluse)</div>
        </div>

        <div className="bg-gray-950 border border-gray-800 p-5 rounded-2xl space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Situazione Task & Subtask</span>
          <div className="flex gap-4 text-xs font-mono pt-1">
            <div>
              <span className="text-cyan-400 font-bold block text-sm">{activeTasksCount} / {activeSubtasksCount}</span>
              <span className="text-[10px] text-gray-400">Attivi (Task/Sub)</span>
            </div>
            <div className="border-l border-gray-800 pl-4">
              <span className="text-emerald-400 font-bold block text-sm">{completedTasksCount} / {completedSubtasksCount}</span>
              <span className="text-[10px] text-gray-400">Chiusi (Task/Sub)</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-950 border border-gray-800 p-5 rounded-2xl space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Budget Stimato vs Spesa Reale</span>
          <div className={`text-2xl font-extrabold font-mono ${budgetDifference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {currencySymbol} {budgetDifference.toLocaleString('it-IT')}
          </div>
          <p className="text-[10px] text-gray-400">
            Stimato: <strong className="text-amber-400">{currencySymbol} {totalEstimatedBudget.toLocaleString('it-IT')}</strong> | Reale: <strong className="text-cyan-400">{currencySymbol} {totalActualCost.toLocaleString('it-IT')}</strong>
          </p>
        </div>

        <div className="bg-gray-950 border border-gray-800 p-5 rounded-2xl space-y-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avanzamento Globale</span>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">{completionPercentage}%</div>
            <div className="flex-1 bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800">
              <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400">{completedItems} di {totalItems} elementi chiusi</p>
        </div>
      </div>

      {/* FORM AGGIUNTA NUOVO TASK */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-white border-b border-gray-900 pb-2">Inserisci Nuovo Task Principale</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="text-gray-400 block mb-1">Titolo Task</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Es. Setup strutturale commerciale"
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
                required
              />
            </div>
            <div>
              <span className="text-[10px] text-amber-400 block mb-1 font-semibold">
                ⚠️ Assegnare prima il ruolo ai partecipanti del progetto
              </span>
              <label className="text-gray-400 block mb-1">Assegnato a</label>
              <input
                type="text"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                placeholder="Es. Corrado Pinna"
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-gray-400 block mb-1">Descrizione Task Principale</label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Inserisci i dettagli operativi del task..."
                rows={2}
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white resize-none"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Data Inizio</label>
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-mono [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Data Fine</label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-mono [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Priorità</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-semibold cursor-pointer"
              >
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BASSA">Bassa</option>
              </select>
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Budget Stimato ({currencySymbol})</label>
              <input
                type="number"
                value={newBudget}
                onChange={(e) => setNewBudget(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Spesa Reale ({currencySymbol})</label>
              <input
                type="number"
                value={newActual}
                onChange={(e) => setNewActual(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingTask}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md disabled:opacity-50"
            >
              {savingTask ? 'Salvataggio su Supabase...' : 'Salva Task nel Cronoprogramma'}
            </button>
          </div>
        </form>
      )}

      {/* ELENCO TASK PRINCIPALI E SUBTASK */}
      {loadingTasks ? (
        <div className="text-xs text-gray-400 font-mono py-8 text-center">Caricamento cronoprogramma da Supabase...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-gray-950/60 border border-dashed border-gray-800 p-8 rounded-2xl text-center text-xs text-gray-400">
          Nessun task presente per questo progetto. Clicca su <strong>+ Nuovo Task</strong> per iniziare.
        </div>
      ) : (
        <div className="space-y-6">
          {tasks.map((task) => {
            const daysCount = calculateDays(task.startDate, task.endDate);
            return (
              <div key={task.id} className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-5 relative">
                {/* INTESTAZIONE TASK PRINCIPALE */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <select
                        value={task.priority}
                        onChange={(e) => updateTaskField(task.id, 'priority', e.target.value)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase cursor-pointer border ${
                          task.priority === 'ALTA'
                            ? 'bg-red-950 text-red-400 border-red-900'
                            : task.priority === 'MEDIA'
                            ? 'bg-amber-950 text-amber-400 border-amber-900'
                            : 'bg-blue-950 text-blue-400 border-blue-900'
                        }`}
                      >
                        <option value="ALTA" className="bg-gray-900 text-red-400">Priorità Alta</option>
                        <option value="MEDIA" className="bg-gray-900 text-amber-400">Priorità Media</option>
                        <option value="BASSA" className="bg-gray-900 text-blue-400">Priorità Bassa</option>
                      </select>

                      <span className="text-xs text-gray-400">
                        Durata stimata: <strong className="text-white font-mono">{daysCount} giorni</strong>
                      </span>
                    </div>

                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
                      className="w-full bg-transparent text-white font-bold text-base focus:outline-none focus:border-b border-cyan-500 pt-1"
                    />

                    <input
                      type="text"
                      value={task.description}
                      onChange={(e) => updateTaskField(task.id, 'description', e.target.value)}
                      placeholder="Aggiungi una descrizione per questo task principale..."
                      className="w-full bg-transparent text-xs text-gray-400 focus:outline-none focus:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={task.status}
                      onChange={(e) => updateTaskField(task.id, 'status', e.target.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase cursor-pointer border ${
                        task.status === 'COMPLETATO'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : task.status === 'IN_CORSO'
                          ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                          : 'bg-amber-950 text-amber-400 border-amber-800'
                      }`}
                    >
                      <option value="PIANIFICATO" className="bg-gray-900 text-amber-400">Pianificato</option>
                      <option value="IN_CORSO" className="bg-gray-900 text-cyan-400">In Corso</option>
                      <option value="COMPLETATO" className="bg-gray-900 text-emerald-400">Completato</option>
                    </select>

                    <button
                      onClick={() => deleteTask(task.id)}
                      className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-900 text-red-400 text-xs rounded-xl transition-all cursor-pointer"
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>

                {/* GRIGLIA DATI TASK PRINCIPALE */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2 border-t border-gray-900 text-xs">
                  <div>
                    <span className="text-[10px] text-amber-400 block mb-0.5 font-semibold">⚠️ Assegnare prima il ruolo</span>
                    <span className="text-gray-400 block mb-1">Assegnato a</span>
                    <input
                      type="text"
                      value={task.assignee}
                      onChange={(e) => updateTaskField(task.id, 'assignee', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-white"
                    />
                  </div>

                  <div>
                    <span className="text-gray-400 block mb-1">Data Inizio</span>
                    <input
                      type="date"
                      value={task.startDate}
                      onChange={(e) => updateTaskField(task.id, 'startDate', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-white font-mono [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <span className="text-gray-400 block mb-1">Data Fine</span>
                    <input
                      type="date"
                      value={task.endDate}
                      onChange={(e) => updateTaskField(task.id, 'endDate', e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-white font-mono [color-scheme:dark]"
                    />
                  </div>

                  <div>
                    <span className="text-gray-400 block mb-1">Budget Stimato ({currencySymbol})</span>
                    <input
                      type="number"
                      value={task.estimatedBudget}
                      onChange={(e) => updateTaskField(task.id, 'estimatedBudget', Number(e.target.value))}
                      className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-amber-400 font-mono font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div>
                    <span className="text-gray-400 block mb-1">Spesa Reale ({currencySymbol})</span>
                    <input
                      type="number"
                      value={task.actualCost}
                      onChange={(e) => updateTaskField(task.id, 'actualCost', Number(e.target.value))}
                      className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-cyan-400 font-mono font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {/* SEZIONE SUBTASK */}
                <div className="pt-4 border-t border-gray-900/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                      Subtask Collegati ({task.subtasks.length})
                    </h5>
                    <button
                      onClick={() => setActiveSubtaskInput(activeSubtaskInput === task.id ? null : task.id)}
                      className="px-3 py-1 bg-gray-900 hover:bg-gray-800 text-cyan-400 border border-gray-800 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                    >
                      {activeSubtaskInput === task.id ? 'Chiudi' : '+ Aggiungi Subtask'}
                    </button>
                  </div>

                  {activeSubtaskInput === task.id && (
                    <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-3 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="text-gray-400 block mb-1">Titolo Subtask</label>
                          <input
                            type="text"
                            value={subTitle}
                            onChange={(e) => setSubTitle(e.target.value)}
                            placeholder="Es. Verifica conformità documentale"
                            className="w-full bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 block mb-1">Assegnato a</label>
                          <input
                            type="text"
                            value={subAssignee}
                            onChange={(e) => setSubAssignee(e.target.value)}
                            placeholder="Assegnatario"
                            className="w-full bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg text-white"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 block mb-1">Data Inizio</label>
                          <input
                            type="date"
                            value={subStart}
                            onChange={(e) => setSubStart(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg text-white font-mono [color-scheme:dark]"
                          />
                        </div>
                        <div>
                          <label className="text-gray-400 block mb-1">Data Fine</label>
                          <input
                            type="date"
                            value={subEnd}
                            onChange={(e) => setSubEnd(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg text-white font-mono [color-scheme:dark]"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => handleAddSubtask(task.id)}
                          disabled={savingTask}
                          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg cursor-pointer text-xs disabled:opacity-50"
                        >
                          {savingTask ? 'Salvataggio...' : 'Salva Subtask'}
                        </button>
                      </div>
                    </div>
                  )}

                  {task.subtasks.length > 0 && (
                    <div className="space-y-2 pl-4 border-l-2 border-gray-800">
                      {task.subtasks.map((sub) => (
                        <div
                          key={sub.id}
                          className="bg-gray-900/60 border border-gray-800/80 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                        >
                          <div className="flex-1 space-y-1">
                            <input
                              type="text"
                              value={sub.title}
                              onChange={(e) => updateSubtaskField(task.id, sub.id, 'title', e.target.value)}
                              className="w-full bg-transparent text-white font-semibold focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={sub.assignee}
                              onChange={(e) => updateSubtaskField(task.id, sub.id, 'assignee', e.target.value)}
                              className="w-28 bg-gray-950 border border-gray-800 px-2 py-1 rounded text-gray-300"
                              placeholder="Assegnatario"
                            />
                            <input
                              type="date"
                              value={sub.startDate}
                              onChange={(e) => updateSubtaskField(task.id, sub.id, 'startDate', e.target.value)}
                              className="w-32 bg-gray-950 border border-gray-800 px-2 py-1 rounded text-gray-300 font-mono [color-scheme:dark]"
                            />
                            <input
                              type="date"
                              value={sub.endDate}
                              onChange={(e) => updateSubtaskField(task.id, sub.id, 'endDate', e.target.value)}
                              className="w-32 bg-gray-950 border border-gray-800 px-2 py-1 rounded text-gray-300 font-mono [color-scheme:dark]"
                            />

                            <select
                              value={sub.status}
                              onChange={(e) => updateSubtaskField(task.id, sub.id, 'status', e.target.value)}
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase cursor-pointer border ${
                                sub.status === 'COMPLETATO'
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                                  : sub.status === 'IN_CORSO'
                                  ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                                  : 'bg-amber-950 text-amber-400 border-amber-800'
                              }`}
                            >
                              <option value="PIANIFICATO" className="bg-gray-900 text-amber-400">Pianificato</option>
                              <option value="IN_CORSO" className="bg-gray-900 text-cyan-400">In Corso</option>
                              <option value="COMPLETATO" className="bg-gray-900 text-emerald-400">Completato</option>
                            </select>

                            <button
                              onClick={() => deleteSubtask(task.id, sub.id)}
                              className="px-2 py-1 bg-red-950/40 hover:bg-red-900 border border-red-900 text-red-400 rounded transition-all cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
