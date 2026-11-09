export interface ReportConfig {
  activeTab: 'questionari' | 'business-plan' | 'cronoprogramma' | 'ruoli';
  project: {
    codiceAzienda: string;
    codiceProgetto: string;
    titolo: string;
    descrizione: string;
    stato: string;
    ragioneSociale: string;
  };
  advisor: {
    nome: string;
    studio: string;
  };
  financialData?: {
    years: number[];
    pnlRows: Array<{ label: string; values: number[]; isSubtotal?: boolean; isTotal?: boolean }>;
    cashFlowRows: Array<{ label: string; values: number[]; isSubtotal?: boolean; isTotal?: boolean }>;
    kpiRows: Array<{ label: string; values: number[]; isPercentage?: boolean }>;
    loans: Array<{ name: string; principal: number; interestRate: number; durationYears: number }>;
  };
  governanceData?: {
    contacts: Array<{ name: string; role: string; email: string; phone: string; department: string }>;
    assignments: Array<{ entity: string; roleAssigned: string; startDate: string; endDate?: string; status: string; notes: string }>;
  };
  taskData?: {
    summary: { total: number; completed: number; inProgress: number; delayed: number };
    tasks: Array<{ title: string; phase: string; assignee: string; dueDate: string; priority: string; status: string }>;
  };
}

export const projectReportService = {
  getTabDisplayName(activeTab: ReportConfig['activeTab']): string {
    switch (activeTab) {
      case 'business-plan': return 'Business Plan & Finanziario (Quinquennale)';
      case 'cronoprogramma': return 'Cronoprogramma & Task Operations';
      case 'ruoli': return 'Ruoli & Governance';
      case 'questionari': return 'Questionari & Assessment';
    }
  },

  formatProjectCode(codiceAzienda: string, codiceProgetto: string): string {
    return `${codiceAzienda}/${codiceProgetto}`;
  },

  generateReportHtml(config: ReportConfig): string {
    const tabName = this.getTabDisplayName(config.activeTab);
    const formattedCode = this.formatProjectCode(config.project.codiceAzienda, config.project.codiceProgetto);
    const currentDate = new Date().toLocaleDateString('it-IT');
    const fin = config.financialData;
    const gov = config.governanceData;
    const tData = config.taskData;

    // Stili CSS Comuni con A4 Landscape
    const baseStyles = `
      @page {
        size: A4 landscape;
        margin: 15mm;
        @bottom-right {
          content: "Pagina " counter(page) " di " counter(pages);
          font-family: monospace;
          font-size: 9px;
          color: #1e293b;
        }
      }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; line-height: 1.4; background: #fff; margin: 0; padding: 0; }
      .page-sheet { width: 297mm; min-height: 210mm; padding: 15mm; margin: 0 auto; background: #fff; box-sizing: border-box; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; }
      .page-sheet:last-child { page-break-after: avoid; }
      .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px; }
      .title-area h1 { font-size: 16px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a; }
      .title-area p { font-size: 11px; font-weight: 800; color: #3730a3; margin: 3px 0 0 0; }
      .meta-box { text-align: right; font-family: monospace; font-size: 10px; font-weight: 700; color: #0f172a; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
      .info-item span.label { display: block; font-size: 8px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; }
      .info-item span.value { font-size: 12px; font-weight: 900; color: #0f172a; margin-top: 2px; }
      .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
      .summary-card { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center; }
      .summary-card span.num { display: block; font-size: 18px; font-weight: 900; color: #0f172a; }
      .summary-card span.lbl { font-size: 8px; font-weight: 800; color: #475569; text-transform: uppercase; }
      .section-title { font-size: 12px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #0f172a; padding-bottom: 4px; color: #0f172a; margin-top: 20px; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 15px; }
      th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #cbd5e1; color: #0f172a; }
      th { background: #e2e8f0; font-weight: 900; color: #0f172a; text-transform: uppercase; font-size: 8px; }
      td.num, th.num { text-align: right; font-family: monospace; font-weight: 700; }
      tr.subtotal { font-weight: 800; background: #f1f5f9; }
      tr.total { font-weight: 900; background: #e2e8f0; border-top: 2px solid #0f172a; }
      .content-body { flex: 1; }
      .footer { border-top: 1px solid #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between; font-family: monospace; font-size: 9px; font-weight: 700; color: #334155; }
    `;

    // --- 1. CRONOPROGRAMMA & TASK ---
    if (config.activeTab === 'cronoprogramma') {
      return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><style>${baseStyles}</style></head>
        <body>
          <div class="page-sheet">
            <div class="content-body">
              <div class="header">
                <div class="title-area"><h1>GOS - Executive Advisory Report</h1><p>Sezione / Tab: ${tabName}</p></div>
                <div class="meta-box"><div><strong>Codice Progetto:</strong> ${formattedCode}</div><div><strong>Data:</strong> ${currentDate}</div></div>
              </div>
              <div class="info-grid">
                <div class="info-item"><span class="label">Azienda Cliente</span><span class="value">${config.project.ragioneSociale}</span></div>
                <div class="info-item"><span class="label">Rif. Advisor & Partner</span><span class="value">${config.advisor.nome} (${config.advisor.studio})</span></div>
              </div>
              <div class="section-title">Cruscotto di Riepilogo Operativo</div>
              <div class="summary-grid">
                <div class="summary-card"><span class="num">${tData?.summary.total || 0}</span><span class="lbl">Task Totali</span></div>
                <div class="summary-card"><span class="num" style="color: #059669;">${tData?.summary.completed || 0}</span><span class="lbl">Completati</span></div>
                <div class="summary-card"><span class="num" style="color: #d97706;">${tData?.summary.inProgress || 0}</span><span class="lbl">In Corso</span></div>
                <div class="summary-card"><span class="num" style="color: #dc2626;">${tData?.summary.delayed || 0}</span><span class="lbl">In Ritardo</span></div>
              </div>
              <div class="section-title">Elenco Completo Task Attivi</div>
              <table>
                <thead>
                  <tr><th>Titolo Task</th><th>Fase Operativa</th><th>Assegnato A</th><th>Scadenza</th><th>Priorità</th><th>Stato</th></tr>
                </thead>
                <tbody>
                  ${tData && tData.tasks.length > 0 ? tData.tasks.map(t => `
                    <tr><td><strong>${t.title}</strong></td><td>${t.phase}</td><td>${t.assignee}</td><td class="num">${t.dueDate}</td><td>${t.priority}</td><td><span style="font-weight: bold; color: ${t.status === 'Completato' ? '#059669' : '#d97706'};">${t.status}</span></td></tr>
                  `).join('') : '<tr><td colspan="6" style="text-align:center; color:#334155;">Nessun task attivo registrato.</td></tr>'}
                </tbody>
              </table>
            </div>
            <div class="footer"><span>${config.advisor.studio} - Executive Strategy & Operations</span><span>Pagina 1 di 1</span></div>
          </div>
        </body>
        </html>
      `;
    }

    // --- 2. RUOLI & GOVERNANCE ---
    if (config.activeTab === 'ruoli') {
      return `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><style>${baseStyles}</style></head>
        <body>
          <div class="page-sheet">
            <div class="content-body">
              <div class="header">
                <div class="title-area"><h1>GOS - Executive Advisory Report</h1><p>Sezione / Tab: ${tabName}</p></div>
                <div class="meta-box"><div><strong>Codice Progetto:</strong> ${formattedCode}</div><div><strong>Data:</strong> ${currentDate}</div></div>
              </div>
              <div class="info-grid">
                <div class="info-item"><span class="label">Azienda Cliente</span><span class="value">${config.project.ragioneSociale}</span></div>
                <div class="info-item"><span class="label">Rif. Advisor & Partner</span><span class="value">${config.advisor.nome} (${config.advisor.studio})</span></div>
              </div>
              <div class="section-title">Rubrica Incaricati & Contatti</div>
              <table>
                <thead><tr><th>Nominativo</th><th>Ruolo / Funzione</th><th>Dipartimento</th><th>Contatti (Email / Telefono)</th></tr></thead>
                <tbody>
                  ${gov && gov.contacts.length > 0 ? gov.contacts.map(c => `
                    <tr><td><strong>${c.name}</strong></td><td>${c.role}</td><td>${c.department}</td><td>${c.email} — ${c.phone}</td></tr>
                  `).join('') : '<tr><td colspan="4" style="text-align:center; color:#334155;">Nessun incaricato registrato.</td></tr>'}
                </tbody>
              </table>
              <div class="section-title">Governance & Storico Assegnazioni</div>
              <table>
                <thead><tr><th>Entità / Risorsa</th><th>Ruolo Assegnato</th><th>Periodo (Inizio / Fine)</th><th>Stato</th><th>Note</th></tr></thead>
                <tbody>
                  ${gov && gov.assignments.length > 0 ? gov.assignments.map(a => `
                    <tr><td><strong>${a.entity}</strong></td><td>${a.roleAssigned}</td><td>${a.startDate} ${a.endDate ? '➔ ' + a.endDate : '➔ In corso'}</td><td><span style="font-weight: bold; color: ${a.status === 'Attivo' ? '#059669' : '#dc2626'};">${a.status}</span></td><td>${a.notes}</td></tr>
                  `).join('') : '<tr><td colspan="5" style="text-align:center; color:#334155;">Nessuno storico assegnazioni registrato.</td></tr>'}
                </tbody>
              </table>
            </div>
            <div class="footer"><span>${config.advisor.studio} - Executive Strategy & Operations</span><span>Pagina 1 di 1</span></div>
          </div>
        </body>
        </html>
      `;
    }

    // --- 3. DEFAULT (BUSINESS PLAN & FINANZIARIO) ---
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><style>${baseStyles}</style></head>
      <body>
        <div class="page-sheet">
          <div class="content-body">
            <div class="header">
              <div class="title-area"><h1>GOS - Executive Advisory Report</h1><p>Sezione / Tab: ${tabName}</p></div>
              <div class="meta-box"><div><strong>Codice Progetto:</strong> ${formattedCode}</div><div><strong>Data:</strong> ${currentDate}</div></div>
            </div>
            <div class="info-grid">
              <div class="info-item"><span class="label">Azienda Cliente</span><span class="value">${config.project.ragioneSociale}</span></div>
              <div class="info-item"><span class="label">Rif. Advisor & Partner</span><span class="value">${config.advisor.nome} (${config.advisor.studio})</span></div>
            </div>
            ${fin ? `
              <div class="section-title">Profit & Loss (Conto Economico Quinquennale)</div>
              <table>
                <thead><tr><th>Voce Analitica</th>${fin.years.map(y => `<th class="num">Anno ${y + 1}</th>`).join('')}</tr></thead>
                <tbody>
                  ${fin.pnlRows.map(row => `<tr><td><strong>${row.label}</strong></td>${row.values.map(val => `<td class="num">€ ${val.toLocaleString('it-IT', { maximumFractionDigits: 0 })}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>
            ` : ''}
          </div>
          <div class="footer"><span>${config.advisor.studio} - Executive Strategy & Operations</span><span>Pagina 1</span></div>
        </div>
      </body>
      </html>
    `;
  }
};
