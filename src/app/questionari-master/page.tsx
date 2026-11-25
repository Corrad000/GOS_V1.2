'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { generateGlobalActivityCode } from '@/utils/codeGenerator';
import {
  RispostaConfigMascherina,
  DEFAULT_DOMANDA_CONFIG,
  parseOpzioniList,
  type DomandaConfig,
} from '@/app/components/questionari/RispostaConfigMascherina';

function hydrateConfigFromDomanda(d: any): DomandaConfig {
  const opts = parseOpzioniList(d?.opzioni ?? d?.scelte ?? d?.options ?? '');
  return {
    opzioniText: opts.join(', '),
    ratingMin: Number(d?.rating_min ?? 1) || 1,
    ratingMax: Number(d?.rating_max ?? 5) || 5,
    ratingLabelMin: d?.rating_label_min || 'Minimo / Insufficiente',
    ratingLabelMax: d?.rating_label_max || 'Massimo / Eccellente',
    peso: d?.peso !== undefined && d?.peso !== null ? Number(d.peso) : 1.0,
    sezioneCustom: d?.sezione || '',
  };
}

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

  const [domandaIniziale, setDomandaIniziale] = useState<string>('');
  const [tipoRispostaIniziale, setTipoRispostaIniziale] = useState<string>('rating_1_5');
  const [configIniziale, setConfigIniziale] = useState<DomandaConfig>({ ...DEFAULT_DOMANDA_CONFIG });

  const [domande, setDomande] = useState<any[]>([]);
  const [compilazioni, setCompilazioni] = useState<any[]>([]);
  const [nuovaDomandaTesto, setNuovaDomandaTesto] = useState<string>('');
  const [nuovaDomandaTipo, setNuovaDomandaTipo] = useState<string>('rating_1_5');
  const [configNuovaDomanda, setConfigNuovaDomanda] = useState<DomandaConfig>({
    ...DEFAULT_DOMANDA_CONFIG,
  });

  const [editingDomandaId, setEditingDomandaId] = useState<string | null>(null);
  const [editingDomandaTesto, setEditingDomandaTesto] = useState<string>('');
  const [editingDomandaTipo, setEditingDomandaTipo] = useState<string>('rating_1_5');
  const [configEditingDomanda, setConfigEditingDomanda] = useState<DomandaConfig>({
    ...DEFAULT_DOMANDA_CONFIG,
  });
  const [savingDomanda, setSavingDomanda] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>('');
  const [clientLink, setClientLink] = useState<string>('');
  const [generatingLink, setGeneratingLink] = useState<boolean>(false);

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
            setSelectedCategoryId(
              modRow.categoria_id
                ? String(modRow.categoria_id)
                : catList[0]?.id
                  ? String(catList[0].id)
                  : ''
            );

            const [{ data: domRows }, { data: assRows }] = await Promise.all([
              supabase
                .from('gos_domande')
                .select('*')
                .eq('modulo_id', modRow.id)
                .order('ordine', { ascending: true }),
              supabase
                .from('gos_questionari_assegnati')
                .select('*')
                .eq('modulo_id', modRow.id)
                .order('created_at', { ascending: false }),
            ]);

            setDomande(domRows || []);
            setCompilazioni(assRows || []);
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

  const handleGenerateClientLink = async () => {
    if (!questionnaireId) return;
    setGeneratingLink(true);
    try {
      const token = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      const { data: insertedAss, error } = await supabase
        .from('gos_questionari_assegnati')
        .insert([
          {
            modulo_id: questionnaireId,
            token,
            stato: 'Inviato',
            risposte: {},
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (insertedAss) {
        setCompilazioni((prev) => [insertedAss, ...prev]);
      }

      const url = `${window.location.origin}/questionari-master/${token}`;
      setClientLink(url);
      await navigator.clipboard.writeText(url);
      setFeedback(`Link cliente copiato: ${url}`);
    } catch (err: any) {
      alert('Errore generazione link: ' + (err?.message || err));
    } finally {
      setGeneratingLink(false);
    }
  };

  const buildDomandaPayload = (params: {
    moduloId: string;
    testo: string;
    tipo: string;
    ordine: number;
    defaultSezione: string;
    cfg: DomandaConfig;
  }) => {
    const isHeader = params.tipo === 'section_header';
    const hasOptions = params.tipo === 'choice' || params.tipo === 'boolean';
    const opzioniArray = hasOptions ? parseOpzioniList(params.cfg.opzioniText) : [];

    const basePayload: Record<string, any> = {
      modulo_id: params.moduloId,
      sezione: isHeader
        ? params.testo
        : params.cfg.sezioneCustom.trim() || params.defaultSezione || 'Generale',
      testo_domanda: params.testo,
      tipo_risposta: params.tipo,
      peso: isHeader ? 0 : Number(params.cfg.peso) || 1.0,
      ordine: params.ordine,
    };

    const extendedPayload: Record<string, any> = {
      ...basePayload,
      opzioni: hasOptions && opzioniArray.length > 0 ? opzioniArray : null,
      rating_min: params.tipo === 'rating_1_5' ? Number(params.cfg.ratingMin) || 1 : null,
      rating_max: params.tipo === 'rating_1_5' ? Number(params.cfg.ratingMax) || 5 : null,
      rating_label_min:
        params.tipo === 'rating_1_5' ? params.cfg.ratingLabelMin.trim() || null : null,
      rating_label_max:
        params.tipo === 'rating_1_5' ? params.cfg.ratingLabelMax.trim() || null : null,
    };

    return { basePayload, extendedPayload };
  };

  const insertDomandaResilient = async (params: {
    moduloId: string;
    testo: string;
    tipo: string;
    ordine: number;
    defaultSezione: string;
    cfg: DomandaConfig;
  }) => {
    const { basePayload, extendedPayload } = buildDomandaPayload(params);

    const extRes = await supabase
      .from('gos_domande')
      .insert([extendedPayload])
      .select()
      .single();

    if (!extRes.error && extRes.data) {
      return extRes.data;
    }

    const baseRes = await supabase
      .from('gos_domande')
      .insert([basePayload])
      .select()
      .single();

    if (baseRes.error) throw baseRes.error;
    return { ...baseRes.data, ...extendedPayload, id: baseRes.data?.id };
  };

  const updateDomandaResilient = async (
    domId: string,
    params: {
      moduloId: string;
      testo: string;
      tipo: string;
      ordine: number;
      defaultSezione: string;
      cfg: DomandaConfig;
    }
  ) => {
    const { basePayload, extendedPayload } = buildDomandaPayload(params);

    const extRes = await supabase
      .from('gos_domande')
      .update(extendedPayload)
      .eq('id', domId)
      .select()
      .single();

    if (!extRes.error && extRes.data) {
      return extRes.data;
    }

    const baseRes = await supabase
      .from('gos_domande')
      .update(basePayload)
      .eq('id', domId)
      .select()
      .single();

    if (baseRes.error) throw baseRes.error;
    return { ...(baseRes.data || {}), ...extendedPayload };
  };

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
            stato,
          })
          .eq('id', questionnaireId);

        if (updErr) throw updErr;
        setFeedback('Questionario master aggiornato con successo.');
      } else {
        if (!domandaIniziale.trim()) {
          alert('Inserisci almeno una domanda o intestazione iniziale per il questionario master.');
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
              versione: '1.0',
            },
          ])
          .select()
          .single();

        if (insErr) throw insErr;

        if (insertedMod) {
          const firstDom = await insertDomandaResilient({
            moduloId: insertedMod.id,
            testo: domandaIniziale.trim(),
            tipo: tipoRispostaIniziale,
            ordine: 1,
            defaultSezione: catObj?.nome || 'Generale',
            cfg: configIniziale,
          });

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
    const cleanText = nuovaDomandaTesto.trim();

    try {
      const nextOrder = domande.length + 1;
      const created = await insertDomandaResilient({
        moduloId: questionnaireId,
        testo: cleanText,
        tipo: nuovaDomandaTipo,
        ordine: nextOrder,
        defaultSezione: catObj?.nome || 'Generale',
        cfg: configNuovaDomanda,
      });

      if (created) {
        setDomande((prev) => [...prev, created]);
        setNuovaDomandaTesto('');
        setConfigNuovaDomanda({ ...DEFAULT_DOMANDA_CONFIG });
      }
    } catch (err: any) {
      alert('Errore aggiunta voce: ' + (err?.message || err));
    }
  };

  const handleStartEditDomanda = (domanda: any) => {
    setEditingDomandaId(domanda.id);
    setEditingDomandaTesto(domanda.testo_domanda || '');
    setEditingDomandaTipo(domanda.tipo_risposta || 'rating_1_5');
    setConfigEditingDomanda(hydrateConfigFromDomanda(domanda));
  };

  const handleCancelEditDomanda = () => {
    setEditingDomandaId(null);
    setEditingDomandaTesto('');
    setEditingDomandaTipo('rating_1_5');
    setConfigEditingDomanda({ ...DEFAULT_DOMANDA_CONFIG });
  };

  const handleSaveEditDomanda = async (domId: string, ordineIdx: number) => {
    const cleanText = editingDomandaTesto.trim();
    if (!cleanText || !questionnaireId) {
      alert('Il testo non può essere vuoto.');
      return;
    }

    const catObj = categories.find((c) => String(c.id) === String(selectedCategoryId));
    setSavingDomanda(true);
    try {
      const updated = await updateDomandaResilient(domId, {
        moduloId: questionnaireId,
        testo: cleanText,
        tipo: editingDomandaTipo,
        ordine: ordineIdx + 1,
        defaultSezione: catObj?.nome || 'Generale',
        cfg: configEditingDomanda,
      });

      setDomande((prev) =>
        prev.map((d) => (d.id === domId ? { ...d, ...(updated || {}) } : d))
      );
      handleCancelEditDomanda();
    } catch (err: any) {
      alert('Errore modifica voce: ' + (err?.message || err));
    } finally {
      setSavingDomanda(false);
    }
  };

  const handleDeleteDomanda = async (domId: string) => {
    if (!confirm('Eliminare questa voce?')) return;
    try {
      const { error } = await supabase.from('gos_domande').delete().eq('id', domId);
      if (error) throw error;
      if (editingDomandaId === domId) {
        handleCancelEditDomanda();
      }
      setDomande((prev) => prev.filter((d) => d.id !== domId));
    } catch (err: any) {
      alert('Errore eliminazione voce: ' + (err?.message || err));
    }
  };

  const renderTipoBadge = (d: any) => {
    const tipo = d.tipo_risposta;
    if (tipo === 'section_header') return 'INTESTAZIONE SEZIONE';
    if (tipo === 'choice') {
      const opts = parseOpzioniList(d.opzioni ?? d.scelte ?? d.options ?? '');
      return opts.length > 0 ? `CHOICE (${opts.join(' / ')})` : 'CHOICE';
    }
    if (tipo === 'boolean') {
      const opts = parseOpzioniList(d.opzioni ?? d.scelte ?? d.options ?? '');
      return opts.length > 0 ? `SÌ/NO [FLAG: ${opts[0]}]` : 'SÌ/NO';
    }
    if (tipo === 'rating_1_5') {
      const min = d.rating_min ?? 1;
      const max = d.rating_max ?? 5;
      return `RATING (${min}–${max})`;
    }
    return tipo || 'TEXT';
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
              Assegna la categoria, configura i metadati e gestisci intestazioni, domande e impostazioni di risposta.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {questionnaireId && (
              <button
                type="button"
                disabled={generatingLink}
                onClick={handleGenerateClientLink}
                className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 border border-orange-500 text-xs font-bold text-white rounded-none cursor-pointer transition-all uppercase tracking-wider disabled:opacity-50"
              >
                {generatingLink ? 'Generazione...' : clientLink ? 'Link Copiato ✓' : 'Genera Link Cliente'}
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-[#0B132B] hover:bg-gray-800 border border-gray-700 text-xs font-bold text-white rounded-none cursor-pointer transition-all"
            >
              ← Torna alla Dashboard
            </button>
          </div>
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
                <div className="space-y-3 pt-2 border-t border-gray-800">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-gray-300 mb-1 font-bold uppercase text-[11px] tracking-wider">
                        Domanda o Intestazione Iniziale *
                      </label>
                      <input
                        type="text"
                        placeholder="Es. Sezione 1 — Controllo di Gestione oppure una domanda..."
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
                        <option value="section_header">Intestazione</option>
                      </select>
                    </div>
                  </div>

                  <RispostaConfigMascherina
                    tipo={tipoRispostaIniziale}
                    cfg={configIniziale}
                    setCfg={setConfigIniziale}
                  />
                </div>
              )}

              {feedback && (
                <div className="text-xs font-mono text-emerald-300 bg-gray-950 border border-emerald-800 px-3.5 py-2 break-all">
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

            {questionnaireId && (
              <div className="bg-[#0B132B] border border-gray-800 p-6 rounded-none space-y-5 shadow-xl">
                <div className="border-b border-gray-800 pb-3">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">
                    Domande del Questionario ({domande.length})
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Aggiungi intestazioni di sezione o domande, imposta opzioni/rating, modificale o rimuovile.
                  </p>
                </div>

                <form onSubmit={handleAddDomanda} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <input
                      type="text"
                      placeholder={
                        nuovaDomandaTipo === 'section_header'
                          ? 'Scrivi il titolo della nuova sezione...'
                          : 'Scrivi una nuova domanda...'
                      }
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
                      <option value="section_header">Intestazione</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-none cursor-pointer uppercase tracking-wider"
                    >
                      {nuovaDomandaTipo === 'section_header'
                        ? '+ Aggiungi Intestazione'
                        : '+ Aggiungi Domanda'}
                    </button>
                  </div>

                  <RispostaConfigMascherina
                    tipo={nuovaDomandaTipo}
                    cfg={configNuovaDomanda}
                    setCfg={setConfigNuovaDomanda}
                  />
                </form>

                {domande.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400 border border-dashed border-gray-800 bg-gray-950">
                    Nessuna domanda presente per questo questionario.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {domande.map((d, idx) => {
                      const isEditing = editingDomandaId === d.id;
                      const isHeader = d.tipo_risposta === 'section_header';

                      return (
                        <div
                          key={d.id}
                          className={
                            isHeader
                              ? 'bg-[#111827] border-l-4 border-l-[#FF5500] border border-gray-700 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4'
                              : 'bg-slate-800/90 border border-slate-600/80 p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4'
                          }
                        >
                          <div className="flex-1 space-y-1.5">
                            <div className="text-[10px] font-mono text-[#FF5500] uppercase font-bold">
                              #{idx + 1} • {renderTipoBadge(d)}
                            </div>

                            {isEditing ? (
                              <div className="space-y-2.5 pt-1">
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="text"
                                    value={editingDomandaTesto}
                                    onChange={(e) => setEditingDomandaTesto(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        void handleSaveEditDomanda(d.id, idx);
                                      }
                                      if (e.key === 'Escape') {
                                        handleCancelEditDomanda();
                                      }
                                    }}
                                    autoFocus
                                    className="flex-1 bg-gray-950 border border-[#FF5500] px-3 py-1.5 rounded-none text-white text-xs focus:outline-none"
                                  />
                                  <select
                                    value={editingDomandaTipo}
                                    onChange={(e) => setEditingDomandaTipo(e.target.value)}
                                    className="bg-gray-950 border border-gray-700 px-2.5 py-1.5 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                                  >
                                    <option value="rating_1_5">Valutazione (1-5)</option>
                                    <option value="text">Testo libero</option>
                                    <option value="boolean">Sì / No</option>
                                    <option value="choice">Selezione multipla</option>
                                    <option value="section_header">Intestazione</option>
                                  </select>
                                </div>

                                <RispostaConfigMascherina
                                  tipo={editingDomandaTipo}
                                  cfg={configEditingDomanda}
                                  setCfg={setConfigEditingDomanda}
                                />
                              </div>
                            ) : (
                              <div
                                className={
                                  isHeader
                                    ? 'text-xs font-extrabold uppercase tracking-wider text-white'
                                    : 'text-xs font-semibold text-white'
                                }
                              >
                                {d.testo_domanda}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={savingDomanda}
                                  onClick={() => void handleSaveEditDomanda(d.id, idx)}
                                  className="px-2.5 py-1 bg-[#FF5500] hover:bg-orange-600 text-white text-[11px] font-bold rounded-none cursor-pointer disabled:opacity-50"
                                >
                                  {savingDomanda ? 'Salvataggio...' : 'Salva'}
                                </button>
                                <button
                                  type="button"
                                  disabled={savingDomanda}
                                  onClick={handleCancelEditDomanda}
                                  className="px-2.5 py-1 bg-gray-950 hover:bg-gray-900 text-gray-300 border border-gray-700 text-[11px] font-bold rounded-none cursor-pointer disabled:opacity-50"
                                >
                                  Annulla
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEditDomanda(d)}
                                className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900 text-amber-200 border border-amber-700 text-[11px] font-bold rounded-none cursor-pointer"
                              >
                                Modifica
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteDomanda(d.id)}
                              className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-[11px] font-bold rounded-none cursor-pointer"
                            >
                              Elimina
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {questionnaireId && (
              <div className="bg-[#0B132B] border border-gray-800 p-6 rounded-none space-y-4 shadow-xl">
                <div className="border-b border-gray-800 pb-3">
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">
                    Compilazioni e Link Cliente ({compilazioni.length})
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Apri le risposte inviate dal cliente ed emetti il PDF.
                  </p>
                </div>

                {compilazioni.length === 0 ? (
                  <div className="p-5 text-center text-xs text-gray-400 border border-dashed border-gray-800 bg-gray-950">
                    Nessun link generato o questionario compilato per questo modulo.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {compilazioni.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-950 border border-gray-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1 text-xs font-mono">
                          <div className="text-white font-bold">
                            Stato: <span className="text-[#FF5500]">{item.stato || 'Inviato'}</span> • Token: {item.token}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {item.submitted_at
                              ? `Inviato il: ${new Date(item.submitted_at).toLocaleString('it-IT')}`
                              : `Creato il: ${new Date(item.created_at).toLocaleString('it-IT')}`}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => router.push(`/questionari-master/risposte/${item.id}`)}
                          className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shrink-0"
                        >
                          Vedi Risposte / PDF
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
