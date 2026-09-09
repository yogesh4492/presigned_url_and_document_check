import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  ExternalLink,
  Eye,
  CheckCircle,
  AlertCircle,
  Filter,
  Layers,
  Sparkles,
  Copy,
  Check,
  UploadCloud,
} from 'lucide-react';
import { NoteRecord, DETAIL_COLUMNS } from '../types';

interface ReviewTableProps {
  records: NoteRecord[];
  detectedTags: string[];
  onInspectNote: (record: NoteRecord) => void;
  onDownloadExcel: () => void;
  onUploadToS3?: () => Promise<void>;
  isUploadingS3?: boolean;
  s3WorkbookUrl?: string | null;
  s3Bucket?: string;
  s3Prefix?: string;
}

export const ReviewTable: React.FC<ReviewTableProps> = ({
  records,
  detectedTags,
  onInspectNote,
  onDownloadExcel,
  onUploadToS3,
  isUploadingS3 = false,
  s3WorkbookUrl = null,
  s3Bucket = 'int-shaip-bucket',
  s3Prefix = 'interns-test-data/SEP8/',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterComplete, setFilterComplete] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Local human verification edits so reviewer can type in real-time
  const [humanReviewValues, setHumanReviewValues] = useState<Record<string, Record<string, string>>>({});

  const handleCellChange = (noteId: string, colHeader: string, value: string) => {
    setHumanReviewValues((prev) => ({
      ...prev,
      [noteId]: {
        ...(prev[noteId] || {}),
        [colHeader]: value,
      },
    }));
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Search term
      if (searchTerm && !rec.noteId.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Completion filter
      if (filterComplete === 'complete' && !rec.isComplete) return false;
      if (filterComplete === 'incomplete' && rec.isComplete) return false;
      // Tag filter
      if (selectedTagFilter !== 'all') {
        const count = rec.redactionCounts[selectedTagFilter] || 0;
        if (count === 0) return false;
      }
      return true;
    });
  }, [records, searchTerm, filterComplete, selectedTagFilter]);

  const humanVerificationColumns = [
    ...DETAIL_COLUMNS,
    ...detectedTags.map((t) => `[${t}]`),
  ];

  const detectedCountColumns = [
    ...detectedTags.map((t) => `[${t}]`),
    'total_redacted',
    'unique_tags',
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
      {/* Table Header Bar with Search & Download */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-800 tracking-tight">
              3. Review Workbook Spreadsheet View
            </h3>
            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full">
              {filteredRecords.length} / {records.length} rows
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Interactive preview of the generated <code className="font-mono text-slate-700 bg-slate-200/70 px-1 py-0.5 rounded text-[11px]">De-Identification — Human-in-the-Loop Text Review.xlsx</code>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Note ID..."
              className="pl-8 pr-3 py-1.5 text-xs text-slate-800 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 w-44"
            />
          </div>

          {/* Completion Filter */}
          <select
            value={filterComplete}
            onChange={(e: any) => setFilterComplete(e.target.value)}
            className="px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All Status</option>
            <option value="complete">Complete (3/3)</option>
            <option value="incomplete">Incomplete</option>
          </select>

          {/* Tag Filter */}
          {detectedTags.length > 0 && (
            <select
              value={selectedTagFilter}
              onChange={(e) => setSelectedTagFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
            >
              <option value="all">All Tags</option>
              {detectedTags.map((tag) => (
                <option key={tag} value={tag}>
                  [{tag}]
                </option>
              ))}
            </select>
          )}

          {/* Upload to S3 action button */}
          {onUploadToS3 && records.length > 0 && (
            <button
              type="button"
              onClick={onUploadToS3}
              disabled={isUploadingS3}
              title={`Upload ${records.length * 3} files to s3://${s3Bucket}/${s3Prefix}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className={`w-3.5 h-3.5 text-sky-600 ${isUploadingS3 ? 'animate-bounce' : ''}`} />
              <span>{isUploadingS3 ? 'Uploading S3...' : 'Upload to S3'}</span>
            </button>
          )}

          {/* S3 Workbook Link if uploaded */}
          {s3WorkbookUrl && (
            <a
              href={s3WorkbookUrl}
              target="_blank"
              rel="noreferrer"
              title="Open workbook directly from S3 bucket"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-xs transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span>S3 Workbook</span>
            </a>
          )}

          {/* Primary Download Excel button */}
          <button
            type="button"
            onClick={onDownloadExcel}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .xlsx</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Container with horizontal scroll */}
      <div className="overflow-x-auto max-h-[560px] relative border-b border-slate-100">
        <table className="w-full border-collapse text-xs text-left">
          {/* Header Tier 1: Super Groups */}
          <thead className="sticky top-0 z-20 shadow-xs">
            <tr className="bg-slate-100 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-300">
              <th className="p-2 border-r border-slate-200 bg-slate-200/90 text-center sticky left-0 z-30 min-w-[130px]">
                Filename
              </th>
              <th className="p-2 border-r border-slate-200 bg-slate-200/90 text-center min-w-[150px]">
                raw_txt
              </th>
              <th className="p-2 border-r border-slate-200 bg-slate-200/90 text-center min-w-[150px]">
                deid_json
              </th>
              <th className="p-2 border-r border-slate-300 bg-slate-200/90 text-center min-w-[150px]">
                deid_txt
              </th>
              {/* Human Verification Super Header (matches LIGHT_RED_FILL FCE4D6) */}
              <th
                colSpan={humanVerificationColumns.length}
                className="p-2 border-r border-red-300 text-center font-bold tracking-wide"
                style={{ backgroundColor: '#FCE4D6', color: '#7C2D12' }}
              >
                Human verification (Review Columns)
              </th>
              {/* Detected Redaction Count Super Header (matches LIGHT_GREEN_FILL E2F0D9) */}
              <th
                colSpan={detectedCountColumns.length}
                className="p-2 text-center font-bold tracking-wide border-r border-emerald-300"
                style={{ backgroundColor: '#E2F0D9', color: '#064E3B' }}
              >
                Detected redaction count
              </th>
              <th className="p-2 text-center bg-slate-200/90 min-w-[90px]">
                Action
              </th>
            </tr>

            {/* Header Tier 2: Sub-columns */}
            <tr className="text-slate-800 font-semibold text-[11px] border-b-2 border-slate-300">
              <th className="p-2 border-r border-slate-200 bg-slate-100 sticky left-0 z-30">
                Note ID
              </th>
              <th className="p-2 border-r border-slate-200 bg-slate-100">
                S3 Link (.txt)
              </th>
              <th className="p-2 border-r border-slate-200 bg-slate-100">
                S3 Link (.json)
              </th>
              <th className="p-2 border-r border-slate-300 bg-slate-100">
                S3 Link (.txt)
              </th>

              {/* Human Verification Subheaders */}
              {humanVerificationColumns.map((col, idx) => (
                <th
                  key={`hv-${idx}`}
                  className="p-2 border-r border-red-200/80 text-center font-mono text-[10px] whitespace-nowrap min-w-[110px]"
                  style={{ backgroundColor: '#FCE4D6', color: '#7C2D12' }}
                >
                  {col}
                </th>
              ))}

              {/* Detected Count Subheaders */}
              {detectedCountColumns.map((col, idx) => (
                <th
                  key={`dc-${idx}`}
                  className="p-2 border-r border-emerald-200/80 text-center font-mono text-[10px] whitespace-nowrap min-w-[100px]"
                  style={{ backgroundColor: '#E2F0D9', color: '#064E3B' }}
                >
                  {col}
                </th>
              ))}

              <th className="p-2 text-center bg-slate-100">
                Inspect
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-200 bg-white font-mono">
            {filteredRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={4 + humanVerificationColumns.length + detectedCountColumns.length + 1}
                  className="p-8 text-center text-slate-400 font-sans"
                >
                  No clinical notes match the current filters.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, rowIndex) => {
                const isEven = rowIndex % 2 === 0;
                return (
                  <tr
                    key={record.noteId}
                    className={`hover:bg-slate-50 transition-colors ${
                      isEven ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* Note ID */}
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-800 sticky left-0 z-10 bg-inherit whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${record.isComplete ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span>{record.noteId}</span>
                      </div>
                    </td>

                    {/* raw_txt Link */}
                    <td className="p-2 border-r border-slate-200 whitespace-nowrap text-[11px]">
                      {record.raw_txt ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={record.raw_txt.s3Url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-600 hover:text-sky-800 underline flex items-center gap-1 truncate max-w-[130px]"
                            title={record.raw_txt.s3Url}
                          >
                            <span>{record.raw_txt.name}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(record.raw_txt?.s3Url || '')}
                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            title="Copy S3 Presigned URL"
                          >
                            {copiedUrl === record.raw_txt.s3Url ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-amber-500 text-[10px] font-sans italic">Missing</span>
                      )}
                    </td>

                    {/* deid_json Link */}
                    <td className="p-2 border-r border-slate-200 whitespace-nowrap text-[11px]">
                      {record.deid_json ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={record.deid_json.s3Url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-600 hover:text-sky-800 underline flex items-center gap-1 truncate max-w-[130px]"
                            title={record.deid_json.s3Url}
                          >
                            <span>{record.deid_json.name}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(record.deid_json?.s3Url || '')}
                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            title="Copy S3 Presigned URL"
                          >
                            {copiedUrl === record.deid_json.s3Url ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-amber-500 text-[10px] font-sans italic">Missing</span>
                      )}
                    </td>

                    {/* deid_txt Link */}
                    <td className="p-2 border-r border-slate-300 whitespace-nowrap text-[11px]">
                      {record.deid_txt ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={record.deid_txt.s3Url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-600 hover:text-sky-800 underline flex items-center gap-1 truncate max-w-[130px]"
                            title={record.deid_txt.s3Url}
                          >
                            <span>{record.deid_txt.name}</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(record.deid_txt?.s3Url || '')}
                            className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                            title="Copy S3 Presigned URL"
                          >
                            {copiedUrl === record.deid_txt.s3Url ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-amber-500 text-[10px] font-sans italic">Missing</span>
                      )}
                    </td>

                    {/* Human Verification input cells (empty initially) */}
                    {humanVerificationColumns.map((col, cIdx) => {
                      const val = humanReviewValues[record.noteId]?.[col] || '';
                      return (
                        <td
                          key={`hvc-${cIdx}`}
                          className="p-1 border-r border-slate-200 text-center"
                          style={{ backgroundColor: '#FFF5F0' }}
                        >
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => handleCellChange(record.noteId, col, e.target.value)}
                            placeholder="—"
                            className="w-full text-center text-[10px] bg-transparent focus:bg-white focus:ring-1 focus:ring-red-400 focus:outline-none rounded px-1 py-0.5 text-slate-700"
                          />
                        </td>
                      );
                    })}

                    {/* Detected Redaction Count cells */}
                    {detectedTags.map((tag) => {
                      const count = record.redactionCounts[tag] || 0;
                      return (
                        <td
                          key={`dc-val-${tag}`}
                          className="p-2 border-r border-slate-200 text-right font-medium"
                          style={{ backgroundColor: '#F4FBF7' }}
                        >
                          {count > 0 ? (
                            <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[10px]">
                              {count}
                            </span>
                          ) : (
                            <span className="text-slate-300">0</span>
                          )}
                        </td>
                      );
                    })}

                    {/* total_redacted */}
                    <td
                      className="p-2 border-r border-slate-200 text-right font-bold text-slate-900"
                      style={{ backgroundColor: '#EBF7F0' }}
                    >
                      {record.totalRedacted}
                    </td>

                    {/* unique_tags */}
                    <td
                      className="p-2 border-r border-slate-300 text-right font-bold text-slate-700"
                      style={{ backgroundColor: '#EBF7F0' }}
                    >
                      {record.uniqueTagsCount}
                    </td>

                    {/* Inspect Button */}
                    <td className="p-2 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onInspectNote(record)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded font-sans text-xs transition-colors cursor-pointer"
                        title="Inspect side-by-side raw vs de-identified text"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Summary & Legend */}
      <div className="p-3 bg-slate-50 text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-red-300" style={{ backgroundColor: '#FCE4D6' }} />
            <span>Light Red: Human Verification Columns</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-emerald-300" style={{ backgroundColor: '#E2F0D9' }} />
            <span>Light Green: Detected Redaction Counts</span>
          </div>
        </div>
        <div className="text-slate-400">
          Hyperlinks in raw_txt, deid_json, deid_txt point directly to configured S3 object keys.
        </div>
      </div>
    </div>
  );
};
