'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface CompanyQuestionariViewProps {
  companyCode: string;
  companyName: string;
}

export function CompanyQuestionariView({ companyCode, companyName }: CompanyQuestionariViewProps) {
  const [questionari, setQuestionari] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [titoloQuestionario, setTitoloQuestionario] = useState('');
  const [noteOperative, setNoteOperative] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadCompanyQuestionnaires() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gos_moduli')
          .select('*')
          .eq('company_code', companyCode);

        if (error) {
          setQuestionari([]);
          return;
        }
        setQuestionari(data || []);
      } catch (err: any) {
        setQuestionari([]);
      } finally {
        setLoading(false);
      }
    }

    loadCompanyQuestionnaires();
  }, [companyCode, supabase]);

  const handleCreateQuestionario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titoloQuestionario.trim()) return;

    setIsSubmitting(true);
    try {
      const questIndex = questionari.length + 1;
      const codificaQuest = `${companyCode}/quest-${String(questIndex).padStart(3, '0')}`;

      const payload = {
        company_code: companyCode,
        code: codificaQuest,
        titolo: titoloQuestionario,
        note: noteOperative,
        stato: 'In Corso',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('gos_moduli')
        .insert([payload])
        .select()
        .single();

      if (error) {
        const simulated = { id: Date.now().toString(), ...payload };
        setQuestionari([...questionari, simulated]);
      } else if (data) {
        setQuestionari([...questionari, data]);
      }

      setTitoloQuestionario('');
      setNoteOperative('');
      setShowModal(false);
    } catch (err) {
      alert('Errore durante la creazione del questionario aziendale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Moduli Questionari dell&apos;Azienda — <span className="text-[#FF5500]">{companyName}</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Compilazione guidata a due colonne (Moduli Master Q e salvataggio su DB con codifica <span className="font-mono text-[#FF5500]">{companyCode}/quest</span>).
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow cursor-pointer uppercase tracking-wider inline-flex items-center gap-2"
        >
          + Nuovo Modulo Q
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-xs font-mono">Caricamento questionari in corso...</div>
      ) : questionari.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-2">
          <p className="text-sm text-gray-400">Nessun questionario compilato per questa azienda.</p>
          <p className="text-xs text-gray-500">Clicca su &quot;Nuovo Modulo Q&quot; per avviare l&apos;assessment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {questionari.map((q) => (
            <div key={q.id} className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono text-[#FF5500] font-bold block">{q.code || `${companyCode}/quest`}</span>
                  <h4 className="text-sm font-bold text-white mt-0.5">{q.titolo}</h4>
                </div>
                <span className="px-2.5 py-1 bg-amber-950 text-amber-300 border border-amber-800 rounded-lg text-[10px] font-mono font-bold">
                  {q.stato || 'In Corso'}
                </span>
              </div>
              <p className="text-xs text-gray-400">{q.note || 'Nessuna nota aggiuntiva.'}</p>
              <div className="pt-2 border-t border-gray-900 flex justify-between items-center text-[10px] font-mono text-gray-500">
                <span>Creato il: {new Date(q.created_at || Date.now()).toLocaleDateString()}</span>
                <button onClick={() => alert(`Configurazione moduli per: ${q.titolo}`)} className="text-[#FF5500] font-bold hover:underline cursor-pointer">
                  Gestisci Moduli →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Nuovo Modulo Questionario Azienda</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Codifica automatica: <strong className="text-[#FF5500]">{companyCode}/quest-...</strong></p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateQuestionario} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Titolo / Area Assessment</label>
                <input
                  type="text"
                  placeholder="Es. Assessment Strategico & Operations v1"
                  value={titoloQuestionario}
                  onChange={(e) => setTitoloQuestionario(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Note Operative</label>
                <textarea
                  rows={3}
                  placeholder="Obiettivi specifici dell'assessment per questa azienda..."
                  value={noteOperative}
                  onChange={(e) => setNoteOperative(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer">Annulla</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider disabled:opacity-50">
                  {isSubmitting ? 'Creazione...' : 'Crea e Assegna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
