import React, { useState } from 'react';
import {
  X,
  FileText,
  FileCode,
  Link2,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Tag,
  Hash,
  Layers,
} from 'lucide-react';
import { NoteRecord } from '../types';

interface NoteInspectorModalProps {
  record: NoteRecord | null;
  onClose: () => void;
}

export const NoteInspectorModal: React.FC<NoteInspectorModalProps> = ({
  record,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'tags' | 'json' | 's3'>('comparison');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  if (!record) return null;

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper to colorize [redacted-...] tags in the de-identified text
  const getTagColorClass = (tag: string) => {
    const lower = tag.toLowerCase();
    if (lower.includes('date')) {
      return {
        bg: 'bg-amber-100 text-amber-900 border-amber-300',
        badge: 'bg-amber-500 text-white',
        border: 'border-amber-200',
      };
    } else if (lower.includes('hospital') || lower.includes('org') || lower.includes('clinic')) {
      return {
        bg: 'bg-sky-100 text-sky-900 border-sky-300',
        badge: 'bg-sky-500 text-white',
        border: 'border-sky-200',
      };
    } else if (lower.includes('location') || lower.includes('address') || lower.includes('city') || lower.includes('state')) {
      return {
        bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        badge: 'bg-emerald-500 text-white',
        border: 'border-emerald-200',
      };
    } else if (lower.includes('room') || lower.includes('id') || lower.includes('phone') || lower.includes('mrn')) {
      return {
        bg: 'bg-violet-100 text-violet-900 border-violet-300',
        badge: 'bg-violet-500 text-white',
        border: 'border-violet-200',
      };
    }
    return {
      bg: 'bg-rose-100 text-rose-900 border-rose-300',
      badge: 'bg-rose-500 text-white',
      border: 'border-rose-200',
    };
  };

  const renderHighlightedDeidText = (text: string) => {
    const parts = text.split(/(\[redacted-[^\]]+\])/g);
    return parts.map((part, idx) => {
      if (part.startsWith('[redacted-') && part.endsWith(']')) {
        const tagName = part.slice(1, -1);
        const { bg } = getTagColorClass(tagName);
        const isDimmed = tagFilter && part !== tagFilter;

        return (
          <span
            key={idx}
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold border ${bg} mx-0.5 transition-opacity ${
              isDimmed ? 'opacity-30' : 'opacity-100 shadow-xs'
            }`}
          >
            {part}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const redactionEntries = (Object.entries(record.redactionCounts || {}) as [string, number][]).sort(
    (a, b) => Number(b[1]) - Number(a[1])
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-800 font-mono">
                  {record.noteId}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                    record.isComplete
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {record.isComplete ? 'Complete Group (3/3)' : 'Incomplete Group'}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900 text-white shadow-xs">
                  <Hash className="w-3 h-3 text-rose-400" />
                  <span>{record.totalRedacted} Redactions</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                  <Tag className="w-3 h-3 text-sky-600" />
                  <span>{record.uniqueTagsCount} Unique Tags</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                SOAP Note ID: <span className="font-mono font-medium text-slate-700">{record.noteId}</span> &bull; Inspect raw clinical text, detected redactions, JSON entities, and S3 links
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Tab switchers */}
            <div className="flex bg-slate-200/80 p-1 rounded-lg text-xs font-medium text-slate-600 flex-wrap">
              <button
                type="button"
                onClick={() => setActiveTab('comparison')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'comparison'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                Side-by-Side Review
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tags')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'tags'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                <Tag className="w-3 h-3 text-rose-500" />
                <span>Redacted Tags</span>
                {record.totalRedacted > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] bg-rose-100 text-rose-800 rounded-full font-bold">
                    {record.totalRedacted}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 'json'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                JSON Entities
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('s3')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activeTab === 's3'
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                S3 Objects
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick tag count bar if redactions exist */}
        {redactionEntries.length > 0 && (
          <div className="px-4 sm:px-6 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px] shrink-0">
              Redacted Tags ({record.totalRedacted}):
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {redactionEntries.map(([tag, count]) => {
                const { bg } = getTagColorClass(tag);
                const isSelected = tagFilter === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setTagFilter(isSelected ? null : tag);
                      if (activeTab !== 'comparison' && activeTab !== 'tags') {
                        setActiveTab('tags');
                      }
                    }}
                    title={`Click to filter highlights for ${tag}`}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono border transition-all cursor-pointer shrink-0 ${bg} ${
                      isSelected ? 'ring-2 ring-slate-800 font-bold scale-105 shadow-xs' : 'hover:opacity-90'
                    }`}
                  >
                    <span>{tag}</span>
                    <span className="px-1 py-0.2 bg-black/10 rounded font-bold text-[10px]">
                      {count}
                    </span>
                  </button>
                );
              })}
              {tagFilter && (
                <button
                  type="button"
                  onClick={() => setTagFilter(null)}
                  className="text-[10px] text-slate-500 hover:text-slate-800 underline ml-1 cursor-pointer shrink-0"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* Tab 1: Side-by-Side Review */}
          {activeTab === 'comparison' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
              {/* Left: Raw Clinical Note */}
              <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Raw Clinical Text ({record.raw_txt?.name || 'missing'})</span>
                  </div>
                  {record.raw_txt && (
                    <button
                      type="button"
                      onClick={() => copyText(record.raw_txt?.content || '', 'raw')}
                      className="text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer text-[11px]"
                    >
                      {copiedKey === 'raw' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  )}
                </div>
                <div className="p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[460px] text-slate-800 bg-white">
                  {record.raw_txt ? (
                    record.raw_txt.content
                  ) : (
                    <span className="text-amber-600 italic">No raw_txt file found for this note ID.</span>
                  )}
                </div>
              </div>

              {/* Right: De-identified Text */}
              <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                <div className="p-2.5 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between text-xs font-semibold text-emerald-900">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>De-Identified Text ({record.deid_txt?.name || 'missing'})</span>
                  </div>
                  {record.deid_txt && (
                    <button
                      type="button"
                      onClick={() => copyText(record.deid_txt?.content || '', 'deid')}
                      className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer text-[11px]"
                    >
                      {copiedKey === 'deid' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  )}
                </div>
                <div className="p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[460px] text-slate-800 bg-white">
                  {record.deid_txt ? (
                    renderHighlightedDeidText(record.deid_txt.content)
                  ) : (
                    <span className="text-amber-600 italic">No deid_txt file found for this note ID.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Dedicated Redacted Tag Counts Explorer */}
          {activeTab === 'tags' && (
            <div className="space-y-5">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-rose-700 block">Total Redacted Tags</span>
                    <span className="text-2xl font-bold font-mono text-rose-950 mt-0.5 block">
                      {record.totalRedacted}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700">
                    <Hash className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-sky-50/80 border border-sky-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-sky-700 block">Unique Tag Types</span>
                    <span className="text-2xl font-bold font-mono text-sky-950 mt-0.5 block">
                      {record.uniqueTagsCount}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700">
                    <Tag className="w-5 h-5" />
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-emerald-700 block">Source De-ID Note</span>
                    <span className="text-xs font-bold font-mono text-emerald-950 mt-1 block truncate max-w-[180px]">
                      {record.deid_txt?.name || 'missing'}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Tag Counts Detailed Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Tag className="w-4 h-4 text-rose-600" />
                    <span>Redacted Tag Counts Breakdown ({record.noteId})</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {redactionEntries.length} tag categories detected
                  </span>
                </div>

                {redactionEntries.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {redactionEntries.map(([tag, count]) => {
                      const { bg, badge } = getTagColorClass(tag);
                      const pct = record.totalRedacted > 0
                        ? Math.round((Number(count) / record.totalRedacted) * 100)
                        : 0;

                      return (
                        <div
                          key={tag}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${bg}`}
                            >
                              {tag}
                            </span>
                            <div className="flex-1 max-w-md hidden sm:block">
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    tag.includes('date')
                                      ? 'bg-amber-500'
                                      : tag.includes('hospital') || tag.includes('org')
                                      ? 'bg-sky-500'
                                      : tag.includes('location')
                                      ? 'bg-emerald-500'
                                      : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-slate-500 font-medium">{pct}% of note</span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                              <span>Count:</span>
                              <span className="text-rose-600 text-sm">{count}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setTagFilter(tag);
                                setActiveTab('comparison');
                              }}
                              className="text-sky-600 hover:text-sky-800 text-xs font-medium cursor-pointer underline"
                            >
                              Highlight in text &rarr;
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No [redacted-...] tags detected in this note.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: JSON Entities Explorer + Redacted Tag Counts */}
          {activeTab === 'json' && (
            <div className="space-y-5">
              {/* Prominent Redacted Tag Counts Section right at top of JSON Entities */}
              <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Redacted Tag Counts in Note
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                      {record.totalRedacted} Total
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                      {record.uniqueTagsCount} Unique Tags
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tags')}
                    className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                  >
                    View Full Tag Analytics &rarr;
                  </button>
                </div>

                {redactionEntries.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {redactionEntries.map(([tag, count]) => {
                      const { bg } = getTagColorClass(tag);
                      return (
                        <div
                          key={tag}
                          className="p-2 bg-white rounded-lg border border-rose-200/80 flex items-center justify-between shadow-2xs"
                        >
                          <span className={`text-[11px] font-mono font-semibold truncate ${bg} px-1.5 py-0.5 rounded`}>
                            {tag}
                          </span>
                          <span className="font-mono font-bold text-xs text-rose-700 ml-2">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No bracketed redaction tags detected in the de-identified text for this note.
                  </p>
                )}
              </div>

              {/* Category Mappings summary from JSON Entities */}
              {record.entityBuckets && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-sky-600" />
                    <span>Extracted Detail Column Entities from JSON</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(record.entityBuckets).map(([key, bucketVal]) => {
                      const bucket = bucketVal as { count: number; texts: string[] };
                      return (
                        <div
                          key={key}
                          className={`p-2.5 rounded-lg border text-xs ${
                            bucket.count > 0
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-white border-dashed border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono font-semibold text-slate-700 mb-1">
                            <span>[{key}]</span>
                            <span className="px-1.5 py-0.2 text-[10px] bg-slate-200 rounded">
                              {bucket.count}
                            </span>
                          </div>
                          {bucket.texts.length > 0 ? (
                            <div className="text-[11px] text-slate-600 truncate">
                              {bucket.texts.join(', ')}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">none detected</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Raw JSON viewer */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Raw JSON Structure ({record.deid_json?.name || 'missing'})
                  </h4>
                  {record.deid_json && (
                    <button
                      type="button"
                      onClick={() => copyText(record.deid_json?.content || '', 'json_raw')}
                      className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'json_raw' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>Copy JSON</span>
                    </button>
                  )}
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-[360px] leading-relaxed">
                  {record.deid_json?.content || '// No JSON content available'}
                </pre>
              </div>
            </div>
          )}

          {/* Tab 4: S3 Objects & Links */}
          {activeTab === 's3' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Target S3 bucket and generated presigned URLs embedded inside the Review Workbook:
              </p>

              {[
                { label: 'Raw Note File (raw_txt)', file: record.raw_txt },
                { label: 'De-ID Metadata (deid_json)', file: record.deid_json },
                { label: 'De-Identified Note (deid_txt)', file: record.deid_txt },
              ].map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                  <div className="flex items-center justify-between mb-1 font-semibold text-slate-800">
                    <span>{item.label}</span>
                    <span className="font-mono text-slate-500">{item.file?.name || 'Not Available'}</span>
                  </div>

                  {item.file ? (
                    <div className="space-y-2 mt-2 font-mono">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-sans">S3 Key:</span>
                        <div className="flex items-center justify-between bg-white px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 text-[11px]">
                          <span className="truncate">{item.file.s3Key}</span>
                          <button
                            type="button"
                            onClick={() => copyText(item.file?.s3Key || '', `key-${idx}`)}
                            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer shrink-0"
                          >
                            {copiedKey === `key-${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block font-sans">Presigned URL (7 days):</span>
                        <div className="flex items-center justify-between bg-white px-2.5 py-1.5 border border-slate-200 rounded text-slate-700 text-[11px]">
                          <span className="truncate max-w-[500px] text-sky-700">{item.file.s3Url}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => copyText(item.file?.s3Url || '', `url-${idx}`)}
                              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                              title="Copy URL"
                            >
                              {copiedKey === `url-${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <a
                              href={item.file.s3Url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                              title="Open URL in new tab"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-amber-600 italic mt-1">This file was not found in the input group.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            Clicking filenames in the exported Excel spreadsheet opens these presigned S3 URLs directly.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
