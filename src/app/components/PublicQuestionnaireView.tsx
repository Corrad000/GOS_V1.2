'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface PublicQuestionnaireViewProps {
  moduloId: string;
  aziendaId: string; // L'azienda che sta compilando il questionario
}

export function PublicQuestionnaireView({ moduloId, aziendaId }: PublicQuestionnaireViewProps) {
  const [modulo, setModulo] = useState<any | null>(null);
  const [domande, setDomande] = useState<any[]>([]);
  const [risposte, setRisposte] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function loadQuestionnaireData() {
      setLoading(true);
      try {
        // 1. Carica i dati del Modulo
        const { data: modData, error: modErr } = await supabase
          .from('gos_moduli')
          .select('*')
          .eq('id', moduloId)
          .single();

        if (modErr) throw modErr;
        setModulo(modData);

        // 2. Carica tutte le domande associate a questo modulo
        const { data: domData, error: domErr } = await supabase
          .from('gos_domande')
          .select('*')
          .eq('modulo_id', moduloId)
          .order('ordine', { ascending: true });

        if (domErr) throw domErr;
        setDomande(domData || []);
      } catch (err: any) {
        console.error('Errore caricamento questionario:', err?.message || err);
      } finally {
        setLoading(false);
      }
    }

    if (moduloId) {
      loadQuestionnaireData();
    }
  }, [moduloId, supabase]);

  // Gestione della digitazione / selezione della risposta
  const handleInputChange = (domandaId: string, valore: string) => {
    setRisposte(prev => ({
      ...prev,
      [domandaId]: valore
    }));
  };

  // Invio e salvataggio delle risposte su Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = Object.keys(risposte).map(domandaId => ({
        azienda_id: aziendaId,
        modulo_id: moduloId,
        domanda_id: domandaId,
        valore_risposta: risposte[domandaId]
      }));

      const { error } = await supabase
        .from('gos_risposte')
        .insert(payload);

      if (error) throw error;

      setIsSubmitted(true);
    } catch (err: any) {
      alert('Errore durante l\'invio delle risposte: ' + (err.message || err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center text-gray-400 font-mono text-xs">
        Caricamento questionario in corso...
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center p-4">
        <div className="bg-[#0B132B] border border-gray-800 rounded-2xl max-w-md w-full p-8 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-lg font-bold">
            ✓
          </div>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">Questionario Inviato con Successo</h2>
          <p className="text-xs text-gray-400">Grazie per aver compilato il modulo diagnostico. Le risposte sono state registrate correttamente nel sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050B14] text-white py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* INTESTAZIONE QUESTIONARIO */}
        <div className="bg-[#0B132B] border border-gray-800 p-6 rounded-2xl space-y-2 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-gray-950 border border-gray-800 text-[#FF5500] font-mono text-xs font-bold rounded-lg uppercase">
              {modulo?.codice_modulo || 'QST'}
            </span>
            <span className="text-xs font-mono text-gray-400">Versione {modulo?.versione || '1.0'}</span>
          </div>
          <h1 className="text-xl font-black uppercase tracking-wider">{modulo?.titolo}</h1>
          <p className="text-xs text-gray-400">{modulo?.descrizione || 'Compila tutte le sezioni sottostanti.'}</p>
        </div>

        {/* FORM DI COMPILAZIONE */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {domande.map((dom, index) => (
            <div key={dom.id} className="bg-[#0B132B] border border-gray-800 p-6 rounded-2xl space-y-4 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-gray-950 border border-gray-800 text-amber-400 font-mono text-[10px] font-bold rounded">
                  #{index + 1}
                </span>
                <span className="px-2 py-0.5 bg-gray-950 border border-gray-800 text-gray-300 font-mono text-[10px] uppercase">
                  {dom.sezione}
                </span>
              </div>

              <h3 className="text-sm font-bold text-white">{dom.testo_domanda}</h3>

              {/* RENDERIZZAZIONE DELLA CELLA DI RISPOSTA INTERATTIVA */}
              <div className="pt-2">
                {dom.tipo_risposta === 'rating_1_5' && (
                  <div className="flex items-center gap-3">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        type="button"
                        key={num}
                        onClick={() => handleInputChange(dom.id, num.toString())}
                        className={`w-10 h-10 rounded-xl border font-mono text-xs font-bold transition-all cursor-pointer ${
                          risposte[dom.id] === num.toString()
                            ? 'bg-[#FF5500] border-orange-500 text-white shadow-lg shadow-orange-950/50'
                            : 'bg-gray-950 border-gray-800 text-gray-300 hover:border-gray-700'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                )}

                {dom.tipo_risposta === 'text' && (
                  <textarea
                    rows={3}
                    placeholder="Scrivi qui la tua risposta..."
                    value={risposte[dom.id] || ''}
                    onChange={(e) => handleInputChange(dom.id, e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 focus:border-[#FF5500] p-3 rounded-xl text-white text-xs outline-none transition-all"
                    required
                  />
                )}

                {dom.tipo_risposta === 'boolean' && (
                  <div className="flex items-center gap-4">
                    {['Sì', 'No'].map((val) => (
                      <label
                        key={val}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          risposte[dom.id] === val
                            ? 'bg-[#FF5500]/10 border-[#FF5500] text-white'
                            : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`dom_${dom.id}`}
                          value={val}
                          checked={risposte[dom.id] === val}
                          onChange={(e) => handleInputChange(dom.id, e.target.value)}
                          className="accent-[#FF5500]"
                          required
                        />
                        {val}
                      </label>
                    ))}
                  </div>
                )}

                {dom.tipo_risposta === 'choice' && (
                  <div className="space-y-2">
                    {['Opzione A', 'Opzione B', 'Opzione C'].map((opt) => (
                      <label
                        key={opt}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gray-950 border border-gray-800 text-xs text-gray-300 cursor-pointer hover:border-gray-700"
                      >
                        <input
                          type="radio"
                          name={`dom_choice_${dom.id}`}
                          value={opt}
                          checked={risposte[dom.id] === opt}
                          onChange={(e) => handleInputChange(dom.id, e.target.value)}
                          className="accent-[#FF5500]"
                          required
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ))}

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-950/50 transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
            >
              {submitting ? 'Invio in corso...' : 'Invia Risposte al Sistema'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
