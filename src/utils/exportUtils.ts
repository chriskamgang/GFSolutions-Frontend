import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import dayjs from 'dayjs';
import { GFS_LOGO_BASE64 } from './logo';


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
    doc.text(subtitle.replace(/[\u00A0\u202F\u2009]/g, ' '), 14, 36);
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
      doc.text(s.value.replace(/[\u00A0\u202F\u2009]/g, ' '), x, y + 5);
    });
    startY += Math.ceil(summary.length / 4) * 12 + 4;
  }

  // Tableau
  // Remplacer les espaces insecables (toLocaleString fr-FR) que jsPDF ne rend pas correctement
  const sanitize = (v: string) => v.replace(/[\u00A0\u202F\u2009]/g, ' ');
  const head = [columns.map(c => c.title)];
  const body = data.map(row =>
    columns.map(col => sanitize(col.format ? col.format(row[col.key], row) : String(row[col.key] ?? '')))
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


// ==================== ATTESTATION DE DOMICILIATION ====================

interface AttestationData {
  clientName: string;
  clientAddress: string;
  accountNumber: string;
  accountType: string;
  agencyName: string;
  agencyCity: string;
  directorName: string;
  date?: string;
}

export function generateAttestation(data: AttestationData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;

  // En-tete GFS
  doc.setFillColor(27, 42, 74);
  doc.rect(0, 0, pageWidth, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(27, 42, 74);
  doc.text('Global Financial Solution', centerX, 22, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Etablissement de Microfinance agree COBAC', centerX, 28, { align: 'center' });
  doc.text('Siege Social : Douala, Cameroun', centerX, 33, { align: 'center' });

  // Ligne separatrice
  doc.setDrawColor(245, 166, 35); // orange #F5A623
  doc.setLineWidth(0.8);
  doc.line(20, 38, pageWidth - 20, 38);

  // Numero de reference
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const refNum = `N° ${dayjs().format('YYYY')}/${dayjs().format('MM')}/${Math.floor(Math.random() * 9000 + 1000)}`;
  doc.text(refNum, 20, 47);

  // Titre encadre
  doc.setDrawColor(27, 42, 74);
  doc.setLineWidth(0.5);
  doc.rect(45, 53, pageWidth - 90, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(27, 42, 74);
  doc.text('ATTESTATION DE DOMICILIATION DE COMPTE', centerX, 61, { align: 'center' });

  // Corps du texte
  let y = 80;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(40, 40, 40);

  doc.text('Nous soussignes,', 25, y);
  y += 10;

  const intro = `Global Financial Solution en abrege « GFS », Etablissement de Microfinance de 2eme categorie agree par la COBAC, dont le Siege Social est a Douala, Cameroun,`;
  const introLines = doc.splitTextToSize(intro, pageWidth - 50);
  doc.text(introLines, 25, y);
  y += introLines.length * 6 + 8;

  doc.text('Attestons que', 25, y);
  y += 3;

  // Nom du client en gras
  doc.setFont('helvetica', 'bold');
  const clientLine = `     ${data.clientName},`;
  doc.text(clientLine, 25, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`     adresse ${data.clientAddress}`, 25, y + 14);
  y += 24;

  const body2 = `entretient dans nos livres, le compte ouvert a l'agence de ${data.agencyName} dont les coordonnees sont ci-apres reprises :`;
  const bodyLines = doc.splitTextToSize(body2, pageWidth - 50);
  doc.text(bodyLines, 25, y);
  y += bodyLines.length * 6 + 10;

  // Coordonnees du compte
  const details: [string, string][] = [
    ['Code etablissement', '90001'],
    ['Code guichet', data.accountNumber.substring(0, 2).padStart(5, '0')],
    ['N° de Compte', data.accountNumber],
    ['Type de compte', data.accountType],
    ['Intitule compte', data.clientName],
  ];

  details.forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal');
    doc.text(`- ${label}`, 35, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`: ${value}`, 95, y);
    y += 8;
  });

  y += 10;

  // Formule de cloture
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(11);
  const closing = 'En foi de quoi, la presente Attestation est delivree pour servir et valoir ce que de droit.';
  const closingLines = doc.splitTextToSize(closing, pageWidth - 50);
  doc.text(closingLines, 25, y);

  y += 20;

  // Date et lieu
  const dateStr = data.date || dayjs().format('DD MMMM YYYY');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Fait a ${data.agencyCity}, le ${dateStr}`, centerX, y, { align: 'center' });

  y += 15;

  // Signature directeur
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Le Directeur d\'Agence', centerX + 30, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.directorName, centerX + 30, y + 18, { align: 'center' });

  // Ligne pour signature manuscrite
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(centerX + 5, y + 14, centerX + 55, y + 14);

  // Pied de page
  doc.setFillColor(27, 42, 74);
  doc.rect(0, doc.internal.pageSize.getHeight() - 12, pageWidth, 12, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('Global Financial Solution — Agree COBAC — www.gfinancials.com', centerX, doc.internal.pageSize.getHeight() - 5, { align: 'center' });

  doc.save(`Attestation_Domiciliation_${data.accountNumber}_${dayjs().format('YYYY-MM-DD')}.pdf`);
}


// ==================== BORDEREAUX (RETRAIT / VIREMENT) ====================

interface BordereauData {
  type: 'RETRAIT' | 'VIREMENT';
  clientName: string;
  accountNumber: string;
  accountType: string;
  amount: number;
  amountInWords: string;
  agencyName: string;
  cashierName: string;
  description?: string;
  beneficiaryName?: string;
  beneficiaryAccount?: string;
  date?: string;
}

function numberToWordsFr(n: number): string {
  if (n === 0) return 'zero';
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];
  const convert = (num: number): string => {
    if (num < 20) return units[num];
    if (num < 100) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7 || t === 9) return tens[t] + '-' + units[10 + u];
      if (u === 0) return tens[t] + (t === 8 ? 's' : '');
      if (u === 1 && t !== 8) return tens[t] + ' et un';
      return tens[t] + '-' + units[u];
    }
    if (num < 1000) {
      const h = Math.floor(num / 100);
      const rest = num % 100;
      const prefix = h === 1 ? 'cent' : units[h] + ' cent';
      if (rest === 0) return h > 1 ? prefix + 's' : prefix;
      return prefix + ' ' + convert(rest);
    }
    if (num < 1000000) {
      const th = Math.floor(num / 1000);
      const rest = num % 1000;
      const prefix = th === 1 ? 'mille' : convert(th) + ' mille';
      if (rest === 0) return prefix;
      return prefix + ' ' + convert(rest);
    }
    const mil = Math.floor(num / 1000000);
    const rest = num % 1000000;
    const prefix = mil === 1 ? 'un million' : convert(mil) + ' millions';
    if (rest === 0) return prefix;
    return prefix + ' ' + convert(rest);
  };
  return convert(Math.floor(n)).toUpperCase() + ' FRANCS CFA';
}

export function generateBordereau(data: BordereauData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const centerX = pageW / 2;
  const ml = 20; // marge gauche
  const mr = pageW - 20; // marge droite
  const fmt = (n: number) => n.toLocaleString('fr-FR').replace(/[\u00A0\u202F\u2009]/g, ' ');
  const dateStr = data.date || dayjs().format('DD/MM/YYYY');
  const ref = `BRD-${dayjs().format('YYMMDDHHmmss')}-${Math.floor(Math.random() * 900 + 100)}`;

  const isVirement = data.type === 'VIREMENT';
  const title = isVirement ? 'BORDEREAU DE VIREMENT' : 'BORDEREAU DE RETRAIT';
  const color: [number, number, number] = isVirement ? [41, 128, 185] : [231, 76, 60];

  // ========= BANDEAU EN-TETE =========
  doc.setFillColor(27, 42, 74);
  doc.rect(0, 0, pageW, 36, 'F');

  // Logo
  try {
    doc.addImage(GFS_LOGO_BASE64, 'JPEG', ml, 6, 22, 17);
  } catch { /* logo non disponible */ }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('GLOBAL FINANCIAL SOLUTION', ml + 26, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(200, 210, 230);
  doc.text('Etablissement de Microfinance agree COBAC', ml + 26, 20);
  doc.text(`Agence : ${data.agencyName}`, ml + 26, 25);
  doc.text(`Tel: +237 6XX XXX XXX | www.gfinancials.com`, ml + 26, 30);

  // ========= TITRE DU BORDEREAU =========
  let y = 44;
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(ml, y, pageW - 40, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(title, centerX, y + 8.5, { align: 'center' });

  // ========= REFERENCE + DATE =========
  y += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Reference : ${ref}`, ml, y);
  doc.text(`Date : ${dateStr}`, mr, y, { align: 'right' });

  // ========= INFORMATIONS CLIENT =========
  y += 12;
  doc.setFillColor(245, 248, 252);
  doc.roundedRect(ml, y, pageW - 40, isVirement ? 62 : 42, 3, 3, 'F');
  doc.setDrawColor(27, 42, 74);
  doc.setLineWidth(0.3);
  doc.roundedRect(ml, y, pageW - 40, isVirement ? 62 : 42, 3, 3, 'S');

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(27, 42, 74);
  doc.text('INFORMATIONS DU DONNEUR D\'ORDRE', ml + 6, y);

  y += 10;
  const addField = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(label, ml + 8, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(27, 42, 74);
    doc.text(value, ml + 55, y);
    y += 8;
  };

  addField('Nom / Raison sociale :', data.clientName);
  addField('N° de compte :', data.accountNumber);
  addField('Type de compte :', data.accountType);

  if (isVirement && data.beneficiaryName) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(27, 42, 74);
    doc.text('BENEFICIAIRE DU VIREMENT', ml + 6, y);
    y += 10;
    addField('Nom / Raison sociale :', data.beneficiaryName);
    addField('N° de compte :', data.beneficiaryAccount || '-');
  }

  // ========= MONTANT =========
  y += 8;
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(ml, y, pageW - 40, 32, 3, 3, 'S');

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Montant en chiffres :', ml + 8, y);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.text(`${fmt(data.amount)} FCFA`, mr - 8, y, { align: 'right' });

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Montant en lettres :', ml + 8, y);
  y += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(27, 42, 74);
  const wordsText = data.amountInWords || numberToWordsFr(data.amount);
  const wordsLines = doc.splitTextToSize(wordsText, pageW - 60);
  doc.text(wordsLines, ml + 8, y);
  y += wordsLines.length * 5;

  // ========= MOTIF =========
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Motif / Description :', ml, y);
  y += 6;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(ml, y, mr, y);
  if (data.description) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(data.description, ml + 2, y - 1);
  }
  y += 2;
  doc.line(ml, y + 6, mr, y + 6);

  // ========= SIGNATURES =========
  y += 20;
  const sigBoxW = (pageW - 50) / 3;

  // Signature client
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(ml, y, sigBoxW, 30);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Signature du client', ml + sigBoxW / 2, y + 34, { align: 'center' });

  // Signature caissier
  const sigX2 = ml + sigBoxW + 5;
  doc.rect(sigX2, y, sigBoxW, 30);
  doc.text('Signature du caissier', sigX2 + sigBoxW / 2, y + 34, { align: 'center' });
  doc.setFontSize(7);
  doc.setTextColor(140, 140, 140);
  doc.text(data.cashierName, sigX2 + sigBoxW / 2, y + 38, { align: 'center' });

  // Visa chef d'agence
  const sigX3 = sigX2 + sigBoxW + 5;
  doc.rect(sigX3, y, sigBoxW, 30);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Visa Chef d\'agence', sigX3 + sigBoxW / 2, y + 34, { align: 'center' });

  // ========= MENTION LEGALE =========
  y += 48;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text('Je soussigne(e), titulaire du compte sus-mentionne, autorise l\'operation ci-dessus.', centerX, y, { align: 'center' });
  doc.text('Document a conserver. Toute rature ou surcharge annule le present bordereau.', centerX, y + 4, { align: 'center' });

  // ========= PIED DE PAGE =========
  doc.setFillColor(27, 42, 74);
  doc.rect(0, pageH - 10, pageW, 10, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('Global Financial Solution — Agree COBAC — www.gfinancials.com', centerX, pageH - 4, { align: 'center' });

  doc.save(`${data.type === 'VIREMENT' ? 'Bordereau_Virement' : 'Bordereau_Retrait'}_${ref}.pdf`);
}


// ==================== BORDEREAUX VIERGES (A IMPRIMER EN LOT) ====================

export function generateBlankBordereau(type: 'RETRAIT' | 'VIREMENT' | 'DEPOT', copies = 3) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const centerX = pageW / 2;
  const ml = 12;
  const mr = pageW - 12;
  const lineW = mr - ml;
  const halfH = pageH / 2;

  const labels: Record<string, string> = {
    RETRAIT: 'BORDEREAU DE RETRAIT',
    VIREMENT: 'BORDEREAU DE VIREMENT',
    DEPOT: 'BORDEREAU DE DEPOT',
  };
  const colors: Record<string, [number, number, number]> = {
    RETRAIT: [231, 76, 60],
    VIREMENT: [41, 128, 185],
    DEPOT: [39, 174, 96],
  };
  const color = colors[type];
  const title = labels[type];

  const drawOneBordereau = (offsetY: number) => {
    let y = offsetY;

    // EN-TETE
    doc.setFillColor(27, 42, 74);
    doc.rect(ml, y, lineW, 16, 'F');
    try { doc.addImage(GFS_LOGO_BASE64, 'JPEG', ml + 2, y + 2, 12, 10); } catch { /* */ }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('GLOBAL FINANCIAL SOLUTION', ml + 17, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(200, 210, 230);
    doc.text('Microfinance agree COBAC | Douala, Cameroun | www.gfinancials.com', ml + 17, y + 12);

    // TITRE
    y += 19;
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(ml, y, lineW, 7, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title, centerX, y + 5, { align: 'center' });

    // DATE & REF
    y += 11;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text('Date :', ml, y);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.15);
    doc.line(ml + 12, y, ml + 50, y);
    doc.text('N° Ref :', centerX + 10, y);
    doc.line(centerX + 24, y, mr, y);

    // SECTION CLIENT
    y += 5;
    const clientBoxH = type === 'VIREMENT' ? 38 : 24;
    doc.setFillColor(245, 248, 252);
    doc.roundedRect(ml, y, lineW, clientBoxH, 1.5, 1.5, 'F');
    doc.setDrawColor(27, 42, 74);
    doc.setLineWidth(0.15);
    doc.roundedRect(ml, y, lineW, clientBoxH, 1.5, 1.5, 'S');

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(27, 42, 74);
    doc.text(type === 'DEPOT' ? 'DEPOSANT' : 'TITULAIRE DU COMPTE', ml + 3, y);

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);

    const field = (label: string, x1: number, x2: number) => {
      doc.text(label, x1, y);
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.12);
      doc.line(x1 + doc.getTextWidth(label) + 1, y, x2, y);
    };

    field('Nom et Prenom(s) :', ml + 3, mr - 3);
    y += 7;
    field('N° Compte :', ml + 3, centerX - 3);
    doc.text('N° CNI :', centerX + 3, y);
    doc.line(centerX + 3 + doc.getTextWidth('N° CNI :') + 1, y, mr - 3, y);

    if (type === 'VIREMENT') {
      y += 9;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(27, 42, 74);
      doc.text('BENEFICIAIRE', ml + 3, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(60, 60, 60);
      field('Nom et Prenom(s) :', ml + 3, mr - 3);
      y += 7;
      field('N° Compte :', ml + 3, mr - 3);
    }

    // MONTANT
    y += 5;
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(ml, y, lineW, 22, 1.5, 1.5, 'S');

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);
    doc.text('Montant en chiffres :', ml + 3, y);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(ml + 40, y - 4, lineW - 44, 7, 'S');
    doc.setFontSize(6);
    doc.setTextColor(180, 180, 180);
    doc.text('FCFA', mr - 12, y);

    y += 10;
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(7);
    doc.text('Montant en lettres :', ml + 3, y);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.12);
    doc.line(ml + 3, y + 4, mr - 3, y + 4);

    // MOTIF
    y += 10;
    doc.text('Motif :', ml, y);
    doc.line(ml + 12, y, mr, y);

    // SIGNATURE CLIENT
    y += 7;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.12);
    doc.rect(mr - 55, y, 55, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text('Signature du client', mr - 55 + 27.5, y + 19, { align: 'center' });

    // MENTION
    y += 23;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(160, 160, 160);
    doc.text('Je soussigne(e), titulaire du compte sus-mentionne, autorise l\'operation decrite ci-dessus. Toute rature annule le bordereau.', centerX, y, { align: 'center' });
  };

  const totalPages = Math.ceil(copies / 2);

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) doc.addPage();

    // Bordereau du haut
    const idx1 = p * 2;
    if (idx1 < copies) {
      drawOneBordereau(5);
    }

    // Ligne de decoupe
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(5, halfH, pageW - 5, halfH);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(180, 180, 180);
    doc.text('✂', 3, halfH + 1.5);
    doc.setLineDashPattern([], 0);

    // Bordereau du bas
    const idx2 = p * 2 + 1;
    if (idx2 < copies) {
      drawOneBordereau(halfH + 3);
    }
  }

  doc.save(`${title.replace(/ /g, '_')}_Vierges_x${copies}.pdf`);
}


// ==================== RECU DE TRANSACTION ====================

interface ReceiptData {
  type: 'DEPOT' | 'RETRAIT' | 'VIREMENT';
  reference: string;
  amount: number;
  fees?: number;
  date: string;
  clientName: string;
  accountNumber: string;
  accountBalance?: number;
  agencyName: string;
  cashierName: string;
  description?: string;
  beneficiaryName?: string;
  beneficiaryAccount?: string;
}

export function generateReceipt(data: ReceiptData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const colW = (pageW - 16) / 3;
  const gap = 2;
  const m = 5; // marge interne

  const fmt = (n: number) => n.toLocaleString('fr-FR').replace(/[\u00A0\u202F\u2009]/g, ' ');

  const typeLabels: Record<string, string> = {
    DEPOT: 'DEPOT', RETRAIT: 'RETRAIT', VIREMENT: 'VIREMENT',
  };
  const typeColors: Record<string, [number, number, number]> = {
    DEPOT: [39, 174, 96], RETRAIT: [231, 76, 60], VIREMENT: [41, 128, 185],
  };

  const drawCopy = (startX: number, copyLabel: string) => {
    const x = startX;
    const w = colW;
    const right = x + w - m;
    const left = x + m;
    const cx = x + w / 2;
    let y = 8;

    // Cadre avec coins arrondis
    doc.setDrawColor(27, 42, 74);
    doc.setLineWidth(0.3);
    doc.roundedRect(x + 1, 4, w - 2, pageH - 8, 3, 3, 'S');

    // Bandeau bleu en haut
    doc.setFillColor(27, 42, 74);
    doc.roundedRect(x + 1, 4, w - 2, 24, 3, 3, 'F');
    // Recouvrir les coins arrondis du bas du bandeau
    doc.rect(x + 1, 20, w - 2, 8, 'F');

    // Logo
    try {
      doc.addImage(GFS_LOGO_BASE64, 'JPEG', left, y - 2, 14, 11);
    } catch { /* logo non disponible */ }

    // Nom entreprise
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('GLOBAL FINANCIAL SOLUTION', left + 16, y + 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(200, 210, 230);
    doc.text('Etablissement de Microfinance agree COBAC', left + 16, y + 6);
    doc.text(`Agence : ${data.agencyName}`, left + 16, y + 10);

    // Mention exemplaire (badge orange)
    y = 30;
    doc.setFillColor(245, 166, 35);
    doc.roundedRect(right - 28, y - 3, 28, 5.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(255, 255, 255);
    doc.text(copyLabel, right - 14, y + 0.5, { align: 'center' });

    // Type d'operation (badge colore)
    const tc = typeColors[data.type] || [27, 42, 74];
    doc.setFillColor(tc[0], tc[1], tc[2]);
    doc.roundedRect(left, y - 3, 30, 5.5, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`RECU DE ${typeLabels[data.type] || 'TRANSACTION'}`, left + 15, y + 0.5, { align: 'center' });

    // Separateur orange fin
    y += 6;
    doc.setDrawColor(245, 166, 35);
    doc.setLineWidth(0.6);
    doc.line(left, y, right, y);

    // Details de la transaction
    y += 6;
    doc.setFontSize(7);

    const addRow = (label: string, value: string, bold = false, color?: [number, number, number]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(label, left, y);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      if (color) doc.setTextColor(color[0], color[1], color[2]);
      else doc.setTextColor(27, 42, 74);
      doc.text(value, right, y, { align: 'right' });
      y += 5;
    };

    addRow('Reference', data.reference);
    addRow('Date', dayjs(data.date).format('DD/MM/YYYY HH:mm'));
    addRow('Client', data.clientName, true);
    addRow('N. Compte', data.accountNumber);

    if (data.type === 'VIREMENT' && data.beneficiaryName) {
      y += 1;
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.15);
      doc.line(left, y, right, y);
      y += 4;
      addRow('Beneficiaire', data.beneficiaryName, true);
      if (data.beneficiaryAccount) addRow('Compte benef.', data.beneficiaryAccount);
    }

    if (data.description) {
      addRow('Motif', data.description);
    }

    // Zone montant avec fond
    y += 2;
    const boxH = data.fees && data.fees > 0 ? 22 : 12;
    doc.setFillColor(245, 248, 252);
    doc.roundedRect(left, y - 1, w - m * 2, boxH, 2, 2, 'F');
    doc.setDrawColor(27, 42, 74);
    doc.setLineWidth(0.15);
    doc.roundedRect(left, y - 1, w - m * 2, boxH, 2, 2, 'S');

    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Montant', left + 3, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(27, 42, 74);
    doc.text(`${fmt(data.amount)} FCFA`, right - 3, y, { align: 'right' });

    if (data.fees && data.fees > 0) {
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Frais', left + 3, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(231, 76, 60);
      doc.text(`- ${fmt(data.fees)} FCFA`, right - 3, y, { align: 'right' });

      y += 6;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.line(left + 3, y - 3, right - 3, y - 3);
      const netLabel = data.type === 'DEPOT' ? 'Net credite' : 'Total debite';
      const netAmount = data.type === 'DEPOT' ? data.amount - data.fees : data.amount + data.fees;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text(netLabel, left + 3, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(27, 42, 74);
      doc.text(`${fmt(netAmount)} FCFA`, right - 3, y, { align: 'right' });
    }

    y += boxH - (data.fees && data.fees > 0 ? 14 : 6);

    // Nouveau solde
    if (data.accountBalance !== undefined) {
      y += 3;
      doc.setFillColor(27, 42, 74);
      doc.roundedRect(left, y - 1, w - m * 2, 9, 2, 2, 'F');
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(200, 210, 230);
      doc.text('NOUVEAU SOLDE', left + 3, y);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(245, 166, 35);
      doc.text(`${fmt(data.accountBalance)} FCFA`, right - 3, y, { align: 'right' });
      y += 8;
    }

    // Caissier
    y += 3;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text(`Caissier : ${data.cashierName}`, left, y);

    // Signatures
    y += 7;
    const sigW = (w - m * 2 - 4) / 2;
    // Signature caissier
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);
    doc.line(left, y + 10, left + sigW, y + 10);
    doc.setFontSize(5.5);
    doc.setTextColor(140, 140, 140);
    doc.text('Signature caissier', left + sigW / 2, y + 13, { align: 'center' });
    // Signature client
    doc.line(right - sigW, y + 10, right, y + 10);
    doc.text('Signature client', right - sigW / 2, y + 13, { align: 'center' });

    // Pied de colonne
    const footY = pageH - 12;
    doc.setDrawColor(245, 166, 35);
    doc.setLineWidth(0.4);
    doc.line(left, footY, right, footY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.setTextColor(140, 140, 140);
    doc.text('Ce recu tient lieu de preuve de transaction.', cx, footY + 3, { align: 'center' });
    doc.text('Merci de votre confiance. — www.gfinancials.com', cx, footY + 6, { align: 'center' });
  };

  // Dessiner les 3 exemplaires
  const col1X = 5;
  const col2X = 5 + colW + gap;
  const col3X = 5 + (colW + gap) * 2;

  drawCopy(col1X, 'EXEMPLAIRE CLIENT');
  drawCopy(col2X, 'EXEMPLAIRE GFS');
  drawCopy(col3X, 'EXEMPLAIRE AUDIT');

  // Lignes de decoupe entre les colonnes
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.15);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(col2X - gap / 2, 6, col2X - gap / 2, pageH - 6);
  doc.line(col3X - gap / 2, 6, col3X - gap / 2, pageH - 6);
  doc.setLineDashPattern([], 0);

  doc.save(`Recu_${data.type}_${data.reference}_${dayjs().format('YYYY-MM-DD')}.pdf`);
}


// ==================== BORDEREAU VIERGE FRAIS DE SCOLARITE ====================

interface SchoolFeeSlipData {
  schoolName: string;
  accountNumber: string;
  academicYear?: string;
  copies?: number;
}

export function generateSchoolFeeSlip(data: SchoolFeeSlipData) {
  const totalSlips = data.copies || 10;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const centerX = pageW / 2;
  const ml = 8;
  const mr = pageW - 8;
  const lineW = mr - ml;
  const slipH = (pageH - 6) / 2; // 2 bordereaux par page
  const academicYear = data.academicYear || `${dayjs().year()}-${dayjs().year() + 1}`;

  const drawSlip = (offsetY: number) => {
    let y = offsetY;
    const slipMl = ml;
    const slipMr = mr;
    const slipCenterX = centerX;

    // ===== EN-TETE GFS =====
    doc.setFillColor(27, 42, 74);
    doc.rect(0, y, pageW, 18, 'F');

    try { doc.addImage(GFS_LOGO_BASE64, 'JPEG', slipMl + 1, y + 2, 12, 10); } catch { /* */ }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('GLOBAL FINANCIAL SOLUTION', slipMl + 16, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(200, 210, 230);
    doc.text('Etablissement de Microfinance agree COBAC | Douala, Cameroun | www.gfinancials.com', slipMl + 16, y + 13);

    // ===== TITRE ORANGE =====
    y += 20;
    doc.setFillColor(245, 166, 35);
    doc.roundedRect(slipMl, y, lineW, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('FRAIS D\'INSCRIPTION ET DE SCOLARITE / SCHOOL FEES', slipCenterX, y + 5.5, { align: 'center' });

    // ===== ANNEE + DATE + COMPTE (ligne compacte) =====
    y += 11;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(27, 42, 74);
    doc.text('Annee Acad. :', slipMl, y);
    doc.setFont('helvetica', 'bold');
    doc.text(academicYear, slipMl + 24, y);

    doc.setFont('helvetica', 'normal');
    doc.text('Date :', slipMl + 55, y);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.15);
    doc.line(slipMl + 65, y, slipMl + 90, y);

    doc.setFont('helvetica', 'normal');
    doc.text('N. Compte :', slipMl + 95, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(data.accountNumber, slipMl + 115, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Titulaire :', slipMl + 145, y);
    doc.setFont('helvetica', 'bold');
    doc.text(data.schoolName, slipMl + 162, y);

    // ===== INFOS ETUDIANT =====
    y += 7;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(27, 42, 74);
    doc.text('ETUDIANT', slipMl, y);

    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(60, 60, 60);

    doc.text('Nom et Prenom(s) :', slipMl + 2, y);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.15);
    doc.line(slipMl + 35, y, slipMr, y);

    y += 7;
    doc.text('Classe / Specialite :', slipMl + 2, y);
    doc.line(slipMl + 37, y, slipCenterX - 5, y);
    doc.text('Tel :', slipCenterX, y);
    doc.line(slipCenterX + 10, y, slipMr - 40, y);
    doc.text('CNI :', slipMr - 38, y);
    doc.line(slipMr - 28, y, slipMr, y);

    // ===== TABLEAU DENOMINATIONS =====
    y += 6;
    const colBillet = slipMl;
    const colPiece = slipCenterX + 3;
    const halfW = (lineW - 6) / 2;
    const rowH = 6;

    // En-tete BILLETS
    doc.setFillColor(27, 42, 74);
    doc.rect(colBillet, y, halfW, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('BILLETS / NOTES', colBillet + halfW / 2, y + 4, { align: 'center' });

    // En-tete PIECES
    doc.rect(colPiece, y, halfW, 6, 'F');
    doc.text('PIECES / COINS', colPiece + halfW / 2, y + 4, { align: 'center' });

    y += 6;

    // Sous-en-tetes
    doc.setFillColor(240, 243, 248);
    doc.rect(colBillet, y, halfW, 5, 'F');
    doc.rect(colPiece, y, halfW, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(27, 42, 74);

    const bDenom = colBillet + 2;
    const bNb = colBillet + 22;
    const bTotal = colBillet + halfW - 2;
    doc.text('Valeur', bDenom, y + 3.5);
    doc.text('Nbre', bNb, y + 3.5);
    doc.text('Total', bTotal, y + 3.5, { align: 'right' });

    const pDenom = colPiece + 2;
    const pNb = colPiece + 22;
    const pTotal = colPiece + halfW - 2;
    doc.text('Valeur', pDenom, y + 3.5);
    doc.text('Nbre', pNb, y + 3.5);
    doc.text('Total', pTotal, y + 3.5, { align: 'right' });

    y += 5;

    const billets = [10000, 5000, 2000, 1000, 500];
    const pieces = [500, 100, 50, 25, 10, 5];
    const maxRows = Math.max(billets.length, pieces.length);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);

    for (let i = 0; i < maxRows; i++) {
      const rowY = y + i * rowH;
      const bg: [number, number, number] = i % 2 === 0 ? [255, 255, 255] : [250, 252, 255];
      doc.setFillColor(bg[0], bg[1], bg[2]);

      if (i < billets.length) {
        doc.rect(colBillet, rowY, halfW, rowH, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.1);
        doc.rect(colBillet, rowY, halfW, rowH, 'S');
        doc.setTextColor(40, 40, 40);
        doc.text(billets[i].toLocaleString('fr-FR').replace(/[\u00A0\u202F\u2009]/g, ' '), bDenom, rowY + 4.2);
        doc.line(bNb - 2, rowY, bNb - 2, rowY + rowH);
        doc.line(bNb + 16, rowY, bNb + 16, rowY + rowH);
      }

      if (i < pieces.length) {
        doc.rect(colPiece, rowY, halfW, rowH, 'F');
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.1);
        doc.rect(colPiece, rowY, halfW, rowH, 'S');
        doc.setTextColor(40, 40, 40);
        doc.text(pieces[i].toLocaleString('fr-FR').replace(/[\u00A0\u202F\u2009]/g, ' '), pDenom, rowY + 4.2);
        doc.line(pNb - 2, rowY, pNb - 2, rowY + rowH);
        doc.line(pNb + 16, rowY, pNb + 16, rowY + rowH);
      }
    }

    // Ligne TOTAL
    const totalRowY = y + maxRows * rowH;
    doc.setFillColor(27, 42, 74);
    doc.rect(colBillet, totalRowY, halfW, 6, 'F');
    doc.rect(colPiece, totalRowY, halfW, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Total Billets', bDenom, totalRowY + 4);
    doc.text('Total Pieces', pDenom, totalRowY + 4);

    y = totalRowY + 9;

    // ===== MONTANT TOTAL =====
    doc.setDrawColor(245, 166, 35);
    doc.setLineWidth(0.8);
    doc.roundedRect(slipMl, y, lineW, 14, 1.5, 1.5, 'S');

    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(27, 42, 74);
    doc.text('Montant Total / Total Amount :', slipMl + 3, y);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.15);
    doc.line(slipMl + 60, y, slipMr - 20, y);
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text('FCFA', slipMr - 16, y);

    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(60, 60, 60);
    doc.text('En lettres / In words :', slipMl + 3, y);
    doc.line(slipMl + 38, y, slipMr - 3, y);

    // ===== SIGNATURES =====
    y += 6;
    const sigW = (lineW - 6) / 2;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.rect(slipMl, y, sigW, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Signature deposant', slipMl + sigW / 2, y + 17, { align: 'center' });

    doc.rect(slipMr - sigW, y, sigW, 14);
    doc.text('Signature caissier', slipMr - sigW / 2, y + 17, { align: 'center' });
  };

  const totalPages = Math.ceil(totalSlips / 2);

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) doc.addPage();

    // Bordereau du haut
    drawSlip(2);

    // Ligne de decoupe
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(5, slipH + 2, pageW - 5, slipH + 2);
    doc.setLineDashPattern([], 0);
    // Icone ciseaux
    doc.setFontSize(6);
    doc.setTextColor(180, 180, 180);
    doc.text('✂', 2, slipH + 3);

    // Bordereau du bas (si on n'a pas depasse le nombre)
    if (p * 2 + 1 < totalSlips) {
      drawSlip(slipH + 4);
    }
  }

  doc.save(`Bordereau_Scolarite_${data.schoolName.replace(/ /g, '_')}_x${totalSlips}.pdf`);
}
