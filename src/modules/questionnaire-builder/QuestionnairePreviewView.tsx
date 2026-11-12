'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface QuestionnairePreviewViewProps {
  companyCode: string;
  companyName: string;
  companyEmail?: string;
  questionario: any;
  onBackToComposer: () => void;
  onBackToList: () => void;
}

export function QuestionnairePreviewView({
  companyCode,
  companyName,
  companyEmail = '',
  questionario,
  onBackToComposer,
  onBackToList
}: QuestionnairePreviewViewProps) {
  const [modulesWithQuestions, setModulesWithQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>(questionario?.stato || 'Bozza');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Carica i moduli figli di questo questionario e le relative domande tramite modulo_id
  useEffect(() => {
    async function loadPreviewData() {
      if (!questionario?.id) return;
      setLoading(true);
      try {
        // 1. Recupera i moduli figli associati a questo questionario
        const { data: mods, error: modError } = await supabase
          .from('gos_moduli')
          .select('*')
          .eq('parent_questionario_id', questionario.id);

        if (modError) throw modError;

        if (!mods || mods.length === 0) {
          setModulesWithQuestions([]);
          return;
        }

        // 2. Recupera le domande associate ai moduli tramite il loro id (che corrisponde a modulo_id in gos_domande)
        const modIds = mods.map((m) => m.id);
        const { data: questions, error: qError } = await supabase
          .from('gos_domande')
          .select('*')
          .in('modulo_id', modIds)
          .order('ordine', { ascending: true });

        if (qError) throw qError;

        // 3. Unisce i moduli con le rispettive domande
        const combined = mods.map((m) => ({
          ...m,
          domande: (questions || []).filter((q) => q.modulo_id === m.id)
        }));

        setModulesWithQuestions(combined);
      } catch (err) {
        console.error('Errore nel caricamento anteprima questionario:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPreviewData();
  }, [questionario?.id, supabase]);

  // URL pubblico per la compilazione aziendale
  const publicLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/public/questionario/${questionario.id}`
      : `/public/questionario/${questionario.id}`;

  // Salva / Attiva il questionario su Supabase
  const handleActivateQuestionnaire = async () => {
    setActivating(true);
    try {
      const { error } = await supabase
        .from('gos_moduli')
        .update({ stato: 'Attivo' })
        .eq('id', questionario.id);

      if (error) throw error;
      setStatus('Attivo');
      alert('Questionario attivato e salvato con successo!');
    } catch (err: any) {
      alert('Errore durante il salvataggio: ' + (err.message || err));
    } finally {
      setActivating(false);
    }
  };

  // Copia link negli appunti
  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // Apri client email con oggetto e link precompilati
  const handleSendEmail = () => {
    if (status !== 'Attivo') {
      handleActivateQuestionnaire();
    }
    const subject = encodeURIComponent(`Questionario di Assessment — ${questionario.titolo} (${companyName})`);
    const body = encodeURIComponent(
      `Buongiorno,\n\nin allegato il link dedicato per la compilazione del questionario di assessment "${questionario.titolo}":\n\n${publicLink}\n\nCordiali saluti.`
    );
    window.location.href = `mailto:${companyEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-6">
      {/* BARRA AZIONI & INVIO LINK */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-gray-950 border border-gray-800 text-[#FF5500] font-mono text-xs font-bold rounded-lg uppercase">
                {questionario.codice_modulo}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase border ${
                  status === 'Attivo'
                    ? 'bg-emerald-950 border-emerald-800 text-emerald-400'
                    : 'bg-amber-950 border-amber-800 text-amber-400'
                }`}
              >
                {status}
              </span>
            </div>
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider pt-1">
              Anteprima &amp; Invio — {questionario.titolo}
            </h2>
            <p className="text-xs text-gray-400">
              Verifica i moduli inclusi e invia il link pubblico di compilazione a <strong className="text-white">{companyName}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onBackToComposer}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-all cursor-pointer border border-gray-700"
            >
              &lt;- Modifica Moduli
            </button>
            <button
              onClick={onBackToList}
              className="px-4 py-2.5 bg-gray-950 hover:bg-gray-800 text-gray-400 text-xs font-bold rounded-xl transition-all cursor-pointer border border-gray-800"
            >
              Lista Questionari
            </button>
          </div>
        </div>

        {/* BOX LINK PUBBLICO E PULSANTI INVIO */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <span className="text-[10px] font-mono uppercase text-gray-500 font-bold block">
              Link Pubblico di Compilazione Aziendale
            </span>
            <div className="text-xs font-mono text-emerald-400 truncate bg-gray-900 px-3 py-2 rounded-lg border border-gray-800">
              {publicLink}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {status !== 'Attivo' && (
              <button
                onClick={handleActivateQuestionnaire}
                disabled={activating}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider disabled:opacity-50"
              >
                {activating ? 'Salvataggio...' : 'Salva & Attiva'}
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer border border-gray-700 uppercase tracking-wider"
            >
              {copied ? '✓ Link Copiato' : 'Copia Link'}
            </button>

            <button
              onClick={handleSendEmail}
              className="px-5 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-950/50 transition-all cursor-pointer uppercase tracking-wider"
            >
              ✉️ Invia via Mail
            </button>
          </div>
        </div>
      </div>

      {/* CONTENUTO ANTEPRIMA MODULI E DOMANDE */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="border-b border-gray-800 pb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Struttura Questionario ({modulesWithQuestions.length} Moduli)
          </h3>
          {questionario.descrizione && (
            <p className="text-xs text-gray-400 mt-1">{questionario.descrizione}</p>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-gray-400">
            Caricamento struttura e domande in corso...
          </div>
        ) : modulesWithQuestions.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-3">
            <p className="text-sm text-gray-400">
              Nessun modulo inserito in questo questionario. Torna alla composizione per aggiungerne almeno uno prima dell&apos;invio.
            </p>
            <button
              onClick={onBackToComposer}
              className="px-5 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl cursor-pointer uppercase tracking-wider"
            >
              Vai alla Composizione
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            {modulesWithQuestions.map((mod, idx) => (
              <div key={mod.id} className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-4">
                <div className="flex justify-between items-start border-b border-gray-900 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-[#FF5500] font-bold uppercase">
                      Modulo {idx + 1} • {mod.codice_modulo}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{mod.titolo}</h4>
                    {mod.descrizione && (
                      <p className="text-xs text-gray-400 mt-0.5">{mod.descrizione}</p>
                    )}
                  </div>
                  <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 rounded-lg font-mono text-[10px] text-gray-400">
                    {mod.domande.length} domande
                  </span>
                </div>

                {mod.domande.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    Nessuna domanda registrata in questo modulo.
                  </p>
                ) : (
                  <ol className="space-y-2.5 text-xs">
                    {mod.domande.map((dom: any, qIdx: number) => (
                      <li key={dom.id} className="bg-gray-900/70 border border-gray-800/80 rounded-lg p-3 flex justify-between items-start gap-4">
                        <div className="text-gray-200">
                          <span className="font-mono text-[#FF5500] font-bold mr-2">{qIdx + 1}.</span>
                          {dom.testo_domanda}
                        </div>
                        <span className="px-2 py-0.5 bg-gray-950 border border-gray-800 rounded font-mono text-[10px] text-gray-400 whitespace-nowrap uppercase">
                          {dom.tipo_risposta === 'testo_breve'
                            ? 'Testo (max 250)'
                            : dom.tipo_risposta === 'multipla'
                            ? 'Scelta Multipla'
                            : 'Rating 1-5'}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
