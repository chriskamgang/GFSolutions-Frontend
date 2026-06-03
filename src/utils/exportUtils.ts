import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';

const _fmt = (v: number) => v.toLocaleString('fr-FR');

// ==================== EXCEL ====================

export function exportToExcel(
  data: Record<string, any>[],
  columns: { title: string; key: string; format?: (v: any, row: any) => string }[],
  filename: string,
) {
  const rows = data.map(row =>
    Object.fromEntries(columns.map(col => [
      col.title,
      col.format ? col.format(row[col.key], row) : row[col.key] ?? '',
    ]))
  );

  const ws = XLSX.utils.json_to_sheet(rows);

  // Largeurs de colonnes auto
  const colWidths = columns.map(col => ({
    wch: Math.max(col.title.length, ...rows.map(r => String(r[col.title] ?? '').length).slice(0, 50)) + 2,
  }));
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Donnees');
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `${filename}_${dayjs().format('YYYY-MM-DD')}.xlsx`);
}

// ==================== PDF ====================

interface PdfOptions {
  title: string;
  subtitle?: string;
  columns: { title: string; key: string; format?: (v: any, row: any) => string }[];
  data: Record<string, any>[];
  filename: string;
  orientation?: 'portrait' | 'landscape';
  summary?: { label: string; value: string }[];
}

export function exportToPdf(options: PdfOptions) {
  const { title, subtitle, columns, data, filename, orientation = 'portrait', summary } = options;

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // En-tete
  doc.setFillColor(27, 42, 74); // #1B2A4A
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Global Financial Solution', 14, 12);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(title, 14, 20);

  // Sous-titre et date
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  const dateStr = `Genere le ${dayjs().format('DD/MM/YYYY [a] HH:mm')}`;
  doc.text(dateStr, pageWidth - 14, 36, { align: 'right' });

  if (subtitle) {
    doc.setFontSize(10);
    doc.text(subtitle, 14, 36);
  }

  let startY = subtitle ? 42 : 40;

  // Resume (KPI en haut)
  if (summary && summary.length > 0) {
    doc.setFontSize(9);
    const colW = (pageWidth - 28) / Math.min(summary.length, 4);
    summary.forEach((s, i) => {
      const x = 14 + (i % 4) * colW;
      const y = startY + Math.floor(i / 4) * 12;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(s.label, x, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(27, 42, 74);
      doc.text(s.value, x, y + 5);
    });
    startY += Math.ceil(summary.length / 4) * 12 + 4;
  }

  // Tableau
  const head = [columns.map(c => c.title)];
  const body = data.map(row =>
    columns.map(col => col.format ? col.format(row[col.key], row) : String(row[col.key] ?? ''))
  );

  autoTable(doc, {
    head,
    body,
    startY,
    theme: 'grid',
    headStyles: {
      fillColor: [27, 42, 74],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 7.5, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    styles: { cellPadding: 2, overflow: 'linebreak' },
    margin: { left: 14, right: 14 },
    didDrawPage: (data: any) => {
      // Pied de page
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${data.pageNumber} / ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' },
      );
    },
  });

  doc.save(`${filename}_${dayjs().format('YYYY-MM-DD')}.pdf`);
}
