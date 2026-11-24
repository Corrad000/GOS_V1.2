import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as logoModule from './logo';
import type { GosKybSubmission } from '@/modules/kyb/kybService';

function fmt(value: unknown, fallback = '-'): string {
  if (typeof value === 'boolean') return value ? 'Sì' : 'No';
  if (value === null || value === undefined) return fallback;
  const str = String(value).trim();
  return str.length > 0 ? str : fallback;
}

function fmtYesNo(item: unknown): string {
  if (!item || typeof item !== 'object') return '-';
  const obj = item as { esito?: unknown; dettagli?: unknown };
  const esito = fmt(obj.esito, '');
  const dettagli = fmt(obj.dettagli, '');
  if (!esito && !dettagli) return '-';
  if (esito && dettagli) return `${esito} — ${dettagli}`;
  return esito || dettagli;
}

function resolveLogoValue(): string | null {
  const mod = logoModule as Record<string, unknown>;
  const candidate =
    mod.LOGO_BASE64 ||
    mod.GLARING_LOGO_BASE64 ||
    mod.logoBase64 ||
    mod.default;

  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return null;
}

function drawGlaringHeader(
  doc: jsPDF,
  pageWidth: number,
  currentY: number,
  codiceAzienda: string,
  tokenPratica: string,
  advisorName: string,
  currentTimestamp: string
): void {
  let rendered = false;
  const rawLogo = resolveLogoValue();

  if (rawLogo) {
    const formats: Array<'JPEG' | 'PNG'> = rawLogo.toLowerCase().includes('png')
      ? ['PNG', 'JPEG']
      : ['JPEG', 'PNG'];

    for (const fmtType of formats) {
      try {
        doc.addImage(rawLogo, fmtType, 14, currentY, 60, 18);
        rendered = true;
        break;
      } catch {
        // Prova il formato alternativo
      }
    }
  }

  if (!rendered) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('GLARING', 14, currentY + 6);
    doc.setFillColor(34, 197, 94);
    doc.circle(42.5, currentY + 5.8, 1.2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('LLP', 46, currentY + 8);
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Codice Azienda: ${codiceAzienda} | Token: ${tokenPratica}`,
    pageWidth - 14,
    currentY + 4,
    { align: 'right' }
  );
  doc.text(
    `Generato da: ${advisorName} | ${currentTimestamp}`,
    pageWidth - 14,
    currentY + 9,
    { align: 'right' }
  );
}

export function printKybSubmissionPdf(
  submission: GosKybSubmission,
  advisorName = 'Glaring LLP'
): void {
  if (typeof window === 'undefined') return;

  const anag = (submission.anagrafica_dati || {}) as Record<string, any>;
  const ubo = (submission.societa_ubo_dati || {}) as Record<string, any>;
  const op = (submission.operativita_fondi_dati || {}) as Record<string, any>;
  const pack = (submission.pacchetto_completo || {}) as Record<string, any>;
  const ctrl = (pack.controllo_documento || {}) as Record<string, any>;
  const cp = (pack.counterparty_kyb || {}) as Record<string, any>;

  const s1 = (cp.sezione_1_anagrafica || {}) as Record<string, any>;
  const s2 = (cp.sezione_2_proprieta_controllo || {}) as Record<string, any>;
  const s3 = (cp.sezione_3_attivita_economica || {}) as Record<string, any>;
  const s4 = (cp.sezione_4_origine_fondi_patrimonio || {}) as Record<string, any>;
  const s5 = (cp.sezione_5_intermediari_agenti_commissioni || {}) as Record<string, any>;
  const s6 = (cp.sezione_6_informazioni_finanziarie || {}) as Record<string, any>;
  const s7 = (cp.sezione_7_conformita_governance || {}) as Record<string, any>;
  const s8 = (cp.sezione_8_rapporto_atteso || {}) as Record<string, any>;
  const s9Docs = Array.isArray(cp.sezione_9_documenti_da_allegare)
    ? cp.sezione_9_documenti_da_allegare
    : Array.isArray(pack.indice_documentale)
      ? pack.indice_documentale
      : [];
  const s10 = (cp.sezione_10_dichiarazione || {}) as Record<string, any>;

  const companyName = fmt(
    s1.denominazione_legale || anag.ragione_sociale || ctrl.riferimento_interno || submission.company_code,
    'Pratica KYB'
  );
  const codiceAzienda = fmt(submission.company_code, 'KYB');
  const tokenPratica = fmt(submission.token, '-');
  const statoPratica = fmt(submission.stato, 'Bozza');
  const inviatoIl = submission.submitted_at
    ? new Date(submission.submitted_at).toLocaleString('it-IT')
    : '-';

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - 28;

  const currentTimestamp = new Date().toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  let currentY = 12;
  let sectionNum = 0;

  drawGlaringHeader(
    doc,
    pageWidth,
    currentY,
    codiceAzienda,
    tokenPratica,
    advisorName,
    currentTimestamp
  );

  currentY += 22;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.1);
  doc.line(14, currentY, pageWidth - 14, currentY);

  currentY += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Questionario KYB Controparte — ${companyName}`, 14, currentY);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Stato: ${statoPratica} | Inviato il: ${inviatoIl} | Data Compilazione: ${fmt(cp.data_compilazione)} | Restituire a: ${fmt(cp.contatto_ritorno)}`,
    14,
    currentY + 5.5
  );

  currentY += 11;

  const ensureSpaceAndHeading = (title: string, minNeededY = 240) => {
    if (currentY > minNeededY) {
      doc.addPage();
      currentY = 20;
    }
    sectionNum += 1;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`${sectionNum}. ${title}`, 14, currentY);
    currentY += 4;
  };

  const renderQaTable = (rows: Array<[string, string]>) => {
    autoTable(doc, {
      startY: currentY,
      head: [['Voce / Domanda', 'Risposta']],
      body: rows,
      theme: 'plain',
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7.5,
        lineWidth: { bottom: 0.1 },
        lineColor: [0, 0, 0],
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [0, 0, 0],
        lineWidth: { bottom: 0.1 },
        lineColor: [203, 213, 225],
      },
      columnStyles: {
        0: { cellWidth: 82, fontStyle: 'bold' },
        1: { cellWidth: 100 },
      },
      margin: { left: 14, right: 14 },
    });
    currentY = (doc as any).lastAutoTable.finalY + 8;
  };

  // Sezione 1. Anagrafica della società
  ensureSpaceAndHeading('Anagrafica della Società', 235);
  renderQaTable([
    ['Denominazione legale completa', fmt(s1.denominazione_legale || anag.ragione_sociale)],
    ['Denominazione commerciale', fmt(s1.denominazione_commerciale)],
    ['Forma giuridica', fmt(s1.forma_giuridica || anag.forma_giuridica)],
    ['Numero di iscrizione o registrazione', fmt(s1.numero_registrazione || anag.partita_iva)],
    ['Paese di costituzione o registrazione', fmt(s1.paese_costituzione || anag.nazione)],
    ['Data di costituzione', fmt(s1.data_costituzione)],
    ['Indirizzo della sede legale', fmt(s1.sede_legale || anag.sede_legale)],
    ['Sede operativa principale', fmt(s1.sede_operativa)],
    ['Sito web', fmt(s1.sito_web || anag.sito_web)],
    ['Partita IVA / VAT', fmt(s1.partita_iva || anag.partita_iva)],
    ['Codice fiscale / identificativo fiscale', fmt(s1.codice_fiscale_utr || anag.codice_fiscale)],
    ['Referente principale (nome, ruolo, email)', fmt(s1.referente_nome_ruolo_email || anag.referente_nome)],
    ['Telefono referente principale', fmt(s1.telefono_referente || anag.referente_telefono)],
  ]);

  // Sezione 2. Proprietà e controllo
  ensureSpaceAndHeading('Proprietà e Controllo', 235);
  const owners = Array.isArray(s2.titolari_controllo) ? s2.titolari_controllo : [];
  const ownerRows =
    owners.length > 0
      ? owners.map((o: any) => [
          fmt(o.nome_completo),
          fmt(o.data_nascita),
          fmt(o.nazionalita),
          fmt(o.paese_residenza),
          fmt(o.quota_percentuale),
          fmt(o.ruolo),
        ])
      : [[fmt(ubo.titolari_effettivi_ubo), '-', fmt(ubo.legale_rappresentante_nazionalita), '-', fmt(ubo.partecipazioni_rilevanti), fmt(ubo.legale_rappresentante)]];

  autoTable(doc, {
    startY: currentY,
    head: [['Nome e cognome', 'Data nascita', 'Nazionalità', 'Residenza', '% Quota', 'Ruolo']],
    body: ownerRows,
    theme: 'plain',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.5,
      lineWidth: { bottom: 0.1 },
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
      lineWidth: { bottom: 0.1 },
      lineColor: [203, 213, 225],
    },
    margin: { left: 14, right: 14 },
  });
  currentY = (doc as any).lastAutoTable.finalY + 6;

  renderQaTable([
    ['Società controllante / UBO catene societarie', fmt(s2.nota_societa_controllante)],
    ['PEP o familiari stretti / stretti collaboratori', fmtYesNo(s2.pep_o_familiari_stretti)],
    ['Sanzioni (UK, UE, ONU, US OFAC)', fmtYesNo(s2.sanzioni_uk_ue_onu_ofac)],
    ['Controllo statale o ente pubblico', fmtYesNo(s2.controllo_statale_o_ente_pubblico)],
    ['Variazioni assetto o amministratori (ultimi 12 mesi)', fmtYesNo(s2.variazioni_assetto_ultimi_12_mesi)],
  ]);

  // Sezione 3. Attività economica
  ensureSpaceAndHeading('Attività Economica', 235);
  renderQaTable([
    ['Attività economica principale, prodotti o servizi', fmt(s3.descrizione_attivita_prodotti_servizi || op.attivita_prevalente)],
    ['Settore/i industriale/i', fmt(s3.settori_industriali)],
    ['Paesi in cui operate o generate ricavi', fmt(s3.paesi_operativi_e_ricavi || op.paesi_operativi)],
    ['Paesi in cui intendete operare con Glaring LLP', fmt(s3.paesi_operativi_con_glaring)],
    ['Principali tipologie di clienti', fmt(s3.tipologia_clienti)],
    ['Fatturato annuo stimato', fmt(s3.fatturato_annuo_stimato || op.volume_annuo_stimato)],
    ['Volume annuo stimato con Glaring LLP', fmt(s3.volume_annuo_stimato_glaring)],
  ]);

  // Sezione 4. Origine dei fondi e del patrimonio
  ensureSpaceAndHeading('Origine dei Fondi e del Patrimonio', 235);
  renderQaTable([
    ['Origine del capitale iniziale e finanziamento', fmt(s4.origine_capitale_iniziale || op.provenienza_fondi)],
    ['Principali fonti di ricavo', fmt(s4.principali_fonti_ricavi)],
    ['Fondi derivanti da terze parti', fmt(s4.fondi_da_terze_parti)],
    ['Evidenza documentale a supporto', fmt(s4.prova_documentale_fondi)],
  ]);

  // Sezione 5. Intermediari, agenti e commissioni
  ensureSpaceAndHeading('Intermediari, Agenti e Commissioni', 235);
  renderQaTable([
    ['Uso agenti, segnalatori o intermediari a commissione', fmtYesNo(s5.uso_agenti_o_intermediari)],
    ['Elenco agenti, paese, ambito e remunerazione', fmt(s5.elenco_agenti_e_compensi)],
    ['Verifica PEP e sanzioni sugli agenti', fmtYesNo(s5.verifica_pep_e_sanzioni_agenti)],
  ]);

  // Sezione 6. Informazioni finanziarie
  ensureSpaceAndHeading('Informazioni Finanziarie', 235);
  renderQaTable([
    ['Bilanci annuali depositati e registro', fmt(s6.bilanci_depositati_e_registro)],
    ['Bilanci recenti revisionati e soggetto revisore', fmt(s6.bilanci_revisionati_e_soggetto)],
    ['Banca principale e paese del conto', fmt(s6.banca_principale_e_paese)],
    ['Lettera di referenza bancaria disponibile', fmt(s6.lettera_referenza_bancaria)],
    ['Procedure concorsuali o ristrutturazione in corso', fmt(s6.procedure_insolvenza_o_ristrutturazione)],
  ]);

  // Sezione 7. Conformità e governance
  ensureSpaceAndHeading('Conformità e Governance', 235);
  renderQaTable([
    ['Politica scritta anti-corruzione', fmtYesNo(s7.politica_anticorruzione)],
    ['Codice etico o codice di condotta', fmtYesNo(s7.codice_etico_o_condotta)],
    ['Procedure AML e screening sanzioni', fmtYesNo(s7.procedure_aml_e_sanzioni)],
    ['Responsabile protezione dati e autorità', fmtYesNo(s7.responsabile_dati_e_autorita)],
    ['Contenziosi, indagini o provvedimenti (ultimi 5 anni)', fmtYesNo(s7.contenziosi_indagini_ultimi_5_anni)],
    ['Coperture assicurative (assicuratore e massimale)', fmtYesNo(s7.coperture_assicurative)],
  ]);

  // Sezione 8. Rapporto atteso
  ensureSpaceAndHeading('Rapporto Atteso', 235);
  renderQaTable([
    ['Scopo e natura del rapporto con Glaring LLP', fmt(s8.scopo_e_natura_rapporto)],
    ['Data di avvio prevista', fmt(s8.data_avvio_prevista)],
    ['Durata prevista', fmt(s8.durata_prevista)],
    ['Modalità di pagamento e valuta', fmt(s8.modalita_pagamento_e_valuta)],
  ]);

  // Sezione 9. Documenti da allegare
  ensureSpaceAndHeading('Documenti da Allegare', 235);
  const docRows =
    s9Docs.length > 0
      ? s9Docs.map((d: any) => [
          d.allegato !== undefined ? (d.allegato ? 'Sì' : 'No') : fmt(d.stato),
          fmt(d.etichetta || d.documento),
          fmt(d.note),
        ])
      : [['-', 'Nessun documento elencato', '-']];

  autoTable(doc, {
    startY: currentY,
    head: [['Fornito', 'Documento richiesto', 'Note']],
    body: docRows,
    theme: 'plain',
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 7.5,
      lineWidth: { bottom: 0.1 },
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
      lineWidth: { bottom: 0.1 },
      lineColor: [203, 213, 225],
    },
    columnStyles: {
      0: { cellWidth: 20, fontStyle: 'bold' },
      1: { cellWidth: 112 },
      2: { cellWidth: 50 },
    },
    margin: { left: 14, right: 14 },
  });
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Sezione 10. Dichiarazione
  ensureSpaceAndHeading('Dichiarazione', 235);
  renderQaTable([
    ['Dichiarazione confermata', fmt(s10.conferma_dichiarazione)],
    ['Nome del firmatario autorizzato', fmt(s10.firmatario_autorizzato)],
    ['Carica', fmt(s10.carica)],
    ['Firma', fmt(s10.firma)],
    ['Data', fmt(s10.data)],
    ['Note aggiuntive di conformità', fmt(submission.conformita_note)],
  ]);

  // Footer su tutte le pagine
  const pageCount = (doc as any).getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `Glaring LLP — Questionario KYB Controparte — ${companyName} — Operatore: ${advisorName} — ${currentTimestamp} — Pagina ${i} di ${pageCount}`,
      14,
      pageHeight - 8
    );
  }

  window.open(doc.output('bloburl'), '_blank');
}
