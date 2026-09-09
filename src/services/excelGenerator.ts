import ExcelJS from 'exceljs';
import { NoteRecord, DETAIL_COLUMNS } from '../types';

export async function generateReviewWorkbook(
  records: NoteRecord[],
  detectedTags: string[],
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'De-ID Pipeline Review Generator';
  workbook.lastModifiedBy = 'De-ID Pipeline Review Generator';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Review', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 2 }],
  });

  // Light red: FCE4D6, Light green: E2F0D9
  const lightRedFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFCE4D6' },
  };

  const lightGreenFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE2F0D9' },
  };

  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
  };

  // Build column list matching the python script
  // Col 1-4: Filename, raw_txt, deid_json, deid_txt
  // Review columns: DETAIL_COLUMNS + [tag] for each detected tag
  const humanReviewHeaders = [
    ...DETAIL_COLUMNS,
    ...detectedTags.map((tag) => `[${tag}]`),
  ];

  // Detected columns: [tag] for each detected tag + total_redacted + unique_tags
  const detectedCountHeaders = [
    ...detectedTags.map((tag) => `[${tag}]`),
    'total_redacted',
    'unique_tags',
  ];

  // Total columns count
  // 4 + humanReviewHeaders.length + detectedCountHeaders.length
  // Set Row 1 (Group headers)
  const row1Values: (string | null)[] = [
    'Filename',
    'raw_txt',
    'deid_json',
    'deid_txt',
  ];

  for (let i = 0; i < humanReviewHeaders.length; i++) {
    row1Values.push('Human verification');
  }

  for (let i = 0; i < detectedCountHeaders.length; i++) {
    row1Values.push('Detected redaction count');
  }

  const row1 = worksheet.addRow(row1Values);
  row1.height = 24;
  row1.font = { bold: true, size: 10, name: 'Calibri' };
  row1.alignment = { vertical: 'middle', horizontal: 'center' };

  // Set Row 2 (Detailed headers)
  const row2Values: (string | null)[] = [
    'Filename',
    'raw_txt',
    'deid_json',
    'deid_txt',
    ...humanReviewHeaders,
    ...detectedCountHeaders,
  ];

  const row2 = worksheet.addRow(row2Values);
  row2.height = 32;
  row2.font = { bold: true, size: 10, name: 'Calibri' };
  row2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // Apply colors to headers
  let colIndex = 5;
  for (let i = 0; i < humanReviewHeaders.length; i++) {
    const cell1 = row1.getCell(colIndex);
    const cell2 = row2.getCell(colIndex);
    cell1.fill = lightRedFill;
    cell2.fill = lightRedFill;
    cell1.border = borderStyle;
    cell2.border = borderStyle;
    colIndex++;
  }

  for (let i = 0; i < detectedCountHeaders.length; i++) {
    const cell1 = row1.getCell(colIndex);
    const cell2 = row2.getCell(colIndex);
    cell1.fill = lightGreenFill;
    cell2.fill = lightGreenFill;
    cell1.border = borderStyle;
    cell2.border = borderStyle;
    colIndex++;
  }

  // Format first 4 header cells
  for (let i = 1; i <= 4; i++) {
    const cell1 = row1.getCell(i);
    const cell2 = row2.getCell(i);
    cell1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' },
    };
    cell2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF2F2F2' },
    };
    cell1.border = borderStyle;
    cell2.border = borderStyle;
  }

  // Populate data rows (starting at row 3)
  for (const record of records) {
    const rowData: any[] = [];
    rowData.push(record.noteId);
    rowData.push(''); // placeholder for raw_txt
    rowData.push(''); // placeholder for deid_json
    rowData.push(''); // placeholder for deid_txt

    // Human verification columns (empty initially)
    for (let i = 0; i < humanReviewHeaders.length; i++) {
      rowData.push('');
    }

    // Detected redaction count columns
    for (const tag of detectedTags) {
      rowData.push(record.redactionCounts[tag] || 0);
    }
    rowData.push(record.totalRedacted);
    rowData.push(record.uniqueTagsCount);

    const dataRow = worksheet.addRow(rowData);
    dataRow.height = 20;

    // Apply borders and font
    for (let c = 1; c <= rowData.length; c++) {
      const cell = dataRow.getCell(c);
      cell.border = borderStyle;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: c > 4 ? 'right' : 'left',
      };
    }

    // Set Hyperlink cells (Cols 2, 3, 4)
    if (record.raw_txt) {
      const cell = dataRow.getCell(2);
      cell.value = {
        text: record.raw_txt.name,
        hyperlink: record.raw_txt.s3Url || '#',
      };
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: 'FF0563C1' },
        underline: true,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }

    if (record.deid_json) {
      const cell = dataRow.getCell(3);
      cell.value = {
        text: record.deid_json.name,
        hyperlink: record.deid_json.s3Url || '#',
      };
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: 'FF0563C1' },
        underline: true,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }

    if (record.deid_txt) {
      const cell = dataRow.getCell(4);
      cell.value = {
        text: record.deid_txt.name,
        hyperlink: record.deid_txt.s3Url || '#',
      };
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: 'FF0563C1' },
        underline: true,
      };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    }
  }

  // Adjust column widths automatically
  worksheet.columns.forEach((column, index) => {
    if (index === 0) {
      column.width = 24;
    } else if (index >= 1 && index <= 3) {
      column.width = 28;
    } else {
      column.width = 16;
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
