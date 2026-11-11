'use client';

import React, { useState, useEffect } from 'react';
import { questionarioService, Questionario, Domanda, RispostaAziendale } from '@/services/questionnaireService';

interface QuestionnaireViewProps {
  projectId: string;
}

export function QuestionnaireView({ projectId }: QuestionnaireViewProps) {
  const [questionari, setQuestionari] = useState<Questionario[]>([]);
  const [domandeMap, setDomandeMap] = useState<{ [key: string]: Domanda[] }>({});
  const [risposteMap, setRisposteMap] = useState<{ [key: string]: RispostaAziendale }>({});
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  
  // Stato modale creazione nuovo questionario
  const [showModal, setShowModal] = useState(false);
  const [newCodice, setNewCodice] = useState('QST-001');
  const [newTitolo, setNewTitolo] = useState('');
  const [newDescrizione, setNewDescrizione] = useState('');

  // Stato espansione dettaglio questionario attivo
  const [activeQuestionarioId, setActiveQuestionarioId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false); // Stato blocco post-compilazione

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    try {
      setLoading(true);
      const dataQ = await questionarioService.getQuestionari();
      setQuestionari(dataQ);

      const risposteList = await questionarioService.getRisposteByProgetto(projectId);
      const rMap: { [key: string]: RispostaAziendale } = {};
      risposteList.forEach(r => {
        rMap[r.domanda_id] = r;
      });
      setRisposteMap(rMap);

      // Carica le domande per ciascun questionario
      const dMap: { [key: string]: Domanda[] } = {};
      for (const q of dataQ) {
        const domande = await questionarioService.getDomandeByQuestionario(q.id);
        dMap[q.id] = domande;
      }
      setDomandeMap(dMap);

      if (dataQ.length > 0) {
        setActiveQuestionarioId(dataQ[0].id);
      }
    } catch (err: any) {
      setMessage(`Errore di caricamento: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateQuestionario(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitolo) return;

    try {
      setMessage(null);
      const created = await questionarioService.createQuestionario({
        codice: newCodice,
        titolo: newTitolo,
        descrizione: newDescrizione
      });

      setQuestionari([...questionari, created]);
      setNewTitolo('');
      setNewDescrizione('');
      setShowModal(false);
      setMessage('Questionario creato con successo dalla libreria moduli.');
    } catch (err: any) {
      setMessage(`Errore creazione: ${err.message}`);
    }
  }

  async function handleSaveRisposta(domandaId: string, valore: string) {
    if (isLocked) return;

    try {
      const nuevaRisposta: RispostaAziendale = {
        progetto_id: projectId,
        domanda_id: domandaId,
        valore_risposta: valore
      };

      await questionarioService.saveRisposta(nuevaRisposta);
      setRisposteMap({
        ...risposteMap,
        [domandaId]: nuevaRisposta
      });
      setMessage('Risposta salvata correttamente su Supabase.');
    } catch (err: any) {
      setMessage(`Errore salvataggio risposta: ${err.message}`);
    }
  }

  function handleSendLink(q: Questionario) {
    const clientEmail = 'cliente@azienda.it';
    const link = `${window.location.origin}/client-portal/questionnaire/${q.codice}?project=${projectId}`;
    navigator.clipboard.writeText(link);
    alert(`Link generato e copiato negli appunti per ${clientEmail}!\n\nURL: ${link}`);
  }

  if (loading) {
    return <div className="text-xs text-gray-400 p-6 font-mono text-center">Caricamento questionari e moduli Supabase...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER SEZIONE */}
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

      {message && <div className="p-3 bg-purple-950/40 border border-purple-800/60 rounded-xl text-purple-300 text-xs">{message}</div>}

      {/* SELETTORE QUESTIONARI ATTIVI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {questionari.map(q => {
          const isActive = activeQuestionarioId === q.id;
          return (
            <div
              key={q.id}
              onClick={() => setActiveQuestionarioId(q.id)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isActive ? 'bg-purple-950/30 border-purple-500 shadow-md' : 'bg-gray-950 border-gray-800 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 bg-gray-900 border border-gray-800 text-purple-400 font-mono text-[10px] font-bold rounded">
                  {q.codice}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isLocked ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                  {isLocked ? 'Completato & Bloccato' : 'In Compilazione'}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">{q.titolo}</h4>
              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{q.descrizione || 'Nessuna descrizione specificata.'}</p>
            </div>
          );
        })}
      </div>

      {/* DETTAGLIO DOMANDE DEL QUESTIONARIO ATTIVO */}
      {activeQuestionarioId && (
        <div className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-6">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-4">
            <div>
              <h4 className="text-sm font-bold text-white">
                {questionari.find(q => q.id === activeQuestionarioId)?.titolo}
              </h4>
              <p className="text-xs text-gray-400">Visualizzazione e compilazione a due righe (Domanda sopra, Risposta sotto).</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const q = questionari.find(item => item.id === activeQuestionarioId);
                  if (q) handleSendLink(q);
                }}
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
            {(domandeMap[activeQuestionarioId] || []).map((domanda, idx) => {
              const rispostaCorrente = risposteMap[domanda.id]?.valore_risposta || '';
              return (
                <div key={domanda.id} className="bg-gray-900/60 border border-gray-800 p-4 rounded-xl space-y-2">
                  
                  {/* Riga 1: Domanda Sopra */}
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>
                      <span className="text-purple-400 font-mono mr-2">D{idx + 1}.</span> {domanda.testo_domanda}
                    </span>
                    <span className="text-[10px] font-mono text-gray-400 uppercase bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                      {domanda.sezione} (Peso: {domanda.peso})
                    </span>
                  </div>

                  {/* Riga 2: Risposta Sotto */}
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

      {/* MODALE SELEZIONE MODULO DA LIBRERIA SUPABASE */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-white font-bold text-sm">Seleziona Modulo da Libreria Supabase</h3>
            <form onSubmit={handleCreateQuestionario} className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Codice Automatico</label>
                <input
                  type="text"
                  value={newCodice}
                  onChange={e => setNewCodice(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Titolo Questionario</label>
                <input
                  type="text"
                  placeholder="Es. Assessment Strategico & Commerciale"
                  value={newTitolo}
                  onChange={e => setNewTitolo(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Descrizione / Obiettivo</label>
                <textarea
                  placeholder="Descrizione sintetica del modulo..."
                  value={newDescrizione}
                  onChange={e => setNewDescrizione(e.target.value)}
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
                  Importa & Associa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
