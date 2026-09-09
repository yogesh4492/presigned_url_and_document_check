import React from 'react';
import {
  FileSpreadsheet,
  Database,
  ShieldCheck,
  HelpCircle,
  UploadCloud,
  FileText,
  BookOpen,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'clinical' | 'generic-s3' | 'docs';
  onTabChange: (tab: 'clinical' | 'generic-s3' | 'docs') => void;
  onDownloadExcel: () => void;
  onOpenHelp: () => void;
  onLoadSample: () => void;
  isProcessing: boolean;
  notesCount: number;
  s3Bucket: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onDownloadExcel,
  onOpenHelp,
  onLoadSample,
  isProcessing,
  notesCount,
  s3Bucket,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand & Identity */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base tracking-tight text-white font-sans">
                  Clinical De-ID & S3 Pipeline
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  v2.5
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                SOAP Notes Review &bull; S3 Sync &bull; Presigned URL Reports
              </p>
            </div>
          </div>

          {/* Central Mode Switcher */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/80">
            <button
              type="button"
              onClick={() => onTabChange('clinical')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'clinical'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Clinical De-ID Review</span>
              {notesCount > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    activeTab === 'clinical' ? 'bg-emerald-700' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {notesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onTabChange('generic-s3')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'generic-s3'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Any-File S3 Uploader</span>
            </button>

            <button
              type="button"
              onClick={() => onTabChange('docs')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'docs'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Docs & Local Setup</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                Guide
              </span>
            </button>
          </div>

          {/* S3 Target Indicator & Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 font-mono">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span className="truncate max-w-[150px]">s3://{s3Bucket || 'int-shaip-bucket'}</span>
            </div>

            {activeTab === 'clinical' && (
              <>
                <button
                  type="button"
                  onClick={onLoadSample}
                  disabled={isProcessing}
                  className="hidden md:inline-flex px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Load realistic clinical SOAP notes sample dataset"
                >
                  Sample Notes
                </button>

                <button
                  type="button"
                  onClick={onDownloadExcel}
                  disabled={isProcessing || notesCount === 0}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer ${
                    notesCount > 0 && !isProcessing
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                  title="Download Human-in-the-Loop review workbook"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Export Review .xlsx</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onOpenHelp}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Documentation & matching pipeline details"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

