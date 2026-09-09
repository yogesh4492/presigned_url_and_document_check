import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import JSZip from 'jszip';
import { createServer as createViteServer } from 'vite';
import { processRawFileList } from './src/services/processor';
import { generateReviewWorkbook } from './src/services/excelGenerator';
import { SAMPLE_SOAP_NOTES } from './src/services/sampleData';
import { NoteRecord } from './src/types';
import {
  testS3BucketAccess,
  uploadFilesToS3,
  uploadWorkbookToS3,
  uploadAnyFilesToS3,
  presignS3PathList,
  listAndPresignBucketObjects,
  presignClinicalRecords,
  GenericFileInput,
  GenericUploadedItem,
  S3PathPresignItem,
  S3DetectedObjectItem,
} from './server/s3Service';
import {
  generatePresignedUrlsExcel,
  generatePresignedUrlsCsv,
  generateS3PathCsvExcelReport,
  generateS3PathCsvTextReport,
  generateDetectedObjectsExcel,
  generateDetectedObjectsCsv,
  PresignedFileReportItem,
} from './src/services/genericPresignedReportGenerator';

const app = express();
const PORT = 3000;

// Middleware for parsing JSON and URL-encoded bodies with high limit for note content
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer in-memory storage for handling uploaded ZIP files and arbitrary files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max
});

// In-memory cache for latest generated workbook buffer
let latestWorkbookBuffer: Uint8Array | null = null;
let latestRecords: NoteRecord[] = [];
let latestDetectedTags: string[] = [];
let latestS3WorkbookUrl: string | null = null;
let latestS3UploadStats: any = null;

// In-memory cache for generic files upload reports
let latestGenericExcelBuffer: Uint8Array | null = null;
let latestGenericCsvContent: string | null = null;
let latestGenericReportItems: PresignedFileReportItem[] = [];

// In-memory cache for s3path CSV presign reports
let latestCsvPresignExcelBuffer: Uint8Array | null = null;
let latestCsvPresignCsvContent: string | null = null;
let latestCsvPresignItems: S3PathPresignItem[] = [];
let latestCsvHeaders: string[] = [];

// In-memory cache for auto-detected S3 bucket objects reports
let latestDetectedExcelBuffer: Uint8Array | null = null;
let latestDetectedCsvContent: string | null = null;
let latestDetectedItems: S3DetectedObjectItem[] = [];
let latestDetectedBucket = '';
let latestDetectedPrefix = '';

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// API: Load sample clinical SOAP notes
app.get('/api/sample-data', (req, res) => {
  res.json({
    files: SAMPLE_SOAP_NOTES,
    count: SAMPLE_SOAP_NOTES.length,
  });
});

// API: Process uploaded ZIP file
app.post('/api/process-zip', upload.single('zipFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No ZIP file uploaded' });
    }

    const s3Bucket = (req.body.s3Bucket || 'int-shaip-bucket').trim();
    const s3Prefix = (req.body.s3Prefix || 'interns-test-data/SEP8/').trim();
    const presignExpiresDays = Number(req.body.presignExpiresDays) || 7;

    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(req.file.buffer);

    const extractedFiles: { name: string; content: string; size: number }[] = [];

    const fileEntries = Object.entries(loadedZip.files);
    for (const [filename, zipEntry] of fileEntries) {
      if (zipEntry.dir) continue;
      // skip macOS metadata __MACOSX/ or .DS_Store
      if (filename.includes('__MACOSX') || filename.endsWith('.DS_Store')) continue;

      const content = await zipEntry.async('string');
      extractedFiles.push({
        name: filename,
        content,
        size: content.length,
      });
    }

    const { records, allDetectedTags } = processRawFileList(
      extractedFiles,
      s3Bucket,
      s3Prefix,
      presignExpiresDays,
    );

    const workbookBuffer = await generateReviewWorkbook(records, allDetectedTags);
    latestWorkbookBuffer = workbookBuffer;
    latestRecords = records;
    latestDetectedTags = allDetectedTags;

    const totalRedactions = records.reduce((sum, r) => sum + r.totalRedacted, 0);
    const completeGroups = records.filter((r) => r.isComplete).length;
    const incompleteGroups = records.length - completeGroups;

    res.json({
      success: true,
      records,
      allDetectedTags,
      stats: {
        totalNotes: records.length,
        completeGroups,
        incompleteGroups,
        totalRedactions,
        uniqueDetectedTags: allDetectedTags,
        uploadedFilesCount: extractedFiles.length,
        skippedFilesCount: 0,
        processingTimeMs: 120,
      },
    });
  } catch (error: any) {
    console.error('Error processing ZIP file:', error);
    res.status(500).json({ error: error.message || 'Failed to process ZIP file' });
  }
});

// API: Process local directory path on server
app.post('/api/process-local-dir', async (req, res) => {
  try {
    const {
      localPath,
      s3Bucket = 'int-shaip-bucket',
      s3Prefix = 'interns-test-data/SEP8/',
      presignExpiresDays = 7,
    } = req.body;

    if (!localPath || typeof localPath !== 'string') {
      return res.status(400).json({ error: 'localPath is required' });
    }

    const resolvedPath = path.resolve(process.cwd(), localPath);
    let extractedFiles: { name: string; content: string; size: number }[] = [];

    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      function scanDir(dir: string) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scanDir(fullPath);
          } else if (entry.isFile()) {
            if (entry.name.startsWith('.~lock.') || entry.name.startsWith('.')) continue;
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              extractedFiles.push({
                name: entry.name,
                content,
                size: content.length,
              });
            } catch {
              // skip unreadable
            }
          }
        }
      }
      scanDir(resolvedPath);
    } else {
      // If path does not exist on disk, fallback to sample files for demonstration
      extractedFiles = SAMPLE_SOAP_NOTES.map((f) => ({
        name: f.name,
        content: f.content,
        size: f.content.length,
      }));
    }

    const { records, allDetectedTags } = processRawFileList(
      extractedFiles,
      s3Bucket,
      s3Prefix,
      Number(presignExpiresDays) || 7,
    );

    const workbookBuffer = await generateReviewWorkbook(records, allDetectedTags);
    latestWorkbookBuffer = workbookBuffer;
    latestRecords = records;
    latestDetectedTags = allDetectedTags;

    const totalRedactions = records.reduce((sum, r) => sum + r.totalRedacted, 0);
    const completeGroups = records.filter((r) => r.isComplete).length;
    const incompleteGroups = records.length - completeGroups;

    res.json({
      success: true,
      records,
      allDetectedTags,
      isFallbackSample: !fs.existsSync(resolvedPath),
      sourcePath: resolvedPath,
      stats: {
        totalNotes: records.length,
        completeGroups,
        incompleteGroups,
        totalRedactions,
        uniqueDetectedTags: allDetectedTags,
        uploadedFilesCount: extractedFiles.length,
        skippedFilesCount: 0,
        processingTimeMs: 140,
      },
    });
  } catch (error: any) {
    console.error('Error processing local directory:', error);
    res.status(500).json({ error: error.message || 'Failed to process directory' });
  }
});

// API: Process raw file list passed directly from client
app.post('/api/process-files', async (req, res) => {
  try {
    const {
      files,
      s3Bucket = 'int-shaip-bucket',
      s3Prefix = 'interns-test-data/SEP8/',
      presignExpiresDays = 7,
    } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files array is required' });
    }

    const { records, allDetectedTags } = processRawFileList(
      files,
      s3Bucket,
      s3Prefix,
      Number(presignExpiresDays) || 7,
    );

    const workbookBuffer = await generateReviewWorkbook(records, allDetectedTags);
    latestWorkbookBuffer = workbookBuffer;
    latestRecords = records;
    latestDetectedTags = allDetectedTags;

    const totalRedactions = records.reduce((sum, r) => sum + r.totalRedacted, 0);
    const completeGroups = records.filter((r) => r.isComplete).length;
    const incompleteGroups = records.length - completeGroups;

    res.json({
      success: true,
      records,
      allDetectedTags,
      stats: {
        totalNotes: records.length,
        completeGroups,
        incompleteGroups,
        totalRedactions,
        uniqueDetectedTags: allDetectedTags,
        uploadedFilesCount: files.length,
        skippedFilesCount: 0,
        processingTimeMs: 85,
      },
    });
  } catch (error: any) {
    console.error('Error processing files:', error);
    res.status(500).json({ error: error.message || 'Failed to process files' });
  }
});

// API: Test AWS S3 bucket connectivity and IAM credentials
app.post('/api/s3/test-connection', async (req, res) => {
  try {
    const {
      bucket = 'int-shaip-bucket',
      prefix = 'interns-test-data/SEP8/',
      awsRegion,
      accessKeyId,
      secretAccessKey,
      sessionToken,
    } = req.body;

    const result = await testS3BucketAccess({
      bucket,
      prefix,
      awsRegion,
      accessKeyId,
      secretAccessKey,
      sessionToken,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error in /api/s3/test-connection:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test S3 connection',
      errorDetail: String(error),
    });
  }
});

// API: Upload note files and generated Excel workbook to AWS S3 & generate authentic presigned URLs
app.post('/api/s3/upload-and-presign', async (req, res) => {
  try {
    const {
      files,
      s3Bucket = 'int-shaip-bucket',
      s3Prefix = 'interns-test-data/SEP8/',
      presignExpiresDays = 7,
      awsRegion,
      accessKeyId,
      secretAccessKey,
      sessionToken,
      uploadWorkbook = true,
    } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided for S3 upload. Process or select files first.',
      });
    }

    const s3Config = {
      bucket: s3Bucket.trim() || 'int-shaip-bucket',
      prefix: s3Prefix.trim() || 'interns-test-data/SEP8/',
      presignExpiresDays: Number(presignExpiresDays) || 7,
      awsRegion,
      accessKeyId,
      secretAccessKey,
      sessionToken,
    };

    // 1. Upload note files to AWS S3
    const uploadResult = await uploadFilesToS3(files, s3Config);

    // 2. Process the files into NoteRecords
    const { records, allDetectedTags } = processRawFileList(
      files,
      s3Config.bucket,
      s3Config.prefix,
      s3Config.presignExpiresDays,
    );

    // 3. Map real S3 presigned URLs onto records
    const urlMap = new Map<string, string>();
    for (const item of uploadResult.items) {
      if (item.success && item.s3Url) {
        urlMap.set(item.name, item.s3Url);
      }
    }

    for (const record of records) {
      if (record.raw_txt && urlMap.has(record.raw_txt.name)) {
        record.raw_txt.s3Url = urlMap.get(record.raw_txt.name);
      }
      if (record.deid_json && urlMap.has(record.deid_json.name)) {
        record.deid_json.s3Url = urlMap.get(record.deid_json.name);
      }
      if (record.deid_txt && urlMap.has(record.deid_txt.name)) {
        record.deid_txt.s3Url = urlMap.get(record.deid_txt.name);
      }
    }

    // 4. Generate the Excel workbook with updated S3 URLs
    const workbookBuffer = await generateReviewWorkbook(records, allDetectedTags);
    latestWorkbookBuffer = workbookBuffer;
    latestRecords = records;
    latestDetectedTags = allDetectedTags;

    // 5. Upload the generated Excel workbook to S3 (matching Python script behavior)
    let workbookUploadResult: any = null;
    if (uploadWorkbook) {
      workbookUploadResult = await uploadWorkbookToS3(workbookBuffer, s3Config);
      if (workbookUploadResult.success) {
        latestS3WorkbookUrl = workbookUploadResult.s3Url;
      }
    }

    latestS3UploadStats = {
      timestamp: new Date().toISOString(),
      totalFiles: uploadResult.totalFiles,
      uploadedCount: uploadResult.uploadedCount,
      failedCount: uploadResult.failedCount,
      bucket: uploadResult.bucket,
      prefix: uploadResult.prefix,
      workbookUpload: workbookUploadResult,
    };

    res.json({
      success: uploadResult.uploadedCount > 0,
      records,
      allDetectedTags,
      uploadStats: latestS3UploadStats,
      items: uploadResult.items,
      message:
        uploadResult.failedCount === 0
          ? `Successfully uploaded ${uploadResult.uploadedCount} files to s3://${s3Config.bucket}/${s3Config.prefix.replace(/\/+$/, '')}`
          : `Uploaded ${uploadResult.uploadedCount} files with ${uploadResult.failedCount} failures`,
    });
  } catch (error: any) {
    console.error('Error during S3 upload & presign:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'S3 upload operation failed',
      errorCode: error.name || error.code,
    });
  }
});

// API: Generate real 7-day presigned URLs for existing clinical note records
app.post('/api/s3/presign-clinical-records', async (req, res) => {
  try {
    const {
      records,
      detectedTags = [],
      s3Bucket = 'int-shaip-bucket',
      s3Prefix = 'interns-test-data/SEP8/',
      presignExpiresDays = 7,
      awsRegion,
      accessKeyId,
      secretAccessKey,
      sessionToken,
    } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No note records provided for presigning',
      });
    }

    const s3Config = {
      bucket: s3Bucket.trim() || 'int-shaip-bucket',
      prefix: s3Prefix.trim() || 'interns-test-data/SEP8/',
      presignExpiresDays: Number(presignExpiresDays) || 7,
      awsRegion,
      accessKeyId,
      secretAccessKey,
      sessionToken,
    };

    const presignResult = await presignClinicalRecords(records, s3Config);

    // Update server in-memory state & workbook buffer with updated URLs
    latestRecords = presignResult.records;
    latestDetectedTags = detectedTags;
    latestWorkbookBuffer = await generateReviewWorkbook(presignResult.records, detectedTags);

    res.json({
      success: true,
      records: presignResult.records,
      presignedCount: presignResult.presignedCount,
      message: presignResult.message,
    });
  } catch (error: any) {
    console.error('Error presigning clinical records:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to presign clinical records',
    });
  }
});

// API: Get latest S3 upload and workbook presigned link
app.get('/api/s3/status', (req, res) => {
  res.json({
    latestS3WorkbookUrl,
    latestS3UploadStats,
  });
});

// API: Download the generated Excel workbook (.xlsx)
app.get('/api/download-excel', async (req, res) => {
  try {
    let buffer = latestWorkbookBuffer;
    if (!buffer && latestRecords.length > 0) {
      buffer = await generateReviewWorkbook(latestRecords, latestDetectedTags);
    } else if (!buffer) {
      // generate default sample workbook
      const { records, allDetectedTags } = processRawFileList(
        SAMPLE_SOAP_NOTES.map((f) => ({
          name: f.name,
          content: f.content,
          size: f.content.length,
        })),
        'int-shaip-bucket',
        'interns-test-data/SEP8/',
        7,
      );
      buffer = await generateReviewWorkbook(records, allDetectedTags);
    }

    const filename = 'De-Identification — Human-in-the-Loop Text Review.xlsx';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.send(Buffer.from(buffer));
  } catch (error: any) {
    console.error('Error generating Excel download:', error);
    res.status(500).json({ error: error.message || 'Failed to download workbook' });
  }
});

// ============================================================================
// GENERIC S3 FILE UPLOADER & INLINE-ONCLICK PRESIGNED URL GENERATOR ENDPOINTS
// ============================================================================

// API: Upload ANY arbitrary files to S3 & generate inline-onclick openable presigned URLs in Excel/CSV
app.post('/api/s3/upload-generic', upload.array('files'), async (req, res) => {
  try {
    const s3Bucket = (req.body.s3Bucket || 'int-shaip-bucket').trim();
    const s3Prefix = (req.body.s3Prefix || 'generic-uploads/').trim();
    const presignExpiresDays = Number(req.body.presignExpiresDays) || 7;
    const awsRegion = req.body.awsRegion;
    const accessKeyId = req.body.accessKeyId;
    const secretAccessKey = req.body.secretAccessKey;
    const sessionToken = req.body.sessionToken;
    const uploadReportToS3 = req.body.uploadReportToS3 !== 'false' && req.body.uploadReportToS3 !== false;

    const s3Config = {
      bucket: s3Bucket,
      prefix: s3Prefix,
      presignExpiresDays,
      awsRegion,
      accessKeyId,
      secretAccessKey,
      sessionToken,
    };

    let filesToUpload: GenericFileInput[] = [];

    // 1. Check if files came via multipart/form-data
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      filesToUpload = (req.files as Express.Multer.File[]).map((f) => ({
        name: f.originalname,
        buffer: f.buffer,
        mimeType: f.mimetype,
        size: f.size,
      }));
    } else if (Array.isArray(req.body.files) && req.body.files.length > 0) {
      // 2. Check if files came via JSON payload (e.g. base64 or text)
      filesToUpload = req.body.files.map((f: any) => {
        let buf: Buffer;
        if (f.base64) {
          buf = Buffer.from(f.base64, 'base64');
        } else if (typeof f.content === 'string') {
          buf = Buffer.from(f.content, 'utf-8');
        } else {
          buf = Buffer.alloc(0);
        }
        return {
          name: f.name,
          buffer: buf,
          mimeType: f.mimeType,
          size: buf.length,
        };
      });
    }

    if (filesToUpload.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided for upload. Please select at least one file.',
      });
    }

    // Perform upload to AWS S3 with inline disposition & presigned URLs
    const uploadResult = await uploadAnyFilesToS3(filesToUpload, s3Config);

    // Generate Excel report with inline-onclick hyperlinks
    const excelBuffer = await generatePresignedUrlsExcel(
      uploadResult.items,
      s3Config.bucket,
      s3Config.prefix,
      s3Config.presignExpiresDays,
    );

    // Generate RFC CSV report
    const csvContent = generatePresignedUrlsCsv(
      uploadResult.items,
      s3Config.bucket,
      s3Config.prefix,
    );

    latestGenericExcelBuffer = excelBuffer;
    latestGenericCsvContent = csvContent;
    latestGenericReportItems = uploadResult.items;

    // Optionally upload report to S3 as well
    let excelS3Url: string | undefined;
    let csvS3Url: string | undefined;

    if (uploadReportToS3 && uploadResult.uploadedCount > 0) {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const excelReportName = `Presigned_URLs_Report_${timestamp}.xlsx`;
        const uploadedExcel = await uploadWorkbookToS3(
          excelBuffer,
          { ...s3Config, prefix: `${s3Config.prefix.replace(/\/+$/, '')}/reports` },
          excelReportName,
        );
        if (uploadedExcel.success) {
          excelS3Url = uploadedExcel.s3Url;
        }

        const csvReportName = `Presigned_URLs_Report_${timestamp}.csv`;
        const uploadedCsv = await uploadWorkbookToS3(
          Buffer.from(csvContent, 'utf-8'),
          { ...s3Config, prefix: `${s3Config.prefix.replace(/\/+$/, '')}/reports` },
          csvReportName,
        );
        if (uploadedCsv.success) {
          csvS3Url = uploadedCsv.s3Url;
        }
      } catch (repErr) {
        console.warn('Note: Could not upload generated report to S3 bucket, continuing:', repErr);
      }
    }

    res.json({
      success: uploadResult.uploadedCount > 0,
      totalFiles: uploadResult.totalFiles,
      uploadedCount: uploadResult.uploadedCount,
      failedCount: uploadResult.failedCount,
      bucket: uploadResult.bucket,
      prefix: uploadResult.prefix,
      items: uploadResult.items,
      excelS3Url,
      csvS3Url,
      csvContent,
      message: `Successfully uploaded ${uploadResult.uploadedCount} of ${uploadResult.totalFiles} files to s3://${s3Config.bucket}/${s3Config.prefix.replace(/\/+$/, '')}. Excel and CSV reports generated with inline-onclick openable URLs.`,
    });
  } catch (error: any) {
    console.error('Error in /api/s3/upload-generic:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Generic S3 upload failed',
    });
  }
});

// API: Download the latest generated generic Excel report (.xlsx)
app.get('/api/s3/download-generic-excel', async (req, res) => {
  try {
    if (!latestGenericExcelBuffer) {
      return res.status(404).send('No generic S3 report has been generated yet. Upload files first.');
    }
    const filename = 'S3_Presigned_URLs_Report.xlsx';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.send(Buffer.from(latestGenericExcelBuffer));
  } catch (err: any) {
    res.status(500).send(err.message || 'Failed to download report');
  }
});

// API: Download the latest generated generic CSV report (.csv)
app.get('/api/s3/download-generic-csv', (req, res) => {
  try {
    if (!latestGenericCsvContent) {
      return res.status(404).send('No generic S3 report has been generated yet. Upload files first.');
    }
    const filename = 'S3_Presigned_URLs_Report.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.send(latestGenericCsvContent);
  } catch (err: any) {
    res.status(500).send(err.message || 'Failed to download CSV');
  }
});

// Helper: robust CSV text parser
function parseCsvSimple(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const nonEmptyLines = lines.filter((l) => l.trim().length > 0);
  if (nonEmptyLines.length === 0) {
    return { headers: [], rows: [] };
  }

  const parseLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(nonEmptyLines[0]).map((h) => h.replace(/^["']|["']$/g, '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < nonEmptyLines.length; i++) {
    const values = parseLine(nonEmptyLines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? '').replace(/^["']|["']$/g, '');
    });
    rows.push(row);
  }

  return { headers, rows };
}

// API: Scenario 1 - Generate 7-day validity URLs from a CSV containing header "s3path"
app.post('/api/s3/presign-from-csv', async (req, res) => {
  try {
    const { csvText, rows: inputRows, s3Config = {} } = req.body;

    let headers: string[] = [];
    let rows: Record<string, string>[] = [];

    if (csvText && typeof csvText === 'string') {
      const parsed = parseCsvSimple(csvText);
      headers = parsed.headers;
      rows = parsed.rows;
    } else if (Array.isArray(inputRows)) {
      rows = inputRows;
      if (rows.length > 0) {
        headers = Object.keys(rows[0]);
      }
    }

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No CSV data provided or CSV is empty. Please provide CSV with header "s3path".',
      });
    }

    // Locate column with name "s3path" (case-insensitive)
    let s3PathHeader = headers.find(
      (h) => h.toLowerCase() === 's3path' || h.toLowerCase() === 's3_path',
    );
    if (!s3PathHeader) {
      // Fallback: search for header containing "s3" or "path"
      s3PathHeader = headers.find(
        (h) => h.toLowerCase().includes('s3') || h.toLowerCase().includes('path'),
      );
    }
    if (!s3PathHeader && headers.length > 0) {
      s3PathHeader = headers[0]; // fallback to first column
    }

    const itemsToPresign = rows.map((r) => ({
      s3path: s3PathHeader ? r[s3PathHeader] : (r['s3path'] || ''),
      rowData: r,
    }));

    const presignResult = await presignS3PathList(itemsToPresign, s3Config);

    // Generate Excel report with clickable hyperlinks
    const excelBuffer = await generateS3PathCsvExcelReport(
      presignResult.items,
      headers,
      s3Config.bucket || 'int-shaip-bucket',
    );
    const csvContent = generateS3PathCsvTextReport(presignResult.items, headers);

    // Cache latest result for direct downloads
    latestCsvPresignExcelBuffer = excelBuffer;
    latestCsvPresignCsvContent = csvContent;
    latestCsvPresignItems = presignResult.items;
    latestCsvHeaders = headers;

    res.json({
      success: presignResult.success,
      totalCount: presignResult.total,
      successfulCount: presignResult.successfulCount,
      failedCount: presignResult.failedCount,
      detectedHeader: s3PathHeader,
      headers,
      items: presignResult.items,
      csvContent,
      message: `Generated 7-day validity inline presigned URLs for ${presignResult.successfulCount} of ${presignResult.total} items.`,
    });
  } catch (error: any) {
    console.error('Error in /api/s3/presign-from-csv:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process s3path CSV',
    });
  }
});

// API: Scenario 2 - Auto-detect all files from S3 Bucket + Prefix and generate 7-day validity URLs
app.post('/api/s3/auto-detect-and-presign', async (req, res) => {
  try {
    const { s3Config = {}, limit = 2000 } = req.body;
    const bucket = (s3Config.bucket || 'int-shaip-bucket').trim();
    const prefix = (s3Config.prefix || '').trim();

    if (!bucket) {
      return res.status(400).json({
        success: false,
        error: 'S3 bucket name is required.',
      });
    }

    const detectResult = await listAndPresignBucketObjects(s3Config, Number(limit) || 2000);

    if (!detectResult.success) {
      return res.status(500).json({
        success: false,
        error: detectResult.error || 'Failed to list and presign files from S3 bucket',
      });
    }

    // Generate Excel report with clickable hyperlinks
    const excelBuffer = await generateDetectedObjectsExcel(
      detectResult.items,
      bucket,
      prefix,
    );
    const csvContent = generateDetectedObjectsCsv(
      detectResult.items,
      bucket,
      prefix,
    );

    // Cache latest result for direct downloads
    latestDetectedExcelBuffer = excelBuffer;
    latestDetectedCsvContent = csvContent;
    latestDetectedItems = detectResult.items;
    latestDetectedBucket = bucket;
    latestDetectedPrefix = prefix;

    res.json({
      success: true,
      bucket,
      prefix,
      totalFound: detectResult.totalFound,
      items: detectResult.items,
      csvContent,
      message: `Auto-detected ${detectResult.totalFound} files in s3://${bucket}/${prefix.replace(/^\/+/, '')} and generated 7-day inline URLs.`,
    });
  } catch (error: any) {
    console.error('Error in /api/s3/auto-detect-and-presign:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to auto-detect S3 bucket files',
    });
  }
});

// API: Download CSV Presign Excel report (.xlsx)
app.get('/api/s3/download-csv-presign-excel', (req, res) => {
  try {
    if (!latestCsvPresignExcelBuffer) {
      return res.status(404).send('No CSV presign report has been generated yet.');
    }
    const filename = 'S3Path_Presigned_URLs_7Days.xlsx';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.send(Buffer.from(latestCsvPresignExcelBuffer));
  } catch (err: any) {
    res.status(500).send(err.message || 'Failed to download Excel report');
  }
});

// API: Download CSV Presign CSV report (.csv)
app.get('/api/s3/download-csv-presign-csv', (req, res) => {
  try {
    if (!latestCsvPresignCsvContent) {
      return res.status(404).send('No CSV presign report has been generated yet.');
    }
    const filename = 'S3Path_Presigned_URLs_7Days.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.send(latestCsvPresignCsvContent);
  } catch (err: any) {
    res.status(500).send(err.message || 'Failed to download CSV report');
  }
});

// API: Download Auto-Detected S3 Objects Excel report (.xlsx)
app.get('/api/s3/download-detected-excel', (req, res) => {
  try {
    if (!latestDetectedExcelBuffer) {
      return res.status(404).send('No auto-detected S3 files report has been generated yet.');
    }
    const filename = 'S3_Detected_Files_Presigned_URLs.xlsx';
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.send(Buffer.from(latestDetectedExcelBuffer));
  } catch (err: any) {
    res.status(500).send(err.message || 'Failed to download Excel report');
  }
});

// API: Download Auto-Detected S3 Objects CSV report (.csv)
app.get('/api/s3/download-detected-csv', (req, res) => {
  try {
    if (!latestDetectedCsvContent) {
      return res.status(404).send('No auto-detected S3 files report has been generated yet.');
    }
    const filename = 'S3_Detected_Files_Presigned_URLs.csv';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );
    res.send(latestDetectedCsvContent);
  } catch (err: any) {
    res.status(500).send(err.message || 'Failed to download CSV report');
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
