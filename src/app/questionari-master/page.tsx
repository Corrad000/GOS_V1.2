'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { generateGlobalActivityCode } from '@/utils/codeGenerator';

function QuestionariMasterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const questionnaireId = searchParams?.get('id');

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [titolo, setTitolo] = useState<string>('');
  const [descrizione, setDescrizione] = useState<string>('');
  const [stato, setStato] = useState<string>('Attivo');
  const [codiceModulo, setCodiceModulo] = useState<string>('');

  // Domanda iniziale (in creazione) o lista domande (in modifica)
  const [domandaIniziale, setDomandaIniziale] = useState<string>('');
  const [tipoRispostaIniziale, setTipoRispostaIniziale] = useState<string>('rating_1_5');
  const [domande, setDomande] = useState<any[]>([]);
  const [nuovaDomandaTesto, setNuovaDomandaTesto] = useState<string>('');
  const [nuovaDomandaTipo, setNuovaDomandaTipo] = useState<string>('rating_1_5');

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>('');

  // Creazione rapida categoria se non presente
  const [showQuickCat, setShowQuickCat] = useState<boolean>(false);
  const [quickCatName, setQuickCatName] = useState<string>('');
  const [quickCatDesc, setQuickCatDesc] = useState<string>('');

  useEffect(() => {
    async function initPage() {
      setLoading(true);
      try {
        const { data: cats, error: catErr } = await supabase
          .from('gos_categorie')
          .select('*')
          .order('nome');

        if (catErr) throw catErr;
        const catList = cats || [];
        setCategories(catList);

        if (questionnaireId) {
          const { data: modRow, error: modErr } = await supabase
            .from('gos_moduli')
            .select('*')
            .eq('id', questionnaireId)
            .single();

          if (modErr) throw modErr;

          if (modRow) {
            setTitolo(modRow.titolo || '');
            setDescrizione(modRow.descrizione || '');
            setStato(modRow.stato || 'Attivo');
            setCodiceModulo(modRow.codice_modulo || '');
            setSelectedCategoryId(modRow.categoria_id ? String(modRow.categoria_id) : (catList[0]?.id ? String(catList[0].id) : ''));

            const { data: domRows } = await supabase
              .from('gos_domande')
              .select('*')
              .eq('modulo_id', modRow.id)
              .order('ordine', { ascending: true });

            setDomande(domRows || []);
          }
        } else {
          if (catList.length > 0) {
            setSelectedCategoryId(String(catList[0].id));
          }
        }
      } catch (err: any) {
        console.error('Errore caricamento pagina questionari master:', err?.message || err);
        setFeedback('Errore caricamento dati: ' + (err?.message || err));
      } finally {
        setLoading(false);
      }
    }

    initPage();
  }, [questionnaireId, supabase]);

  const handleQuickCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCatName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('gos_categorie')
        .insert([{ nome: quickCatName.trim(), descrizione: quickCatDesc.trim() || null }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setCategories((prev) => [...prev, data]);
        setSelectedCategoryId(String(data.id));
        setQuickCatName('');
        setQuickCatDesc('');
        setShowQuickCat(false);
      }
    } catch (err: any) {
      alert('Errore creazione categoria: ' + (err?.message || err));
    }
  };

  const handleSaveQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');

    if (!selectedCategoryId) {
      alert('Seleziona una categoria prima di salvare il questionario master.');
      return;
    }
    if (!titolo.trim()) {
      alert('Inserisci il titolo del questionario master.');
      return;
    }

    setSaving(true);
    try {
      const catObj = categories.find((c) => String(c.id) === String(selectedCategoryId));

      if (questionnaireId) {
        const { error: updErr } = await supabase
          .from('gos_moduli')
          .update({
            categoria_id: selectedCategoryId,
            titolo: titolo.trim(),
            descrizione: descrizione.trim() || null,
            stato
          })
          .eq('id', questionnaireId);

        if (updErr) throw updErr;
        setFeedback('Questionario master aggiornato con successo.');
      } else {
        if (!domandaIniziale.trim()) {
          alert('Inserisci almeno una domanda iniziale per il questionario master.');
          setSaving(false);
          return;
        }

        const generatedCode = await generateGlobalActivityCode('MASTER', 'QST');
        const { data: insertedMod, error: insErr } = await supabase
          .from('gos_moduli')
          .insert([
            {
              categoria_id: selectedCategoryId,
              company_code: null,
              codice_modulo: generatedCode,
              titolo: titolo.trim(),
              descrizione: descrizione.trim() || 'Creato da pagina dedicata Questionari Master',
              stato,
              versione: '1.0'
            }
          ])
          .select()
          .single();

        if (insErr) throw insErr;

        if (insertedMod) {
          const { data: firstDom } = await supabase
            .from('gos_domande')
            .insert([
              {
                modulo_id: insertedMod.id,
                sezione: catObj?.nome || 'Generale',
                testo_domanda: domandaIniziale.trim(),
                tipo_risposta: tipoRispostaIniziale,
                peso: 1.0,
                ordine: 1
              }
            ])
            .select()
            .single();

          setCodiceModulo(insertedMod.codice_modulo || generatedCode);
          if (firstDom) setDomande([firstDom]);
          setFeedback('Questionario master creato e salvato.');
          router.replace(`/questionari-master?id=${insertedMod.id}`);
        }
      }
    } catch (err: any) {
      console.error('Errore salvataggio questionario master:', err?.message || err);
      alert('Errore durante il salvataggio: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionnaireId || !nuovaDomandaTesto.trim()) return;

    const catObj = categories.find((c) => String(c.id) === String(selectedCategoryId));
    try {
      const nextOrder = domande.length + 1;
      const { data, error } = await supabase
        .from('gos_domande')
        .insert([
          {
            modulo_id: questionnaireId,
            sezione: catObj?.nome || 'Generale',
            testo_domanda: nuovaDomandaTesto.trim(),
            tipo_risposta: nuovaDomandaTipo,
            peso: 1.0,
            ordine: nextOrder
          }
        ])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setDomande((prev) => [...prev, data]);
        setNuovaDomandaTesto('');
      }
    } catch (err: any) {
      alert('Errore aggiunta domanda: ' + (err?.message || err));
    }
  };

  const handleDeleteDomanda = async (domId: string) => {
    if (!confirm('Eliminare questa domanda?')) return;
    try {
      const { error } = await supabase.from('gos_domande').delete().eq('id', domId);
      if (error) throw error;
      setDomande((prev) => prev.filter((d) => d.id !== domId));
    } catch (err: any) {
      alert('Errore eliminazione domanda: ' + (err?.message || err));
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-orange-950 text-[#FF5500] border border-orange-800 font-mono text-[10px] font-bold uppercase">
                {questionnaireId ? `MODIFICA • ${codiceModulo || 'QST'}` : 'NUOVO QUESTIONARIO MASTER'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight mt-1">
              Lavorazione Questionari Master
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Assegna la categoria, configura i metadati e gestisci le domande in un&apos;area dedicata.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#0B132B] hover:bg-gray-800 border border-gray-700 text-xs font-bold text-white rounded-none cursor-pointer transition-all"
          >
            ← Torna alla Dashboard
          </button>
        </div>

        {loading ? (
          <div className="bg-[#0B132B] border border-gray-800 p-8 text-center text-xs font-mono text-gray-400">
            Caricamento dati in corso...
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSaveQuestionnaire}
              className="bg-[#0B132B] border border-gray-800 p-6 rounded-none space-y-5 shadow-xl"
            >
              {/* ASSEGNAZIONE CATEGORIA (OBBLIGATORIA) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-gray-300 font-bold uppercase text-[11px] tracking-wider">
                    Categoria Master *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickCat((v) => !v)}
                    className="text-[11px] font-bold text-[#FF5500] hover:underline cursor-pointer"
                  >
                    {showQuickCat ? 'Chiudi nuova categoria' : '+ Nuova Categoria'}
                  </button>
                </div>

                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  required
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                >
                  <option value="">-- Seleziona una categoria --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nome}
                    </option>
                  ))}
                </select>

                {showQuickCat && (
                  <div className="bg-gray-950 border border-gray-800 p-4 space-y-3 mt-2">
                    <div className="text-[11px] font-bold text-white uppercase">Crea Categoria Rapida</div>
                    <input
                      type="text"
                      placeholder="Nome nuova categoria..."
                      value={quickCatName}
                      onChange={(e) => setQuickCatName(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                    />
                    <input
                      type="text"
                      placeholder="Descrizione opzionale..."
                      value={quickCatDesc}
                      onChange={(e) => setQuickCatDesc(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleQuickCreateCategory}
                        className="px-4 py-1.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-none cursor-pointer"
                      >
                        Salva Categoria
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-gray-300 mb-1 font-bold uppercase text-[11px] tracking-wider">
                    Titolo del Questionario Master *
                  </label>
                  <input
                    type="text"
                    placeholder="Es. Assessment Controllo di Gestione & Cash Flow"
                    value={titolo}
                    onChange={(e) => setTitolo(e.target.value)}
                    required
                    className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 mb-1 font-bold uppercase text-[11px] tracking-wider">
                    Stato
                  </label>
                  <select
                    value={stato}
                    onChange={(e) => setStato(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  >
                    <option value="Attivo">Attivo</option>
                    <option value="Bozza">Bozza</option>
                    <option value="Archiviato">Archiviato</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 mb-1 font-bold uppercase text-[11px] tracking-wider">
                  Descrizione / Obiettivo
                </label>
                <textarea
                  rows={2}
                  placeholder="Descrivi lo scopo del questionario master..."
                  value={descrizione}
                  onChange={(e) => setDescrizione(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              {!questionnaireId && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-800">
                  <div className="md:col-span-2">
                    <label className="block text-gray-300 mb-1 font-bold uppercase text-[11px] tracking-wider">
                      Domanda Iniziale *
                    </label>
                    <input
                      type="text"
                      placeholder="Es. Esiste un budget mensile aggiornato con rolling forecast?"
                      value={domandaIniziale}
                      onChange={(e) => setDomandaIniziale(e.target.value)}
                      required
                      className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 mb-1 font-bold uppercase text-[11px] tracking-wider">
                      Tipo Risposta
                    </label>
                    <select
                      value={tipoRispostaIniziale}
                      onChange={(e) => setTipoRispostaIniziale(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                    >
                      <option value="rating_1_5">Valutazione numerica (1 a 5)</option>
                      <option value="text">Testo libero</option>
                      <option value="boolean">Sì / No (Booleana)</option>
                      <option value="choice">Selezione multipla</option>
                    </select>
                  </div>
                </div>
              )}

              {feedback && (
                <div className="text-xs font-mono text-emerald-300 bg-gray-950 border border-emerald-800 px-3.5 py-2">
                  {feedback}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-none cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-none shadow cursor-pointer uppercase tracking-wider disabled:opacity-50"
                >
                  {saving
                    ? 'Salvataggio...'
                    : questionnaireId
                      ? 'Salva Modifiche'
                      : 'Crea Questionario Master'}
                </button>
              </div>
            </form>

            {/* GESTIONE DOMANDE QUANDO SI LAVORA UN QUESTIONARIO ESISTENTE */}
            {questionnaireId && (
              <div className="bg-[#0B132B] border border-gray-800 p-6 rounded-none space-y-5 shadow-xl">
                <div className="border-b border-gray-800 pb-3">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">
                    Domande del Questionario ({domande.length})
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Aggiungi o rimuovi domande associate a questo questionario master.
                  </p>
                </div>

                <form onSubmit={handleAddDomanda} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Scrivi una nuova domanda..."
                    value={nuovaDomandaTesto}
                    onChange={(e) => setNuovaDomandaTesto(e.target.value)}
                    className="md:col-span-2 bg-gray-950 border border-gray-700 px-3.5 py-2 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                    required
                  />
                  <select
                    value={nuovaDomandaTipo}
                    onChange={(e) => setNuovaDomandaTipo(e.target.value)}
                    className="bg-gray-950 border border-gray-700 px-3 py-2 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  >
                    <option value="rating_1_5">Valutazione (1-5)</option>
                    <option value="text">Testo libero</option>
                    <option value="boolean">Sì / No</option>
                    <option value="choice">Selezione multipla</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-none cursor-pointer uppercase tracking-wider"
                  >
                    + Aggiungi Domanda
                  </button>
                </form>

                {domande.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-800 bg-gray-950">
                    Nessuna domanda presente per questo questionario.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {domande.map((d, idx) => (
                      <div
                        key={d.id}
                        className="bg-slate-800/90 border border-slate-600/80 p-3.5 flex items-center justify-between gap-4"
                      >
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-mono text-[#FF5500] uppercase font-bold">
                            #{idx + 1} • {d.tipo_risposta}
                          </div>
                          <div className="text-xs font-semibold text-white">{d.testo_domanda}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteDomanda(d.id)}
                          className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-[11px] font-bold rounded-none cursor-pointer"
                        >
                          Elimina
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default function QuestionariMasterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-950 text-gray-400 p-10 text-xs font-mono">
          Caricamento area Questionari Master...
        </main>
      }
    >
      <QuestionariMasterContent />
    </Suspense>
  );
}
