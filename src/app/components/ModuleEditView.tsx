'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface ModuleEditViewProps {
  modulo: {
    id: string;
    codice_modulo: string;
    titolo: string;
    versione: string;
    descrizione?: string;
  };
  onBack: () => void;
}

export function ModuleEditView({ modulo, onBack }: ModuleEditViewProps) {
  const [domande, setDomande] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stati form nuova domanda
  const [sezione, setSezione] = useState('Generale');
  const [testoDomanda, setTestoDomanda] = useState('');
  const [tipoRisposta, setTipoRisposta] = useState('text_250');
  const [opzioniInput, setOpzioniInput] = useState('Opzione 1, Opzione 2, Opzione 3'); // <-- Per personalizzare le opzioni multiple
  const [peso, setPeso] = useState(1.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stato per la modifica di una domanda esistente
  const [editingDomandaId, setEditingDomandaId] = useState<string | null>(null);
  const [editTesto, setEditTesto] = useState('');
  const [editSezione, setEditSezione] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editOpzioni, setEditOpzioni] = useState('');
  const [editPeso, setEditPeso] = useState(1.0);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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

  // Aggiunta nuova domanda
  const handleAddDomanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testoDomanda.trim()) return;

    setIsSubmitting(true);
    try {
      // Se è multi-select, salviamo le opzioni (separate da virgola, massimo 3)
      const opzioniArray = tipoRisposta === 'multi_select_3' 
        ? opzioniInput.split(',').map(o => o.trim()).filter(Boolean).slice(0, 3) 
        : [];

      const nuovaDomandaPayload = {
        modulo_id: modulo.id,
        sezione,
        testo_domanda: testoDomanda,
        tipo_risposta: tipoRisposta,
        opzioni: opzioniArray, // Salvato come array o JSON su Supabase se la colonna esiste
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
      setOpzioniInput('Opzione 1, Opzione 2, Opzione 3');
      setPeso(1.0);
    } catch (err: any) {
      alert('Errore durante il salvataggio della domanda: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Salvataggio modifica domanda
  const handleUpdateDomanda = async (domId: string) => {
    try {
      const opzioniArray = editTipo === 'multi_select_3' 
        ? editOpzioni.split(',').map(o => o.trim()).filter(Boolean).slice(0, 3) 
        : [];

      const { error } = await supabase
        .from('gos_domande')
        .update({
          testo_domanda: editTesto,
          sezione: editSezione,
          tipo_risposta: editTipo,
          opzioni: opzioniArray,
          peso: Number(editPeso)
        })
        .eq('id', domId);

      if (error) throw error;

      setDomande(prev => prev.map(d => d.id === domId ? {
        ...d,
        testo_domanda: editTesto,
        sezione: editSezione,
        tipo_risposta: editTipo,
        opzioni: opzioniArray,
        peso: Number(editPeso)
      } : d));

      setEditingDomandaId(null);
    } catch (err: any) {
      alert('Errore durante l\'aggiornamento: ' + (err.message || err));
    }
  };

  // Eliminazione domanda
  const handleDeleteDomanda = async (domandaId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa domanda?')) return;

    try {
      const { error } = await supabase
        .from('gos_domande')
        .delete()
        .eq('id', domId);

      if (error) throw error;

      setDomande(prev => prev.filter(d => d.id !== domId));
    } catch (err: any) {
      alert('Errore durante l\'eliminazione: ' + (err.message || err));
    }
  };

  // Renderizzazione cella risposta con opzioni personalizzate
  const renderCellaRisposta = (dom: any) => {
    switch (dom.tipo_risposta) {
      case 'text_250':
        return (
          <div className="space-y-1 pt-2">
            <div className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-gray-400">
              [ Cella di Testo Singolo — max 250 caratteri ]
            </div>
            <div className="text-right text-[10px] font-mono text-gray-500">0 / 250 caratteri</div>
          </div>
        );
      case 'multi_select_3':
        // Usa le opzioni salvate o un fallback se vuote
        const listaOpzioni = (dom.opzioni && dom.opzioni.length > 0) ? dom.opzioni : ['Opzione 1', 'Opzione 2', 'Opzione 3'];
        return (
          <div className="space-y-1.5 pt-2">
            <div className="text-[10px] font-mono text-amber-400 uppercase">Selezione multipla (max 3 risposte):</div>
            {listaOpzioni.map((opt: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-xs text-gray-300 bg-gray-900 border border-gray-700 p-2.5 rounded-lg">
                <div className="w-3.5 h-3.5 rounded border border-gray-600 bg-gray-950" />
                <span>{opt}</span>
              </div>
            ))}
          </div>
        );
      case 'rating_1_5':
        return (
          <div className="flex items-center gap-2 pt-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center font-mono text-xs text-gray-300 font-bold">
                {num}
              </div>
            ))}
            <span className="text-[10px] font-mono text-gray-500 ml-2">(Indice di gradimento da 1 a 5)</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* INTESTAZIONE PAGINA EDIT MODULE */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-gray-950 border border-gray-800 text-[#FF5500] font-mono text-xs font-bold rounded-lg uppercase">
              {modulo.codice_modulo || 'QST'}
            </span>
            <span className="text-xs font-mono text-gray-400">Versione {modulo.versione}</span>
          </div>
          <h3 className="text-xl font-extrabold text-white uppercase tracking-wider">
            Edit Module: {modulo.titolo}
          </h3>
          <p className="text-xs text-gray-400">Componi il modulo inserendo le domande e i relativi spazi di risposta automatizzati.</p>
        </div>

        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider"
        >
          Salva e Torna ai Moduli -&gt;
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLONNA SINISTRA: AGGIUNGI NUOVA DOMANDA */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 lg:col-span-1 h-fit">
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
                placeholder="Es. Quali sono i principali obiettivi strategici?"
                value={testoDomanda}
                onChange={(e) => setTestoDomanda(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                required
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Tipologia Risposta</label>
              <select
                value={tipoRisposta}
                onChange={(e) => setTipoRisposta(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
              >
                <option value="text_250">1. Risposta singola (testo max 250 car.)</option>
                <option value="multi_select_3">2. Risposta multipla (selezione max 3)</option>
                <option value="rating_1_5">3. Indice di gradimento (rating da 1 a 5)</option>
              </select>
            </div>

            {/* CAMPO OPZIONI VISIBILE SOLO SE È SELEZIONATA LA SCELTA MULTIPLA */}
            {tipoRisposta === 'multi_select_3' && (
              <div>
                <label className="block text-amber-400 mb-1 font-bold uppercase text-[10px]">Opzioni di Risposta (max 3, separate da virgola)</label>
                <input
                  type="text"
                  placeholder="Es. Opzione A, Opzione B, Opzione C"
                  value={opzioniInput}
                  onChange={(e) => setOpzioniInput(e.target.value)}
                  className="w-full bg-gray-950 border border-amber-500/60 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            )}

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
              className="w-full py-3 bg-[#FF5500] hover:bg-orange-600 text-white font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Salvataggio...' : '+ Inserisci Domanda'}
            </button>
          </form>
        </div>

        {/* COLONNA DESTRA: LISTA DOMANDE */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4 lg:col-span-2">
          <div className="border-b border-gray-800 pb-3 flex justify-between items-center">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Domande nel Modulo ({domande.length})
            </h4>
            <span className="text-gray-500 font-mono text-[10px]">Tabella gos_domande</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-gray-400 font-mono">Caricamento domande in corso...</div>
          ) : domande.length === 0 ? (
            <div className="p-16 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-2">
              <p className="text-sm text-gray-400">Nessuna domanda presente in questo modulo.</p>
              <p className="text-xs text-gray-500">Usa il modulo a sinistra per aggiungere la prima domanda.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
              {domande.map((dom, index) => (
                <div key={dom.id} className="bg-gray-950 border border-gray-800 p-5 rounded-xl space-y-3">
                  
                  {editingDomandaId !== dom.id ? (
                    <>
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 text-amber-400 font-mono text-xs font-bold rounded-lg">
                            #{index + 1}
                          </span>
                          <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 text-gray-300 font-mono text-[10px] uppercase rounded-lg">
                            {dom.sezione}
                          </span>
                          <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 text-emerald-400 font-mono text-[10px] uppercase rounded-lg">
                            {dom.tipo_risposta}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingDomandaId(dom.id);
                              setEditTesto(dom.testo_domanda);
                              setEditSezione(dom.sezione);
                              setEditTipo(dom.tipo_risposta);
                              setEditOpzioni(dom.opzioni ? dom.opzioni.join(', ') : '');
                              setEditPeso(dom.peso);
                            }}
                            className="text-[11px] font-mono text-amber-400 hover:text-amber-300 px-3 py-1 bg-amber-950/40 hover:bg-amber-950 rounded-lg border border-amber-900/50 transition-all cursor-pointer"
                          >
                            Modifica
                          </button>
                          <button
                            onClick={() => handleDeleteDomanda(dom.id)}
                            className="text-[11px] font-mono text-red-400 hover:text-red-300 px-3 py-1 bg-red-950/40 hover:bg-red-950 rounded-lg border border-red-900/50 transition-all cursor-pointer"
                          >
                            Elimina
                          </button>
                        </div>
                      </div>

                      <h5 className="text-sm font-bold text-white pt-1">{dom.testo_domanda}</h5>

                      {/* CELLA DI RISPOSTA AUTOMATICA CON OPZIONI PERSONALIZZATE */}
                      <div className="pt-3 border-t border-gray-900">
                        <span className="text-[10px] font-mono font-bold uppercase text-gray-500 tracking-wider">Cella Risposta Associata:</span>
                        {renderCellaRisposta(dom)}
                      </div>

                      <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 pt-2 border-t border-gray-900/60">
                        <span>Peso specifico: {dom.peso}</span>
                        <span>ID: {dom.id}</span>
                      </div>
                    </>
                  ) : (
                    // VISTA MODIFICA ATTIVA
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-gray-800 pb-2">
                        <span className="text-xs font-bold text-amber-400 uppercase font-mono">Modifica Domanda #{index + 1}</span>
                        <button onClick={() => setEditingDomandaId(null)} className="text-xs text-gray-400 hover:text-white">Annulla</button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Sezione</label>
                          <input
                            type="text"
                            value={editSezione}
                            onChange={(e) => setEditSezione(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-lg text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Tipologia Risposta</label>
                          <select
                            value={editTipo}
                            onChange={(e) => setEditTipo(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-lg text-white text-xs"
                          >
                            <option value="text_250">Risposta singola (testo max 250 car.)</option>
                            <option value="multi_select_3">Risposta multipla (max 3)</option>
                            <option value="rating_1_5">Indice di gradimento (1-5)</option>
                          </select>
                        </div>
                      </div>

                      {editTipo === 'multi_select_3' && (
                        <div>
                          <label className="block text-[10px] font-mono text-amber-400 uppercase mb-1">Opzioni (separate da virgola, max 3)</label>
                          <input
                            type="text"
                            value={editOpzioni}
                            onChange={(e) => setEditOpzioni(e.target.value)}
                            className="w-full bg-gray-900 border border-amber-500 px-3 py-2 rounded-lg text-white text-xs"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-[10px] font-mono text-gray-400 uppercase mb-1">Testo Domanda</label>
                        <textarea
                          rows={2}
                          value={editTesto}
                          onChange={(e) => setEditTesto(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-lg text-white text-xs"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => handleUpdateDomanda(dom.id)}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Salva Modifica
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
