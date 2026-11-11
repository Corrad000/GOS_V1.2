import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from './logo';

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

  // --- STAMPA REPORT BUSINESS PLAN (VERTICALE / PORTRAIT - Perfettamente Allineato) ---
  printBusinessPlanReport(
    bpData: {
      kpis: Array<{ label: string; value: string; variance?: string }>;
      balanceSheet: Array<string[]>;
      incomeStatement: Array<string[]>;
      cashFlow: Array<string[]>;
      loansSummary?: Array<{ name: string; principal: string; rate: string; duration: string }>;
      debtSchedule: Array<string[]>;
    },
    companyName: string,
    projectCode: string,
    advisorName: string
  ) {
    const doc = new jsPDF({ orientation: 'portrait' });
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

    // --- 1. KPI PRINCIPALI ---
    doc.setFontSize(9.5);
    doc.text('1. Key Performance Indicators (KPI)', 14, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [['Indicatore', 'Valore / Trend', 'Variazione / Note']],
      body: bpData.kpis.map(k => [k.label, k.value, k.variance || '-']),
      theme: 'plain',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
      bodyStyles: { fontSize: 7, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 80 }, 2: { cellWidth: 47 } },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // --- CONFIGURAZIONE RIGIDA COLONNE ANNI (Totale esatto 182 mm) ---
    // cellWidth: 0=52mm, 1(Anno1)=26mm, 2(Anno2)=26mm, 3(Anno3)=26mm, 4(Anno4)=26mm, 5(Anno5)=26mm -> 52 + 130 = 182 mm
    const financialColumnStyles = {
      0: { cellWidth: 52 },
      1: { cellWidth: 26, halign: 'right' as const },
      2: { cellWidth: 26, halign: 'right' as const },
      3: { cellWidth: 26, halign: 'right' as const },
      4: { cellWidth: 26, halign: 'right' as const },
      5: { cellWidth: 26, halign: 'right' as const }
    };

    const financialHead = [['Voce', 'Anno 1', 'Anno 2', 'Anno 3', 'Anno 4', 'Anno 5']];

    // --- 2. STATO PATRIMONIALE ---
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('2. Stato Patrimoniale Pluriennale', 14, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: financialHead,
      body: bpData.balanceSheet,
      theme: 'plain',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
      bodyStyles: { fontSize: 6.5, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
      columnStyles: financialColumnStyles,
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // --- 3. CONTO ECONOMICO ---
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('3. Conto Economico Previsionale (5 Anni)', 14, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: financialHead,
      body: bpData.incomeStatement,
      theme: 'plain',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
      bodyStyles: { fontSize: 6.5, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
      columnStyles: financialColumnStyles,
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // --- 4. CASH FLOW ---
    if (currentY > 240) { doc.addPage(); currentY = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('4. Cash Flow & Rendiconto Finanziario (5 Anni)', 14, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [['Flusso di Cassa / Voce', 'Anno 1', 'Anno 2', 'Anno 3', 'Anno 4', 'Anno 5']],
      body: bpData.cashFlow,
      theme: 'plain',
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7.5, lineWidth: { bottom: 0.1 }, lineColor: [0, 0, 0] },
      bodyStyles: { fontSize: 6.5, textColor: [0, 0, 0], lineWidth: { bottom: 0.1 }, lineColor: [203, 213, 225] },
      columnStyles: financialColumnStyles,
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // --- 5. PIANO DEBITI & AMMORTAMENTO ---
    if (currentY > 210) { doc.addPage(); currentY = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('5. Piano di Ammortamento Finanziamenti & Esposizioni', 14, currentY);
    currentY += 4;

    // Tabella riassuntiva del finanziamento
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

    // Prospetto consolidato di ammortamento primi 5 anni
    autoTable(doc, {
      startY: currentY,
      head: [['Periodo', 'Debito Iniziale', 'Quota Capitale', 'Interessi', 'Rata Totale', 'Debito Residuo']],
      body: bpData.debtSchedule,
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

    // --- PIÈ DI PAGINA ---
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
