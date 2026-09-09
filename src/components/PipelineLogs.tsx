import React, { useState } from 'react';
import { Terminal, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { PipelineLog } from '../types';

interface PipelineLogsProps {
  logs: PipelineLog[];
  s3Bucket: string;
  s3Prefix: string;
}

export const PipelineLogs: React.FC<PipelineLogsProps> = ({
  logs,
  s3Bucket,
  s3Prefix,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const copyAllLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-md overflow-hidden text-slate-300">
      {/* Console Header */}
      <div className="p-3 sm:px-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-mono font-semibold text-slate-200">
            Pipeline Execution & S3 Synchronization Console
          </span>
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            (target: s3://{s3Bucket}/{s3Prefix})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyAllLogs}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Copy all logs"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline">Copy Logs</span>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Console Body */}
      {isExpanded && (
        <div className="p-4 font-mono text-xs max-h-52 overflow-y-auto space-y-1.5 leading-relaxed bg-slate-900/90">
          {logs.length === 0 ? (
            <div className="text-slate-500 italic">
              System ready. Upload a .zip, select a folder, or load demo samples to start pipeline execution.
            </div>
          ) : (
            logs.map((log, index) => {
              let levelColor = 'text-slate-400';
              if (log.level === 'success') levelColor = 'text-emerald-400';
              if (log.level === 'warn') levelColor = 'text-amber-400';
              if (log.level === 'error') levelColor = 'text-rose-400';

              return (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-slate-600 shrink-0 select-none">[{log.timestamp}]</span>
                  <span className={`shrink-0 font-bold uppercase text-[10px] ${levelColor}`}>
                    [{log.level}]
                  </span>
                  <span className={log.level === 'success' ? 'text-emerald-200' : 'text-slate-300'}>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
