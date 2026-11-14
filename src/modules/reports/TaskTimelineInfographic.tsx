// src/modules/report/TaskTimelineInfographic.tsx
'use client';

import React from 'react';
import { TaskItem } from '../project-management/TaskScheduleView';

interface TaskTimelineInfographicProps {
  tasks: TaskItem[];
  currencySymbol?: string;
}

export function TaskTimelineInfographic({ tasks, currencySymbol = '€' }: TaskTimelineInfographicProps) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl text-center text-xs text-gray-400 font-mono">
        Nessun task disponibile per generare la timeline grafica. Inserisci almeno un task nel cronoprogramma.
      </div>
    );
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.startDate) return 1;
    if (!b.startDate) return -1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  const getColoreNodo = (stato: TaskItem['status']) => {
    switch (stato) {
      case 'COMPLETATO':
        return "border-emerald-500 bg-emerald-950 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
      case 'IN_CORSO':
        return "border-cyan-500 bg-cyan-950 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]";
      case 'PIANIFICATO':
      default:
        return "border-amber-500 bg-amber-950 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]";
    }
  };

  const getTestoStato = (stato: TaskItem['status']) => {
    switch (stato) {
      case 'COMPLETATO': return { label: "Completato", style: "bg-emerald-950 text-emerald-400 border-emerald-900" };
      case 'IN_CORSO': return { label: "In corso", style: "bg-cyan-950 text-cyan-400 border-cyan-900" };
      case 'PIANIFICATO':
      default: return { label: "Pianificato", style: "bg-amber-950 text-amber-400 border-amber-900" };
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 md:p-10 rounded-2xl space-y-8 shadow-2xl">
      <div className="border-b border-gray-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">Roadmap Strategica Avanzata</span>
          <h3 className="text-base font-extrabold text-white uppercase tracking-tight">Timeline & Subtask Integrati</h3>
          <p className="text-xs text-gray-400">Visualizzazione a tappe sfalsate per la massima leggibilità di fase e dei task operativi.</p>
        </div>
        <div className="bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-xl text-xs font-mono text-cyan-300">
          Fasi Totali: {sortedTasks.length}
        </div>
      </div>

      {/* STRUTTURA A STEP VERTICALI / DIAGONALI RICCHE DI CONTENUTO */}
      <div className="relative pl-6 md:pl-10 space-y-8 before:absolute before:left-3 md:before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-cyan-500 before:via-indigo-600 before:to-gray-800">
        {sortedTasks.map((t, i) => {
          const statoInfo = getTestoStato(t.status);

          return (
            <div key={t.id} className="relative flex flex-col md:flex-row items-start md:items-center gap-6 group">
              
              {/* NODO NUMERATO LUNGO LA LINEA */}
              <div className={`absolute -left-6 md:-left-10 top-1 md:top-1/2 md:-translate-y-1/2 w-9 h-9 rounded-xl border-2 flex items-center justify-center font-mono font-extrabold text-xs z-10 transition-transform duration-300 group-hover:scale-110 ${getColoreNodo(t.status)}`}>
                0{i + 1}
              </div>

              {/* CARD PRINCIPALE DELLA TAPPA */}
              <div className="flex-1 w-full bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-4 shadow-xl hover:border-gray-700 transition-all">
                
                {/* Intestazione Tappa */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-900 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900/50">
                        📅 {t.startDate || 'N/D'} → {t.endDate || 'N/D'}
                      </span>
                      <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded border ${
                        t.priority === 'ALTA' ? 'bg-red-950 text-red-400 border-red-900' :
                        t.priority === 'MEDIA' ? 'bg-amber-950 text-amber-400 border-amber-900' :
                        'bg-blue-950 text-blue-400 border-blue-900'
                      }`}>
                        Priorità {t.priority}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-white tracking-tight pt-1">{t.title}</h4>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase border ${statoInfo.style}`}>
                      {statoInfo.label}
                    </span>
                  </div>
                </div>

                {t.description && (
                  <p className="text-xs text-gray-300 leading-relaxed">{t.description}</p>
                )}

                {/* Assegnatario e Budget della fase */}
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4 pt-2 text-xs font-mono bg-gray-900/40 p-3 rounded-xl border border-gray-900">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">Responsabile</span>
                    <span className="text-white font-semibold">👤 {t.assignee || 'Non assegnato'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase">Budget Stimato</span>
                    <span className="text-amber-400 font-bold">{currencySymbol} {t.estimatedBudget.toLocaleString('it-IT')}</span>
                  </div>
                </div>

                {/* --- SUBTASK INTEGRATI NELLA VISUALIZZAZIONE --- */}
                {t.subtasks && t.subtasks.length > 0 && (
                  <div className="space-y-2 pt-3 border-t border-gray-900">
                    <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <span>Subtask Operativi ({t.subtasks.length})</span>
                      <span className="text-emerald-400 font-mono">
                        {t.subtasks.filter(s => s.status === 'COMPLETATO').length} / {t.subtasks.length} completati
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                      {t.subtasks.map((sub) => {
                        const subStatoStyle = 
                          sub.status === 'COMPLETATO' ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300' :
                          sub.status === 'IN_CORSO' ? 'bg-cyan-950/40 border-cyan-900/60 text-cyan-300' :
                          'bg-gray-900/80 border-gray-800 text-gray-300';

                        return (
                          <div key={sub.id} className={`p-3 rounded-xl border flex flex-col justify-between gap-2 text-xs ${subStatoStyle}`}>
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-white">🔹 {sub.title}</span>
                              <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-gray-950 border border-gray-800 text-gray-400 shrink-0">
                                {sub.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 pt-1 border-t border-gray-800/60">
                              <span>👤 {sub.assignee || 'N/D'}</span>
                              <span>📅 {sub.startDate || 'N/D'} → {sub.endDate || 'N/D'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
