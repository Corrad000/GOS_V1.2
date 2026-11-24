import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LOGO_BASE64 } from './logo';
import {
  calculateInvoiceTotals,
  type GosInvoiceRecord,
  type InvoiceStatus,
} from '@/modules/invoices/invoiceService';

export interface FatturePdfOptions {
  advisorName?: string;
  openInNewTab?: boolean;
}

const DOC_META: Record<
  InvoiceStatus,
  { badge: string; heading: string; proformaNote?: string }
> = {
  proforma: {
    badge: 'PRO-FORMA INVOICE',
    heading: 'Pro-forma Invoice',
    proformaNote:
      'Documento non fiscale emesso a scopo preventivo / richiesta pagamento preliminare prima della fattura definitiva.',
  },
  draft: {
    badge: 'INVOICE — DRAFT',
    heading: 'Invoice (Draft)',
  },
  issued: {
    badge: 'INVOICE',
    heading: 'Invoice',
  },
  paid: {
    badge: 'INVOICE — PAID',
    heading: 'Invoice (Paid)',
  },
  cancelled: {
    badge: 'INVOICE — CANCELLED',
    heading: 'Invoice (Cancelled)',
  },
};

function fmtAmount(amount: number, currency = 'GBP'): string {
  const safeVal = Number.isFinite(amount) ? amount : 0;
  return `${currency} ${safeVal.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const fatturePdfService = {
  buildInvoicePdf(
    invoice: GosInvoiceRecord,
    advisorName = 'Glaring LLP'
  ): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const currency = (invoice.currency || 'GBP').toUpperCase();
    const meta = DOC_META[invoice.status] || DOC_META.draft;
    const totals = calculateInvoiceTotals(invoice.items || []);

    const currentTimestamp = new Date().toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    let currentY = 12;

    // --- INTESTAZIONE (stesso impianto grafico del report service) ---
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
    doc.text(
      `Documento: ${meta.badge} — ${invoice.invoice_number}`,
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

    currentY += 22;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.line(14, currentY, pageWidth - 14, currentY);

    // --- TITOLO DOCUMENTO & METADATI ---
    currentY += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`${meta.heading} — ${invoice.invoice_number}`, 14, currentY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Data Emissione: ${invoice.issue_date}  |  Scadenza: ${invoice.due_date}  |  Valuta: ${currency}`,
      14,
      currentY + 5.5
    );

    if (meta.proformaNote) {
      currentY += 10.5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(meta.proformaNote, 14, currentY, { maxWidth: pageWidth - 28 });
    }

    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.line(14, currentY, pageWidth - 14, currentY);

    // --- GRIGLIA FROM (SUPPLIER) / TO (CUSTOMER) ---
    currentY += 6;
    const colGap = 6;
    const boxWidth = (pageWidth - 28 - colGap) / 2;

    const supplierLines: string[] = [
      invoice.supplier_name || 'GLARING LLP',
      ...(invoice.supplier_registered_office ? [invoice.supplier_registered_office] : []),
      ...(invoice.supplier_company_number
        ? [`Company No.: ${invoice.supplier_company_number}`]
        : []),
      ...(invoice.supplier_vat_number ? [`VAT No.: ${invoice.supplier_vat_number}`] : []),
      ...(invoice.supplier_contact ? [`Contact: ${invoice.supplier_contact}`] : []),
    ];

    const customerLines: string[] = [
      invoice.customer_name || '-',
      ...(invoice.customer_billing_address ? [invoice.customer_billing_address] : []),
      ...(invoice.customer_vat_number ? [`VAT / Tax No.: ${invoice.customer_vat_number}`] : []),
      ...(invoice.customer_contact ? [`Contact: ${invoice.customer_contact}`] : []),
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['FROM (SUPPLIER)', 'TO (CUSTOMER)']],
      body: [[supplierLines.join('\n'), customerLines.join('\n')]],
      theme: 'plain',
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 8,
        lineWidth: { bottom: 0.1 },
        lineColor: [0, 0, 0],
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [0, 0, 0],
        cellPadding: 3,
        lineWidth: { bottom: 0.1 },
        lineColor: [203, 213, 225],
      },
      columnStyles: {
        0: { cellWidth: boxWidth },
        1: { cellWidth: boxWidth },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    // --- RIGHE SERVIZI / BENI ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('1. Services or Goods Supplied', 14, currentY);
    currentY += 3;

    const lineRows = (invoice.items || []).map((item, idx) => {
      const qty = Number(item.qty) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const vatRate = Number(item.vat_rate) || 0;
      const lineNet = qty * unitPrice;
      const lineVat = lineNet * vatRate;
      const lineGross = lineNet + lineVat;

      return [
        `#${idx + 1}`,
        item.description || '-',
        qty.toLocaleString('en-GB'),
        fmtAmount(unitPrice, currency),
        `${Math.round(vatRate * 100)}%`,
        fmtAmount(lineNet, currency),
        fmtAmount(lineGross, currency),
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Description', 'Qty', 'Unit Price', 'VAT', 'Net', 'Gross']],
      body: lineRows,
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
        fontSize: 7.5,
        textColor: [0, 0, 0],
        lineWidth: { bottom: 0.1 },
        lineColor: [203, 213, 225],
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 68 },
        2: { cellWidth: 14, halign: 'right' },
        3: { cellWidth: 24, halign: 'right' },
        4: { cellWidth: 14, halign: 'right' },
        5: { cellWidth: 26, halign: 'right' },
        6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;

    // --- RIEPILOGO TOTALI ---
    if (currentY > 215) {
      doc.addPage();
      currentY = 20;
    }

    const totalsBody: string[][] = [
      ['Total excluding VAT (Net)', fmtAmount(totals.netTotal, currency)],
      ['VAT at standard rate (20%)', fmtAmount(totals.vatStandard, currency)],
      ['VAT at reduced rate (5%)', fmtAmount(totals.vatReduced, currency)],
      ['VAT at zero rate / exempt (0%)', fmtAmount(totals.vatZero, currency)],
      ['Total VAT', fmtAmount(totals.vatTotal, currency)],
      ['TOTAL AMOUNT DUE', fmtAmount(totals.grossTotal, currency)],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Totals Summary', currency]],
      body: totalsBody,
      theme: 'plain',
      tableWidth: 86,
      margin: { left: pageWidth - 14 - 86, right: 14 },
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7.5,
        lineWidth: { bottom: 0.1 },
        lineColor: [0, 0, 0],
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [0, 0, 0],
        lineWidth: { bottom: 0.1 },
        lineColor: [203, 213, 225],
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === totalsBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 8.5;
        }
      },
    });

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

    // --- COORDINATE BANCARIE & TERMINI / NOTE ---
    if (currentY > 235) {
      doc.addPage();
      currentY = 20;
    }

    const paymentLines: string[] = [
      ...(invoice.bank_name ? [`Bank: ${invoice.bank_name}`] : []),
      ...(invoice.account_name ? [`Account Name: ${invoice.account_name}`] : []),
      ...(invoice.sort_code ? [`Sort Code: ${invoice.sort_code}`] : []),
      ...(invoice.account_number ? [`Account No.: ${invoice.account_number}`] : []),
      ...(invoice.iban ? [`IBAN: ${invoice.iban}`] : []),
      ...(invoice.bic_swift ? [`BIC / SWIFT: ${invoice.bic_swift}`] : []),
      ...(invoice.payment_reference ? [`Payment Reference: ${invoice.payment_reference}`] : []),
    ];

    const termsLines: string[] = [
      ...(invoice.payment_terms ? [`Payment Terms: ${invoice.payment_terms}`] : []),
      ...(invoice.late_payment_statement
        ? [`Late Payment: ${invoice.late_payment_statement}`]
        : []),
      ...(invoice.vat_treatment ? [`VAT Treatment: ${invoice.vat_treatment}`] : []),
      ...(invoice.additional_notes ? [`Notes: ${invoice.additional_notes}`] : []),
    ];

    if (paymentLines.length > 0 || termsLines.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [['Payment Details', 'Terms & Notes']],
        body: [
          [
            paymentLines.length > 0 ? paymentLines.join('\n') : '-',
            termsLines.length > 0 ? termsLines.join('\n') : '-',
          ],
        ],
        theme: 'plain',
        headStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 7.5,
          lineWidth: { bottom: 0.1 },
          lineColor: [0, 0, 0],
        },
        bodyStyles: {
          fontSize: 7,
          textColor: [0, 0, 0],
          cellPadding: 3,
          lineWidth: { bottom: 0.1 },
          lineColor: [203, 213, 225],
        },
        columnStyles: {
          0: { cellWidth: boxWidth },
          1: { cellWidth: boxWidth },
        },
        margin: { left: 14, right: 14 },
      });
    }

    // --- FOOTER (stesso impianto grafico del report service) ---
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Glaring LLP — ${meta.heading} ${invoice.invoice_number} — Operatore: ${advisorName} — ${currentTimestamp} — Pagina ${i} di ${pageCount}`,
        14,
        pageHeight - 8
      );
    }

    return doc;
  },

  printInvoicePdf(
    invoice: GosInvoiceRecord,
    options?: FatturePdfOptions
  ) {
    const advisorName = options?.advisorName || 'Glaring LLP';
    const doc = this.buildInvoicePdf(invoice, advisorName);
    const blobUrl = doc.output('bloburl');

    if (options?.openInNewTab === false) {
      const safeName = (invoice.invoice_number || 'documento').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`${safeName}.pdf`);
      return;
    }

    window.open(blobUrl, '_blank');
  },
};
