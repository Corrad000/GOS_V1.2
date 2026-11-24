'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { questionarioService, ModuloQuestionario, Domanda } from '@/services/questionnaireService';

interface QuestionnaireViewProps {
  projectId: string;
}

interface RispostaRecord {
  id?: string;
  progetto_id: string;
  domanda_id: string;
  valore_risposta: string;
}

export function QuestionnaireView({ projectId }: QuestionnaireViewProps) {
  const [moduli, setModuli] = useState<ModuloQuestionario[]>([]);
  const [domandeMap, setDomandeMap] = useState<Record<string, Domanda[]>>({});
  const [risposteMap, setRisposteMap] = useState<Record<string, RispostaRecord>>({});

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [newTitolo, setNewTitolo] = useState('');
  const [newDescrizione, setNewDescrizione] = useState('');
  const [newDomandaTesto, setNewDomandaTesto] = useState('Quali sono le priorità strategiche per i prossimi 12 mesi?');

  const [activeModuloId, setActiveModuloId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    try {
      setLoading(true);
      setMessage(null);

      const { data: moduliRows, error: modErr } = await supabase
        .from('gos_moduli')
        .select('*')
        .order('created_at', { ascending: false });

      if (modErr) throw modErr;

      const loadedModuli: ModuloQuestionario[] = moduliRows || [];
      setModuli(loadedModuli);

      const { data: risposteRows, error: respErr } = await supabase
        .from('gos_risposte_questionario')
        .select('*')
        .eq('progetto_id', projectId);

      if (!respErr && risposteRows) {
        const rMap: Record<string, RispostaRecord> = {};
        risposteRows.forEach((r: any) => {
          if (r.domanda_id) {
            rMap[r.domanda_id] = {
              id: r.id,
              progetto_id: r.progetto_id || projectId,
              domanda_id: r.domanda_id,
              valore_risposta: r.valore_risposta ?? ''
            };
          }
        });
        setRisposteMap(rMap);
      }

      const dMap: Record<string, Domanda[]> = {};
      for (const m of loadedModuli) {
        const domList = await questionarioService.getDomandeByModulo(m.id);
        dMap[m.id] = domList;
      }
      setDomandeMap(dMap);

      if (loadedModuli.length > 0) {
        setActiveModuloId((prev) => prev ?? loadedModuli[0].id);
      }
    } catch (err: any) {
      setMessage(`Errore di caricamento: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateModulo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitolo.trim()) return;

    try {
      setMessage(null);
      const categorie = await questionarioService.getCategorie();
      const defaultCategoriaId = categorie[0]?.id;

      if (!defaultCategoriaId) {
        setMessage('Crea prima una categoria in Gestione Questionari prima di aggiungere un modulo.');
        return;
      }

      const created = await questionarioService.createModuloWithDomanda(
        defaultCategoriaId,
        newTitolo.trim(),
        newDomandaTesto.trim() || 'Obiettivi e priorità del progetto',
        'text'
      );

      if (newDescrizione.trim()) {
        await supabase
          .from('gos_moduli')
          .update({ descrizione: newDescrizione.trim() })
          .eq('id', created.id);
        created.descrizione = newDescrizione.trim();
      }

      const domList = await questionarioService.getDomandeByModulo(created.id);
      setModuli((prev) => [created, ...prev]);
      setDomandeMap((prev) => ({ ...prev, [created.id]: domList }));
      setActiveModuloId(created.id);
      setNewTitolo('');
      setNewDescrizione('');
      setShowModal(false);
      setMessage('Modulo creato con successo dalla libreria Supabase.');
    } catch (err: any) {
      setMessage(`Errore creazione: ${err?.message || String(err)}`);
    }
  }

  async function handleSaveRisposta(domandaId: string, valore: string) {
    if (isLocked) return;

    const nuovaRisposta: RispostaRecord = {
      progetto_id: projectId,
      domanda_id: domandaId,
      valore_risposta: valore
    };

    setRisposteMap((prev) => ({
      ...prev,
      [domandaId]: nuovaRisposta
    }));

    try {
      const { error } = await supabase
        .from('gos_risposte_questionario')
        .upsert(nuovaRisposta, { onConflict: 'progetto_id,domanda_id' });

      if (error) throw error;
    } catch (err: any) {
      setMessage(`Errore salvataggio risposta: ${err?.message || String(err)}`);
    }
  }

  function handleSendLink(m: ModuloQuestionario) {
    const clientEmail = 'cliente@azienda.it';
    const link = `${window.location.origin}/client-portal/questionnaire/${m.id}?project=${projectId}`;
    navigator.clipboard.writeText(link);
    alert(`Link generato e copiato negli appunti per ${clientEmail}!\n\nURL: ${link}`);
  }

  if (loading) {
    return <div className="text-xs text-gray-400 p-6 font-mono text-center">Caricamento questionari e moduli Supabase...</div>;
  }

  const activeModulo = moduli.find((m) => m.id === activeModuloId) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Questionari & Assessment Aziendali</h3>
          <p className="text-xs text-gray-400">Composizione moduli da libreria Supabase, invio link al cliente e blocco post-compilazione.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
        >
          + Seleziona Modulo da Libreria
        </button>
      </div>

      {message && (
        <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl text-purple-300 text-xs">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {moduli.map((m) => {
          const isActive = activeModuloId === m.id;
          return (
            <div
              key={m.id}
              onClick={() => setActiveModuloId(m.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isActive ? 'bg-purple-950/30 border-purple-500 shadow-md' : 'bg-gray-950 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 bg-gray-900 border border-gray-800 text-purple-400 font-mono text-[10px] font-bold rounded">
                  v{m.versione || '1.0'}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isLocked
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {isLocked ? 'Completato & Bloccato' : m.stato || 'In Compilazione'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">{m.titolo}</h4>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{m.descrizione || 'Nessuna descrizione specificata.'}</p>
            </div>
          );
        })}
      </div>

      {activeModulo && (
        <div className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white">{activeModulo.titolo}</h4>
              <p className="text-xs text-gray-400">Visualizzazione e compilazione a due righe (Domanda sopra, Risposta sotto).</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSendLink(activeModulo)}
                className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Invia Link al Cliente
              </button>

              <button
                onClick={() => setIsLocked(!isLocked)}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl cursor-pointer ${
                  isLocked ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {isLocked ? '🔒 Questionario Bloccato (Sola Lettura)' : '🔓 Sblocca Modifica'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {(domandeMap[activeModulo.id] || []).map((domanda, idx) => {
              const rispostaCorrente = risposteMap[domanda.id]?.valore_risposta || '';
              return (
                <div key={domanda.id} className="bg-gray-900/60 border border-gray-800 p-4 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>
                      <span className="text-purple-400 font-mono mr-2">D{idx + 1}.</span> {domanda.testo_domanda}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 uppercase bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                      {domanda.sezione} (Peso: {domanda.peso})
                    </span>
                  </div>

                  <div>
                    {isLocked ? (
                      <div className="text-xs text-emerald-300 bg-emerald-950/30 border border-emerald-900/50 p-2.5 rounded-lg font-mono">
                        {rispostaCorrente || 'Nessuna risposta registrata.'}
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Inserisci o aggiorna la risposta..."
                        value={rispostaCorrente}
                        onChange={(e) => handleSaveRisposta(domanda.id, e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-white font-bold text-sm">Nuovo Modulo Questionario</h3>
            <form onSubmit={handleCreateModulo} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Titolo Modulo</label>
                <input
                  type="text"
                  placeholder="Es. Assessment Strategico & Commerciale"
                  value={newTitolo}
                  onChange={(e) => setNewTitolo(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Prima Domanda Iniziale</label>
                <input
                  type="text"
                  value={newDomandaTesto}
                  onChange={(e) => setNewDomandaTesto(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Descrizione / Obiettivo</label>
                <textarea
                  placeholder="Descrizione sintetica del modulo..."
                  value={newDescrizione}
                  onChange={(e) => setNewDescrizione(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white h-20"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Crea & Associa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
