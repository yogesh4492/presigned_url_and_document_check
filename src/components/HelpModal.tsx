import React from 'react';
import { X, Code, CheckCircle, FileSpreadsheet, Database, Layers } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Pipeline Architecture & Python Script Compatibility
              </h3>
              <p className="text-xs text-slate-500">
                Faithful implementation of the clinical SOAP de-identification review script
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
          {/* Section 1 */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              <span>1. Note File Triplet Matching</span>
            </h4>
            <p className="mb-2">
              Every clinical note record is composed of three mandatory files sharing the same Note ID:
            </p>
            <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-slate-700">
              <li>
                <strong className="text-slate-900">raw_txt:</strong> e.g.{' '}
                <code>NOTE_673_01_raw.txt</code> (unmodified clinical SOAP note)
              </li>
              <li>
                <strong className="text-slate-900">deid_json:</strong> e.g.{' '}
                <code>NOTE_673_01.deid.json</code> (de-identification metadata and entity spans)
              </li>
              <li>
                <strong className="text-slate-900">deid_txt:</strong> e.g.{' '}
                <code>NOTE_673_01.txt</code> (redacted text with <code>[redacted-...]</code> tags)
              </li>
            </ul>
          </div>

          {/* Section 2 */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-2">
              <FileSpreadsheet className="w-4 h-4 text-sky-600" />
              <span>2. Excel Styling & Multi-Tier Review Layout</span>
            </h4>
            <p className="mb-2">
              The generated <code className="font-mono text-slate-800 bg-slate-200 px-1 py-0.5 rounded">workbook.xlsx</code> strictly adheres to OpenPyXL styling specifications:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-700">
              <li>
                <strong className="text-slate-900">Tier 1 & Tier 2 Headers:</strong> Row 1 groups columns into <span className="px-1.5 py-0.5 rounded bg-[#FCE4D6] text-amber-950 font-semibold font-mono text-[10px]">Human verification</span> and <span className="px-1.5 py-0.5 rounded bg-[#E2F0D9] text-emerald-950 font-semibold font-mono text-[10px]">Detected redaction count</span>.
              </li>
              <li>
                <strong className="text-slate-900">Color Palette:</strong> Light Red fill (<code>#FCE4D6</code>) for human reviewer fields; Light Green fill (<code>#E2F0D9</code>) for algorithmic redaction counts.
              </li>
              <li>
                <strong className="text-slate-900">Live Hyperlinks:</strong> Cells for <code>raw_txt</code>, <code>deid_json</code>, and <code>deid_txt</code> contain clickable single-click hyperlinks styled with Calibri blue underlined fonts.
              </li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-violet-600" />
              <span>3. AWS S3 Storage & Upload Configuration</span>
            </h4>
            <p className="mb-2">
              Files are mapped and uploaded to target S3 keys using pattern:{' '}
              <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">
                s3://&lt;bucket&gt;/&lt;prefix&gt;/&lt;filename&gt;
              </code>
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
              <li>
                <strong className="text-slate-900">Direct S3 Upload:</strong> Toggle &ldquo;Auto-upload notes & review workbook to AWS S3&rdquo; or click &ldquo;Upload to S3&rdquo;. The backend uses AWS SDK v3 to stream each note file and the generated Excel workbook into your bucket.
              </li>
              <li>
                <strong className="text-slate-900">AWS Credentials:</strong> Enter your AWS Region, Access Key ID, Secret Access Key, and optional Session Token. Alternatively, set <code className="font-mono">AWS_ACCESS_KEY_ID</code> and <code className="font-mono">AWS_SECRET_ACCESS_KEY</code> environment variables.
              </li>
              <li>
                <strong className="text-slate-900">IAM Permissions Required:</strong> Ensure your AWS IAM user or role has:
                <div className="mt-1 font-mono text-[11px] bg-slate-900 text-emerald-400 p-2 rounded-lg">
                  s3:PutObject, s3:GetObject, s3:ListBucket, s3:GetBucketLocation
                </div>
              </li>
              <li>
                <strong className="text-slate-900">Bucket Connection Test:</strong> Use the &ldquo;Test S3 Bucket&rdquo; button in the configuration panel to verify IAM credentials, bucket access, and region configuration before running large uploads.
              </li>
              <li>
                <strong className="text-slate-900">Presigned Links:</strong> Generates authentic AWS presigned URLs with custom expiration (up to 7 days / 604,800s) embedded directly into the Excel spreadsheet cells.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
