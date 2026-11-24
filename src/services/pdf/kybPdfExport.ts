import type { GosKybSubmission } from '@/modules/kyb/kybService';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function printKybSubmissionPdf(submission: GosKybSubmission): void {
  if (typeof window === 'undefined') return;

  const anag = submission.anagrafica_dati || ({} as any);
  const ubo = submission.societa_ubo_dati || ({} as any);
  const op = submission.operativita_fondi_dati || ({} as any);
  const pack = submission.pacchetto_completo || ({} as any);
  const ctrl = pack.controllo_documento || ({} as any);
  const prof = pack.profilo_societa || ({} as any);
  const struct = pack.struttura_societaria || ({} as any);
  const docs = Array.isArray(pack.indice_documentale) ? pack.indice_documentale : [];
  const faqs = Array.isArray(pack.domande_ricorrenti) ? pack.domande_ricorrenti : [];
  const kyc = pack.modulo_kyc || ({} as any);
  const decl = pack.dichiarazione_legale || ({} as any);

  const titoloAzienda =
    anag.ragione_sociale || ctrl.riferimento_interno || submission.company_code || 'Pratica KYB';

  const docsRowsHtml = docs
    .map(
      (d: any) => `
      <tr>
        <td>${escapeHtml(d.documento)}</td>
        <td>${escapeHtml(d.fonte || '-')}</td>
        <td>${escapeHtml(d.data || '-')}</td>
        <td>${escapeHtml(d.stato || '-')}</td>
        <td>${escapeHtml(d.note || '-')}</td>
      </tr>
    `
    )
    .join('');

  const faqHtml = faqs
    .map(
      (q: any, idx: number) => `
      <div class="faq-item">
        <div class="faq-q">${idx + 1}. ${escapeHtml(q.domanda)}</div>
        <div class="faq-a">${escapeHtml(q.risposta || 'Non compilato')}</div>
      </div>
    `
    )
    .join('');

  const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <title>Documento KYB — ${escapeHtml(titoloAzienda)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #111827;
      margin: 28px;
      font-size: 12px;
      line-height: 1.45;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111827;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand {
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #b45309;
    }
    h1 {
      margin: 4px 0 0;
      font-size: 20px;
      text-transform: uppercase;
    }
    .meta {
      text-align: right;
      font-family: monospace;
      font-size: 11px;
      color: #374151;
    }
    h2 {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #f3f4f6;
      padding: 6px 10px;
      border-left: 4px solid #f59e0b;
      margin: 18px 0 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 18px;
    }
    .field {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }
    .label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6b7280;
    }
    .val {
      font-size: 12px;
      color: #111827;
      margin-top: 2px;
      white-space: pre-wrap;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f9fafb;
      font-size: 10px;
      text-transform: uppercase;
    }
    .faq-item {
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .faq-q {
      font-weight: 700;
      color: #111827;
    }
    .faq-a {
      margin-top: 3px;
      color: #374151;
      white-space: pre-wrap;
    }
    @media print {
      body { margin: 14px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Glaring LLP · Fascicolo KYB</div>
      <h1>${escapeHtml(titoloAzienda)}</h1>
    </div>
    <div class="meta">
      <div><strong>Codice:</strong> ${escapeHtml(submission.company_code)}</div>
      <div><strong>Token:</strong> ${escapeHtml(submission.token)}</div>
      <div><strong>Stato:</strong> ${escapeHtml(submission.stato || 'Bozza')}</div>
      <div><strong>Inviato il:</strong> ${escapeHtml(submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('it-IT') : '-')}</div>
    </div>
  </div>

  <h2>1. Anagrafica Aziendale &amp; Referente</h2>
  <div class="grid">
    <div class="field"><div class="label">Ragione Sociale</div><div class="val">${escapeHtml(anag.ragione_sociale || '-')}</div></div>
    <div class="field"><div class="label">Forma Giuridica</div><div class="val">${escapeHtml(anag.forma_giuridica || '-')}</div></div>
    <div class="field"><div class="label">Partita IVA</div><div class="val">${escapeHtml(anag.partita_iva || '-')}</div></div>
    <div class="field"><div class="label">Codice Fiscale</div><div class="val">${escapeHtml(anag.codice_fiscale || '-')}</div></div>
    <div class="field"><div class="label">Sede Legale</div><div class="val">${escapeHtml(anag.sede_legale || '-')}</div></div>
    <div class="field"><div class="label">Città / Nazione</div><div class="val">${escapeHtml([anag.citta, anag.nazione].filter(Boolean).join(' — ') || '-')}</div></div>
    <div class="field"><div class="label">Sito Web</div><div class="val">${escapeHtml(anag.sito_web || '-')}</div></div>
    <div class="field"><div class="label">Referente</div><div class="val">${escapeHtml([anag.referente_nome, anag.referente_ruolo].filter(Boolean).join(' · ') || '-')}</div></div>
    <div class="field"><div class="label">Email Referente</div><div class="val">${escapeHtml(anag.referente_email || '-')}</div></div>
    <div class="field"><div class="label">Telefono Referente</div><div class="val">${escapeHtml(anag.referente_telefono || '-')}</div></div>
  </div>

  <h2>2. Assetto Societario, UBO &amp; Operatività</h2>
  <div class="grid">
    <div class="field"><div class="label">Legale Rappresentante</div><div class="val">${escapeHtml(ubo.legale_rappresentante || '-')}</div></div>
    <div class="field"><div class="label">Nazionalità Legale Rappresentante</div><div class="val">${escapeHtml(ubo.legale_rappresentante_nazionalita || '-')}</div></div>
    <div class="field"><div class="label">Titolari Effettivi (UBO)</div><div class="val">${escapeHtml(ubo.titolari_effettivi_ubo || '-')}</div></div>
    <div class="field"><div class="label">Partecipazioni Rilevanti</div><div class="val">${escapeHtml(ubo.partecipazioni_rilevanti || '-')}</div></div>
    <div class="field"><div class="label">PEP o Restrizioni</div><div class="val">${escapeHtml(ubo.pep_o_restrizioni || '-')}</div></div>
    <div class="field"><div class="label">Volume Annuo Stimato</div><div class="val">${escapeHtml(op.volume_annuo_stimato || '-')}</div></div>
    <div class="field"><div class="label">Attività Prevalente</div><div class="val">${escapeHtml(op.attivita_prevalente || prof.descrizione_attivita || '-')}</div></div>
    <div class="field"><div class="label">Paesi Operativi</div><div class="val">${escapeHtml(op.paesi_operativi || prof.mercati_paesi_serviti || '-')}</div></div>
    <div class="field"><div class="label">Provenienza Fondi</div><div class="val">${escapeHtml(op.provenienza_fondi || '-')}</div></div>
    <div class="field"><div class="label">Struttura Societaria / Capogruppo</div><div class="val">${escapeHtml([struct.gruppo_o_capogruppo, struct.soci_designati_quote].filter(Boolean).join(' — ') || '-')}</div></div>
  </div>

  <h2>3. Indice Documentale</h2>
  <table>
    <thead>
      <tr>
        <th>Documento</th>
        <th>Fonte</th>
        <th>Data</th>
        <th>Stato</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      ${docsRowsHtml || '<tr><td colspan="5">Nessun documento elencato.</td></tr>'}
    </tbody>
  </table>

  <h2>4. Domande Ricorrenti &amp; Conformità</h2>
  ${faqHtml || '<p>Nessuna risposta compilata.</p>'}

  <h2>5. Dichiarazione Legale &amp; Riferimento KYC</h2>
  <div class="grid">
    <div class="field"><div class="label">Riferimento Modulo KYC</div><div class="val">${escapeHtml(kyc.riferimento_modulo_kyc || '-')}</div></div>
    <div class="field"><div class="label">Modulo KYC Compilato</div><div class="val">${escapeHtml(kyc.modulo_kyc_compilato || '-')}</div></div>
    <div class="field"><div class="label">Dichiarante</div><div class="val">${escapeHtml([decl.nome_cognome, decl.carica].filter(Boolean).join(' — ') || '-')}</div></div>
    <div class="field"><div class="label">Luogo / Data / Firma</div><div class="val">${escapeHtml([decl.luogo, decl.data_dd_mm_yyyy, decl.firma].filter(Boolean).join(' · ') || '-')}</div></div>
  </div>
  ${submission.conformita_note ? `<div class="field" style="margin-top:10px;"><div class="label">Note Conformità</div><div class="val">${escapeHtml(submission.conformita_note)}</div></div>` : ''}

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print();
      }, 150);
    };
  </script>
</body>
</html>`;

  const printWin = window.open('', '_blank', 'width=960,height=780');
  if (!printWin) {
    alert('Consenti i popup nel browser per generare il PDF del documento KYB.');
    return;
  }
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}
