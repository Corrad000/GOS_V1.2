import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from './logo';

export const projectReportService = {
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let currentY = 12;

    // --- HEADER CON LOGO ---
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

    // Metadata a destra
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

    // --- RIFERIMENTI CLIENTE ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(offer.title, 14, currentY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${companyName} | Alla c.a.: ${offer.attentionName} (${offer.attentionEmail})`, 14, currentY + 6);

    currentY += 14;

    doc.setLineWidth(0.1);
    doc.line(14, currentY, pageWidth - 14, currentY);

    currentY += 8;

    // --- TABELLA MODULI E SERVIZI ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
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
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
        lineWidth: { bottom: 0.1 },
        lineColor: [0, 0, 0]
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [0, 0, 0],
        lineWidth: { bottom: 0.1 },
        lineColor: [203, 213, 225]
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 85 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // --- RIEPILOGO TOTALE ---
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(0, 0, 0);
    doc.text(`Valore Totale Fee: EUR ${offer.totalFee.toLocaleString()}`, pageWidth - 14, currentY, { align: 'right' });

    currentY += 12;

    // --- NOTE E CONDIZIONI ---
    if (offer.notes) {
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text('Note & Condizioni:', 14, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(offer.notes, 45, currentY);
    }

    // --- PIÈ DI PAGINA ---
    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Glaring LLP — Proposal ${offer.code} — Operatore: ${advisorName} — ${currentTimestamp} — Pagina ${i} di ${pageCount}`,
        14,
        pageHeight - 8
      );
    }

    // --- ANTEPRIMA IN SCHEDA ---
    const pdfBlobUrl = doc.output('bloburl');
    window.open(pdfBlobUrl, '_blank');
  }
};