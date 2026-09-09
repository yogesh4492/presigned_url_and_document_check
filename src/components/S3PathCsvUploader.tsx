import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  Download,
  Search,
  Eye,
  Trash2,
} from 'lucide-react';
import { S3Config } from '../types';
import {
  S3PathPresignItem,
  generateS3PathCsvExcelReport,
  generateS3PathCsvTextReport,
} from '../services/genericPresignedReportGenerator';

interface S3PathCsvUploaderProps {
  s3Config: S3Config;
  onS3ConfigChange: (config: S3Config) => void;
}

const SAMPLE_CSV_CONTENT = `patient_id,note_type,date,s3path,notes
PT-10492,Discharge Summary,2026-03-01,s3://int-shaip-bucket/interns-test-data/SEP8/note_10492.txt,De-identified SOAP notes
PT-10493,Progress Note,2026-03-02,s3://int-shaip-bucket/interns-test-data/SEP8/note_10493.txt,Cardiology follow-up
PT-10494,Operative Report,2026-03-03,s3://int-shaip-bucket/interns-test-data/SEP8/note_10494.pdf,Surgical notes
PT-10495,Consultation,2026-03-04,https://int-shaip-bucket.s3.amazonaws.com/interns-test-data/SEP8/note_10495.json,Endocrinology consult
PT-10496,History & Physical,2026-03-05,interns-test-data/SEP8/note_10496.docx,Initial clinical intake`;

export const S3PathCsvUploader: React.FC<S3PathCsvUploaderProps> = ({
  s3Config,
}) => {
  const [csvText, setCsvText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [copiedCsv, setCopiedCsv] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const [result, setResult] = useState<{
    success: boolean;
    totalCount: number;
    successfulCount: number;
    failedCount: number;
    detectedHeader: string;
    headers: string[];
    items: S3PathPresignItem[];
    csvContent?: string;
    message?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setErrorMessage('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setCsvText(text);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read CSV file.');
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setFileName('sample_clinical_s3paths.csv');
    setCsvText(SAMPLE_CSV_CONTENT);
    setErrorMessage('');
  };

  const handleClear = () => {
    setCsvText('');
    setFileName('');
    setResult(null);
    setErrorMessage('');
  };

  const handleGenerateUrls = async () => {
    if (!csvText.trim()) {
      setErrorMessage('Please upload or paste a CSV file containing an "s3path" header column.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/s3/presign-from-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvText,
          s3Config: {
            bucket: s3Config.bucket,
            prefix: s3Config.prefix,
            awsRegion: s3Config.awsRegion,
            accessKeyId: s3Config.accessKeyId,
            secretAccessKey: s3Config.secretAccessKey,
            sessionToken: s3Config.sessionToken,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process CSV and generate presigned URLs.');
      }

      setResult(data);
    } catch (err: any) {
      console.error('CSV presign error:', err);
      // Fallback: parse client side and generate direct URLs
      setErrorMessage(err.message || 'Error communicating with server.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Download Excel workbook
  const handleDownloadExcel = async () => {
    if (!result?.items || result.items.length === 0) return;

    try {
      const res = await fetch('/api/s3/download-csv-presign-excel');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `S3Path_Presigned_URLs_7Days_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('Server download endpoint failed, using client generator:', e);
    }

    // Client-side fallback generator
    try {
      const excelBuffer = await generateS3PathCsvExcelReport(
        result.items,
        result.headers,
        s3Config.bucket,
      );
      const blob = new Blob([excelBuffer as unknown as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `S3Path_Presigned_URLs_7Days_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Client-side Excel generation error:', err);
    }
  };

  // Download CSV file
  const handleDownloadCsv = async () => {
    if (!result?.items || result.items.length === 0) return;

    try {
      const res = await fetch('/api/s3/download-csv-presign-csv');
      if (res.ok) {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `S3Path_Presigned_URLs_7Days_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('Server CSV download failed, using client fallback:', e);
    }

    // Client-side fallback
    const csvContent = result.csvContent || generateS3PathCsvTextReport(result.items, result.headers);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `S3Path_Presigned_URLs_7Days_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyUrl = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyAllUrls = () => {
    if (!result?.items) return;
    const urls = result.items
      .filter((i) => i.success && i.presignedUrl)
      .map((i) => `${i.fileName || i.s3Path}: ${i.presignedUrl}`)
      .join('\n');
    navigator.clipboard.writeText(urls);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyCsvText = () => {
    if (!result?.items) return;
    const text = result.csvContent || generateS3PathCsvTextReport(result.items, result.headers);
    navigator.clipboard.writeText(text);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const filteredItems = (result?.items || []).filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.s3Path.toLowerCase().includes(q) ||
      item.fileName.toLowerCase().includes(q) ||
      item.bucket.toLowerCase().includes(q) ||
      Object.values(item.originalRow).some((v) => String(v).toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Intro & instructions card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Generate 7-Day Validity URLs from `s3path` CSV
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                Scenario 1
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Upload or paste a CSV file containing an <code className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono text-xs">s3path</code> header.
              All existing columns are preserved and enriched with 7-day inline-openable presigned URLs.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample CSV</span>
            </button>
            {csvText && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Drag & drop upload area */}
        <div className="mt-5 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileUpload(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50/50'
                : 'border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              {fileName ? (
                <span className="text-indigo-600">Selected: {fileName}</span>
              ) : (
                'Drop your CSV file here, or click to browse'
              )}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports .csv files with header <code className="text-slate-600 font-mono">s3path</code> (e.g. s3://bucket/key or path/file.pdf)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </div>

          {/* Or paste CSV text directly */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-semibold text-slate-700">Or Paste / Inspect CSV Content:</span>
              <span>{csvText.split('\n').filter((l) => l.trim()).length} rows detected</span>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setFileName('');
              }}
              rows={5}
              placeholder="patient_id,s3path,notes&#10;PT-1001,s3://int-shaip-bucket/notes/note1.pdf,SOAP summary&#10;PT-1002,s3://int-shaip-bucket/notes/note2.json,Lab findings"
              className="w-full text-xs font-mono p-3 bg-slate-900 text-slate-100 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action button */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500 font-mono">
              Target Bucket: <span className="font-semibold text-slate-700">{s3Config.bucket}</span> &bull; Validity:{' '}
              <span className="font-semibold text-emerald-600">7 Days (604,800s)</span>
            </div>

            <button
              type="button"
              onClick={handleGenerateUrls}
              disabled={isProcessing || !csvText.trim()}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all cursor-pointer ${
                isProcessing || !csvText.trim()
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-[0.99]'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating 7-Day URLs...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate 7-Day URLs</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
          {/* Header & Stats Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Presigned URLs Generated ({result.successfulCount} of {result.totalCount} Active)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Header matched: <code className="font-mono text-indigo-600 font-semibold">{result.detectedHeader}</code> &bull; Validity: 7 Days &bull; Inline On-Click Enabled
              </p>
            </div>

            {/* Export & Copy Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAllUrls}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Copy all presigned URLs to clipboard"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? 'Copied All!' : 'Copy URLs'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCsvText}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Copy CSV string with generated presigned URLs"
              >
                {copiedCsv ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5" />}
                <span>{copiedCsv ? 'Copied CSV!' : 'Copy CSV'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .csv</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadExcel}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-sm shadow-emerald-900/20 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Download .xlsx</span>
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across all CSV columns and paths..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Showing {filteredItems.length} of {result.items.length} records
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-center w-12">#</th>
                  {result.headers.map((h) => (
                    <th key={h} className="py-2.5 px-3 font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">
                    7-Day Presigned URL (Inline On-Click)
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center w-24">Status</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    {result.headers.map((h) => (
                      <td key={h} className="py-2 px-3 text-slate-700 whitespace-nowrap max-w-[200px] truncate">
                        {item.originalRow[h] || item.originalRow[h.toLowerCase()] || '-'}
                      </td>
                    ))}
                    <td className="py-2 px-3 max-w-xs truncate">
                      {item.success && item.presignedUrl ? (
                        <a
                          href={item.presignedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 text-[11px]"
                          title="Click to open file inline in browser"
                        >
                          <span className="truncate max-w-[260px]">{item.presignedUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-red-500 text-xs font-mono">{item.error || 'Failed'}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {item.success ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active (7d)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {item.success && item.presignedUrl && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(item.presignedUrl, idx)}
                            className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            title="Copy Presigned URL"
                          >
                            {copiedIndex === idx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a
                            href={item.presignedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors inline-flex items-center"
                            title="Open Inline in Browser"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
