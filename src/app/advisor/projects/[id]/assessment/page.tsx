'use client';

import { useEffect, useState, use, Suspense } from 'react';
import { projectService, Progetto } from '@/services/projectService';
import { questionarioService, Questionario, Domanda, RispostaAziendale } from '@/services/questionarioService';
import Link from 'next/link';

function ProjectAssessmentContent({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const [progetto, setProgetto] = useState<Progetto | null>(null);
  const [questionari, setQuestionari] = useState<Questionario[]>([]);
  const [selectedQuestionarioId, setSelectedQuestionarioId] = useState<string>('');
  const [domande, setDomande] = useState<Domanda[]>([]);
  const [risposte, setRisposte] = useState<Record<string, { valore: string; note: string }>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    async function initData() {
      try {
        const [projData, qList] = await Promise.all([
          projectService.getProjectById(projectId),
          questionarioService.getQuestionari(),
        ]);
        setProgetto(projData);
        setQuestionari(qList);

        if (qList.length > 0) {
          setSelectedQuestionarioId(qList[0].id);
        }
      } catch (err: any) {
        alert(`Errore caricamento: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    initData();
  }, [projectId]);

  useEffect(() => {
    if (!selectedQuestionarioId) return;
    async function loadQData() {
      try {
        const [dList, rList] = await Promise.all([
          questionarioService.getDomandeByQuestionario(selectedQuestionarioId),
          questionarioService.getRisposteByProgetto(projectId),
        ]);
        setDomande(dList);

        const map: Record<string, { valore: string; note: string }> = {};
        rList.forEach((r) => {
          map[r.domanda_id] = {
            valore: r.valore_risposta || '',
            note: r.note_advisor || '',
          };
        });
        setRisposte(map);
      } catch (err: any) {
        alert(`Errore caricamento questionario: ${err.message}`);
      }
    }
    loadQData();
  }, [selectedQuestionarioId, projectId]);

  const handleValueChange = (domandaId: string, valore: string) => {
    setRisposte((prev) => ({
      ...prev,
      [domandaId]: { ...prev[domandaId], valore },
    }));
  };

  const handleNoteChange = (domandaId: string, note: string) => {
    setRisposte((prev) => ({
      ...prev,
      [domandaId]: { ...prev[domandaId], note },
    }));
  };

  const handleSave = async (domandaId: string) => {
    setSavingId(domandaId);
    try {
      const item = risposte[domandaId] || { valore: '', note: '' };
      await questionarioService.saveRisposta({
        progetto_id: projectId,
        domanda_id: domandaId,
        valore_risposta: item.valore,
        note_advisor: item.note,
      });
    } catch (err: any) {
      alert(`Errore salvataggio risposta: ${err.message}`);
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
        Caricamento Assessment in corso...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono px-3 py-1 bg-gray-900 border border-gray-800 rounded text-gray-400">
                {progetto?.codice_progetto || 'PRJ-N/A'}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-white">Assessment & Diagnostica</h1>
            <p className="text-sm text-gray-400 mt-1">Incarico: {progetto?.titolo}</p>
          </div>
          <Link
            href={`/advisor/projects/${projectId}`}
            className="px-4 py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-sm rounded-lg transition-colors"
          >
            ← Torna al Progetto
          </Link>
        </div>

        {/* Selettore Modulo Questionario */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Seleziona Modulo di Diagnostica</h3>
            <p className="text-xs text-gray-400 mt-0.5">Scegli quale questionario compilare per questo cliente</p>
          </div>
          <select
            value={selectedQuestionarioId}
            onChange={(e) => setSelectedQuestionarioId(e.target.value)}
            className="w-full md:w-80 bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {questionari.map((q) => (
              <option key={q.id} value={q.id}>
                {q.codice} - {q.titolo}
              </option>
            ))}
          </select>
        </div>

        {/* Compilazione Domande */}
        <div className="space-y-4">
          {domande.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-gray-800 rounded-2xl text-gray-500 text-sm bg-gray-900">
              Nessuna domanda presente in questo modulo o nessun modulo selezionato.
            </div>
          ) : (
            domande.map((d, index) => {
              const currentItem = risposte[d.id] || { valore: '', note: '' };
              return (
                <div key={d.id} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-blue-950 text-blue-300 border border-blue-800 rounded">
                          #{index + 1}
                        </span>
                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 bg-gray-950 border border-gray-800 text-gray-400 rounded">
                          {d.sezione}
                        </span>
                        <span className="text-[10px] text-gray-500">Peso: {d.peso}</span>
                      </div>
                      <h4 className="text-base font-bold text-white">{d.testo_domanda}</h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-800/60">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-medium text-gray-400 mb-1">Valutazione / Risposta</label>
                      <input
                        type="text"
                        value={currentItem.valore}
                        onChange={(e) => handleValueChange(d.id, e.target.value)}
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="es. Ottimale, Critico, 1-5..."
                      />
                    </div>
                    <div className="md:col-span-2 flex gap-2 items-end">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-400 mb-1">Note & Osservazioni Advisor</label>
                        <input
                          type="text"
                          value={currentItem.note}
                          onChange={(e) => handleNoteChange(d.id, e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                          placeholder="Dettagli e riscontri emersi..."
                        />
                      </div>
                      <button
                        onClick={() => handleSave(d.id)}
                        disabled={savingId === d.id}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors shrink-0"
                      >
                        {savingId === d.id ? 'Salvataggio...' : 'Salva'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </main>
  );
}

export default function ProjectAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">Caricamento...</main>}>
      <ProjectAssessmentContent params={params} />
    </Suspense>
  );
}
