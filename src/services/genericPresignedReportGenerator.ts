import ExcelJS from 'exceljs';

export interface PresignedFileReportItem {
  name: string;
  size: number;
  mimeType: string;
  s3Key: string;
  s3Url: string;
  success: boolean;
  error?: string;
  uploadedAt: string;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generates an Excel workbook (.xlsx) with embedded inline-onclick hyperlinks
 * for all uploaded S3 files.
 */
export async function generatePresignedUrlsExcel(
  items: PresignedFileReportItem[],
  bucket: string,
  prefix: string,
  presignDays: number = 7,
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'S3 Presigned URL Dispatcher';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Presigned Links', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  // Styles
  const titleFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Slate 900
  };

  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate 800
  };

  const successFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2F0D9' }, // Light green
  };

  const errorFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFCE4D6' }, // Light red
  };

  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  // Row 1: Summary Banner
  worksheet.mergeCells('A1:I1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `AWS S3 Presigned URLs Report • Bucket: s3://${bucket}/${prefix.replace(/^\/+/, '')} • Presigned Expiry: ${presignDays} Days (Inline Browser On-Click Openable)`;
  titleCell.fill = titleFill;
  titleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  worksheet.getRow(1).height = 28;

  // Row 2: Column Headers
  const headers = [
    '#',
    'File Name (Click to Open)',
    'Size',
    'Content / MIME Type',
    'S3 Bucket',
    'S3 Object Key',
    'Inline Presigned URL (Click to Open in Browser)',
    'Upload Timestamp',
    'Status',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 26;

  headerRow.eachCell((cell) => {
    cell.fill = headerFill;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = borderStyle;
  });

  // Add Data Rows
  items.forEach((item, index) => {
    const isSuccess = item.success && Boolean(item.s3Url);
    const row = worksheet.addRow([
      index + 1,
      item.name,
      formatBytes(item.size),
      item.mimeType,
      bucket,
      item.s3Key,
      isSuccess ? item.s3Url : (item.error || 'Failed to upload'),
      item.uploadedAt ? new Date(item.uploadedAt).toLocaleString() : new Date().toLocaleString(),
      isSuccess ? 'Uploaded (Inline Openable)' : 'Failed',
    ]);

    row.height = 22;

    // Center index and size
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(3).alignment = { vertical: 'middle', horizontal: 'right' };
    row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };

    // Apply borders
    row.eachCell((cell) => {
      cell.border = borderStyle;
      cell.font = { name: 'Calibri', size: 9 };
    });

    // Make File Name (Col 2) a direct hyperlink if URL is available
    if (isSuccess) {
      const fileNameCell = row.getCell(2);
      fileNameCell.value = {
        text: item.name,
        hyperlink: item.s3Url,
        tooltip: 'Click to open file inline in browser',
      };
      fileNameCell.font = {
        name: 'Calibri',
        size: 9,
        color: { argb: 'FF0284C7' }, // Sky 600
        underline: true,
        bold: true,
      };

      // Make Presigned URL (Col 7) an explicit clickable hyperlink
      const urlCell = row.getCell(7);
      urlCell.value = {
        text: item.s3Url,
        hyperlink: item.s3Url,
        tooltip: 'Click to open file inline in browser',
      };
      urlCell.font = {
        name: 'Calibri',
        size: 8.5,
        color: { argb: 'FF2563EB' }, // Blue 600
        underline: true,
      };

      row.getCell(9).fill = successFill;
      row.getCell(9).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF166534' } };
    } else {
      row.getCell(9).fill = errorFill;
      row.getCell(9).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF991B1B' } };
    }
  });

  // Set explicit column widths
  worksheet.getColumn(1).width = 6;   // #
  worksheet.getColumn(2).width = 30;  // File Name
  worksheet.getColumn(3).width = 13;  // Size
  worksheet.getColumn(4).width = 24;  // Content Type
  worksheet.getColumn(5).width = 20;  // Bucket
  worksheet.getColumn(6).width = 40;  // S3 Key
  worksheet.getColumn(7).width = 60;  // Presigned URL
  worksheet.getColumn(8).width = 22;  // Timestamp
  worksheet.getColumn(9).width = 22;  // Status

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

/**
 * Generates an RFC 4180 compliant CSV string containing the files and their presigned URLs
 */
export function generatePresignedUrlsCsv(
  items: PresignedFileReportItem[],
  bucket: string,
  prefix: string,
): string {
  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows: string[] = [];

  // Header row
  rows.push(
    [
      'Index',
      'File Name',
      'File Size (Bytes)',
      'File Size (Formatted)',
      'Content / MIME Type',
      'S3 Bucket',
      'S3 Object Key',
      'Inline Presigned URL',
      'Upload Timestamp',
      'Status',
    ].map(escapeCsv).join(','),
  );

  // Data rows
  items.forEach((item, index) => {
    const isSuccess = item.success && Boolean(item.s3Url);
    rows.push(
      [
        index + 1,
        item.name,
        item.size || 0,
        formatBytes(item.size),
        item.mimeType,
        bucket,
        item.s3Key,
        isSuccess ? item.s3Url : (item.error || 'Failed'),
        item.uploadedAt || new Date().toISOString(),
        isSuccess ? 'Uploaded' : 'Failed',
      ].map(escapeCsv).join(','),
    );
  });

  return rows.join('\r\n');
}
