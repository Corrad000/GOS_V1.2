'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  listKybSubmissions,
  createKybSubmission,
  saveKybSubmission,
  getKybSubmissionByToken,
  buildKybClientLink,
  buildEmptyKybPayload,
  hydratePacchettoCompleto,
  type GosKybSubmission,
  type KybAnagraficaDati,
  type KybSocietaUboDati,
  type KybOperativitaFondiDati,
  type KybPacchettoCompleto,
  type KybStato,
} from './kybService';

interface KybQuestionnaireViewProps {
  companyCode: string;
  aziendaId?: string | null;
  companySeed?: Parameters<typeof buildEmptyKybPayload>[0];
  initialSubmission?: GosKybSubmission | null;
  clientToken?: string;
  clientMode?: boolean;
}

type SectionTab =
  | 'profilo'
  | 'struttura'
  | 'documenti'
  | 'faq'
  | 'dichiarazione';

export function KybQuestionnaireView({
  companyCode,
  aziendaId,
  companySeed,
  initialSubmission = null,
  clientToken,
  clientMode = false,
}: KybQuestionnaireViewProps) {
  const [submissions, setSubmissions] = useState<GosKybSubmission[]>(
    initialSubmission ? [initialSubmission] : []
  );
  const [activeSub, setActiveSub] = useState<GosKybSubmission | null>(initialSubmission);
  const [activeSection, setActiveSection] = useState<SectionTab>('profilo');
  const [loading, setLoading] = useState(!initialSubmission);
  const [notFoundToken, setNotFoundToken] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [anagrafica, setAnagrafica] = useState<KybAnagraficaDati>(() => {
    const base = buildEmptyKybPayload(companySeed).anagrafica_dati;
    return initialSubmission?.anagrafica_dati
      ? { ...base, ...initialSubmission.anagrafica_dati }
      : base;
  });

  const [societaUbo, setSocietaUbo] = useState<KybSocietaUboDati>(() => {
    const base = buildEmptyKybPayload(companySeed).societa_ubo_dati;
    return initialSubmission?.societa_ubo_dati
      ? { ...base, ...initialSubmission.societa_ubo_dati }
      : base;
  });

  const [operativitaFondi, setOperativitaFondi] = useState<KybOperativitaFondiDati>(() => {
    const base = buildEmptyKybPayload(companySeed).operativita_fondi_dati;
    return initialSubmission?.operativita_fondi_dati
      ? { ...base, ...initialSubmission.operativita_fondi_dati }
      : base;
  });

  const [pacchetto, setPacchetto] = useState<KybPacchettoCompleto>(() =>
    hydratePacchettoCompleto(initialSubmission?.pacchetto_completo, companySeed)
  );

  const [stato, setStato] = useState<string>(initialSubmission?.stato || 'Bozza');
  const [conformitaNote, setConformitaNote] = useState<string>(
    initialSubmission?.conformita_note || ''
  );

  const hydrateFormFromSubmission = useCallback(
    (sub: GosKybSubmission) => {
      const defaults = buildEmptyKybPayload(companySeed);
      setActiveSub(sub);
      setNotFoundToken(false);
      setStato(sub.stato || 'Bozza');
      setConformitaNote(sub.conformita_note || '');
      setAnagrafica({ ...defaults.anagrafica_dati, ...(sub.anagrafica_dati || {}) });
      setSocietaUbo({ ...defaults.societa_ubo_dati, ...(sub.societa_ubo_dati || {}) });
      setOperativitaFondi({
        ...defaults.operativita_fondi_dati,
        ...(sub.operativita_fondi_dati || {}),
      });
      setPacchetto(hydratePacchettoCompleto(sub.pacchetto_completo, companySeed));
    },
    [companySeed]
  );

  const loadSubmissions = useCallback(async () => {
    if (clientMode && clientToken) {
      setLoading(true);
      setNotFoundToken(false);
      const found = await getKybSubmissionByToken(clientToken);
      if (found) {
        hydrateFormFromSubmission(found);
      } else {
        setActiveSub(null);
        setNotFoundToken(true);
      }
      setLoading(false);
      return;
    }

    if (initialSubmission) {
      hydrateFormFromSubmission(initialSubmission);
      setLoading(false);
      return;
    }

    setLoading(true);
    const rows = await listKybSubmissions(companyCode, aziendaId || null);
    setSubmissions(rows);
    if (rows.length > 0) {
      hydrateFormFromSubmission(rows[0]);
    }
    setLoading(false);
  }, [clientMode, clientToken, initialSubmission, companyCode, aziendaId, hydrateFormFromSubmission]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const handleCreateNewKyb = async () => {
    const effectiveCode = companyCode || aziendaId || 'KYB';
    setCreating(true);
    setStatusMessage(null);
    const created = await createKybSubmission({
      aziendaId: aziendaId || null,
      companyCode: effectiveCode,
      companySeed,
    });
    setCreating(false);

    if (created) {
      setSubmissions((prev) => [created, ...prev]);
      hydrateFormFromSubmission(created);
      setActiveSection('profilo');
      setStatusMessage(
        'Nuovo pacchetto KYB creato. Compila le sezioni o copia il link per il cliente.'
      );
    } else {
      alert('Impossibile creare una nuova pratica KYB.');
    }
  };

  const handleCopyLink = async (token: string) => {
    const link = buildKybClientLink(token);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2500);
    } catch {
      prompt('Copia il link del questionario KYB:', link);
    }
  };

  const handlePersist = async (targetStato: KybStato | string, markSubmitted = false) => {
    if (!activeSub?.id) return;
    setSaving(true);
    setStatusMessage(null);

    const updated = await saveKybSubmission({
      id: activeSub.id,
      token: activeSub.token,
      stato: targetStato,
      anagrafica_dati: anagrafica,
      societa_ubo_dati: societaUbo,
      operativita_fondi_dati: operativitaFondi,
      pacchetto_completo: pacchetto,
      conformita_note: conformitaNote,
      aziendaId: activeSub.azienda_id || aziendaId || null,
      companyCode: activeSub.company_code || companyCode || null,
      markSubmitted,
    });

    setSaving(false);

    if (updated) {
      hydrateFormFromSubmission(updated);
      setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setStatusMessage(
        markSubmitted
          ? 'Pacchetto KYB inviato e salvato su Supabase.'
          : 'Bozza KYB salvata su Supabase.'
      );
    } else {
      alert('Errore durante il salvataggio del pacchetto KYB.');
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center font-mono text-xs text-gray-400">
        Caricamento pacchetto KYB...
      </div>
    );
  }

  if (clientMode && notFoundToken) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center space-y-2">
        <h2 className="text-base font-extrabold uppercase text-white">
          Link Questionario KYB non valido o non trovato
        </h2>
        <p className="text-xs text-gray-400">
          Token richiesto: <span className="font-mono text-gray-200">{clientToken || '-'}</span>
        </p>
      </div>
    );
  }

  const sectionTabs: { key: SectionTab; label: string }[] = [
    { key: 'profilo', label: '1. Profilo & Dati' },
    { key: 'struttura', label: '2. Struttura & UBO' },
    { key: 'documenti', label: '3. Indice Documentale' },
    { key: 'faq', label: '4. Domande Ricorrenti' },
    { key: 'dichiarazione', label: '5-6. KYC & Dichiarazione' },
  ];

  return (
    <div className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-800 pb-4 md:flex-row md:items-center">
        <div>
          <h3 className="text-base font-bold uppercase text-white">
            Profilo Societario &amp; Pacchetto KYC / KYB
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Due diligence societaria, indice documentale, domande ricorrenti e dichiarazione del legale rappresentante.
          </p>
        </div>

        {!clientMode && (
          <div className="flex flex-wrap items-center gap-2.5">
            {activeSub?.token && (
              <button
                type="button"
                onClick={() => handleCopyLink(activeSub.token)}
                className="cursor-pointer rounded-xl border border-gray-700 bg-gray-950 px-3.5 py-2 text-xs font-semibold text-gray-200 transition hover:bg-gray-800"
              >
                {copiedToken === activeSub.token ? 'Link Copiato!' : 'Copia Link Cliente'}
              </button>
            )}
            <button
              type="button"
              disabled={creating}
              onClick={handleCreateNewKyb}
              className="cursor-pointer rounded-xl bg-[#FF5500] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-orange-600 disabled:opacity-50"
            >
              {creating ? 'Creazione...' : '+ Nuovo Pacchetto KYB'}
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
          {statusMessage}
        </div>
      )}

      {!clientMode && submissions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {submissions.map((sub, idx) => {
            const isSelected = activeSub?.id === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => hydrateFormFromSubmission(sub)}
                className={`cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? 'border-[#FF5500] bg-[#FF5500]/15 text-white'
                    : 'border-gray-800 bg-gray-950 text-gray-400 hover:text-white'
                }`}
              >
                Pratica #{submissions.length - idx} · {sub.stato}
              </button>
            );
          })}
        </div>
      )}

      {!activeSub ? (
        <div className="space-y-3 rounded-xl border border-dashed border-gray-800 bg-gray-950 p-10 text-center">
          <p className="text-sm text-gray-400">
            Nessun pacchetto KYB aperto per questa azienda.
          </p>
          {!clientMode && (
            <button
              type="button"
              disabled={creating}
              onClick={handleCreateNewKyb}
              className="cursor-pointer rounded-xl bg-[#FF5500] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-orange-600"
            >
              Crea il primo Pacchetto KYB
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {!clientMode && !pacchetto.controllo_documento.nascondi_avvertenze_interne && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/25 p-4 text-xs text-amber-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold uppercase tracking-wider text-amber-300">
                  Nota Interna — Verificare Prima dell&apos;Invio
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPacchetto((prev) => ({
                      ...prev,
                      controllo_documento: {
                        ...prev.controllo_documento,
                        nascondi_avvertenze_interne: true,
                      },
                    }))
                  }
                  className="cursor-pointer rounded border border-amber-500/40 bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-200 hover:bg-amber-800/50"
                >
                  Nascondi Nota
                </button>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-100/90">
                <li>Inviare solo su richiesta attraverso un canale sicuro; non allegare a email generiche.</li>
                <li>I documenti pubblici (es. registro imprese / Companies House) vanno scaricati nella versione corrente il giorno dell&apos;invio.</li>
                <li>Verificare la posizione fiscale e la coerenza dei dati prima dell&apos;invio definitivo.</li>
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded border border-[#FF5500]/40 bg-[#FF5500]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#FF5500]">
                  {activeSub.company_code}
                </span>
                <span className="font-mono text-[11px] text-gray-400">
                  Token: <strong className="text-white">{activeSub.token}</strong>
                </span>
                <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                  {stato}
                </span>
              </div>

              {!clientMode && (
                <div className="flex items-center gap-2">
                  <label className="text-[10px] font-bold uppercase text-gray-400">Stato Pratica</label>
                  <select
                    value={stato}
                    onChange={(e) => setStato(e.target.value)}
                    className="rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  >
                    <option value="Bozza">Bozza</option>
                    <option value="Inviato">Inviato</option>
                    <option value="In revisione">In revisione</option>
                    <option value="Approvato">Approvato</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 pt-2 border-t border-gray-800/80">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                  Versione Documento
                </label>
                <input
                  type="text"
                  value={pacchetto.controllo_documento.versione}
                  onChange={(e) =>
                    setPacchetto((prev) => ({
                      ...prev,
                      controllo_documento: {
                        ...prev.controllo_documento,
                        versione: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                  Riferimento Interno
                </label>
                <input
                  type="text"
                  placeholder="Es. KYC-2026-001"
                  value={pacchetto.controllo_documento.riferimento_interno}
                  onChange={(e) =>
                    setPacchetto((prev) => ({
                      ...prev,
                      controllo_documento: {
                        ...prev.controllo_documento,
                        riferimento_interno: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                  Compilato Da
                </label>
                <input
                  type="text"
                  value={pacchetto.controllo_documento.compilato_da}
                  onChange={(e) =>
                    setPacchetto((prev) => ({
                      ...prev,
                      controllo_documento: {
                        ...prev.controllo_documento,
                        compilato_da: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3">
            {sectionTabs.map((sec) => {
              const active = activeSection === sec.key;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => setActiveSection(sec.key)}
                  className={`cursor-pointer rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                    active
                      ? 'bg-[#FF5500] text-white shadow'
                      : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-white'
                  }`}
                >
                  {sec.label}
                </button>
              );
            })}
          </div>

          {activeSection === 'profilo' && (
            <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                1. Profilo della Società &amp; Referente
              </h4>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Ragione Sociale *
                  </label>
                  <input
                    type="text"
                    value={anagrafica.ragione_sociale}
                    onChange={(e) =>
                      setAnagrafica((prev) => ({ ...prev, ragione_sociale: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Partita IVA / Registration No.
                  </label>
                  <input
                    type="text"
                    value={anagrafica.partita_iva}
                    onChange={(e) =>
                      setAnagrafica((prev) => ({ ...prev, partita_iva: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Anno di Avvio Attività
                  </label>
                  <input
                    type="text"
                    placeholder="Es. 2021"
                    value={pacchetto.profilo_societa.anno_avvio_attivita}
                    onChange={(e) =>
                      setPacchetto((prev) => ({
                        ...prev,
                        profilo_societa: {
                          ...prev.profilo_societa,
                          anno_avvio_attivita: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Sede Legale / Indirizzo
                  </label>
                  <input
                    type="text"
                    value={anagrafica.sede_legale}
                    onChange={(e) =>
                      setAnagrafica((prev) => ({ ...prev, sede_legale: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Referente Compilatore *
                  </label>
                  <input
                    type="text"
                    value={anagrafica.referente_nome}
                    onChange={(e) =>
                      setAnagrafica((prev) => ({ ...prev, referente_nome: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Email Referente
                  </label>
                  <input
                    type="email"
                    value={anagrafica.referente_email}
                    onChange={(e) =>
                      setAnagrafica((prev) => ({ ...prev, referente_email: e.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                  Descrizione dell&apos;Attività (sintesi breve e verificabile)
                </label>
                <textarea
                  rows={2}
                  value={pacchetto.profilo_societa.descrizione_attivita}
                  onChange={(e) =>
                    setPacchetto((prev) => ({
                      ...prev,
                      profilo_societa: {
                        ...prev.profilo_societa,
                        descrizione_attivita: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Linee di Servizio
                  </label>
                  <textarea
                    rows={2}
                    value={pacchetto.profilo_societa.linee_servizio}
                    onChange={(e) =>
                      setPacchetto((prev) => ({
                        ...prev,
                        profilo_societa: {
                          ...prev.profilo_societa,
                          linee_servizio: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Mercati e Paesi Serviti
                  </label>
                  <textarea
                    rows={2}
                    value={pacchetto.profilo_societa.mercati_paesi_serviti}
                    onChange={(e) =>
                      setPacchetto((prev) => ({
                        ...prev,
                        profilo_societa: {
                          ...prev.profilo_societa,
                          mercati_paesi_serviti: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Tipologia di Clienti (settori, referenze anonimizzate)
                  </label>
                  <textarea
                    rows={2}
                    value={pacchetto.profilo_societa.tipologia_clienti}
                    onChange={(e) =>
                      setPacchetto((prev) => ({
                        ...prev,
                        profilo_societa: {
                          ...prev.profilo_societa,
                          tipologia_clienti: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Team di Direzione (nome, ruolo)
                  </label>
                  <textarea
                    rows={2}
                    value={pacchetto.profilo_societa.team_direzione}
                    onChange={(e) =>
                      setPacchetto((prev) => ({
                        ...prev,
                        profilo_societa: {
                          ...prev.profilo_societa,
                          team_direzione: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'struttura' && (
            <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                2. Struttura Societaria &amp; Titolari Effettivi (UBO)
              </h4>

              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Legale Rappresentante
                  </label>
                  <input
                    type="text"
                    value={societaUbo.legale_rappresentante}
                    onChange={(e) =>
                      setSocietaUbo((prev) => ({
                        ...prev,
                        legale_rappresentante: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Organigramma Societario
                  </label>
                  <select
                    value={pacchetto.struttura_societaria.organigramma_stato}
                    onChange={(e) =>
                      setPacchetto((prev) => ({
                        ...prev,
                        struttura_societaria: {
                          ...prev.struttura_societaria,
                          organigramma_stato: e.target.value as 'Allegato' | 'Da allegare' | '',
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  >
                    <option value="">-- Seleziona --</option>
                    <option value="Allegato">Allegato</option>
                    <option value="Da allegare">Da allegare</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    PEP o Restrizioni
                  </label>
                  <input
                    type="text"
                    value={societaUbo.pep_o_restrizioni}
                    onChange={(e) =>
                      setSocietaUbo((prev) => ({
                        ...prev,
                        pep_o_restrizioni: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                  Eventuale Gruppo o Capogruppo
                </label>
                <input
                  type="text"
                  value={pacchetto.struttura_societaria.gruppo_o_capogruppo}
                  onChange={(e) =>
                    setPacchetto((prev) => ({
                      ...prev,
                      struttura_societaria: {
                        ...prev.struttura_societaria,
                        gruppo_o_capogruppo: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                  Soci Designati e Quote (Riepilogo)
                </label>
                <textarea
                  rows={3}
                  value={pacchetto.struttura_societaria.soci_designati_quote}
                  onChange={(e) =>
                    setPacchetto((prev) => ({
                      ...prev,
                      struttura_societaria: {
                        ...prev.struttura_societaria,
                        soci_designati_quote: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                  Titolari Effettivi (UBO) &amp; Controllo Effettivo
                </label>
                <textarea
                  rows={2}
                  value={societaUbo.titolari_effettivi_ubo}
                  onChange={(e) =>
                    setSocietaUbo((prev) => ({
                      ...prev,
                      titolari_effettivi_ubo: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
              </div>
            </div>
          )}

          {activeSection === 'documenti' && (
            <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                3. Indice Documentale
              </h4>

              <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-950/70 text-[10px] uppercase tracking-wider text-gray-400">
                      <th className="px-3 py-2.5">Documento</th>
                      <th className="px-3 py-2.5">Fonte</th>
                      <th className="px-3 py-2.5">Data</th>
                      <th className="px-3 py-2.5">Stato</th>
                      <th className="px-3 py-2.5">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80">
                    {pacchetto.indice_documentale.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2.5 font-semibold text-white">{item.documento}</td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            value={item.fonte}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPacchetto((prev) => {
                                const next = [...prev.indice_documentale];
                                next[idx] = { ...next[idx], fonte: val };
                                return { ...prev, indice_documentale: next };
                              });
                            }}
                            className="w-32 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-gray-200"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            placeholder="DD/MM/YYYY"
                            value={item.data}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPacchetto((prev) => {
                                const next = [...prev.indice_documentale];
                                next[idx] = { ...next[idx], data: val };
                                return { ...prev, indice_documentale: next };
                              });
                            }}
                            className="w-28 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 font-mono text-xs text-gray-200"
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <select
                            value={item.stato}
                            onChange={(e) => {
                              const val = e.target.value as 'Disponibile' | 'Da ottenere' | '';
                              setPacchetto((prev) => {
                                const next = [...prev.indice_documentale];
                                next[idx] = { ...next[idx], stato: val };
                                return { ...prev, indice_documentale: next };
                              });
                            }}
                            className="rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-white"
                          >
                            <option value="">--</option>
                            <option value="Disponibile">Disponibile</option>
                            <option value="Da ottenere">Da ottenere</option>
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <input
                            type="text"
                            placeholder="Note..."
                            value={item.note}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPacchetto((prev) => {
                                const next = [...prev.indice_documentale];
                                next[idx] = { ...next[idx], note: val };
                                return { ...prev, indice_documentale: next };
                              });
                            }}
                            className="w-40 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-gray-200"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeSection === 'faq' && (
            <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                4. Domande Ricorrenti (Banche &amp; Controparti)
              </h4>

              <div className="space-y-3.5">
                {pacchetto.domande_ricorrenti.map((q, idx) => (
                  <div
                    key={q.id}
                    className="rounded-xl border border-gray-800 bg-gray-900 p-3.5 space-y-2"
                  >
                    <div className="text-xs font-bold text-white">
                      {idx + 1}. {q.domanda}
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Inserisci risposta coerente con profilo e modulo KYC..."
                      value={q.risposta}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPacchetto((prev) => {
                          const next = [...prev.domande_ricorrenti];
                          next[idx] = { ...next[idx], risposta: val };
                          return { ...prev, domande_ricorrenti: next };
                        });
                      }}
                      className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'dichiarazione' && (
            <div className="space-y-5 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                  5. Riferimento Modulo KYC
                </h4>
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                      Riferimento del Modulo KYC
                    </label>
                    <input
                      type="text"
                      value={pacchetto.modulo_kyc.riferimento_modulo_kyc}
                      onChange={(e) =>
                        setPacchetto((prev) => ({
                          ...prev,
                          modulo_kyc: {
                            ...prev.modulo_kyc,
                            riferimento_modulo_kyc: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                      Modulo KYC Compilato
                    </label>
                    <select
                      value={pacchetto.modulo_kyc.modulo_kyc_compilato}
                      onChange={(e) =>
                        setPacchetto((prev) => ({
                          ...prev,
                          modulo_kyc: {
                            ...prev.modulo_kyc,
                            modulo_kyc_compilato: e.target.value as 'Sì' | 'No' | '',
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                    >
                      <option value="">-- Seleziona --</option>
                      <option value="Sì">Sì</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-gray-800 pt-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                  6. Dichiarazione del Legale Rappresentante
                </h4>

                <div className="space-y-2 rounded-xl border border-gray-800 bg-gray-900 p-4 text-xs text-gray-200">
                  {[
                    {
                      key: 'chk_informazioni_veritiere' as const,
                      label:
                        'Le informazioni contenute in questo documento sono complete e veritiere alla data della firma.',
                    },
                    {
                      key: 'chk_no_sanzioni_congelamento' as const,
                      label:
                        'Né la società né le persone della sezione 3 sono soggette a sanzioni o misure di congelamento di beni.',
                    },
                    {
                      key: 'chk_poteri_firma' as const,
                      label:
                        'Il firmatario è autorizzato a sottoscrivere il documento in nome e per conto della società.',
                    },
                    {
                      key: 'chk_comunicazione_variazioni' as const,
                      label:
                        'La società comunicherà tempestivamente per iscritto ogni variazione dei dati indicati.',
                    },
                    {
                      key: 'chk_informativa_privacy_persone' as const,
                      label:
                        'Le persone della sezione 3 sono state informate del trattamento dei loro dati ai fini della presente registrazione.',
                    },
                  ].map((chk) => (
                    <label
                      key={chk.key}
                      className="flex cursor-pointer items-start gap-2.5 text-xs text-gray-200"
                    >
                      <input
                        type="checkbox"
                        checked={pacchetto.dichiarazione_legale[chk.key]}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setPacchetto((prev) => ({
                            ...prev,
                            dichiarazione_legale: {
                              ...prev.dichiarazione_legale,
                              [chk.key]: checked,
                            },
                          }));
                        }}
                        className="mt-0.5 h-4 w-4 accent-[#FF5500]"
                      />
                      <span>{chk.label}</span>
                    </label>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                      Nome e Cognome Firmatario
                    </label>
                    <input
                      type="text"
                      value={pacchetto.dichiarazione_legale.nome_cognome}
                      onChange={(e) =>
                        setPacchetto((prev) => ({
                          ...prev,
                          dichiarazione_legale: {
                            ...prev.dichiarazione_legale,
                            nome_cognome: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                      Carica
                    </label>
                    <input
                      type="text"
                      placeholder="Es. Equity Partner / Legale Rappresentante"
                      value={pacchetto.dichiarazione_legale.carica}
                      onChange={(e) =>
                        setPacchetto((prev) => ({
                          ...prev,
                          dichiarazione_legale: {
                            ...prev.dichiarazione_legale,
                            carica: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                      Luogo
                    </label>
                    <input
                      type="text"
                      value={pacchetto.dichiarazione_legale.luogo}
                      onChange={(e) =>
                        setPacchetto((prev) => ({
                          ...prev,
                          dichiarazione_legale: {
                            ...prev.dichiarazione_legale,
                            luogo: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                      Data (DD/MM/YYYY)
                    </label>
                    <input
                      type="text"
                      placeholder="DD/MM/YYYY"
                      value={pacchetto.dichiarazione_legale.data_dd_mm_yyyy}
                      onChange={(e) =>
                        setPacchetto((prev) => ({
                          ...prev,
                          dichiarazione_legale: {
                            ...prev.dichiarazione_legale,
                            data_dd_mm_yyyy: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                      Firma
                    </label>
                    <input
                      type="text"
                      value={pacchetto.dichiarazione_legale.firma}
                      onChange={(e) =>
                        setPacchetto((prev) => ({
                          ...prev,
                          dichiarazione_legale: {
                            ...prev.dichiarazione_legale,
                            firma: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                      Contatto Privacy (GDPR)
                    </label>
                    <input
                      type="text"
                      value={pacchetto.dichiarazione_legale.contatto_privacy}
                      onChange={(e) =>
                        setPacchetto((prev) => ({
                          ...prev,
                          dichiarazione_legale: {
                            ...prev.dichiarazione_legale,
                            contatto_privacy: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Note Aggiuntive di Conformità
                  </label>
                  <textarea
                    rows={2}
                    value={conformitaNote}
                    onChange={(e) => setConformitaNote(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-800 pt-4">
            <button
              type="button"
              disabled={saving}
              onClick={() => handlePersist(clientMode ? 'Bozza' : stato, false)}
              className="cursor-pointer rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs font-bold text-gray-200 transition hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva Bozza'}
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handlePersist('Inviato', true)}
              className="cursor-pointer rounded-xl bg-[#FF5500] px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition hover:bg-orange-600 disabled:opacity-50"
            >
              {saving
                ? 'Invio...'
                : clientMode
                  ? 'Invia Pacchetto KYB'
                  : 'Salva & Segna Inviato'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
