import React from 'react';
import { Tag, BarChart3, PieChart, Shield } from 'lucide-react';
import { NoteRecord } from '../types';

interface TagAnalyticsProps {
  records: NoteRecord[];
  detectedTags: string[];
}

export const TagAnalytics: React.FC<TagAnalyticsProps> = ({
  records,
  detectedTags,
}) => {
  // Compute counts per tag
  const tagTotals: Record<string, number> = {};
  for (const tag of detectedTags) {
    tagTotals[tag] = 0;
  }

  for (const record of records) {
    for (const [tag, count] of Object.entries(record.redactionCounts)) {
      tagTotals[tag] = (tagTotals[tag] || 0) + (Number(count) || 0);
    }
  }

  const sortedTags = Object.entries(tagTotals).sort((a, b) => b[1] - a[1]);
  const grandTotal = Object.values(tagTotals).reduce((sum, v) => sum + v, 0);

  if (detectedTags.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800">
            Detected Redaction Tag Distribution
          </h3>
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {grandTotal} total PHI redactions detected
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {sortedTags.map(([tag, count]) => {
          const percent = grandTotal > 0 ? ((count / grandTotal) * 100).toFixed(1) : '0';
          return (
            <div
              key={tag}
              className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-semibold text-slate-700 truncate" title={`[${tag}]`}>
                  [{tag}]
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded font-mono">
                  {count}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(5, Number(percent)))}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 self-end font-mono">
                {percent}% of total
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
