import React, { useState } from 'react';
import {
  Database,
  Search,
  RefreshCw,
  Sparkles,
  Download,
  FileSpreadsheet,
  FileText,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  File,
  FileImage,
  FileCode,
  FileArchive,
  Music,
  Video,
} from 'lucide-react';
import { S3Config } from '../types';
import {
  S3DetectedObjectItem,
  formatBytes,
  generateDetectedObjectsExcel,
  generateDetectedObjectsCsv,
} from '../services/genericPresignedReportGenerator';

interface S3AutoDetectorProps {
  s3Config: S3Config;
  onS3ConfigChange: (config: S3Config) => void;
  onTestS3Connection: () => Promise<void>;
  isTestingS3: boolean;
  s3TestResult: {
    success: boolean;
    message: string;
    errorCode?: string;
  } | null;
}

export const S3AutoDetector: React.FC<S3AutoDetectorProps> = ({
  s3Config,
  onS3ConfigChange,
  onTestS3Connection,
  isTestingS3,
  s3TestResult,
}) => {
  const [bucket, setBucket] = useState(s3Config.bucket || 'int-shaip-bucket');
  const [prefix, setPrefix] = useState(s3Config.prefix || 'interns-test-data/SEP8/');
  const [maxLimit, setMaxLimit] = useState(1000);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedCsv, setCopiedCsv] = useState(false);

  const [result, setResult] = useState<{
    success: boolean;
    bucket: string;
    prefix: string;
    totalFound: number;
    items: S3DetectedObjectItem[];
    csvContent?: string;
    message?: string;
  } | null>(null);

  const handleScanBucket = async () => {
    if (!bucket.trim()) {
      setErrorMessage('Please provide an S3 Bucket name.');
      return;
    }

    setIsScanning(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/s3/auto-detect-and-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          s3Config: {
            ...s3Config,
            bucket: bucket.trim(),
            prefix: prefix.trim(),
          },
          limit: maxLimit,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to auto-detect S3 bucket objects.');
      }

      setResult(data);
      // Sync with parent config
      onS3ConfigChange({
        ...s3Config,
        bucket: bucket.trim(),
        prefix: prefix.trim(),
      });
    } catch (err: any) {
      console.error('S3 auto-detect error:', err);
      setErrorMessage(err.message || 'Error communicating with AWS S3.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!result?.items || result.items.length === 0) return;

    try {
      const res = await fetch('/api/s3/download-detected-excel');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `S3_${bucket}_Detected_Files_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('Server download endpoint failed, using client generator:', e);
    }

    // Client-side fallback
    try {
      const buffer = await generateDetectedObjectsExcel(result.items, result.bucket, result.prefix);
      const blob = new Blob([buffer as unknown as BlobPart], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `S3_${bucket}_Detected_Files_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Client Excel generation error:', err);
    }
  };

  const handleDownloadCsv = async () => {
    if (!result?.items || result.items.length === 0) return;

    try {
      const res = await fetch('/api/s3/download-detected-csv');
      if (res.ok) {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `S3_${bucket}_Detected_Files_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('Server CSV download failed, using client fallback:', e);
    }

    const csvText = result.csvContent || generateDetectedObjectsCsv(result.items, result.bucket, result.prefix);
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `S3_${bucket}_Detected_Files_${new Date().toISOString().slice(0, 10)}.csv`;
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
      .map((i) => `${i.name}: ${i.presignedUrl}`)
      .join('\n');
    navigator.clipboard.writeText(urls);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyCsvText = () => {
    if (!result?.items) return;
    const text = result.csvContent || generateDetectedObjectsCsv(result.items, result.bucket, result.prefix);
    navigator.clipboard.writeText(text);
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 2000);
  };

  const getFileIcon = (filename: string, mime: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext) || mime.startsWith('image/')) {
      return <FileImage className="w-4 h-4 text-indigo-600 shrink-0" />;
    }
    if (['pdf'].includes(ext) || mime.includes('pdf')) {
      return <FileText className="w-4 h-4 text-rose-600 shrink-0" />;
    }
    if (['csv', 'xlsx', 'xls'].includes(ext) || mime.includes('sheet') || mime.includes('csv')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (['json', 'xml', 'ts', 'js', 'html', 'py'].includes(ext)) {
      return <FileCode className="w-4 h-4 text-amber-600 shrink-0" />;
    }
    if (['zip', 'gz', 'tar', 'rar', '7z'].includes(ext)) {
      return <FileArchive className="w-4 h-4 text-purple-600 shrink-0" />;
    }
    if (['mp3', 'wav', 'm4a', 'flac'].includes(ext) || mime.startsWith('audio/')) {
      return <Music className="w-4 h-4 text-pink-600 shrink-0" />;
    }
    if (['mp4', 'mov', 'avi', 'mkv'].includes(ext) || mime.startsWith('video/')) {
      return <Video className="w-4 h-4 text-cyan-600 shrink-0" />;
    }
    return <File className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  const filteredItems = (result?.items || []).filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.key.toLowerCase().includes(q) || item.mimeType.toLowerCase().includes(q);
  });

  const totalBytes = (result?.items || []).reduce((sum, item) => sum + (item.size || 0), 0);

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Database className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-slate-900">
                Auto-Detect S3 Files & Generate 7-Day URLs
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                Scenario 2
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Specify your target S3 Bucket and folder prefix. The pipeline scans the bucket via ListObjectsV2 and generates 7-day validity inline-openable presigned URLs for every file found.
            </p>
          </div>

          <button
            type="button"
            onClick={onTestS3Connection}
            disabled={isTestingS3}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTestingS3 ? 'animate-spin' : ''}`} />
            <span>Test S3 Credentials</span>
          </button>
        </div>

        {s3TestResult && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              s3TestResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {s3TestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{s3TestResult.message}</span>
          </div>
        )}

        {/* Target Bucket & Prefix Inputs */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              S3 Bucket Name *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                s3://
              </span>
              <input
                type="text"
                value={bucket}
                onChange={(e) => setBucket(e.target.value)}
                placeholder="int-shaip-bucket"
                className="w-full pl-12 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Prefix / Folder Path
            </label>
            <div className="relative">
              <FolderTree className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="interns-test-data/SEP8/"
                className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Leave blank to scan the entire bucket root
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Scan Limit
            </label>
            <select
              value={maxLimit}
              onChange={(e) => setMaxLimit(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={100}>Up to 100 files</option>
              <option value={500}>Up to 500 files</option>
              <option value={1000}>Up to 1,000 files</option>
              <option value={2000}>Up to 2,000 files</option>
              <option value={5000}>Up to 5,000 files</option>
            </select>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scan Button */}
        <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Destination: <code className="font-mono font-semibold text-slate-700">s3://{bucket}/{prefix.replace(/^\/+/, '')}</code>
          </div>

          <button
            type="button"
            onClick={handleScanBucket}
            disabled={isScanning || !bucket.trim()}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all cursor-pointer ${
              isScanning || !bucket.trim()
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 active:scale-[0.99]'
            }`}
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scanning S3 Bucket...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Auto-Detect & Generate 7-Day URLs</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {result.totalFound} Files Detected ({formatBytes(totalBytes)})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Target: <code className="font-mono text-emerald-700 font-semibold">s3://{result.bucket}/{result.prefix}</code> &bull; All URLs configured with 7-Day Validity & Inline Open
              </p>
            </div>

            {/* Export & Copy Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAllUrls}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Copy all presigned URLs"
              >
                {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAll ? 'Copied All!' : 'Copy URLs'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCsvText}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                title="Copy CSV representation"
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

          {/* Search Filter */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search file name, S3 key, MIME type..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Showing {filteredItems.length} of {result.items.length} files
            </div>
          </div>

          {/* Files Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[460px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-center w-12">#</th>
                  <th className="py-2.5 px-3 font-semibold">File Name (Click to Open)</th>
                  <th className="py-2.5 px-3 font-semibold">S3 Key</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Size</th>
                  <th className="py-2.5 px-3 font-semibold">Content Type</th>
                  <th className="py-2.5 px-3 font-semibold">Last Modified</th>
                  <th className="py-2.5 px-3 font-semibold">7-Day Presigned URL</th>
                  <th className="py-2.5 px-3 font-semibold text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        {getFileIcon(item.name, item.mimeType)}
                        {item.success && item.presignedUrl ? (
                          <a
                            href={item.presignedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-slate-800 hover:text-emerald-700 hover:underline truncate max-w-[220px]"
                            title="Click to open inline in browser"
                          >
                            {item.name}
                          </a>
                        ) : (
                          <span className="font-semibold text-slate-800 truncate max-w-[220px]">{item.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-500 text-[11px] truncate max-w-[200px]">
                      {item.key}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatBytes(item.size)}
                    </td>
                    <td className="py-2 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {item.mimeType}
                    </td>
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {item.lastModified ? new Date(item.lastModified).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-2 px-3 max-w-xs truncate">
                      {item.success && item.presignedUrl ? (
                        <a
                          href={item.presignedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-emerald-600 hover:text-emerald-800 hover:underline inline-flex items-center gap-1 text-[11px]"
                          title="Click to open inline in browser (7 days)"
                        >
                          <span className="truncate max-w-[220px]">{item.presignedUrl}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-red-500 text-xs font-mono">{item.error || 'Failed'}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {item.success && item.presignedUrl && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(item.presignedUrl, idx)}
                            className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
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
                            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition-colors inline-flex items-center"
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
