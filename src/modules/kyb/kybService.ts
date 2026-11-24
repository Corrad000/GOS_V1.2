import { supabase } from '@/services/supabase/client';
import { upsertContatto, splitNomeCognome } from '@/modules/contacts/contactsService';

export type KybStato = 'Bozza' | 'Inviato' | 'In revisione' | 'Approvato';

export interface KybAnagraficaDati {
  ragione_sociale: string;
  partita_iva: string;
  codice_fiscale: string;
  forma_giuridica: string;
  sede_legale: string;
  citta: string;
  nazione: string;
  sito_web: string;
  referente_nome: string;
  referente_ruolo: string;
  referente_email: string;
  referente_telefono: string;
}

export interface KybSocietaUboDati {
  legale_rappresentante: string;
  legale_rappresentante_nazionalita: string;
  titolari_effettivi_ubo: string;
  partecipazioni_rilevanti: string;
  pep_o_restrizioni: string;
}

export interface KybOperativitaFondiDati {
  attivita_prevalente: string;
  paesi_operativi: string;
  provenienza_fondi: string;
  volume_annuo_stimato: string;
  documenti_caricati_note: string;
}

export interface KybControlloDocumento {
  versione: string;
  riferimento_interno: string;
  compilato_da: string;
  nascondi_avvertenze_interne: boolean;
}

export interface KybProfiloSocieta {
  descrizione_attivita: string;
  linee_servizio: string;
  mercati_paesi_serviti: string;
  tipologia_clienti: string;
  team_direzione: string;
  anno_avvio_attivita: string;
}

export interface KybStrutturaSocietaria {
  organigramma_stato: 'Allegato' | 'Da allegare' | '';
  gruppo_o_capogruppo: string;
  soci_designati_quote: string;
}

export interface KybDocumentoItem {
  id: string;
  documento: string;
  fonte: string;
  data: string;
  stato: 'Disponibile' | 'Da ottenere' | '';
  note: string;
}

export interface KybDomandaRisposta {
  id: string;
  domanda: string;
  risposta: string;
}

export interface KybModuloKycRif {
  riferimento_modulo_kyc: string;
  modulo_kyc_compilato: 'Sì' | 'No' | '';
}

export interface KybDichiarazioneLegale {
  chk_informazioni_veritiere: boolean;
  chk_no_sanzioni_congelamento: boolean;
  chk_poteri_firma: boolean;
  chk_comunicazione_variazioni: boolean;
  chk_informativa_privacy_persone: boolean;
  nome_cognome: string;
  carica: string;
  luogo: string;
  data_dd_mm_yyyy: string;
  firma: string;
  contatto_privacy: string;
}

export interface KybPacchettoCompleto {
  controllo_documento: KybControlloDocumento;
  profilo_societa: KybProfiloSocieta;
  struttura_societaria: KybStrutturaSocietaria;
  indice_documentale: KybDocumentoItem[];
  domande_ricorrenti: KybDomandaRisposta[];
  modulo_kyc: KybModuloKycRif;
  dichiarazione_legale: KybDichiarazioneLegale;
}

export interface GosKybSubmission {
  id: string;
  azienda_id: string | null;
  company_code: string;
  token: string;
  stato: KybStato | string;
  anagrafica_dati: KybAnagraficaDati;
  societa_ubo_dati: KybSocietaUboDati;
  operativita_fondi_dati: KybOperativitaFondiDati;
  pacchetto_completo?: KybPacchettoCompleto;
  conformita_note: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toSafeUuid(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

export function buildDefaultIndiceDocumentale(): KybDocumentoItem[] {
  const rows: Array<{ id: string; documento: string; fonte: string }> = [
    { id: 'doc-1', documento: 'Certificato di costituzione', fonte: 'Companies House' },
    { id: 'doc-2', documento: 'Dichiarazione di conferma (confirmation statement)', fonte: 'Companies House' },
    { id: 'doc-3', documento: 'Registro delle persone con controllo significativo (PSC)', fonte: 'Companies House' },
    { id: 'doc-4', documento: 'Elenco dei soci designati', fonte: 'Companies House' },
    { id: 'doc-5', documento: 'Ultimo bilancio depositato', fonte: 'Companies House' },
    { id: 'doc-6', documento: 'Accordo di partnership della LLP', fonte: 'Interna' },
    { id: 'doc-7', documento: "Prova dell'indirizzo della sede legale", fonte: 'Interna' },
    { id: 'doc-8', documento: 'Delibera dei soci che autorizza la relazione', fonte: 'Interna' },
    {
      id: 'doc-9',
      documento: "Documenti d'identità dei soci e del legale rappresentante (copie certificate)",
      fonte: 'Interna / soci',
    },
    { id: 'doc-10', documento: 'Attestazione bancaria', fonte: 'Banca' },
    { id: 'doc-11', documento: 'Certificato fiscale (UTR) e posizione IVA', fonte: 'HMRC / interna' },
    { id: 'doc-12', documento: 'Polizza di responsabilità professionale', fonte: 'Assicuratore' },
  ];

  return rows.map((r) => ({
    id: r.id,
    documento: r.documento,
    fonte: r.fonte,
    data: '',
    stato: '',
    note: '',
  }));
}

export function buildDefaultDomandeRicorrenti(): KybDomandaRisposta[] {
  const domande = [
    'Qual è il modello di business e come si genera il fatturato?',
    'Chi sono i soci e chi esercita il controllo?',
    'Qual è l’origine dei fondi per l’attività?',
    'La società o i suoi esponenti sono PEP o soggetti a sanzioni?',
    'Vi sono contenziosi, indagini o procedure concorsuali in corso o recenti?',
    'La società utilizza agenti o intermediari retribuiti a provvigione?',
    'Esiste una politica anticorruzione e un codice etico?',
    'Come sono trattati i dati personali e chi è responsabile della protezione dei dati?',
    'Quali coperture assicurative sono in vigore?',
    'Sono disponibili bilanci certificati o non certificati?',
  ];

  return domande.map((domanda, idx) => ({
    id: `faq-${idx + 1}`,
    domanda,
    risposta: '',
  }));
}

export function buildEmptyKybPayload(company?: {
  ragione_sociale?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  indirizzo?: string;
  citta?: string;
  nazione?: string;
  sito_web?: string;
  referente?: string;
  email?: string;
  telefono?: string;
  advisor_nome?: string;
}): {
  anagrafica_dati: KybAnagraficaDati;
  societa_ubo_dati: KybSocietaUboDati;
  operativita_fondi_dati: KybOperativitaFondiDati;
  pacchetto_completo: KybPacchettoCompleto;
} {
  const ragioneSociale = company?.ragione_sociale || '';
  const referente = company?.referente || '';

  return {
    anagrafica_dati: {
      ragione_sociale: ragioneSociale,
      partita_iva: company?.partita_iva || '',
      codice_fiscale: company?.codice_fiscale || '',
      forma_giuridica: '',
      sede_legale: company?.indirizzo || '',
      citta: company?.citta || '',
      nazione: company?.nazione || '',
      sito_web: company?.sito_web || '',
      referente_nome: referente,
      referente_ruolo: '',
      referente_email: company?.email || '',
      referente_telefono: company?.telefono || '',
    },
    societa_ubo_dati: {
      legale_rappresentante: '',
      legale_rappresentante_nazionalita: '',
      titolari_effettivi_ubo: '',
      partecipazioni_rilevanti: '',
      pep_o_restrizioni: 'No',
    },
    operativita_fondi_dati: {
      attivita_prevalente: '',
      paesi_operativi: '',
      provenienza_fondi: '',
      volume_annuo_stimato: '',
      documenti_caricati_note: '',
    },
    pacchetto_completo: {
      controllo_documento: {
        versione: 'v0.1 — bozza',
        riferimento_interno: '',
        compilato_da: company?.advisor_nome || referente || '',
        nascondi_avvertenze_interne: false,
      },
      profilo_societa: {
        descrizione_attivita: '',
        linee_servizio: '',
        mercati_paesi_serviti: company?.nazione || '',
        tipologia_clienti: '',
        team_direzione: '',
        anno_avvio_attivita: '',
      },
      struttura_societaria: {
        organigramma_stato: '',
        gruppo_o_capogruppo: '',
        soci_designati_quote: '',
      },
      indice_documentale: buildDefaultIndiceDocumentale(),
      domande_ricorrenti: buildDefaultDomandeRicorrenti(),
      modulo_kyc: {
        riferimento_modulo_kyc: '',
        modulo_kyc_compilato: '',
      },
      dichiarazione_legale: {
        chk_informazioni_veritiere: false,
        chk_no_sanzioni_congelamento: false,
        chk_poteri_firma: false,
        chk_comunicazione_variazioni: false,
        chk_informativa_privacy_persone: false,
        nome_cognome: '',
        carica: '',
        luogo: company?.citta || '',
        data_dd_mm_yyyy: '',
        firma: '',
        contatto_privacy: company?.email || '',
      },
    },
  };
}

export function hydratePacchettoCompleto(
  raw: Partial<KybPacchettoCompleto> | undefined | null,
  companySeed?: Parameters<typeof buildEmptyKybPayload>[0]
): KybPacchettoCompleto {
  const defaults = buildEmptyKybPayload(companySeed).pacchetto_completo;

  const indiceMerged =
    Array.isArray(raw?.indice_documentale) && raw.indice_documentale.length > 0
      ? raw.indice_documentale
      : defaults.indice_documentale;

  const faqMerged =
    Array.isArray(raw?.domande_ricorrenti) && raw.domande_ricorrenti.length > 0
      ? raw.domande_ricorrenti
      : defaults.domande_ricorrenti;

  return {
    controllo_documento: {
      ...defaults.controllo_documento,
      ...(raw?.controllo_documento || {}),
    },
    profilo_societa: {
      ...defaults.profilo_societa,
      ...(raw?.profilo_societa || {}),
    },
    struttura_societaria: {
      ...defaults.struttura_societaria,
      ...(raw?.struttura_societaria || {}),
    },
    indice_documentale: indiceMerged,
    domande_ricorrenti: faqMerged,
    modulo_kyc: {
      ...defaults.modulo_kyc,
      ...(raw?.modulo_kyc || {}),
    },
    dichiarazione_legale: {
      ...defaults.dichiarazione_legale,
      ...(raw?.dichiarazione_legale || {}),
    },
  };
}

export function buildKybClientLink(token: string): string {
  if (typeof window === 'undefined') return `/kyb/${token}`;
  return `${window.location.origin}/kyb/${token}`;
}

export async function listKybSubmissions(
  companyCode: string,
  aziendaId?: string | null
): Promise<GosKybSubmission[]> {
  const safeId = toSafeUuid(aziendaId);
  const safeCode = String(companyCode || '').trim();
  if (!safeCode && !safeId) return [];

  let query = supabase
    .from('gos_kyb_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  if (safeId && safeCode) {
    query = query.or(`azienda_id.eq.${safeId},company_code.eq.${safeCode}`);
  } else if (safeId) {
    query = query.eq('azienda_id', safeId);
  } else {
    query = query.eq('company_code', safeCode);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Errore lettura gos_kyb_submissions:', error.message || error);
    return [];
  }

  return (data || []) as GosKybSubmission[];
}

export async function createKybSubmission(params: {
  aziendaId?: string | null;
  companyCode: string;
  companySeed?: Parameters<typeof buildEmptyKybPayload>[0];
}): Promise<GosKybSubmission | null> {
  const payload = buildEmptyKybPayload(params.companySeed);
  const safeId = toSafeUuid(params.aziendaId);
  const safeCode = String(params.companyCode || safeId || 'KYB').trim();
  const fallbackToken = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;

  const { data, error } = await supabase
    .from('gos_kyb_submissions')
    .insert([
      {
        azienda_id: safeId,
        company_code: safeCode,
        token: fallbackToken,
        stato: 'Bozza',
        ...payload,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('Errore creazione gos_kyb_submissions:', error.message || error);
    return null;
  }

  return (data as GosKybSubmission) || null;
}

export async function saveKybSubmission(params: {
  id: string;
  token?: string | null;
  stato: KybStato | string;
  anagrafica_dati: KybAnagraficaDati;
  societa_ubo_dati: KybSocietaUboDati;
  operativita_fondi_dati: KybOperativitaFondiDati;
  pacchetto_completo?: KybPacchettoCompleto;
  conformita_note?: string | null;
  aziendaId?: string | null;
  companyCode?: string | null;
  markSubmitted?: boolean;
}): Promise<GosKybSubmission | null> {
  const nowIso = new Date().toISOString();
  const safeId = toSafeUuid(params.aziendaId);

  const updatePayload: Record<string, any> = {
    stato: params.stato,
    anagrafica_dati: params.anagrafica_dati,
    societa_ubo_dati: params.societa_ubo_dati,
    operativita_fondi_dati: params.operativita_fondi_dati,
    conformita_note: params.conformita_note ?? null,
    updated_at: nowIso,
  };

  if (params.pacchetto_completo) {
    updatePayload.pacchetto_completo = params.pacchetto_completo;
  }

  if (params.markSubmitted) {
    updatePayload.submitted_at = nowIso;
  }

  let savedRow: GosKybSubmission | null = null;

  if (params.token) {
    const res = await fetch(`/api/kyb/${encodeURIComponent(String(params.token).trim())}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...updatePayload,
        markSubmitted: Boolean(params.markSubmitted),
      }),
    });
    if (res.ok) {
      const json = await res.json();
      savedRow = (json?.submission as GosKybSubmission) || null;
    }
  }

  if (!savedRow) {
    const { data, error } = await supabase
      .from('gos_kyb_submissions')
      .update(updatePayload)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Errore salvataggio gos_kyb_submissions:', error.message || error);
      return null;
    }
    savedRow = (data as GosKybSubmission) || null;
  }

  const refName =
    params.anagrafica_dati.referente_nome?.trim() ||
    params.societa_ubo_dati.legale_rappresentante?.trim() ||
    params.pacchetto_completo?.dichiarazione_legale?.nome_cognome?.trim();

  if (refName) {
    try {
      const { nome, cognome } = splitNomeCognome(refName);
      await upsertContatto({
        nome,
        cognome,
        email: params.anagrafica_dati.referente_email?.trim() || null,
        telefono: params.anagrafica_dati.referente_telefono?.trim() || null,
        ruolo:
          params.anagrafica_dati.referente_ruolo?.trim() ||
          params.pacchetto_completo?.dichiarazione_legale?.carica?.trim() ||
          'Referente / UBO KYB',
        aziendaId: safeId,
        aziendaNome:
          params.anagrafica_dati.ragione_sociale?.trim() ||
          params.pacchetto_completo?.controllo_documento?.riferimento_interno?.trim() ||
          null,
        origine: 'kyc',
      });
    } catch (e) {
      console.warn('Sync rubrica contatti non eseguito:', e);
    }
  }

  return savedRow;
}

export async function getKybSubmissionByToken(
  token: string
): Promise<GosKybSubmission | null> {
  const clean = decodeURIComponent(String(token || '')).trim();
  if (!clean) return null;

  try {
    const res = await fetch(`/api/kyb/${encodeURIComponent(clean)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.submission) {
        return json.submission as GosKybSubmission;
      }
    }
  } catch {
    // fallback diretto client Supabase
  }

  const { data, error } = await supabase
    .from('gos_kyb_submissions')
    .select('*')
    .eq('token', clean)
    .maybeSingle();

  if (error) {
    console.error('Errore lettura KYB da token:', error.message || error);
    return null;
  }

  return (data as GosKybSubmission) || null;
}
