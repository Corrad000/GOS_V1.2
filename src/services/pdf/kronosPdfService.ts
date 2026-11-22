import jsPDF from 'jspdf';
import { LOGO_BASE64 } from './logo';
import type { GanttItem } from '@/services/ganttService';

export interface KronosPdfOptions {
  projectTitle: string;
  projectCode?: string;
  advisorName: string;
  statusBadge: string;
  items: GanttItem[];
  wbsMap: Record<string, string>;
  stats: {
    totalTasks: number;
    criticalTasks: number;
    completedTasks: number;
    progressPct: number;
  };
}

const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const diffDays = (a: string, b: string) =>
  Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000);

const formatShort = (s: string) =>
  parseDate(s).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });

export const kronosPdfService = {
  printKronosGantt(opts: KronosPdfOptions) {
    const { projectTitle, projectCode, advisorName, statusBadge, items, wbsMap, stats } = opts;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm

    const marginX = 12;
    const usableWidth = pageWidth - marginX * 2; // 273 mm
    const leftColWidth = 78;
    const timelineWidth = usableWidth - leftColWidth; // 195 mm

    const timestamp = new Date().toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const dated = items.filter((i) => i.type !== 'grp' && i.start_date && i.end_date);
    const today = toIso(new Date());
    const minDate = dated.length > 0 ? dated.map((i) => i.start_date!).sort()[0] : today;
    const maxDate =
      dated.length > 0
        ? dated.map((i) => i.end_date!).sort().slice(-1)[0]
        : toIso(addDays(parseDate(today), 14));
    const totalDays = Math.max(1, diffDays(minDate, maxDate) + 1);

    const drawHeaderAndKpi = (startY: number) => {
      let y = startY;
      try {
        doc.addImage(LOGO_BASE64, 'JPEG', marginX, y, 36, 11);
      } catch {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text('GLARING LLP', marginX, y + 6);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`KRONOS · GANTT OPERATIVO — ${projectTitle.toUpperCase()}`, marginX + 40, y + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Codice: ${projectCode || 'PRJ'} | Stato: ${statusBadge} | Advisor: ${advisorName} | ${timestamp}`,
        marginX + 40,
        y + 10
      );

      y += 14;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 4;

      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, y, usableWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Totale Voci: ${stats.totalTasks}    |    Percorso Critico: ${stats.criticalTasks}    |    Completate (Stima): ${stats.completedTasks}/${stats.totalTasks}    |    Avanzamento Temporale: ${stats.progressPct}%    |    Finestra: ${formatShort(minDate)} - ${formatShort(maxDate)} (${totalDays} gg)`,
        marginX + 3,
        y + 5.2
      );

      return y + 11;
    };

    const drawGridHeader = (y: number, colWidth: number, unitsCount: number) => {
      const headerHeight = 9;
      doc.setFillColor(226, 232, 240);
      doc.rect(marginX, y, leftColWidth, headerHeight, 'F');
      doc.setDrawColor(148, 163, 184);
      doc.rect(marginX, y, leftColWidth, headerHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('WBS · ATTIVITÀ / RESPONSABILE', marginX + 2, y + 5.6);

      const labelStep = colWidth >= 5.2 ? 1 : Math.max(1, Math.ceil(14 / colWidth));

      for (let idx = 0; idx < unitsCount; idx++) {
        const x = marginX + leftColWidth + idx * colWidth;
        const dIso = toIso(addDays(parseDate(minDate), idx));
        const dt = parseDate(dIso);
        const isToday = dIso === today;

        doc.setFillColor(isToday ? 219 : 241, isToday ? 234 : 245, isToday ? 254 : 249);
        doc.rect(x, y, colWidth, headerHeight, 'F');
        doc.setDrawColor(148, 163, 184);
        doc.rect(x, y, colWidth, headerHeight);

        if (colWidth >= 5.2) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(15, 23, 42);
          doc.text(String(dt.getDate()), x + colWidth / 2, y + 4.2, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(71, 85, 105);
          const dayChar = dt.toLocaleDateString('it-IT', { weekday: 'narrow' }).toUpperCase();
          doc.text(dayChar, x + colWidth / 2, y + 7.6, { align: 'center' });
        } else if (idx === 0 || idx === unitsCount - 1 || idx % labelStep === 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(71, 85, 105);
          doc.text(formatShort(dIso), x + colWidth / 2, y + 5.6, { align: 'center' });
        }
      }

      return y + headerHeight;
    };

    const colWidth = timelineWidth / totalDays;
    const rowHeight = 9.5;
    const bottomLimit = pageHeight - 14;

    let currentY = drawHeaderAndKpi(10);
    currentY = drawGridHeader(currentY, colWidth, totalDays);

    items.forEach((item, idx) => {
      if (currentY + rowHeight > bottomLimit) {
        doc.addPage();
        currentY = drawHeaderAndKpi(10);
        currentY = drawGridHeader(currentY, colWidth, totalDays);
      }

      const wbs = wbsMap[item.id || String(idx)] || '';
      const isGroup = item.type === 'grp';

      doc.setFillColor(isGroup ? 241 : 255, isGroup ? 245 : 255, isGroup ? 249 : 255);
      doc.rect(marginX, currentY, leftColWidth, rowHeight, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, currentY, leftColWidth, rowHeight);

      if (isGroup) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(15, 23, 42);
        const label = `${wbs}  ${(item.name || '').toUpperCase()}`.slice(0, 46);
        doc.text(label, marginX + 2, currentY + 6);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        const titleText = `${wbs} ${item.name || ''}`.slice(0, 44);
        doc.text(titleText, marginX + 2, currentY + 4.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        const subText = `${item.owner || 'Glaring'} · ${item.start_date ? formatShort(item.start_date) : ''}${
          item.end_date && item.end_date !== item.start_date ? ` - ${formatShort(item.end_date)}` : ''
        }`;
        doc.text(subText.slice(0, 50), marginX + 2, currentY + 7.8);
      }

      for (let dIdx = 0; dIdx < totalDays; dIdx++) {
        const x = marginX + leftColWidth + dIdx * colWidth;
        const dIso = toIso(addDays(parseDate(minDate), dIdx));
        const dayOfWeek = parseDate(dIso).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        doc.setFillColor(
          isGroup ? 248 : isWeekend ? 241 : 255,
          isGroup ? 250 : isWeekend ? 245 : 255,
          isGroup ? 252 : isWeekend ? 249 : 255
        );
        doc.rect(x, currentY, colWidth, rowHeight, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(x, currentY, colWidth, rowHeight);
      }

      if (!isGroup && item.start_date) {
        const startOffset = Math.max(0, diffDays(minDate, item.start_date));
        const endIso = item.end_date || item.start_date;
        const spanDays = Math.max(1, diffDays(item.start_date, endIso) + 1);
        const barX = marginX + leftColWidth + startOffset * colWidth;
        const barW = Math.max(2.2, spanDays * colWidth - 0.6);

        if (item.type === 'ms' || item.type === 'gate') {
          const cx = barX + Math.min(colWidth / 2, barW / 2);
          const cy = currentY + rowHeight / 2;
          doc.setFillColor(
            item.type === 'gate' ? 22 : 15,
            item.type === 'gate' ? 163 : 23,
            item.type === 'gate' ? 74 : 42
          );
          doc.circle(cx, cy, 1.8, 'F');
        } else {
          if (item.crit) {
            doc.setFillColor(240, 122, 80);
          } else if (item.type === 'opt') {
            doc.setFillColor(100, 116, 139);
          } else {
            doc.setFillColor(91, 139, 230);
          }
          doc.roundedRect(barX + 0.3, currentY + 2.3, barW, rowHeight - 4.6, 1, 1, 'F');
        }
      }

      currentY += rowHeight;
    });

    const pageCount = (doc as any).getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setDrawColor(203, 213, 225);
      doc.line(marginX, pageHeight - 9, pageWidth - marginX, pageHeight - 9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(71, 85, 105);
      doc.text(
        `Glaring LLP — Kronos Gantt (${projectTitle}) — ${advisorName} — ${timestamp} — Pagina ${p} di ${pageCount}`,
        marginX,
        pageHeight - 5
      );
    }

    window.open(doc.output('bloburl'), '_blank');
  },
};
