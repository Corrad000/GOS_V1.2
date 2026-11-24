'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { printKybSubmissionPdf } from '@/services/pdf/kybPdfExport';
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

export interface KybQuestionnaireViewProps {
  companyCode?: string;
  aziendaId?: string | null;
  companyId?: string | null;
  companyName?: string;
  ragioneSociale?: string;
  companySeed?: Parameters<typeof buildEmptyKybPayload>[0];
  initialSubmission?: GosKybSubmission | null;
  clientToken?: string;
  clientMode?: boolean;
}

type SectionTab =
  | 'sec_1_2'
  | 'sec_3_4'
  | 'sec_5_6'
  | 'sec_7_8'
  | 'sec_9_10';

export interface CounterpartyOwnerRow {
  id: string;
  nome_completo: string;
  data_nascita: string;
  nazionalita: string;
  paese_residenza: string;
  quota_percentuale: string;
  ruolo: string;
}

export interface YesNoDetailAnswer {
  esito: 'Sì' | 'No' | 'N/A' | '';
  dettagli: string;
}

export interface CounterpartyDocumentItem {
  id: string;
  etichetta: string;
  allegato: boolean;
  note: string;
}

export interface CounterpartyKybModel {
  contatto_ritorno: string;
  data_compilazione: string;
  sezione_1_anagrafica: {
    denominazione_legale: string;
    denominazione_commerciale: string;
    forma_giuridica: string;
    numero_registrazione: string;
    paese_costituzione: string;
    data_costituzione: string;
    sede_legale: string;
    sede_operativa: string;
    sito_web: string;
    partita_iva: string;
    codice_fiscale_utr: string;
    referente_nome_ruolo_email: string;
    telefono_referente: string;
  };
  sezione_2_proprieta_controllo: {
    titolari_controllo: CounterpartyOwnerRow[];
    nota_societa_controllante: string;
    pep_o_familiari_stretti: YesNoDetailAnswer;
    sanzioni_uk_ue_onu_ofac: YesNoDetailAnswer;
    controllo_statale_o_ente_pubblico: YesNoDetailAnswer;
    variazioni_assetto_ultimi_12_mesi: YesNoDetailAnswer;
  };
  sezione_3_attivita_economica: {
    descrizione_attivita_prodotti_servizi: string;
    settori_industriali: string;
    paesi_operativi_e_ricavi: string;
    paesi_operativi_con_glaring: string;
    tipologia_clienti: string;
    fatturato_annuo_stimato: string;
    volume_annuo_stimato_glaring: string;
  };
  sezione_4_origine_fondi_patrimonio: {
    origine_capitale_iniziale: string;
    principali_fonti_ricavi: string;
    fondi_da_terze_parti: string;
    prova_documentale_fondi: string;
  };
  sezione_5_intermediari_agenti_commissioni: {
    uso_agenti_o_intermediari: YesNoDetailAnswer;
    elenco_agenti_e_compensi: string;
    verifica_pep_e_sanzioni_agenti: YesNoDetailAnswer;
  };
  sezione_6_informazioni_finanziarie: {
    bilanci_depositati_e_registro: string;
    bilanci_revisionati_e_soggetto: string;
    banca_principale_e_paese: string;
    lettera_referenza_bancaria: string;
    procedure_insolvenza_o_ristrutturazione: string;
  };
  sezione_7_conformita_governance: {
    politica_anticorruzione: YesNoDetailAnswer;
    codice_etico_o_condotta: YesNoDetailAnswer;
    procedure_aml_e_sanzioni: YesNoDetailAnswer;
    responsabile_dati_e_autorita: YesNoDetailAnswer;
    contenziosi_indagini_ultimi_5_anni: YesNoDetailAnswer;
    coperture_assicurative: YesNoDetailAnswer;
  };
  sezione_8_rapporto_atteso: {
    scopo_e_natura_rapporto: string;
    data_avvio_prevista: string;
    durata_prevista: string;
    modalita_pagamento_e_valuta: string;
  };
  sezione_9_documenti_da_allegare: CounterpartyDocumentItem[];
  sezione_10_dichiarazione: {
    firmatario_autorizzato: string;
    carica: string;
    firma: string;
    data: string;
    conferma_dichiarazione: boolean;
  };
}

const DEFAULT_COUNTERPARTY_DOCS: CounterpartyDocumentItem[] = [
  { id: 'doc_1', etichetta: 'Certificato di costituzione o registrazione', allegato: false, note: '' },
  { id: 'doc_2', etichetta: 'Ultimo confirmation statement o rendiconto annuale', allegato: false, note: '' },
  { id: 'doc_3', etichetta: 'Registro persone con controllo significativo (PSC) o soci/amministratori', allegato: false, note: '' },
  { id: 'doc_4', etichetta: 'Ultimo bilancio depositato (o bilanci gestionali se non ancora depositati)', allegato: false, note: '' },
  { id: 'doc_5', etichetta: 'Prova della sede legale (emessa negli ultimi 3 mesi, es. utenza o estratto conto)', allegato: false, note: '' },
  { id: 'doc_6', etichetta: 'Documenti di identità soci e amministratori Sez. 2 (passaporto o carta d’identità, copia certificata)', allegato: false, note: '' },
  { id: 'doc_7', etichetta: 'Certificato di registrazione fiscale (es. lettera UTR HMRC, certificato P.IVA / VAT)', allegato: false, note: '' },
  { id: 'doc_8', etichetta: 'Lettera di referenza bancaria o conferma bancaria', allegato: false, note: '' },
  { id: 'doc_9', etichetta: 'Certificato polizza RC professionale o altra copertura rilevante', allegato: false, note: '' },
  { id: 'doc_10', etichetta: 'Politica anticorruzione e codice etico (se disponibili)', allegato: false, note: '' },
  { id: 'doc_11', etichetta: 'Delibera consiglio o soci che autorizza il rapporto con Glaring LLP (se applicabile)', allegato: false, note: '' },
];

function createEmptyOwnerRow(idx = 1): CounterpartyOwnerRow {
  return {
    id: `ubo_row_${idx}_${Math.random().toString(36).slice(2, 7)}`,
    nome_completo: '',
    data_nascita: '',
    nazionalita: '',
    paese_residenza: '',
    quota_percentuale: '',
    ruolo: '',
  };
}

function createEmptyYesNo(): YesNoDetailAnswer {
  return { esito: '', dettagli: '' };
}

function buildDefaultCounterpartyModel(
  seed: NonNullable<Parameters<typeof buildEmptyKybPayload>[0]>,
  anag: KybAnagraficaDati,
  ubo: KybSocietaUboDati,
  op: KybOperativitaFondiDati,
  pack: KybPacchettoCompleto
): CounterpartyKybModel {
  const todayStr = new Date().toLocaleDateString('it-IT');
  const fullAddress =
    anag.sede_legale ||
    [seed.indirizzo, seed.citta, seed.nazione].map((x) => String(x || '').trim()).filter(Boolean).join(', ');
  const contactSummary =
    [anag.referente_nome, anag.referente_ruolo, anag.referente_email]
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .join(' · ') ||
    [seed.referente, seed.email].map((x) => String(x || '').trim()).filter(Boolean).join(' · ');

  return {
    contatto_ritorno: 'Glaring LLP — Compliance (support@glaring.world)',
    data_compilazione: pack.dichiarazione_legale?.data_dd_mm_yyyy || todayStr,
    sezione_1_anagrafica: {
      denominazione_legale: anag.ragione_sociale || seed.ragione_sociale || '',
      denominazione_commerciale: '',
      forma_giuridica: anag.forma_giuridica || '',
      numero_registrazione: anag.partita_iva || seed.partita_iva || '',
      paese_costituzione: anag.nazione || seed.nazione || '',
      data_costituzione: pack.profilo_societa?.anno_avvio_attivita || '',
      sede_legale: fullAddress,
      sede_operativa: '',
      sito_web: anag.sito_web || seed.sito_web || '',
      partita_iva: anag.partita_iva || seed.partita_iva || '',
      codice_fiscale_utr: anag.codice_fiscale || seed.codice_fiscale || '',
      referente_nome_ruolo_email: contactSummary,
      telefono_referente: anag.referente_telefono || seed.telefono || '',
    },
    sezione_2_proprieta_controllo: {
      titolari_controllo: [
        {
          id: 'ubo_default_1',
          nome_completo: ubo.titolari_effettivi_ubo || ubo.legale_rappresentante || '',
          data_nascita: '',
          nazionalita: ubo.legale_rappresentante_nazionalita || '',
          paese_residenza: '',
          quota_percentuale: ubo.partecipazioni_rilevanti || '',
          ruolo: ubo.legale_rappresentante ? 'Legale Rappresentante / Socio' : '',
        },
        createEmptyOwnerRow(2),
      ],
      nota_societa_controllante: pack.struttura_societaria?.gruppo_o_capogruppo || '',
      pep_o_familiari_stretti: {
        esito: ubo.pep_o_restrizioni ? 'Sì' : '',
        dettagli: ubo.pep_o_restrizioni || '',
      },
      sanzioni_uk_ue_onu_ofac: createEmptyYesNo(),
      controllo_statale_o_ente_pubblico: createEmptyYesNo(),
      variazioni_assetto_ultimi_12_mesi: createEmptyYesNo(),
    },
    sezione_3_attivita_economica: {
      descrizione_attivita_prodotti_servizi:
        op.attivita_prevalente || pack.profilo_societa?.descrizione_attivita || '',
      settori_industriali: pack.profilo_societa?.linee_servizio || '',
      paesi_operativi_e_ricavi:
        op.paesi_operativi || pack.profilo_societa?.mercati_paesi_serviti || '',
      paesi_operativi_con_glaring: '',
      tipologia_clienti: pack.profilo_societa?.tipologia_clienti || '',
      fatturato_annuo_stimato: op.volume_annuo_stimato || '',
      volume_annuo_stimato_glaring: '',
    },
    sezione_4_origine_fondi_patrimonio: {
      origine_capitale_iniziale: op.provenienza_fondi || '',
      principali_fonti_ricavi: '',
      fondi_da_terze_parti: '',
      prova_documentale_fondi: '',
    },
    sezione_5_intermediari_agenti_commissioni: {
      uso_agenti_o_intermediari: createEmptyYesNo(),
      elenco_agenti_e_compensi: '',
      verifica_pep_e_sanzioni_agenti: createEmptyYesNo(),
    },
    sezione_6_informazioni_finanziarie: {
      bilanci_depositati_e_registro: '',
      bilanci_revisionati_e_soggetto: '',
      banca_principale_e_paese: '',
      lettera_referenza_bancaria: '',
      procedure_insolvenza_o_ristrutturazione: '',
    },
    sezione_7_conformita_governance: {
      politica_anticorruzione: createEmptyYesNo(),
      codice_etico_o_condotta: createEmptyYesNo(),
      procedure_aml_e_sanzioni: createEmptyYesNo(),
      responsabile_dati_e_autorita: {
        esito: '',
        dettagli: pack.dichiarazione_legale?.contatto_privacy || '',
      },
      contenziosi_indagini_ultimi_5_anni: createEmptyYesNo(),
      coperture_assicurative: createEmptyYesNo(),
    },
    sezione_8_rapporto_atteso: {
      scopo_e_natura_rapporto: '',
      data_avvio_prevista: '',
      durata_prevista: '',
      modalita_pagamento_e_valuta: '',
    },
    sezione_9_documenti_da_allegare: DEFAULT_COUNTERPARTY_DOCS.map((d) => ({ ...d })),
    sezione_10_dichiarazione: {
      firmatario_autorizzato: pack.dichiarazione_legale?.nome_cognome || '',
      carica: pack.dichiarazione_legale?.carica || '',
      firma: pack.dichiarazione_legale?.firma || '',
      data: pack.dichiarazione_legale?.data_dd_mm_yyyy || todayStr,
      conferma_dichiarazione: Boolean(pack.dichiarazione_legale?.chk_informazioni_veritiere),
    },
  };
}

function hydrateCounterpartyModel(
  rawPack: KybPacchettoCompleto,
  seed: NonNullable<Parameters<typeof buildEmptyKybPayload>[0]>,
  anag: KybAnagraficaDati,
  ubo: KybSocietaUboDati,
  op: KybOperativitaFondiDati
): CounterpartyKybModel {
  const base = buildDefaultCounterpartyModel(seed, anag, ubo, op, rawPack);
  const saved = (rawPack as unknown as { counterparty_kyb?: Partial<CounterpartyKybModel> })
    ?.counterparty_kyb;

  if (!saved) return base;

  const mergedDocs = DEFAULT_COUNTERPARTY_DOCS.map((defDoc, idx) => {
    const found = Array.isArray(saved.sezione_9_documenti_da_allegare)
      ? saved.sezione_9_documenti_da_allegare.find((x) => x.id === defDoc.id) ||
        saved.sezione_9_documenti_da_allegare[idx]
      : undefined;
    return found
      ? {
          ...defDoc,
          allegato: Boolean(found.allegato),
          note: String(found.note || ''),
        }
      : defDoc;
  });

  const mergedOwners =
    Array.isArray(saved.sezione_2_proprieta_controllo?.titolari_controllo) &&
    saved.sezione_2_proprieta_controllo.titolari_controllo.length > 0
      ? saved.sezione_2_proprieta_controllo.titolari_controllo.map((row, idx) => ({
          ...createEmptyOwnerRow(idx + 1),
          ...row,
        }))
      : base.sezione_2_proprieta_controllo.titolari_controllo;

  return {
    ...base,
    ...saved,
    contatto_ritorno: saved.contatto_ritorno || base.contatto_ritorno,
    data_compilazione: saved.data_compilazione || base.data_compilazione,
    sezione_1_anagrafica: {
      ...base.sezione_1_anagrafica,
      ...(saved.sezione_1_anagrafica || {}),
    },
    sezione_2_proprieta_controllo: {
      ...base.sezione_2_proprieta_controllo,
      ...(saved.sezione_2_proprieta_controllo || {}),
      titolari_controllo: mergedOwners,
      pep_o_familiari_stretti: {
        ...base.sezione_2_proprieta_controllo.pep_o_familiari_stretti,
        ...(saved.sezione_2_proprieta_controllo?.pep_o_familiari_stretti || {}),
      },
      sanzioni_uk_ue_onu_ofac: {
        ...base.sezione_2_proprieta_controllo.sanzioni_uk_ue_onu_ofac,
        ...(saved.sezione_2_proprieta_controllo?.sanzioni_uk_ue_onu_ofac || {}),
      },
      controllo_statale_o_ente_pubblico: {
        ...base.sezione_2_proprieta_controllo.controllo_statale_o_ente_pubblico,
        ...(saved.sezione_2_proprieta_controllo?.controllo_statale_o_ente_pubblico || {}),
      },
      variazioni_assetto_ultimi_12_mesi: {
        ...base.sezione_2_proprieta_controllo.variazioni_assetto_ultimi_12_mesi,
        ...(saved.sezione_2_proprieta_controllo?.variazioni_assetto_ultimi_12_mesi || {}),
      },
    },
    sezione_3_attivita_economica: {
      ...base.sezione_3_attivita_economica,
      ...(saved.sezione_3_attivita_economica || {}),
    },
    sezione_4_origine_fondi_patrimonio: {
      ...base.sezione_4_origine_fondi_patrimonio,
      ...(saved.sezione_4_origine_fondi_patrimonio || {}),
    },
    sezione_5_intermediari_agenti_commissioni: {
      ...base.sezione_5_intermediari_agenti_commissioni,
      ...(saved.sezione_5_intermediari_agenti_commissioni || {}),
      uso_agenti_o_intermediari: {
        ...base.sezione_5_intermediari_agenti_commissioni.uso_agenti_o_intermediari,
        ...(saved.sezione_5_intermediari_agenti_commissioni?.uso_agenti_o_intermediari || {}),
      },
      verifica_pep_e_sanzioni_agenti: {
        ...base.sezione_5_intermediari_agenti_commissioni.verifica_pep_e_sanzioni_agenti,
        ...(saved.sezione_5_intermediari_agenti_commissioni?.verifica_pep_e_sanzioni_agenti ||
          {}),
      },
    },
    sezione_6_informazioni_finanziarie: {
      ...base.sezione_6_informazioni_finanziarie,
      ...(saved.sezione_6_informazioni_finanziarie || {}),
    },
    sezione_7_conformita_governance: {
      ...base.sezione_7_conformita_governance,
      ...(saved.sezione_7_conformita_governance || {}),
      politica_anticorruzione: {
        ...base.sezione_7_conformita_governance.politica_anticorruzione,
        ...(saved.sezione_7_conformita_governance?.politica_anticorruzione || {}),
      },
      codice_etico_o_condotta: {
        ...base.sezione_7_conformita_governance.codice_etico_o_condotta,
        ...(saved.sezione_7_conformita_governance?.codice_etico_o_condotta || {}),
      },
      procedure_aml_e_sanzioni: {
        ...base.sezione_7_conformita_governance.procedure_aml_e_sanzioni,
        ...(saved.sezione_7_conformita_governance?.procedure_aml_e_sanzioni || {}),
      },
      responsabile_dati_e_autorita: {
        ...base.sezione_7_conformita_governance.responsabile_dati_e_autorita,
        ...(saved.sezione_7_conformita_governance?.responsabile_dati_e_autorita || {}),
      },
      contenziosi_indagini_ultimi_5_anni: {
        ...base.sezione_7_conformita_governance.contenziosi_indagini_ultimi_5_anni,
        ...(saved.sezione_7_conformita_governance?.contenziosi_indagini_ultimi_5_anni || {}),
      },
      coperture_assicurative: {
        ...base.sezione_7_conformita_governance.coperture_assicurative,
        ...(saved.sezione_7_conformita_governance?.coperture_assicurative || {}),
      },
    },
    sezione_8_rapporto_atteso: {
      ...base.sezione_8_rapporto_atteso,
      ...(saved.sezione_8_rapporto_atteso || {}),
    },
    sezione_9_documenti_da_allegare: mergedDocs,
    sezione_10_dichiarazione: {
      ...base.sezione_10_dichiarazione,
      ...(saved.sezione_10_dichiarazione || {}),
    },
  };
}

export function KybQuestionnaireView({
  companyCode = '',
  aziendaId,
  companyId,
  companyName,
  ragioneSociale,
  companySeed,
  initialSubmission = null,
  clientToken,
  clientMode = false,
}: KybQuestionnaireViewProps) {
  const resolvedAziendaId = aziendaId ?? companyId ?? null;
  const resolvedCompanyCode = (companyCode || resolvedAziendaId || 'KYB').trim();

  const seedRagioneSociale =
    companySeed?.ragione_sociale || companyName || ragioneSociale || '';
  const seedPartitaIva = companySeed?.partita_iva || '';
  const seedCodiceFiscale = companySeed?.codice_fiscale || '';
  const seedIndirizzo = companySeed?.indirizzo || '';
  const seedCitta = companySeed?.citta || '';
  const seedNazione = companySeed?.nazione || '';
  const seedSitoWeb = companySeed?.sito_web || '';
  const seedReferente = companySeed?.referente || '';
  const seedEmail = companySeed?.email || '';
  const seedTelefono = companySeed?.telefono || '';
  const seedAdvisorNome = companySeed?.advisor_nome || '';

  const resolvedSeed: NonNullable<Parameters<typeof buildEmptyKybPayload>[0]> = useMemo(
    () => ({
      ragione_sociale: seedRagioneSociale,
      partita_iva: seedPartitaIva,
      codice_fiscale: seedCodiceFiscale,
      indirizzo: seedIndirizzo,
      citta: seedCitta,
      nazione: seedNazione,
      sito_web: seedSitoWeb,
      referente: seedReferente,
      email: seedEmail,
      telefono: seedTelefono,
      advisor_nome: seedAdvisorNome,
    }),
    [
      seedRagioneSociale,
      seedPartitaIva,
      seedCodiceFiscale,
      seedIndirizzo,
      seedCitta,
      seedNazione,
      seedSitoWeb,
      seedReferente,
      seedEmail,
      seedTelefono,
      seedAdvisorNome,
    ]
  );

  const initialDefaults = useMemo(() => buildEmptyKybPayload(resolvedSeed), [resolvedSeed]);

  const initialAnagrafica = useMemo<KybAnagraficaDati>(
    () =>
      initialSubmission?.anagrafica_dati
        ? { ...initialDefaults.anagrafica_dati, ...initialSubmission.anagrafica_dati }
        : initialDefaults.anagrafica_dati,
    [initialDefaults, initialSubmission]
  );

  const initialSocietaUbo = useMemo<KybSocietaUboDati>(
    () =>
      initialSubmission?.societa_ubo_dati
        ? { ...initialDefaults.societa_ubo_dati, ...initialSubmission.societa_ubo_dati }
        : initialDefaults.societa_ubo_dati,
    [initialDefaults, initialSubmission]
  );

  const initialOperativitaFondi = useMemo<KybOperativitaFondiDati>(
    () =>
      initialSubmission?.operativita_fondi_dati
        ? {
            ...initialDefaults.operativita_fondi_dati,
            ...initialSubmission.operativita_fondi_dati,
          }
        : initialDefaults.operativita_fondi_dati,
    [initialDefaults, initialSubmission]
  );

  const initialPacchetto = useMemo<KybPacchettoCompleto>(
    () => hydratePacchettoCompleto(initialSubmission?.pacchetto_completo, resolvedSeed),
    [initialSubmission, resolvedSeed]
  );

  const [submissions, setSubmissions] = useState<GosKybSubmission[]>(
    initialSubmission ? [initialSubmission] : []
  );
  const [activeSub, setActiveSub] = useState<GosKybSubmission | null>(initialSubmission);
  const [activeSection, setActiveSection] = useState<SectionTab>('sec_1_2');
  const [loading, setLoading] = useState(!initialSubmission);
  const [notFoundToken, setNotFoundToken] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [anagrafica, setAnagrafica] = useState<KybAnagraficaDati>(initialAnagrafica);
  const [societaUbo, setSocietaUbo] = useState<KybSocietaUboDati>(initialSocietaUbo);
  const [operativitaFondi, setOperativitaFondi] =
    useState<KybOperativitaFondiDati>(initialOperativitaFondi);
  const [pacchetto, setPacchetto] = useState<KybPacchettoCompleto>(initialPacchetto);
  const [counterparty, setCounterparty] = useState<CounterpartyKybModel>(() =>
    hydrateCounterpartyModel(
      initialPacchetto,
      resolvedSeed,
      initialAnagrafica,
      initialSocietaUbo,
      initialOperativitaFondi
    )
  );

  const [stato, setStato] = useState<string>(initialSubmission?.stato || 'Bozza');
  const [conformitaNote, setConformitaNote] = useState<string>(
    initialSubmission?.conformita_note || ''
  );

  const hydratedSubIdRef = useRef<string | null>(initialSubmission?.id || null);

  const hydrateFormFromSubmission = useCallback(
    (sub: GosKybSubmission, force = false) => {
      if (!force && hydratedSubIdRef.current === sub.id) {
        setActiveSub(sub);
        return;
      }
      hydratedSubIdRef.current = sub.id;
      const defaults = buildEmptyKybPayload(resolvedSeed);
      const nextAnag: KybAnagraficaDati = {
        ...defaults.anagrafica_dati,
        ...(sub.anagrafica_dati || {}),
        ragione_sociale:
          sub.anagrafica_dati?.ragione_sociale || defaults.anagrafica_dati.ragione_sociale,
      };
      const nextUbo: KybSocietaUboDati = {
        ...defaults.societa_ubo_dati,
        ...(sub.societa_ubo_dati || {}),
      };
      const nextOp: KybOperativitaFondiDati = {
        ...defaults.operativita_fondi_dati,
        ...(sub.operativita_fondi_dati || {}),
      };
      const nextPack = hydratePacchettoCompleto(sub.pacchetto_completo, resolvedSeed);

      setActiveSub(sub);
      setNotFoundToken(false);
      setStato(sub.stato || 'Bozza');
      setConformitaNote(sub.conformita_note || '');
      setAnagrafica(nextAnag);
      setSocietaUbo(nextUbo);
      setOperativitaFondi(nextOp);
      setPacchetto(nextPack);
      setCounterparty(
        hydrateCounterpartyModel(nextPack, resolvedSeed, nextAnag, nextUbo, nextOp)
      );
    },
    [resolvedSeed]
  );

  useEffect(() => {
    let cancelled = false;

    const runLoad = async () => {
      if (clientMode && clientToken) {
        setLoading(true);
        setNotFoundToken(false);
        const found = await getKybSubmissionByToken(clientToken);
        if (cancelled) return;
        if (found) {
          hydrateFormFromSubmission(found, true);
        } else {
          setActiveSub(null);
          setNotFoundToken(true);
        }
        setLoading(false);
        return;
      }

      if (initialSubmission) {
        hydrateFormFromSubmission(initialSubmission, false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const rows = await listKybSubmissions(resolvedCompanyCode, resolvedAziendaId);
      if (cancelled) return;
      setSubmissions(rows);
      if (rows.length > 0) {
        hydrateFormFromSubmission(rows[0], false);
      }
      setLoading(false);
    };

    void runLoad();

    return () => {
      cancelled = true;
    };
  }, [
    clientMode,
    clientToken,
    initialSubmission,
    resolvedCompanyCode,
    resolvedAziendaId,
    hydrateFormFromSubmission,
  ]);

  const buildSyncedPayloads = useCallback(() => {
    const s1 = counterparty.sezione_1_anagrafica;
    const s2 = counterparty.sezione_2_proprieta_controllo;
    const s3 = counterparty.sezione_3_attivita_economica;
    const s4 = counterparty.sezione_4_origine_fondi_patrimonio;
    const s10 = counterparty.sezione_10_dichiarazione;

    const primaryOwner = s2.titolari_controllo[0];
    const uboNames = s2.titolari_controllo
      .map((r) => [r.nome_completo, r.quota_percentuale ? `(${r.quota_percentuale})` : ''].filter(Boolean).join(' '))
      .filter(Boolean)
      .join(', ');

    const syncedAnagrafica: KybAnagraficaDati = {
      ...anagrafica,
      ragione_sociale: s1.denominazione_legale || anagrafica.ragione_sociale,
      forma_giuridica: s1.forma_giuridica || anagrafica.forma_giuridica,
      partita_iva: s1.partita_iva || s1.numero_registrazione || anagrafica.partita_iva,
      codice_fiscale: s1.codice_fiscale_utr || anagrafica.codice_fiscale,
      sede_legale: s1.sede_legale || anagrafica.sede_legale,
      nazione: s1.paese_costituzione || anagrafica.nazione,
      sito_web: s1.sito_web || anagrafica.sito_web,
      referente_nome: s1.referente_nome_ruolo_email || anagrafica.referente_nome,
      referente_telefono: s1.telefono_referente || anagrafica.referente_telefono,
    };

    const syncedSocietaUbo: KybSocietaUboDati = {
      ...societaUbo,
      legale_rappresentante:
        s10.firmatario_autorizzato || primaryOwner?.nome_completo || societaUbo.legale_rappresentante,
      legale_rappresentante_nazionalita:
        primaryOwner?.nazionalita || societaUbo.legale_rappresentante_nazionalita,
      titolari_effettivi_ubo: uboNames || societaUbo.titolari_effettivi_ubo,
      partecipazioni_rilevanti:
        primaryOwner?.quota_percentuale || societaUbo.partecipazioni_rilevanti,
      pep_o_restrizioni:
        s2.pep_o_familiari_stretti.dettagli ||
        s2.pep_o_familiari_stretti.esito ||
        societaUbo.pep_o_restrizioni,
    };

    const syncedOperativitaFondi: KybOperativitaFondiDati = {
      ...operativitaFondi,
      attivita_prevalente:
        s3.descrizione_attivita_prodotti_servizi || operativitaFondi.attivita_prevalente,
      paesi_operativi:
        s3.paesi_operativi_e_ricavi || operativitaFondi.paesi_operativi,
      volume_annuo_stimato:
        s3.fatturato_annuo_stimato || operativitaFondi.volume_annuo_stimato,
      provenienza_fondi:
        s4.origine_capitale_iniziale || s4.principali_fonti_ricavi || operativitaFondi.provenienza_fondi,
    };

    const syncedPacchetto: KybPacchettoCompleto = {
      ...pacchetto,
      profilo_societa: {
        ...pacchetto.profilo_societa,
        anno_avvio_attivita: s1.data_costituzione || pacchetto.profilo_societa.anno_avvio_attivita,
        descrizione_attivita:
          s3.descrizione_attivita_prodotti_servizi || pacchetto.profilo_societa.descrizione_attivita,
        linee_servizio: s3.settori_industriali || pacchetto.profilo_societa.linee_servizio,
        mercati_paesi_serviti:
          s3.paesi_operativi_e_ricavi || pacchetto.profilo_societa.mercati_paesi_serviti,
        tipologia_clienti: s3.tipologia_clienti || pacchetto.profilo_societa.tipologia_clienti,
      },
      struttura_societaria: {
        ...pacchetto.struttura_societaria,
        gruppo_o_capogruppo:
          s2.nota_societa_controllante || pacchetto.struttura_societaria.gruppo_o_capogruppo,
        soci_designati_quote: uboNames || pacchetto.struttura_societaria.soci_designati_quote,
      },
      dichiarazione_legale: {
        ...pacchetto.dichiarazione_legale,
        chk_informazioni_veritiere: s10.conferma_dichiarazione,
        nome_cognome: s10.firmatario_autorizzato || pacchetto.dichiarazione_legale.nome_cognome,
        carica: s10.carica || pacchetto.dichiarazione_legale.carica,
        data_dd_mm_yyyy: s10.data || pacchetto.dichiarazione_legale.data_dd_mm_yyyy,
        firma: s10.firma || pacchetto.dichiarazione_legale.firma,
      },
      counterparty_kyb: counterparty,
    } as KybPacchettoCompleto;

    return {
      syncedAnagrafica,
      syncedSocietaUbo,
      syncedOperativitaFondi,
      syncedPacchetto,
    };
  }, [anagrafica, counterparty, operativitaFondi, pacchetto, societaUbo]);

  const handleCreateNewKyb = async () => {
    setCreating(true);
    setStatusMessage(null);
    const created = await createKybSubmission({
      aziendaId: resolvedAziendaId,
      companyCode: resolvedCompanyCode,
      companySeed: resolvedSeed,
    });
    setCreating(false);

    if (created) {
      setSubmissions((prev) => [created, ...prev]);
      hydrateFormFromSubmission(created, true);
      setActiveSection('sec_1_2');
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

    const {
      syncedAnagrafica,
      syncedSocietaUbo,
      syncedOperativitaFondi,
      syncedPacchetto,
    } = buildSyncedPayloads();

    const updated = await saveKybSubmission({
      id: activeSub.id,
      token: activeSub.token,
      stato: targetStato,
      anagrafica_dati: syncedAnagrafica,
      societa_ubo_dati: syncedSocietaUbo,
      operativita_fondi_dati: syncedOperativitaFondi,
      pacchetto_completo: syncedPacchetto,
      conformita_note: conformitaNote,
      aziendaId: activeSub.azienda_id || resolvedAziendaId,
      companyCode: activeSub.company_code || resolvedCompanyCode,
      markSubmitted,
    });

    setSaving(false);

    if (updated) {
      hydrateFormFromSubmission(updated, true);
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

  const handleGeneratePdf = () => {
    if (!activeSub) return;
    const {
      syncedAnagrafica,
      syncedSocietaUbo,
      syncedOperativitaFondi,
      syncedPacchetto,
    } = buildSyncedPayloads();

    printKybSubmissionPdf({
      ...activeSub,
      azienda_id: activeSub.azienda_id || resolvedAziendaId,
      company_code: activeSub.company_code || resolvedCompanyCode,
      token: activeSub.token || clientToken || '',
      stato,
      anagrafica_dati: syncedAnagrafica,
      societa_ubo_dati: syncedSocietaUbo,
      operativita_fondi_dati: syncedOperativitaFondi,
      pacchetto_completo: syncedPacchetto,
      conformita_note: conformitaNote || null,
      updated_at: new Date().toISOString(),
    });
  };

  const updateYesNoField = (
    setter: React.Dispatch<React.SetStateAction<CounterpartyKybModel>>,
    updater: (prev: CounterpartyKybModel) => CounterpartyKybModel
  ) => {
    setter(updater);
  };

  const addOwnerRow = () => {
    setCounterparty((prev) => ({
      ...prev,
      sezione_2_proprieta_controllo: {
        ...prev.sezione_2_proprieta_controllo,
        titolari_controllo: [
          ...prev.sezione_2_proprieta_controllo.titolari_controllo,
          createEmptyOwnerRow(prev.sezione_2_proprieta_controllo.titolari_controllo.length + 1),
        ],
      },
    }));
  };

  const removeOwnerRow = (id: string) => {
    setCounterparty((prev) => {
      const filtered = prev.sezione_2_proprieta_controllo.titolari_controllo.filter(
        (r) => r.id !== id
      );
      return {
        ...prev,
        sezione_2_proprieta_controllo: {
          ...prev.sezione_2_proprieta_controllo,
          titolari_controllo: filtered.length > 0 ? filtered : [createEmptyOwnerRow(1)],
        },
      };
    });
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
    { key: 'sec_1_2', label: '1-2. Anagrafica & Controllo' },
    { key: 'sec_3_4', label: '3-4. Attività & Fondi' },
    { key: 'sec_5_6', label: '5-6. Agenti & Finanza' },
    { key: 'sec_7_8', label: '7-8. Governance & Rapporto' },
    { key: 'sec_9_10', label: '9-10. Documenti & Dichiarazione' },
  ];

  const renderYesNoRow = (
    question: string,
    value: YesNoDetailAnswer,
    onChangeEsito: (val: YesNoDetailAnswer['esito']) => void,
    onChangeDettagli: (val: string) => void,
    detailPlaceholder = 'Dettagli, riferimenti o spiegazione (se applicabile)...'
  ) => (
    <div className="grid grid-cols-1 gap-3 border-b border-gray-800/80 py-3 last:border-b-0 md:grid-cols-12 md:items-start">
      <div className="text-xs font-medium text-gray-200 md:col-span-5">{question}</div>
      <div className="md:col-span-2">
        <select
          value={value.esito}
          onChange={(e) => onChangeEsito(e.target.value as YesNoDetailAnswer['esito'])}
          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-2.5 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
        >
          <option value="">Sì / No</option>
          <option value="Sì">Sì</option>
          <option value="No">No</option>
          <option value="N/A">N/A</option>
        </select>
      </div>
      <div className="md:col-span-5">
        <input
          type="text"
          value={value.dettagli}
          onChange={(e) => onChangeDettagli(e.target.value)}
          placeholder={detailPlaceholder}
          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-800 pb-4 md:flex-row md:items-center">
        <div>
          <h3 className="text-base font-bold uppercase text-white">
            Questionario KYB Controparte — Glaring LLP
          </h3>
          <p className="mt-0.5 text-xs text-gray-400">
            Verifica identità, assetto proprietario e controllo, attività economica, origine dei fondi, conformità e dichiarazione finale.
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
                onClick={() => hydrateFormFromSubmission(sub, true)}
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
          {/* Scopo e istruzioni */}
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

            <p className="text-[11px] leading-relaxed text-gray-400">
              Glaring LLP è tenuta a verificare identità, titolarità effettiva e attività economica di clienti e fornitori prima di avviare un rapporto commerciale, per finalità di due diligence, antiriciclaggio (AML), screening sanzioni e contrattuali. Rispondere a ogni voce (se non applicabile, indicare &ldquo;N/A&rdquo; spiegandone il motivo), allegare i documenti della Sezione 9 e comunicare tempestivamente eventuali variazioni.
            </p>

            <div className="grid grid-cols-1 gap-3 border-t border-gray-800/80 pt-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                  Restituire a (Referente / Email Compliance)
                </label>
                <input
                  type="text"
                  value={counterparty.contatto_ritorno}
                  onChange={(e) =>
                    setCounterparty((prev) => ({ ...prev, contatto_ritorno: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                  Data di Compilazione
                </label>
                <input
                  type="text"
                  placeholder="GG/MM/AAAA"
                  value={counterparty.data_compilazione}
                  onChange={(e) =>
                    setCounterparty((prev) => ({ ...prev, data_compilazione: e.target.value }))
                  }
                  className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                  Riferimento Interno / Versione
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Es. KYB-2026-001"
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
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-2.5 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
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
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-2.5 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tab Paragrafi del Documento */}
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

          {/* Sezioni 1 e 2 */}
          {activeSection === 'sec_1_2' && (
            <div className="space-y-6">
              {/* Sezione 1. Anagrafica della società */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                  Sezione 1. Anagrafica della Società
                </h4>

                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-950/70 text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="w-1/2 px-3 py-2.5">Voce</th>
                        <th className="w-1/2 px-3 py-2.5">Risposta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {[
                        {
                          label: 'Denominazione legale completa della società *',
                          key: 'denominazione_legale' as const,
                          placeholder: 'Ragione sociale ufficiale',
                        },
                        {
                          label: 'Denominazione commerciale (se diversa)',
                          key: 'denominazione_commerciale' as const,
                          placeholder: 'Nome commerciale / brand',
                        },
                        {
                          label: 'Forma giuridica (es. Ltd, LLP, PLC, ditta individuale, S.r.l., GmbH)',
                          key: 'forma_giuridica' as const,
                          placeholder: 'Es. LLP, S.r.l., Ltd',
                        },
                        {
                          label: 'Numero di iscrizione o registrazione',
                          key: 'numero_registrazione' as const,
                          placeholder: 'Company No. / REA',
                        },
                        {
                          label: 'Paese di costituzione o registrazione',
                          key: 'paese_costituzione' as const,
                          placeholder: 'Es. United Kingdom, Italia',
                        },
                        {
                          label: 'Data di costituzione',
                          key: 'data_costituzione' as const,
                          placeholder: 'GG/MM/AAAA o anno',
                        },
                        {
                          label: 'Indirizzo della sede legale',
                          key: 'sede_legale' as const,
                          placeholder: 'Via, civico, CAP, città, paese',
                        },
                        {
                          label: 'Sede operativa principale (se diversa)',
                          key: 'sede_operativa' as const,
                          placeholder: 'Indirizzo sede operativa',
                        },
                        {
                          label: 'Sito web',
                          key: 'sito_web' as const,
                          placeholder: 'https://...',
                        },
                        {
                          label: 'Partita IVA / VAT (se applicabile)',
                          key: 'partita_iva' as const,
                          placeholder: 'Es. GB... / IT...',
                        },
                        {
                          label: 'Codice fiscale / identificativo fiscale (es. UTR, codice fiscale, EIN)',
                          key: 'codice_fiscale_utr' as const,
                          placeholder: 'Codice fiscale o UTR',
                        },
                        {
                          label: 'Referente principale (nome, ruolo ed email)',
                          key: 'referente_nome_ruolo_email' as const,
                          placeholder: 'Nome Cognome · Ruolo · email@dominio.com',
                        },
                        {
                          label: 'Telefono del referente principale',
                          key: 'telefono_referente' as const,
                          placeholder: '+39 / +44 ...',
                        },
                      ].map((row) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2 font-semibold text-gray-200">{row.label}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={counterparty.sezione_1_anagrafica[row.key]}
                              placeholder={row.placeholder}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCounterparty((prev) => ({
                                  ...prev,
                                  sezione_1_anagrafica: {
                                    ...prev.sezione_1_anagrafica,
                                    [row.key]: val,
                                  },
                                }));
                              }}
                              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sezione 2. Proprietà e controllo */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                      Sezione 2. Proprietà e Controllo
                    </h4>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      Indicare ogni persona fisica o giuridica che possiede o controlla direttamente o indirettamente il 25% o più della società, o esercita controllo significativo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addOwnerRow}
                    className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-[11px] font-bold text-gray-200 hover:bg-gray-800"
                  >
                    + Aggiungi Soggetto / UBO
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-950/70 text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="px-2.5 py-2.5">Nome e cognome</th>
                        <th className="px-2.5 py-2.5">Data di nascita</th>
                        <th className="px-2.5 py-2.5">Nazionalità</th>
                        <th className="px-2.5 py-2.5">Paese residenza</th>
                        <th className="px-2.5 py-2.5">% Quota</th>
                        <th className="px-2.5 py-2.5">Ruolo</th>
                        <th className="px-2.5 py-2.5 text-right">Azioni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {counterparty.sezione_2_proprieta_controllo.titolari_controllo.map(
                        (owner, idx) => (
                          <tr key={owner.id}>
                            <td className="px-2.5 py-2">
                              <input
                                type="text"
                                value={owner.nome_completo}
                                placeholder="Nome e cognome o denominazione"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCounterparty((prev) => {
                                    const next = [
                                      ...prev.sezione_2_proprieta_controllo.titolari_controllo,
                                    ];
                                    next[idx] = { ...next[idx], nome_completo: val };
                                    return {
                                      ...prev,
                                      sezione_2_proprieta_controllo: {
                                        ...prev.sezione_2_proprieta_controllo,
                                        titolari_controllo: next,
                                      },
                                    };
                                  });
                                }}
                                className="w-40 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-white"
                              />
                            </td>
                            <td className="px-2.5 py-2">
                              <input
                                type="text"
                                value={owner.data_nascita}
                                placeholder="GG/MM/AAAA"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCounterparty((prev) => {
                                    const next = [
                                      ...prev.sezione_2_proprieta_controllo.titolari_controllo,
                                    ];
                                    next[idx] = { ...next[idx], data_nascita: val };
                                    return {
                                      ...prev,
                                      sezione_2_proprieta_controllo: {
                                        ...prev.sezione_2_proprieta_controllo,
                                        titolari_controllo: next,
                                      },
                                    };
                                  });
                                }}
                                className="w-24 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 font-mono text-xs text-white"
                              />
                            </td>
                            <td className="px-2.5 py-2">
                              <input
                                type="text"
                                value={owner.nazionalita}
                                placeholder="Nazionalità"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCounterparty((prev) => {
                                    const next = [
                                      ...prev.sezione_2_proprieta_controllo.titolari_controllo,
                                    ];
                                    next[idx] = { ...next[idx], nazionalita: val };
                                    return {
                                      ...prev,
                                      sezione_2_proprieta_controllo: {
                                        ...prev.sezione_2_proprieta_controllo,
                                        titolari_controllo: next,
                                      },
                                    };
                                  });
                                }}
                                className="w-28 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-white"
                              />
                            </td>
                            <td className="px-2.5 py-2">
                              <input
                                type="text"
                                value={owner.paese_residenza}
                                placeholder="Residenza"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCounterparty((prev) => {
                                    const next = [
                                      ...prev.sezione_2_proprieta_controllo.titolari_controllo,
                                    ];
                                    next[idx] = { ...next[idx], paese_residenza: val };
                                    return {
                                      ...prev,
                                      sezione_2_proprieta_controllo: {
                                        ...prev.sezione_2_proprieta_controllo,
                                        titolari_controllo: next,
                                      },
                                    };
                                  });
                                }}
                                className="w-28 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-white"
                              />
                            </td>
                            <td className="px-2.5 py-2">
                              <input
                                type="text"
                                value={owner.quota_percentuale}
                                placeholder="Es. 50%"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCounterparty((prev) => {
                                    const next = [
                                      ...prev.sezione_2_proprieta_controllo.titolari_controllo,
                                    ];
                                    next[idx] = { ...next[idx], quota_percentuale: val };
                                    return {
                                      ...prev,
                                      sezione_2_proprieta_controllo: {
                                        ...prev.sezione_2_proprieta_controllo,
                                        titolari_controllo: next,
                                      },
                                    };
                                  });
                                }}
                                className="w-20 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 font-mono text-xs text-white"
                              />
                            </td>
                            <td className="px-2.5 py-2">
                              <input
                                type="text"
                                value={owner.ruolo}
                                placeholder="Socio / Amministratore / UBO"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCounterparty((prev) => {
                                    const next = [
                                      ...prev.sezione_2_proprieta_controllo.titolari_controllo,
                                    ];
                                    next[idx] = { ...next[idx], ruolo: val };
                                    return {
                                      ...prev,
                                      sezione_2_proprieta_controllo: {
                                        ...prev.sezione_2_proprieta_controllo,
                                        titolari_controllo: next,
                                      },
                                    };
                                  });
                                }}
                                className="w-36 rounded-lg border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-white"
                              />
                            </td>
                            <td className="px-2.5 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeOwnerRow(owner.id)}
                                className="cursor-pointer rounded border border-gray-700 px-2 py-1 text-[10px] text-gray-400 hover:border-red-500/60 hover:text-red-300"
                              >
                                Rimuovi
                              </button>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                    Se un socio è una società: denominazione legale, numero di iscrizione, giurisdizione e relativi titolari effettivi
                  </label>
                  <textarea
                    rows={2}
                    value={counterparty.sezione_2_proprieta_controllo.nota_societa_controllante}
                    onChange={(e) =>
                      setCounterparty((prev) => ({
                        ...prev,
                        sezione_2_proprieta_controllo: {
                          ...prev.sezione_2_proprieta_controllo,
                          nota_societa_controllante: e.target.value,
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                  />
                </div>

                <div className="rounded-xl border border-gray-800 bg-gray-900 p-3.5">
                  {renderYesNoRow(
                    'La società, un titolare, amministratore o soggetto con controllo è una Persona Politicamente Esposta (PEP), o un familiare stretto o stretto collaboratore di una PEP?',
                    counterparty.sezione_2_proprieta_controllo.pep_o_familiari_stretti,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_2_proprieta_controllo: {
                          ...prev.sezione_2_proprieta_controllo,
                          pep_o_familiari_stretti: {
                            ...prev.sezione_2_proprieta_controllo.pep_o_familiari_stretti,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_2_proprieta_controllo: {
                          ...prev.sezione_2_proprieta_controllo,
                          pep_o_familiari_stretti: {
                            ...prev.sezione_2_proprieta_controllo.pep_o_familiari_stretti,
                            dettagli,
                          },
                        },
                      }))
                  )}

                  {renderYesNoRow(
                    'La società, un titolare, amministratore o soggetto con controllo è soggetto a sanzioni o iscritto in liste sanzionatorie (UK, UE, ONU, US OFAC)?',
                    counterparty.sezione_2_proprieta_controllo.sanzioni_uk_ue_onu_ofac,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_2_proprieta_controllo: {
                          ...prev.sezione_2_proprieta_controllo,
                          sanzioni_uk_ue_onu_ofac: {
                            ...prev.sezione_2_proprieta_controllo.sanzioni_uk_ue_onu_ofac,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_2_proprieta_controllo: {
                          ...prev.sezione_2_proprieta_controllo,
                          sanzioni_uk_ue_onu_ofac: {
                            ...prev.sezione_2_proprieta_controllo.sanzioni_uk_ue_onu_ofac,
                            dettagli,
                          },
                        },
                      }))
                  )}

                  {renderYesNoRow(
                    'La società è posseduta o controllata da un governo, ente pubblico o impresa a partecipazione/controllo statale?',
                    counterparty.sezione_2_proprieta_controllo.controllo_statale_o_ente_pubblico,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_2_proprieta_controllo: {
                          ...prev.sezione_2_proprieta_controllo,
                          controllo_statale_o_ente_pubblico: {
                            ...prev.sezione_2_proprieta_controllo.controllo_statale_o_ente_pubblico,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_2_proprieta_controllo: {
                          ...prev.sezione_2_proprieta_controllo,
                          controllo_statale_o_ente_pubblico: {
                            ...prev.sezione_2_proprieta_controllo.controllo_statale_o_ente_pubblico,
                            dettagli,
                          },
                        },
                      }))
                  )}

                  {renderYesNoRow(
                    'Vi sono state variazioni dell’assetto proprietario o degli amministratori negli ultimi 12 mesi?',
                    counterparty.sezione_2_proprieta_controllo.variazioni_assetto_ultimi_12_mesi,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_2_proprieta_controllo: {
                          ...prev.sezione_2_proprieta_controllo,
                          variazioni_assetto_ultimi_12_mesi: {
                            ...prev.sezione_2_proprieta_controllo.variazioni_assetto_ultimi_12_mesi,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_2_proprieta_controllo: {
                          ...prev.sezione_2_proprieta_controllo,
                          variazioni_assetto_ultimi_12_mesi: {
                            ...prev.sezione_2_proprieta_controllo.variazioni_assetto_ultimi_12_mesi,
                            dettagli,
                          },
                        },
                      }))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sezioni 3 e 4 */}
          {activeSection === 'sec_3_4' && (
            <div className="space-y-6">
              {/* Sezione 3. Attività economica */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                  Sezione 3. Attività Economica
                </h4>

                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-950/70 text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="w-1/2 px-3 py-2.5">Domanda</th>
                        <th className="w-1/2 px-3 py-2.5">Risposta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {[
                        {
                          label: 'Descrizione dell’attività economica principale e dei prodotti o servizi forniti',
                          key: 'descrizione_attivita_prodotti_servizi' as const,
                          multiline: true,
                        },
                        {
                          label: 'Settore/i industriale/i',
                          key: 'settori_industriali' as const,
                        },
                        {
                          label: 'Paesi in cui operate o generate ricavi',
                          key: 'paesi_operativi_e_ricavi' as const,
                        },
                        {
                          label: 'Paesi in cui intendete operare con Glaring LLP (se diversi)',
                          key: 'paesi_operativi_con_glaring' as const,
                        },
                        {
                          label: 'Principali tipologie di clienti (B2B, B2C, settore pubblico, altro)',
                          key: 'tipologia_clienti' as const,
                        },
                        {
                          label: 'Fatturato annuo stimato (ultimo esercizio e esercizio in corso)',
                          key: 'fatturato_annuo_stimato' as const,
                        },
                        {
                          label: 'Volume annuo stimato delle operazioni con Glaring LLP',
                          key: 'volume_annuo_stimato_glaring' as const,
                        },
                      ].map((row) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2 font-semibold text-gray-200">{row.label}</td>
                          <td className="px-3 py-2">
                            {row.multiline ? (
                              <textarea
                                rows={2}
                                value={counterparty.sezione_3_attivita_economica[row.key]}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCounterparty((prev) => ({
                                    ...prev,
                                    sezione_3_attivita_economica: {
                                      ...prev.sezione_3_attivita_economica,
                                      [row.key]: val,
                                    },
                                  }));
                                }}
                                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                              />
                            ) : (
                              <input
                                type="text"
                                value={counterparty.sezione_3_attivita_economica[row.key]}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCounterparty((prev) => ({
                                    ...prev,
                                    sezione_3_attivita_economica: {
                                      ...prev.sezione_3_attivita_economica,
                                      [row.key]: val,
                                    },
                                  }));
                                }}
                                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                              />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sezione 4. Origine dei fondi e del patrimonio */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                  Sezione 4. Origine dei Fondi e del Patrimonio
                </h4>

                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-950/70 text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="w-1/2 px-3 py-2.5">Domanda</th>
                        <th className="w-1/2 px-3 py-2.5">Risposta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {[
                        {
                          label: 'Descrizione dell’origine del capitale utilizzato per costituire e finanziare l’attività',
                          key: 'origine_capitale_iniziale' as const,
                        },
                        {
                          label: 'Descrizione delle principali fonti di ricavo',
                          key: 'principali_fonti_ricavi' as const,
                        },
                        {
                          label: 'Una parte dei fondi deriva da terzi? Se sì, indicare il soggetto terzo e il motivo',
                          key: 'fondi_da_terze_parti' as const,
                        },
                        {
                          label: 'Evidenza documentale a supporto disponibile (cfr. Sezione 9)',
                          key: 'prova_documentale_fondi' as const,
                        },
                      ].map((row) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2 font-semibold text-gray-200">{row.label}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={counterparty.sezione_4_origine_fondi_patrimonio[row.key]}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCounterparty((prev) => ({
                                  ...prev,
                                  sezione_4_origine_fondi_patrimonio: {
                                    ...prev.sezione_4_origine_fondi_patrimonio,
                                    [row.key]: val,
                                  },
                                }));
                              }}
                              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sezioni 5 e 6 */}
          {activeSection === 'sec_5_6' && (
            <div className="space-y-6">
              {/* Sezione 5. Intermediari, agenti e commissioni */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                  Sezione 5. Intermediari, Agenti e Commissioni
                </h4>

                <div className="rounded-xl border border-gray-800 bg-gray-900 p-3.5 space-y-3">
                  {renderYesNoRow(
                    'Utilizzate agenti commerciali, segnalatori o intermediari retribuiti a provvigione o referral fee?',
                    counterparty.sezione_5_intermediari_agenti_commissioni.uso_agenti_o_intermediari,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_5_intermediari_agenti_commissioni: {
                          ...prev.sezione_5_intermediari_agenti_commissioni,
                          uso_agenti_o_intermediari: {
                            ...prev.sezione_5_intermediari_agenti_commissioni.uso_agenti_o_intermediari,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_5_intermediari_agenti_commissioni: {
                          ...prev.sezione_5_intermediari_agenti_commissioni,
                          uso_agenti_o_intermediari: {
                            ...prev.sezione_5_intermediari_agenti_commissioni.uso_agenti_o_intermediari,
                            dettagli,
                          },
                        },
                      }))
                  )}

                  <div className="border-b border-gray-800/80 py-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                      Se sì, indicare per ciascun agente: nome, paese, ambito di attività e criterio di remunerazione
                    </label>
                    <textarea
                      rows={2}
                      value={counterparty.sezione_5_intermediari_agenti_commissioni.elenco_agenti_e_compensi}
                      onChange={(e) =>
                        setCounterparty((prev) => ({
                          ...prev,
                          sezione_5_intermediari_agenti_commissioni: {
                            ...prev.sezione_5_intermediari_agenti_commissioni,
                            elenco_agenti_e_compensi: e.target.value,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                    />
                  </div>

                  {renderYesNoRow(
                    'Avete verificato che ciascun agente non sia una PEP e non sia soggetto a sanzioni?',
                    counterparty.sezione_5_intermediari_agenti_commissioni.verifica_pep_e_sanzioni_agenti,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_5_intermediari_agenti_commissioni: {
                          ...prev.sezione_5_intermediari_agenti_commissioni,
                          verifica_pep_e_sanzioni_agenti: {
                            ...prev.sezione_5_intermediari_agenti_commissioni.verifica_pep_e_sanzioni_agenti,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_5_intermediari_agenti_commissioni: {
                          ...prev.sezione_5_intermediari_agenti_commissioni,
                          verifica_pep_e_sanzioni_agenti: {
                            ...prev.sezione_5_intermediari_agenti_commissioni.verifica_pep_e_sanzioni_agenti,
                            dettagli,
                          },
                        },
                      }))
                  )}
                </div>
              </div>

              {/* Sezione 6. Informazioni finanziarie */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                  Sezione 6. Informazioni Finanziarie
                </h4>

                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-950/70 text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="w-1/2 px-3 py-2.5">Domanda</th>
                        <th className="w-1/2 px-3 py-2.5">Risposta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {[
                        {
                          label: 'I bilanci annuali sono depositati presso il registro competente? (Sì / No e quale registro)',
                          key: 'bilanci_depositati_e_registro' as const,
                        },
                        {
                          label: 'I bilanci più recenti sono sottoposti a revisione legale? (Sì / No e da chi)',
                          key: 'bilanci_revisionati_e_soggetto' as const,
                        },
                        {
                          label: 'Denominazione della banca principale e paese del conto',
                          key: 'banca_principale_e_paese' as const,
                        },
                        {
                          label: 'È disponibile una lettera di referenza bancaria? (Sì / No)',
                          key: 'lettera_referenza_bancaria' as const,
                        },
                        {
                          label: 'Vi sono procedure concorsuali, di amministrazione o di ristrutturazione pendenti?',
                          key: 'procedure_insolvenza_o_ristrutturazione' as const,
                        },
                      ].map((row) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2 font-semibold text-gray-200">{row.label}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={counterparty.sezione_6_informazioni_finanziarie[row.key]}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCounterparty((prev) => ({
                                  ...prev,
                                  sezione_6_informazioni_finanziarie: {
                                    ...prev.sezione_6_informazioni_finanziarie,
                                    [row.key]: val,
                                  },
                                }));
                              }}
                              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sezioni 7 e 8 */}
          {activeSection === 'sec_7_8' && (
            <div className="space-y-6">
              {/* Sezione 7. Conformità e governance */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                  Sezione 7. Conformità e Governance
                </h4>

                <div className="rounded-xl border border-gray-800 bg-gray-900 p-3.5">
                  {renderYesNoRow(
                    'Disponete di una politica scritta contro la corruzione (anti-bribery and anti-corruption)?',
                    counterparty.sezione_7_conformita_governance.politica_anticorruzione,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          politica_anticorruzione: {
                            ...prev.sezione_7_conformita_governance.politica_anticorruzione,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          politica_anticorruzione: {
                            ...prev.sezione_7_conformita_governance.politica_anticorruzione,
                            dettagli,
                          },
                        },
                      }))
                  )}

                  {renderYesNoRow(
                    'Disponete di un codice etico o codice di condotta?',
                    counterparty.sezione_7_conformita_governance.codice_etico_o_condotta,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          codice_etico_o_condotta: {
                            ...prev.sezione_7_conformita_governance.codice_etico_o_condotta,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          codice_etico_o_condotta: {
                            ...prev.sezione_7_conformita_governance.codice_etico_o_condotta,
                            dettagli,
                          },
                        },
                      }))
                  )}

                  {renderYesNoRow(
                    'Disponete di procedure di controllo antiriciclaggio (AML) e screening sanzioni?',
                    counterparty.sezione_7_conformita_governance.procedure_aml_e_sanzioni,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          procedure_aml_e_sanzioni: {
                            ...prev.sezione_7_conformita_governance.procedure_aml_e_sanzioni,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          procedure_aml_e_sanzioni: {
                            ...prev.sezione_7_conformita_governance.procedure_aml_e_sanzioni,
                            dettagli,
                          },
                        },
                      }))
                  )}

                  {renderYesNoRow(
                    'Chi è il responsabile della protezione dei dati e siete iscritti presso l’autorità competente (es. ICO o Garante)?',
                    counterparty.sezione_7_conformita_governance.responsabile_dati_e_autorita,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          responsabile_dati_e_autorita: {
                            ...prev.sezione_7_conformita_governance.responsabile_dati_e_autorita,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          responsabile_dati_e_autorita: {
                            ...prev.sezione_7_conformita_governance.responsabile_dati_e_autorita,
                            dettagli,
                          },
                        },
                      })),
                    'Responsabile / DPO / Autorità (es. ICO, Garante)...'
                  )}

                  {renderYesNoRow(
                    'Siete a conoscenza di contenziosi, indagini o provvedimenti di autorità che coinvolgano la società o i soci negli ultimi 5 anni?',
                    counterparty.sezione_7_conformita_governance.contenziosi_indagini_ultimi_5_anni,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          contenziosi_indagini_ultimi_5_anni: {
                            ...prev.sezione_7_conformita_governance.contenziosi_indagini_ultimi_5_anni,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          contenziosi_indagini_ultimi_5_anni: {
                            ...prev.sezione_7_conformita_governance.contenziosi_indagini_ultimi_5_anni,
                            dettagli,
                          },
                        },
                      }))
                  )}

                  {renderYesNoRow(
                    'Avete polizze RC professionale, responsabilità civile terzi o altre coperture rilevanti? Se sì, indicare assicuratore e massimale',
                    counterparty.sezione_7_conformita_governance.coperture_assicurative,
                    (esito) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          coperture_assicurative: {
                            ...prev.sezione_7_conformita_governance.coperture_assicurative,
                            esito,
                          },
                        },
                      })),
                    (dettagli) =>
                      updateYesNoField(setCounterparty, (prev) => ({
                        ...prev,
                        sezione_7_conformita_governance: {
                          ...prev.sezione_7_conformita_governance,
                          coperture_assicurative: {
                            ...prev.sezione_7_conformita_governance.coperture_assicurative,
                            dettagli,
                          },
                        },
                      })),
                    'Assicuratore e massimale di copertura...'
                  )}
                </div>
              </div>

              {/* Sezione 8. Rapporto atteso */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                  Sezione 8. Rapporto Atteso
                </h4>

                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-950/70 text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="w-1/2 px-3 py-2.5">Domanda</th>
                        <th className="w-1/2 px-3 py-2.5">Risposta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {[
                        {
                          label: 'Scopo e natura del rapporto con Glaring LLP',
                          key: 'scopo_e_natura_rapporto' as const,
                        },
                        {
                          label: 'Data di avvio prevista',
                          key: 'data_avvio_prevista' as const,
                        },
                        {
                          label: 'Durata prevista',
                          key: 'durata_prevista' as const,
                        },
                        {
                          label: 'Modalità di pagamento e valuta',
                          key: 'modalita_pagamento_e_valuta' as const,
                        },
                      ].map((row) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2 font-semibold text-gray-200">{row.label}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={counterparty.sezione_8_rapporto_atteso[row.key]}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCounterparty((prev) => ({
                                  ...prev,
                                  sezione_8_rapporto_atteso: {
                                    ...prev.sezione_8_rapporto_atteso,
                                    [row.key]: val,
                                  },
                                }));
                              }}
                              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sezioni 9 e 10 */}
          {activeSection === 'sec_9_10' && (
            <div className="space-y-6">
              {/* Sezione 9. Documenti da allegare */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
                <div>
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                    Sezione 9. Documenti da Allegare
                  </h4>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Spuntare ciascun documento fornito. Per i documenti di identità possono essere richieste copie certificate.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-950/70 text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="w-16 px-3 py-2.5 text-center">Fornito</th>
                        <th className="px-3 py-2.5">Documento richiesto</th>
                        <th className="w-56 px-3 py-2.5">Riferimento / Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {counterparty.sezione_9_documenti_da_allegare.map((docItem, idx) => (
                        <tr key={docItem.id}>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={docItem.allegato}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setCounterparty((prev) => {
                                  const next = [...prev.sezione_9_documenti_da_allegare];
                                  next[idx] = { ...next[idx], allegato: checked };
                                  return { ...prev, sezione_9_documenti_da_allegare: next };
                                });
                              }}
                              className="h-4 w-4 cursor-pointer accent-[#FF5500]"
                            />
                          </td>
                          <td className="px-3 py-2 font-medium text-gray-200">{docItem.etichetta}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={docItem.note}
                              placeholder="Data o nota..."
                              onChange={(e) => {
                                const val = e.target.value;
                                setCounterparty((prev) => {
                                  const next = [...prev.sezione_9_documenti_da_allegare];
                                  next[idx] = { ...next[idx], note: val };
                                  return { ...prev, sezione_9_documenti_da_allegare: next };
                                });
                              }}
                              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-2.5 py-1 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sezione 10. Dichiarazione */}
              <div className="space-y-4 rounded-xl border border-gray-800 bg-gray-950/70 p-5">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#FF5500]">
                  Sezione 10. Dichiarazione
                </h4>

                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-800 bg-gray-900 p-4 text-xs leading-relaxed text-gray-200">
                  <input
                    type="checkbox"
                    checked={counterparty.sezione_10_dichiarazione.conferma_dichiarazione}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setCounterparty((prev) => ({
                        ...prev,
                        sezione_10_dichiarazione: {
                          ...prev.sezione_10_dichiarazione,
                          conferma_dichiarazione: checked,
                        },
                      }));
                    }}
                    className="mt-0.5 h-4 w-4 accent-[#FF5500]"
                  />
                  <span>
                    Confermo che le informazioni fornite nel presente questionario sono complete, accurate e aggiornate al meglio delle mie conoscenze. Mi impegno a comunicare tempestivamente a Glaring LLP qualsiasi variazione. Prendo atto che Glaring LLP può richiedere ulteriori informazioni o documenti e può sospendere o risolvere il rapporto qualora le informazioni risultino incomplete o inesatte.
                  </span>
                </label>

                <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-900">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-950/70 text-[10px] uppercase tracking-wider text-gray-400">
                        <th className="w-1/2 px-3 py-2.5">Campo</th>
                        <th className="w-1/2 px-3 py-2.5">Risposta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/80">
                      {[
                        {
                          label: 'Nome del firmatario autorizzato',
                          key: 'firmatario_autorizzato' as const,
                        },
                        {
                          label: 'Carica',
                          key: 'carica' as const,
                        },
                        {
                          label: 'Firma',
                          key: 'firma' as const,
                        },
                        {
                          label: 'Data',
                          key: 'data' as const,
                        },
                      ].map((row) => (
                        <tr key={row.key}>
                          <td className="px-3 py-2 font-semibold text-gray-200">{row.label}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={counterparty.sezione_10_dichiarazione[row.key]}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCounterparty((prev) => ({
                                  ...prev,
                                  sezione_10_dichiarazione: {
                                    ...prev.sezione_10_dichiarazione,
                                    [row.key]: val,
                                  },
                                }));
                              }}
                              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-1.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

          {/* Barra pulsanti invariata */}
          <div className="flex flex-wrap justify-end gap-3 border-t border-gray-800 pt-4">
            <button
              type="button"
              onClick={handleGeneratePdf}
              className="cursor-pointer rounded-xl border border-[#FF5500]/60 bg-[#FF5500]/15 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-orange-200 transition hover:bg-[#FF5500]/25"
            >
              Genera PDF
            </button>

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

export default KybQuestionnaireView;
