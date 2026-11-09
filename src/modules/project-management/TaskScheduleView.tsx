'use client';

import React, { useState } from 'react';

export interface TaskItem {
  id: string;
  title: string;
  assignee: string;
  startDate: string;
  endDate: string;
  estimatedBudget: number;
  actualCost: number;
  priority: 'ALTA' | 'MEDIA' | 'BASSA';
  status: 'COMPLETATO' | 'IN_CORSO' | 'PIANIFICATO';
}

interface TaskScheduleProps {
  projectId: string;
}

export function TaskScheduleView({ projectId }: TaskScheduleProps) {
  const [currency, setCurrency] = useState<string>('EUR');
  const [currencySymbol, setCurrencySymbol] = useState<string>('€');

  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: '1',
      title: 'Analisi preliminare dei flussi finanziari',
      assignee: 'Team Advisor',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      estimatedBudget: 1500,
      actualCost: 1400,
      priority: 'ALTA',
      status: 'COMPLETATO'
    },
    {
      id: '2',
      title: 'Definizione struttura mutui pluriennali e piano debiti',
      assignee: 'Corrado Pinna',
      startDate: '2026-11-06',
      endDate: '2026-11-15',
      estimatedBudget: 2500,
      actualCost: 2300,
      priority: 'ALTA',
      status: 'IN_CORSO'
    },
    {
      id: '3',
      title: 'Riorganizzazione dipartimento marketing e vendite',
      assignee: 'Direzione Strategica',
      startDate: '2026-11-16',
      endDate: '2026-11-30',
      estimatedBudget: 4000,
      actualCost: 0,
      priority: 'MEDIA',
      status: 'PIANIFICATO'
    }
  ]);

  // Stato form per nuovo task
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newBudget, setNewBudget] = useState<number>(1000);
  const [newActual, setNewActual] = useState<number>(0);
  const [newPriority, setNewPriority] = useState<'ALTA' | 'MEDIA' | 'BASSA'>('MEDIA');

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

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: TaskItem = {
      id: Math.random().toString(36).substring(2, 9),
      title: newTitle,
      assignee: newAssignee || 'Team Advisor',
      startDate: newStartDate || new Date().toISOString().split('T')[0],
      endDate: newEndDate || new Date().toISOString().split('T')[0],
      estimatedBudget: Number(newBudget),
      actualCost: Number(newActual),
      priority: newPriority,
      status: 'PIANIFICATO'
    };

    setTasks([...tasks, newTask]);
    setNewTitle('');
    setNewAssignee('');
    setNewStartDate('');
    setNewEndDate('');
    setNewBudget(1000);
    setNewActual(0);
    setNewPriority('MEDIA');
    setIsAdding(false);
  };

  const updateTaskField = (id: string, field: keyof TaskItem, value: any) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // --- CALCOLI CRUSCOTTO DI RIEPILOGO ---
  const totalDays = tasks.reduce((acc, t) => acc + calculateDays(t.startDate, t.endDate), 0);
  const totalEstimatedBudget = tasks.reduce((acc, t) => acc + t.estimatedBudget, 0);
  const totalActualCost = tasks.reduce((acc, t) => acc + t.actualCost, 0);
  const budgetDifference = totalEstimatedBudget - totalActualCost;

  const completedCount = tasks.filter(t => t.status === 'COMPLETATO').length;
  const completionPercentage = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="space-y-8">
      
      {/* HEADER, SELETTORE VALUTA E PULSANTE NUOVO TASK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white">Cronoprogramma & Task Operativi</h3>
          <p className="text-xs text-gray-400">Pianificazione temporale, monitoraggio budget e avanzamento attività ({projectId}).</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selettore Valuta */}
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-gray-400 font-bold">Valuta:</span>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="EUR" className="bg-900">EUR (€)</option>
              <option value="USD" className="bg-900">USD ($)</option>
              <option value="GBP" className="bg-900">GBP (£)</option>
              <option value="CHF" className="bg-900">CHF</option>
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

      {/* CRUSCOTTO DI RIEPILOGO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-gray-950 border border-gray-800 p-5 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Durata Totale Task</span>
          <div className="text-2xl font-extrabold text-white font-mono">{totalDays} <span className="text-xs text-gray-400 font-normal">Giorni totali</span></div>
        </div>

        <div className="bg-gray-950 border border-gray-800 p-5 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Differenza Budget (Stimato - Reale)</span>
          <div className={`text-2xl font-extrabold font-mono ${budgetDifference >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {currencySymbol} {budgetDifference.toLocaleString()}
          </div>
          <p className="text-[10px] text-gray-400">Stimato: {currencySymbol} {totalEstimatedBudget.toLocaleString()} | Reale: {currencySymbol} {totalActualCost.toLocaleString()}</p>
        </div>

        <div className="bg-gray-950 border border-gray-800 p-5 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Percentuale di Completamento</span>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-extrabold text-cyan-400 font-mono">{completionPercentage}%</div>
            <div className="flex-1 bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800">
              <div className="bg-cyan-500 h-full transition-all duration-500" style={{ width: `${completionPercentage}%` }}></div>
            </div>
          </div>
          <p className="text-[10px] text-gray-400">{completedCount} di {tasks.length} task completati</p>
        </div>

      </div>

      {/* FORM AGGIUNTA NUOVO TASK */}
      {isAdding && (
        <form onSubmit={handleAddTask} className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-4">
          <h4 className="text-sm font-bold text-white border-b border-gray-900 pb-2">Inserisci Nuovo Task</h4>
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
              <label className="text-gray-400 block mb-1">Assegnato a</label>
              <input
                type="text"
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                placeholder="Es. Corrado Pinna"
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Data Inizio</label>
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-mono"
              />
            </div>
            <div>
              <label className="text-gray-400 block mb-1">Data Fine</label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-mono"
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
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
            >
              Salva Task nel Cronoprogramma
            </button>
          </div>
        </form>
      )}

      {/* ELENCO TASK DETTAGLIATO E MODIFICABILE */}
      <div className="space-y-4">
        {tasks.map((task) => {
          const daysCount = calculateDays(task.startDate, task.endDate);
          return (
            <div key={task.id} className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-4 relative">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-3">
                    {/* Tendina Priorità in linea */}
                    <select
                      value={task.priority}
                      onChange={(e) => updateTaskField(task.id, 'priority', e.target.value)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded uppercase cursor-pointer border ${
                        task.priority === 'ALTA' ? 'bg-red-950 text-red-400 border-red-900' :
                        task.priority === 'MEDIA' ? 'bg-amber-950 text-amber-400 border-amber-900' :
                        'bg-blue-950 text-blue-400 border-blue-900'
                      }`}
                    >
                      <option value="ALTA" className="bg-gray-900 text-red-400">Priorità Alta</option>
                      <option value="MEDIA" className="bg-gray-900 text-amber-400">Priorità Media</option>
                      <option value="BASSA" className="bg-gray-900 text-blue-400">Priorità Bassa</option>
                    </select>

                    <span className="text-xs text-gray-400">Durata stimata: <strong className="text-white font-mono">{daysCount} giorni</strong></span>
                  </div>

                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
                    className="w-full bg-transparent text-white font-bold text-base focus:outline-none focus:border-b border-cyan-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {/* Gestione Stato */}
                  <select
                    value={task.status}
                    onChange={(e) => updateTaskField(task.id, 'status', e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase cursor-pointer border ${
                      task.status === 'COMPLETATO' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                      task.status === 'IN_CORSO' ? 'bg-cyan-950 text-cyan-400 border-cyan-800' :
                      'bg-amber-950 text-amber-400 border-amber-800'
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

              {/* GRIGLIA DATI / DATE / BUDGET (Senza freccine numeriche) */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2 border-t border-gray-900 text-xs">
                <div>
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
                    className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-white font-mono"
                  />
                </div>

                <div>
                  <span className="text-gray-400 block mb-1">Data Fine</span>
                  <input
                    type="date"
                    value={task.endDate}
                    onChange={(e) => updateTaskField(task.id, 'endDate', e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-white font-mono"
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

            </div>
          );
        })}
      </div>

    </div>
  );
}
