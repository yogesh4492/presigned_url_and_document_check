import React from 'react';
import { FileText, CheckCircle2, AlertTriangle, Tag, Hash, Link2 } from 'lucide-react';
import { NoteRecord } from '../types';

interface StatsOverviewProps {
  records: NoteRecord[];
  detectedTags: string[];
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ records, detectedTags }) => {
  const totalNotes = records.length;
  const completeGroups = records.filter((r) => r.isComplete).length;
  const incompleteGroups = totalNotes - completeGroups;
  const totalRedactions = records.reduce((acc, r) => acc + r.totalRedacted, 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* Card 1: Total Notes */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Notes Processed</span>
          <FileText className="w-4 h-4 text-slate-400" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-slate-800 font-sans">{totalNotes}</span>
          <span className="text-[11px] text-slate-400">groups</span>
        </div>
      </div>

      {/* Card 2: Complete Groups */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-emerald-600 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Complete Groups</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-emerald-700 font-sans">{completeGroups}</span>
          <span className="text-[11px] text-emerald-600/80 font-medium">3/3 files</span>
        </div>
      </div>

      {/* Card 3: Incomplete Groups */}
      <div className={`p-3.5 rounded-xl border shadow-xs flex flex-col justify-between ${
        incompleteGroups > 0
          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
          : 'bg-white border-slate-200/80 text-slate-800'
      }`}>
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Missing Files</span>
          <AlertTriangle className={`w-4 h-4 ${incompleteGroups > 0 ? 'text-amber-500' : 'text-slate-300'}`} />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold font-sans ${incompleteGroups > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            {incompleteGroups}
          </span>
          <span className="text-[11px] text-slate-400">anomalies</span>
        </div>
      </div>

      {/* Card 4: Total Redactions */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-sky-600 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Redactions Found</span>
          <Hash className="w-4 h-4 text-sky-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-sky-700 font-sans">{totalRedactions}</span>
          <span className="text-[11px] text-slate-400">regex matches</span>
        </div>
      </div>

      {/* Card 5: Unique Tags */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-indigo-600 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Tag Categories</span>
          <Tag className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-indigo-700 font-sans">{detectedTags.length}</span>
          <span className="text-[11px] text-slate-400">classes</span>
        </div>
      </div>

      {/* Card 6: Presigned Links */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-violet-600 mb-1">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-400">S3 URLs Ready</span>
          <Link2 className="w-4 h-4 text-violet-500" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-violet-700 font-sans">
            {totalNotes * 3}
          </span>
          <span className="text-[11px] text-slate-400">presigned</span>
        </div>
      </div>
    </div>
  );
};
