'use client';

import { useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';

export interface QuestionarioModuleItem {
  id: string;
  category: string;
  code: string; // Es. MOD-Q01
  title: string;
  description: string;
  estimatedMinutes: number;
  questionsCount: number;
}

function QuestionariCategoryContent() {
  const router = useRouter();
  const params = useParams();
  const rawCategory = params?.category;
  const categoryName = rawCategory 
    ? (typeof rawCategory === 'string' ? decodeURIComponent(rawCategory) : decodeURIComponent(rawCategory[0])) 
    : '';

  const [modules, setModules] = useState<QuestionarioModuleItem[]>([
    { id: 'q1', category: 'strategia', code: 'MOD-Q01', title: 'Assessment Organizzativo & Governance', description: 'Analisi preliminare dellassetto di governance e dei processi decisionali.', estimatedMinutes: 25, questionsCount: 15 },
    { id: 'q2', category: 'diagnostica', code: 'MOD-Q02', title: 'Check-up Finanziario & P&L', description: 'Valutazione della struttura dei costi e flussi di cassa storici.', estimatedMinutes: 30, questionsCount: 20 }
  ]);

  const categoryModules = modules.filter(m => m.category.toLowerCase() === categoryName.toLowerCase());

  // Stati form
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newMinutes, setNewMinutes] = useState('20');
  const [newQuestionsCount, setNewQuestionsCount] = useState('10');

  const handleOpenCreateForm = () => {
    setEditingId(null);
    setNewCode(`MOD-Q0${modules.length + 1}`);
    setNewTitle('');
    setNewDescription('');
    setNewMinutes('20');
    setNewQuestionsCount('10');
    setShowAddForm(true);
  };

  const handleOpenEditForm = (mod: QuestionarioModuleItem) => {
    setEditingId(mod.id);
    setNewCode(mod.code);
    setNewTitle(mod.title);
    setNewDescription(mod.description);
    setNewMinutes(String(mod.estimatedMinutes));
    setNewQuestionsCount(String(mod.questionsCount));
    setShowAddForm(true);
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingId) {
      setModules(modules.map(m => m.id === editingId ? {
        ...m,
        code: newCode || 'MOD-Q',
        title: newTitle,
        description: newDescription,
        estimatedMinutes: Number(newMinutes) || 10,
        questionsCount: Number(newQuestionsCount) || 5
      } : m));
    } else {
      const newMod: QuestionarioModuleItem = {
        id: `q-${Date.now()}`,
        category: categoryName,
        code: newCode || 'MOD-Q99',
        title: newTitle,
        description: newDescription,
        estimatedMinutes: Number(newMinutes) || 10,
        questionsCount: Number(newQuestionsCount) || 5
      };
      setModules([...modules, newMod]);
    }

    setShowAddForm(false);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Vuoi rimuovere questo questionario master?')) {
      setModules(modules.filter(m => m.id !== id));
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase block">
              LIBRERIA MASTER QUESTIONARI — CATEGORIA
            </span>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-wider">{categoryName}</h1>
          </div>
          
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
          >
            ← Torna al Control Center
          </button>
        </div>

        {/* Gestione Questionari della Categoria */}
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-5">
            <div>
              <h2 className="text-base font-black text-white uppercase">Questionari Standard in [{categoryName}]</h2>
              <p className="text-xs text-gray-400 mt-1">Moduli di assessment utilizzati nei progetti per la raccolta dati aziendale.</p>
            </div>
            <button
              onClick={() => showAddForm ? setShowAddForm(false) : handleOpenCreateForm()}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
            >
              {showAddForm ? '✕ Chiudi' : `+ Aggiungi Questionario Master`}
            </button>
          </div>

          {/* Form Inserimento / Modifica */}
          {showAddForm && (
            <form onSubmit={handleSaveModule} className="bg-gray-950 border border-amber-500/40 p-6 rounded-2xl space-y-5 shadow-xl">
              <h3 className="text-sm font-bold text-amber-400 uppercase">
                {editingId ? 'Modifica Questionario Master' : `Nuovo Questionario per [${categoryName}]`}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Codice Modulo</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Titolo del Questionario</label>
                  <input
                    type="text"
                    placeholder="Es. Assessment Processi Operativi"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Descrizione</label>
                  <textarea
                    rows={2}
                    placeholder="Sintesi degli obiettivi del questionario..."
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Input numerici senza freccine */}
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Tempo Stimato (Minuti)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newMinutes}
                    onChange={e => setNewMinutes(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Numero di Domande</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newQuestionsCount}
                    onChange={e => setNewQuestionsCount(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer">
                  Annulla
                </button>
                <button type="submit" className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer">
                  {editingId ? 'Aggiorna Questionario' : 'Salva Questionario Master'}
                </button>
              </div>
            </form>
          )}

          {/* Lista Questionari della Categoria */}
          {categoryModules.length === 0 ? (
            <div className="p-12 text-center border border-gray-800 bg-gray-950 rounded-xl">
              <p className="text-sm text-gray-400">Nessun questionario master presente in questa categoria.</p>
              <p className="text-xs text-gray-500 mt-1">Clicca su &quot;+ Aggiungi Questionario Master&quot; per crearne uno.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryModules.map(mod => (
                <div key={mod.id} className="bg-gray-950 border border-gray-800 p-5 rounded-xl flex flex-col justify-between space-y-4 hover:border-amber-500/50 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-mono uppercase bg-amber-950/60 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded font-bold tracking-wider">
                        {mod.code}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleOpenEditForm(mod)}
                          className="text-gray-400 hover:text-amber-400 text-xs font-bold cursor-pointer transition-colors"
                        >
                          ✏️ Modifica
                        </button>
                        <button
                          onClick={() => handleDelete(mod.id)}
                          className="text-gray-500 hover:text-red-400 text-xs font-bold cursor-pointer transition-colors"
                        >
                          ✕ Rimuovi
                        </button>
                      </div>
                    </div>
                    <h3 className="text-sm font-extrabold text-white mt-1">{mod.title}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">{mod.description}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-800/80 flex justify-between items-center font-mono text-xs text-gray-400">
                    <span>⏱️ {mod.estimatedMinutes} minuti</span>
                    <span>📝 {mod.questionsCount} domande</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </main>
  );
}

export default function QuestionariCategoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-mono text-xs">Caricamento categoria questionari...</div>}>
      <QuestionariCategoryContent />
    </Suspense>
  );
}
