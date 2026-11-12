'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface QuestionnaireBuilderViewProps {
  companyCode: string;
  companyName: string;
  onOpenComposer: (questionario: any) => void;
  onOpenPreview: (questionario: any) => void;
}

export function QuestionnaireBuilderView({
  companyCode,
  companyName,
  onOpenComposer,
  onOpenPreview
}: QuestionnaireBuilderViewProps) {
  const [questionari, setQuestionari] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [questTitle, setQuestTitle] = useState('');
  const [questDescription, setQuestDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Caricamento dei questionari creati per questa azienda
  const loadQuestionari = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gos_moduli')
        .select('*')
        .eq('company_code', companyCode)
        .is('parent_questionario_id', null); // I contenitori principali

      if (error) throw error;
      setQuestionari(data || []);
    } catch (err) {
      console.error('Errore caricamento questionari:', err);
      setQuestionari([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyCode) {
      loadQuestionari();
    }
  }, [companyCode, supabase]);

  // Creazione di un nuovo questionario per l'azienda
  const handleCreateQuestionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        company_code: companyCode,
        codice_modulo: `${companyCode}/QUEST-${Date.now().toString().slice(-4)}`,
        titolo: questTitle,
        descrizione: questDescription,
        versione: '1.0',
        stato: 'Bozza',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('gos_moduli')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setQuestionari(prev => [...prev, data]);
        onOpenComposer(data); // Entra subito nel composer per aggiungere i moduli
      }

      setQuestTitle('');
      setQuestDescription('');
      setShowCreateModal(false);
    } catch (err: any) {
      alert('Errore durante la creazione: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminazione questionario
  const handleDelete = async (id: string, titolo: string) => {
    if (!confirm(`Vuoi eliminare il questionario "${titolo}"?`)) return;

    try {
      const { error } = await supabase
        .from('gos_moduli')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setQuestionari(prev => prev.filter(q => q.id !== id));
    } catch (err: any) {
      alert('Errore durante l\'eliminazione: ' + (err.message || err));
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Questionari &amp; Assessment — <span className="text-[#FF5500]">{companyName}</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Gestisci i questionari operativi assegnati all&apos;azienda (<span className="font-mono text-[#FF5500]">{companyCode}</span>).
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider inline-flex items-center gap-2"
        >
          + Nuovo Questionario
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-gray-400">Caricamento questionari...</div>
      ) : questionari.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-3">
          <p className="text-sm text-gray-400">Nessun questionario registrato per questa azienda.</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider"
          >
            Crea il primo Questionario
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {questionari.map((q) => (
            <div key={q.id} className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-mono text-[#FF5500] font-bold block">{q.codice_modulo}</span>
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-mono text-[10px] font-bold uppercase">
                    {q.stato || 'Bozza'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white">{q.titolo}</h4>
                <p className="text-xs text-gray-400 line-clamp-2">{q.descrizione || 'Nessuna descrizione.'}</p>
              </div>

              <div className="pt-3 border-t border-gray-900 flex justify-between items-center text-xs">
                <button
                  onClick={() => onOpenComposer(q)}
                  className="text-[#FF5500] font-bold hover:underline cursor-pointer"
                >
                  ⚙️ Assembla Moduli →
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenPreview(q)}
                    className="text-gray-300 hover:text-white font-bold cursor-pointer"
                  >
                    👁️ Anteprima &amp; Link
                  </button>
                  <button
                    onClick={() => handleDelete(q.id, q.titolo)}
                    className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALE CREAZIONE NUOVO QUESTIONARIO */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Crea Nuovo Questionario Aziendale</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateQuestionario} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Titolo Questionario</label>
                <input
                  type="text"
                  placeholder="Es. Assessment Strategico Q1"
                  value={questTitle}
                  onChange={(e) => setQuestTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Descrizione / Obiettivi</label>
                <textarea
                  rows={3}
                  placeholder="Inserisci una breve descrizione della sessione di assessment..."
                  value={questDescription}
                  onChange={(e) => setQuestDescription(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-gray-800 text-gray-300 text-xs font-bold rounded-xl cursor-pointer">Annulla</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider disabled:opacity-50">
                  {isSubmitting ? 'Creazione...' : 'Crea e Procedi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
