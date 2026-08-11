import { Clinic } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export interface ReportColumn {
  header: string;
  key: string;
  width: number;
}

const ROW_PADDING = 6;
const MIN_ROW_HEIGHT = 16;

function safeSheetName(title: string): string {
  // Excel worksheet names cannot exceed 31 characters and cannot contain: \ / ? * [ ]
  const sanitized = title.replace(/[\\/?*[\]]/g, ' ').trim();
  return sanitized.slice(0, 31) || 'Report';
}

function exportReportAsPdf(
  reportTitle: string,
  columns: ReportColumn[],
  rows: Record<string, string>[],
  filterSummaryLine: string,
  summaryLines: string[],
  clinicInfo: Pick<Clinic, 'name' | 'address' | 'city' | 'state' | 'pincode' | 'phone' | 'email'>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (error) => reject(error));

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const pageBottom = doc.page.height - doc.page.margins.bottom;

    // ---- Clinic header ----
    doc.fontSize(18).font('Helvetica-Bold').text(clinicInfo.name, { align: 'center' });
    doc.fontSize(9).font('Helvetica');
    const addressParts = [clinicInfo.address, clinicInfo.city, clinicInfo.state, clinicInfo.pincode].filter(
      Boolean
    );
    if (addressParts.length > 0) {
      doc.text(addressParts.join(', '), { align: 'center' });
    }
    const contactParts = [
      clinicInfo.phone ? `Phone: ${clinicInfo.phone}` : null,
      clinicInfo.email ? `Email: ${clinicInfo.email}` : null,
    ].filter(Boolean);
    if (contactParts.length > 0) {
      doc.text(contactParts.join('  |  '), { align: 'center' });
    }

    doc.moveDown(0.5);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .lineWidth(1)
      .strokeColor('#333333')
      .stroke();
    doc.moveDown(0.5);

    doc.fontSize(14).font('Helvetica-Bold').text(reportTitle.toUpperCase(), { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(9).font('Helvetica').text(filterSummaryLine, { width: pageWidth });
    doc.moveDown(0.5);

    if (summaryLines.length > 0) {
      doc.font('Helvetica-Bold').fontSize(10);
      for (const line of summaryLines) {
        doc.text(line);
      }
      doc.moveDown(0.5);
    }

    function renderColumnHeaderRow(): void {
      let columnX = doc.page.margins.left;
      const headerY = doc.y;
      doc.fontSize(9).font('Helvetica-Bold');
      for (const column of columns) {
        doc.text(column.header, columnX, headerY, { width: column.width });
        columnX += column.width;
      }
      doc.moveDown(0.3);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.margins.left + pageWidth, doc.y)
        .lineWidth(0.5)
        .strokeColor('#333333')
        .stroke();
      doc.moveDown(0.3);
    }

    renderColumnHeaderRow();

    doc.font('Helvetica').fontSize(9);
    for (const row of rows) {
      let maxHeight = MIN_ROW_HEIGHT;
      for (const column of columns) {
        const height = doc.heightOfString(row[column.key] ?? '', { width: column.width });
        maxHeight = Math.max(maxHeight, height);
      }

      if (doc.y + maxHeight + ROW_PADDING > pageBottom) {
        doc.addPage();
        doc.y = doc.page.margins.top;
        renderColumnHeaderRow();
        doc.font('Helvetica').fontSize(9);
      }

      const rowY = doc.y;
      let columnX = doc.page.margins.left;
      for (const column of columns) {
        doc.text(row[column.key] ?? '', columnX, rowY, { width: column.width });
        columnX += column.width;
      }

      doc.y = rowY + maxHeight + ROW_PADDING;
    }

    if (rows.length === 0) {
      doc.font('Helvetica-Oblique').fontSize(10).text('No records found for the selected filters.');
    }

    doc.end();
  });
}

async function exportReportAsExcel(
  reportTitle: string,
  columns: ReportColumn[],
  rows: Record<string, string>[],
  summaryLines: string[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(safeSheetName(reportTitle));

  // Column widths are set up-front (without using the `header` shorthand, which would cause
  // exceljs to auto-write a header row at row 1 — we render the header row manually below so
  // it can be positioned after any summary rows).
  worksheet.columns = columns.map((column) => ({
    key: column.key,
    width: column.width / 6,
  }));

  for (const line of summaryLines) {
    const summaryRow = worksheet.addRow([line]);
    summaryRow.font = { bold: true };
  }

  if (summaryLines.length > 0) {
    worksheet.addRow([]);
  }

  const headerRow = worksheet.addRow(columns.map((column) => column.header));
  headerRow.font = { bold: true };

  for (const row of rows) {
    worksheet.addRow(columns.map((column) => row[column.key] ?? ''));
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

export const reportExport = {
  exportReportAsPdf,
  exportReportAsExcel,
};
