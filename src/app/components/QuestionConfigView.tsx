'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface QuestionConfigViewProps {
  modulo: {
    id: string;
    codice_modulo: string;
    titolo: string;
    versione: string;
  };
  onBack: () => void;
}

export function QuestionConfigView({ modulo, onBack }: QuestionConfigViewProps) {
  const [domande, setDomande] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stati form nuova domanda
  const [sezione, setSezione] = useState('Generale');
  const [testoDomanda, setTestoDomanda] = useState('');
  const [tipoRisposta, setTipoRisposta] = useState('rating_1_5');
  const [peso, setPeso] = useState(1.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Caricamento domande del modulo da Supabase
  useEffect(() => {
    async function fetchDomande() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gos_domande')
          .select('*')
          .eq('modulo_id', modulo.id)
          .order('ordine', { ascending: true });

        if (error) throw error;
        setDomande(data || []);
      } catch (err: any) {
        console.error('Errore caricamento domande:', err?.message || err);
      } finally {
        setLoading(false);
      }
    }

    fetchDomande();
  }, [modulo.id, supabase]);

  // Aggiunta nuova domanda su Supabase
  const handleAddDomanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testoDomanda.trim()) return;

    setIsSubmitting(true);
    try {
      const nuovaDomandaPayload = {
        modulo_id: modulo.id,
        sezione,
        testo_domanda: testoDomanda,
        tipo_risposta: tipoRisposta,
        peso: Number(peso),
        ordine: domande.length + 1
      };

      const { data, error } = await supabase
        .from('gos_domande')
        .insert([nuovaDomandaPayload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setDomande(prev => [...prev, data]);
      }

      setTestoDomanda('');
      setPeso(1.0);
    } catch (err: any) {
      alert('Errore durante il salvataggio della domanda: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Eliminazione domanda da Supabase
  const handleDeleteDomanda = async (domandaId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa domanda?')) return;

    try {
      const { error } = await supabase
        .from('gos_domande')
        .delete()
        .eq('id', domandaId);

      if (error) throw error;

      setDomande(prev => prev.filter(d => d.id !== domandaId));
    } catch (err: any) {
      alert('Errore durante l\'eliminazione: ' + (err.message || err));
    }
  };

  // Funzione per renderizzare lo "spazio risposta" in base al tipo scelto
  const renderSpazioRisposta = (tipo: string) => {
    switch (tipo) {
      case 'rating_1_5':
        return (
          <div className="flex items-center gap-2 pt-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="w-9 h-9 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center font-mono text-xs text-gray-400 font-bold">
                {num}
              </div>
            ))}
            <span className="text-[10px] font-mono text-gray-500 ml-2">(Scala 1 a 5)</span>
          </div>
        );
      case 'text':
        return (
          <div className="pt-2">
            <div className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-gray-500 italic">
              Spazio risposta: Testo libero dell'utente...
            </div>
          </div>
        );
      case 'boolean':
        return (
          <div className="flex items-center gap-3 pt-2">
            <span className="px-4 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-xs font-bold text-gray-400">Sì</span>
            <span className="px-4 py-1.5 rounded-xl bg-gray-950 border border-gray-800 text-xs font-bold text-gray-400">No</span>
          </div>
        );
      case 'choice':
        return (
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3.5 h-3.5 rounded-full border border-gray-700 bg-gray-950" />
              <span>Opzione di risposta multipla 1</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="w-3.5 h-3.5 rounded-full border border-gray-700 bg-gray-950" />
              <span>Opzione di risposta multipla 2</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* INTESTAZIONE & PULSANTE INDIETRO */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-gray-950 border border-gray-800 text-[#FF5500] font-mono text-xs font-bold rounded-lg uppercase">
              {modulo.codice_modulo || 'QST'}
            </span>
            <span className="text-xs font-mono text-gray-400">Versione {modulo.versione}</span>
          </div>
          <h3 className="text-xl font-extrabold text-white uppercase tracking-wider">
            Composizione Modulo: {modulo.titolo}
          </h3>
          <p className="text-xs text-gray-400">Aggiungi e configura le domande e i relativi spazi di risposta associati a questo modulo.</p>
        </div>

        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-950 hover:bg-gray-800 text-gray-300 border border-gray-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
        >
          &lt;- Torna ai Moduli
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLONNA SINISTRA: FORM AGGIUNGI DOMANDA */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 lg:col-span-1">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-gray-800 pb-3">
            + Aggiungi Nuova Domanda
          </h4>

          <form onSubmit={handleAddDomanda} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Sezione / Ambito</label>
              <input
                type="text"
                value={sezione}
                onChange={(e) => setSezione(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Testo della Domanda</label>
              <textarea
                rows={3}
                placeholder="Es. Qual è il livello di automazione dei processi commerciali?"
                value={testoDomanda}
                onChange={(e) => setTestoDomanda(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Tipo di Spazio Risposta</label>
              <select
                value={tipoRisposta}
                onChange={(e) => setTipoRisposta(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
              >
                <option value="rating_1_5">Valutazione numerica (1 a 5)</option>
                <option value="text">Testo libero</option>
                <option value="boolean">Sì / No (Booleana)</option>
                <option value="choice">Selezione multipla</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Peso Specifico</label>
              <input
                type="number"
                step="0.1"
                value={peso}
                onChange={(e) => setPeso(parseFloat(e.target.value) || 1.0)}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#FF5500] hover:bg-orange-600 text-white font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50 mt-4"
            >
              {isSubmitting ? 'Salvataggio...' : '+ Aggiungi Domanda al Modulo'}
            </button>
          </form>
        </div>

        {/* COLONNA DESTRA: ANTEPRIMA STRUTTURA DOMANDE E SPAZI RISPOSTA */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 lg:col-span-2">
          <div className="border-b border-gray-800 pb-3 flex justify-between items-center">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Domande & Spazi Risposta Configurati ({domande.length})
            </h4>
            <span className="text-gray-500 font-mono text-[10px]">Sincronizzato con gos_domande</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400 font-mono">Caricamento domande in corso...</div>
          ) : domande.length === 0 ? (
            <div className="p-16 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-2">
              <p className="text-sm text-gray-400">Nessuna domanda presente in questo modulo.</p>
              <p className="text-xs text-gray-500">Usa il pannello a sinistra per aggiungere la prima domanda e generare il relativo spazio di risposta.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {domande.map((dom, index) => (
                <div key={dom.id} className="bg-gray-950 border border-gray-800 p-5 rounded-xl space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 text-amber-400 font-mono text-xs font-bold rounded-lg">
                        #{index + 1}
                      </span>
                      <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 text-gray-300 font-mono text-[10px] uppercase rounded-lg">
                        {dom.sezione}
                      </span>
                      <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 text-emerald-400 font-mono text-[10px] uppercase rounded-lg">
                        Tipo: {dom.tipo_risposta}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteDomanda(dom.id)}
                      className="text-[11px] font-mono text-red-400 hover:text-red-300 px-3 py-1 bg-red-950/40 hover:bg-red-950 rounded-lg border border-red-900/50 transition-all cursor-pointer"
                    >
                      Elimina Domanda
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h5 className="text-sm font-bold text-white">{dom.testo_domanda}</h5>
                  </div>

                  {/* SPAZIO RISPOSTA GENERATO AUTOMATICAMENTE */}
                  <div className="pt-2 border-t border-gray-900">
                    <span className="text-[10px] font-mono font-bold uppercase text-gray-500 tracking-wider">Spazio Risposta Associato:</span>
                    {renderSpazioRisposta(dom.tipo_risposta)}
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 pt-2">
                    <span>Peso specifico: {dom.peso}</span>
                    <span>ID Supabase: {dom.id}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
