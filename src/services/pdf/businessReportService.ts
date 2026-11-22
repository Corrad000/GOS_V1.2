import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from './logo';
import type { ReportTabKey } from '@/app/components/ReportTabSelectorModal';

export interface CruscottoReportData {
  summaryCards?: Array<{ titolo: string; valore: string; nota?: string }>;
  flowsSeries?: Array<{ serie: string; anno1: string; anno2: string; anno3: string; anno4: string; anno5: string }>;
  kpiIndicators?: Array<{ indicatore: string; valoreAnno5: string; note?: string }>;
}

export interface BusinessPlanReportData {
  kpis?: Array<{ label: string; value: string; variance?: string }>;
  balanceSheet?: Array<string[]>;
  incomeStatement?: Array<string[]>;
  cashFlow?: Array<string[]>;
  loansSummary?: Array<{ name: string; principal: string; rate: string; duration: string }>;
  debtSchedule?: Array<string[]>;
  strategyAdvisory?: Array<{ titolo: string; dettaglio: string; priorita?: string }>;
  financialInputs?: Array<{ driver: string; valore: string; note?: string }>;
  tasks?: Array<{ attivita: string; assegnatario?: string; stato?: string; scadenza?: string }>;
  kronos?: Array<{ fase: string; periodo: string; avanzamento?: string }>;
  roles?: Array<{ ruolo: string; responsabile: string; perimetro?: string }>;
  cruscotto?: CruscottoReportData;
}

const DEFAULT_CORE_TABS: ReportTabKey[] = [
  'key_metrics',
  'stato_patrimoniale',
  'profit_and_loss',
  'cash_flow',
  'debt_plan',
];

export const businessReportService = {
  formatProjectCode(codiceAzienda: string, codiceProgetto: string): string {
    return `${codiceAzienda || 'SUPER'} / ${codiceProgetto || 'PRJ-001'}`;
  },

  printOfferReport(
    offer: {
      code: string;
      title: string;
      submissionDate: string;
      status: string;
      attentionName: string;
      attentionEmail: string;
      totalFee: number;
      notes?: string;
      modules: Array<{ title: string; description: string; category: string; estimatedWeeks: number; fee: number }>;
    },
    companyName: string,
    advisorName: string
  ) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const currentTimestamp = new Date().toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    let currentY = 12;

    try {
      doc.addImage(LOGO_BASE64, 'JPEG', 14, currentY, 60, 18);
    } catch (e) {
      console.error('Errore logo:', e);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('GLARING', 14, currentY + 4);
      doc.setFillColor(34, 197, 94);
      doc.circle(42.5, currentY + 3.8, 1.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('LLP', 46, currentY + 6);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Codice Offerta: ${offer.code}`, pageWidth - 14, currentY + 4, { align: 'right' });
    doc.text(`Generato da: ${advisorName} | ${currentTimestamp}`, pageWidth - 14, currentY + 9, { align: 'right' });

    currentY += 22;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.line(14, currentY, pageWidth - 14, currentY);

    currentY += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(offer.title, 14, currentY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${companyName} | Alla c.a.: ${offer.attentionName} (${offer.attentionEmail})`, 14, currentY + 6);

    currentY += 14;
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1. Moduli Strategici & Fee Professionali', 14, currentY);
    currentY += 4;

    const tableData = offer.modules.map((m, idx) => [
      `#${idx + 1}`,
      `${m.title}\n${m.description}`,
      m.category,
      `${m.estimatedWeeks} sett.`,
      `EUR ${m.fee.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['N°', 'Modulo Strategico & Descrizione', 'Categoria', 'Durata', 'Fee Professionale']],
      body: tableData,
      theme: 'plain',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
      bodyStyles: { fontSize: 7.5, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 85 }, 2: { cellWidth: 35 }, 3: { cellWidth: 20 }, 4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' } },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
    if (currentY > 250) { doc.addPage(); currentY = 20; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(`Valore Totale Fee: EUR ${offer.totalFee.toLocaleString()}`, pageWidth - 14, currentY, { align: 'right' });
    currentY += 12;

    if (offer.notes) {
      if (currentY > 260) { doc.addPage(); currentY = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('Note & Condizioni:', 14, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(offer.notes, 45, currentY);
    }

    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Glaring LLP — Proposal ${offer.code} — Operatore: ${advisorName} — ${currentTimestamp} — Pagina ${i} di ${pageCount}`, 14, pageHeight - 8);
    }

    window.open(doc.output('bloburl'), '_blank');
  },

  printBusinessPlanReport(
    bpData: BusinessPlanReportData,
    companyName: string,
    projectCode: string,
    advisorName: string,
    options?: { selectedTabs?: ReportTabKey[] }
  ) {
    const selectedSet = new Set<ReportTabKey>(
      options?.selectedTabs && options.selectedTabs.length > 0
        ? options.selectedTabs
        : DEFAULT_CORE_TABS
    );

    const doc = new jsPDF({ orientation: 'portrait' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const currentTimestamp = new Date().toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    let currentY = 12;
    let sectionNum = 0;

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

    try {
      doc.addImage(LOGO_BASE64, 'JPEG', 14, currentY, 60, 18);
    } catch (e) {
      console.error('Errore logo:', e);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('GLARING', 14, currentY + 4);
      doc.setFillColor(34, 197, 94);
      doc.circle(42.5, currentY + 3.8, 1.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('LLP', 46, currentY + 6);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`Codice Progetto: ${projectCode}`, pageWidth - 14, currentY + 4, { align: 'right' });
    doc.text(`Generato da: ${advisorName} | ${currentTimestamp}`, pageWidth - 14, currentY + 9, { align: 'right' });

    currentY += 22;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.line(14, currentY, pageWidth - 14, currentY);

    currentY += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Business Plan Quinquennale — ${companyName}`, 14, currentY);

    currentY += 8;

    const financialColumnStyles = {
      0: { cellWidth: 52 },
      1: { cellWidth: 26, halign: 'right' as const },
      2: { cellWidth: 26, halign: 'right' as const },
      3: { cellWidth: 26, halign: 'right' as const },
      4: { cellWidth: 26, halign: 'right' as const },
      5: { cellWidth: 26, halign: 'right' as const }
    };

    const financialHead = [['Voce', 'Anno 1', 'Anno 2', 'Anno 3', 'Anno 4', 'Anno 5']];

    if (selectedSet.has('strategia_advisory')) {
      ensureSpaceAndHeading('Strategia & Advisory', 235);
      const strategyRows =
        bpData.strategyAdvisory && bpData.strategyAdvisory.length > 0
          ? bpData.strategyAdvisory.map((s) => [s.titolo, s.dettaglio, s.priorita || '-'])
          : [['Inquadramento Strategico', 'Sezione inclusa dal selettore tab del report.', '-']];

      autoTable(doc, {
        startY: currentY,
        head: [['Area / Direttiva', 'Dettaglio Strategico', 'Priorità']],
        body: strategyRows,
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
        columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 102 }, 2: { cellWidth: 30 } },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (selectedSet.has('financial_input')) {
      ensureSpaceAndHeading('Financial Input & Driver del Modello', 235);
      const inputRows =
        bpData.financialInputs && bpData.financialInputs.length > 0
          ? bpData.financialInputs.map((i) => [i.driver, i.valore, i.note || '-'])
          : [['Parametri Modello', 'Driver derivati dal piano quinquennale attivo', '-']];

      autoTable(doc, {
        startY: currentY,
        head: [['Driver / Parametro', 'Valore', 'Note']],
        body: inputRows,
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 52, halign: 'right' }, 2: { cellWidth: 60 } },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (selectedSet.has('key_metrics')) {
      ensureSpaceAndHeading('Key Performance Indicators (KPI)', 235);
      const kpiList = bpData.kpis || [];

      autoTable(doc, {
        startY: currentY,
        head: [['Indicatore', 'Valore / Trend', 'Variazione / Note']],
        body: kpiList.map(k => [k.label, k.value, k.variance || '-']),
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
        columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 80 }, 2: { cellWidth: 47 } },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (selectedSet.has('stato_patrimoniale')) {
      ensureSpaceAndHeading('Stato Patrimoniale Pluriennale', 240);

      autoTable(doc, {
        startY: currentY,
        head: financialHead,
        body: bpData.balanceSheet || [],
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 6.5, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
        columnStyles: financialColumnStyles,
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (selectedSet.has('profit_and_loss')) {
      ensureSpaceAndHeading('Conto Economico Previsionale (5 Anni)', 240);

      autoTable(doc, {
        startY: currentY,
        head: financialHead,
        body: bpData.incomeStatement || [],
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 6.5, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
        columnStyles: financialColumnStyles,
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (selectedSet.has('cash_flow')) {
      ensureSpaceAndHeading('Cash Flow & Rendiconto Finanziario (5 Anni)', 240);

      autoTable(doc, {
        startY: currentY,
        head: [['Flusso di Cassa / Voce', 'Anno 1', 'Anno 2', 'Anno 3', 'Anno 4', 'Anno 5']],
        body: bpData.cashFlow || [],
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 6.5, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
        columnStyles: financialColumnStyles,
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (selectedSet.has('debt_plan')) {
      ensureSpaceAndHeading('Piano di Ammortamento Finanziamenti & Esposizioni', 210);

      autoTable(doc, {
        startY: currentY,
        head: [['Nome / Descrizione Finanziamento', 'Capitale Iniziale', "Tasso d'Interesse", 'Durata']],
        body: (bpData.loansSummary || []).map(l => [l.name, l.principal, l.rate, l.duration]),
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 72 }, 1: { cellWidth: 45, halign: 'right' }, 2: { cellWidth: 35, halign: 'center' }, 3: { cellWidth: 30, halign: 'center' } },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      autoTable(doc, {
        startY: currentY,
        head: [['Periodo', 'Debito Iniziale', 'Quota Capitale', 'Interessi', 'Rata Totale', 'Debito Residuo']],
        body: bpData.debtSchedule || [],
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 6.5, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 32, halign: 'right' },
          2: { cellWidth: 32, halign: 'right' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 36, halign: 'right', fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (selectedSet.has('tasks')) {
      ensureSpaceAndHeading('Tasks & Attività Operative', 235);
      const taskRows =
        bpData.tasks && bpData.tasks.length > 0
          ? bpData.tasks.map((t) => [t.attivita, t.assegnatario || '-', t.stato || '-', t.scadenza || '-'])
          : [['Piano Operativo', 'Attività sincronizzate dal progetto', '-', '-']];

      autoTable(doc, {
        startY: currentY,
        head: [['Attività', 'Assegnatario', 'Stato', 'Scadenza']],
        body: taskRows,
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
        columnStyles: { 0: { cellWidth: 82 }, 1: { cellWidth: 42 }, 2: { cellWidth: 28 }, 3: { cellWidth: 30 } },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (selectedSet.has('kronos')) {
      ensureSpaceAndHeading('Kronos — Cronoprogramma & Milestone', 235);
      const kronosRows =
        bpData.kronos && bpData.kronos.length > 0
          ? bpData.kronos.map((k) => [k.fase, k.periodo, k.avanzamento || '-'])
          : [['Avanzamento Temporale', 'Milestone di progetto', '-']];

      autoTable(doc, {
        startY: currentY,
        head: [['Fase / Milestone', 'Periodo', 'Avanzamento']],
        body: kronosRows,
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
        columnStyles: { 0: { cellWidth: 92 }, 1: { cellWidth: 55 }, 2: { cellWidth: 35, halign: 'right' } },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (selectedSet.has('ruoli')) {
      ensureSpaceAndHeading('Ruoli & Governance', 235);
      const roleRows =
        bpData.roles && bpData.roles.length > 0
          ? bpData.roles.map((r) => [r.ruolo, r.responsabile, r.perimetro || '-'])
          : [['Advisor Principale', advisorName, 'Coordinamento Strategico & Operativo']];

      autoTable(doc, {
        startY: currentY,
        head: [['Ruolo', 'Responsabile', 'Perimetro']],
        body: roleRows,
        theme: 'plain',
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
        columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 55 }, 2: { cellWidth: 75 } },
        margin: { left: 14, right: 14 }
      });
      currentY = (doc as any).lastAutoTable.finalY + 8;
    }

    if (selectedSet.has('cruscotto')) {
      ensureSpaceAndHeading('Cruscotto Strategico & Risultati Quinquennali', 225);

      const summaryRows =
        bpData.cruscotto?.summaryCards && bpData.cruscotto.summaryCards.length > 0
          ? bpData.cruscotto.summaryCards.map((c) => [c.titolo, c.valore, c.nota || '-'])
          : [['Sintesi Cruscotto', 'Dati allineati ai prospetti quinquennali', 'Target Anno 5']];

      autoTable(doc, {
        startY: currentY,
        head: [['Sintesi Cruscotto', 'Valore', 'Riferimento']],
        body: summaryRows,
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
        bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 72 }, 1: { cellWidth: 55, halign: 'right' }, 2: { cellWidth: 55 } },
        margin: { left: 14, right: 14 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      if (bpData.cruscotto?.flowsSeries && bpData.cruscotto.flowsSeries.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [['Dinamica Flussi', 'Anno 1', 'Anno 2', 'Anno 3', 'Anno 4', 'Anno 5']],
          body: bpData.cruscotto.flowsSeries.map((f) => [
            f.serie,
            f.anno1,
            f.anno2,
            f.anno3,
            f.anno4,
            f.anno5,
          ]),
          theme: 'plain',
          headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
          bodyStyles: { fontSize: 6.5, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
          columnStyles: financialColumnStyles,
          margin: { left: 14, right: 14 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 6;
      }

      if (bpData.cruscotto?.kpiIndicators && bpData.cruscotto.kpiIndicators.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [['Indicatore KPI Cruscotto', 'Valore Anno 5', 'Note']],
          body: bpData.cruscotto.kpiIndicators.map((k) => [
            k.indicatore,
            k.valoreAnno5,
            k.note || 'Target Anno 5',
          ]),
          theme: 'plain',
          headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
          bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
          columnStyles: { 0: { cellWidth: 82 }, 1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' }, 2: { cellWidth: 55 } },
          margin: { left: 14, right: 14 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;
      }
    }

    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(`Glaring LLP — Business Plan — ${companyName} — Operatore: ${advisorName} — ${currentTimestamp} — Pagina ${i} di ${pageCount}`, 14, pageHeight - 8);
    }

    window.open(doc.output('bloburl'), '_blank');
  }
};
