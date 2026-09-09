import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FolderOpen,
  FolderTree,
  FileArchive,
  Database,
  Play,
  Settings2,
  Sparkles,
  KeyRound,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { S3Config } from '../types';

interface ConfigPanelProps {
  s3Config: S3Config;
  onS3ConfigChange: (config: S3Config) => void;
  onProcessZip: (file: File) => Promise<void>;
  onProcessFolder: (files: FileList) => Promise<void>;
  onProcessLocalPath: (path: string) => Promise<void>;
  onLoadSample: () => Promise<void>;
  isProcessing: boolean;
  statusMessage: string;
  onTestS3Connection: () => Promise<void>;
  isTestingS3: boolean;
  s3TestResult: { success: boolean; message: string; errorCode?: string; errorDetail?: string } | null;
  onUploadToS3?: () => Promise<void>;
  isUploadingS3?: boolean;
  hasFilesToUpload?: boolean;
}

type InputTab = 'zip' | 'folder' | 'local_path' | 'sample';

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  s3Config,
  onS3ConfigChange,
  onProcessZip,
  onProcessFolder,
  onProcessLocalPath,
  onLoadSample,
  isProcessing,
  statusMessage,
  onTestS3Connection,
  isTestingS3,
  s3TestResult,
  onUploadToS3,
  isUploadingS3 = false,
  hasFilesToUpload = false,
}) => {
  const [activeTab, setActiveTab] = useState<InputTab>('zip');
  const [selectedZipFile, setSelectedZipFile] = useState<File | null>(null);
  const [selectedFolderFiles, setSelectedFolderFiles] = useState<FileList | null>(null);
  const [localPathInput, setLocalPathInput] = useState<string>('./all_soap_notes_673_deid');
  const [showAdvancedS3, setShowAdvancedS3] = useState<boolean>(
    Boolean(s3Config.accessKeyId || s3Config.secretAccessKey)
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const zipInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleZipDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.zip') || file.type.includes('zip')) {
        setSelectedZipFile(file);
      }
    }
  };

  const handleRunCurrentMode = async () => {
    if (activeTab === 'zip' && selectedZipFile) {
      await onProcessZip(selectedZipFile);
    } else if (activeTab === 'folder' && selectedFolderFiles) {
      await onProcessFolder(selectedFolderFiles);
    } else if (activeTab === 'local_path' && localPathInput.trim()) {
      await onProcessLocalPath(localPathInput.trim());
    } else if (activeTab === 'sample') {
      await onLoadSample();
    }
  };

  const isRunDisabled =
    isProcessing ||
    (activeTab === 'zip' && !selectedZipFile) ||
    (activeTab === 'folder' && !selectedFolderFiles) ||
    (activeTab === 'local_path' && !localPathInput.trim());

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Top banner: Input Mode selection */}
      <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              1. Source SOAP Clinical Notes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Provide clinical notes containing triplets: <code className="text-slate-700 bg-slate-200/60 px-1 py-0.5 rounded font-mono text-[11px]">_raw.txt</code>, <code className="text-slate-700 bg-slate-200/60 px-1 py-0.5 rounded font-mono text-[11px]">.deid.json</code>, <code className="text-slate-700 bg-slate-200/60 px-1 py-0.5 rounded font-mono text-[11px]">.txt</code>
            </p>
          </div>

          <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('zip')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'zip'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <FileArchive className="w-3.5 h-3.5 text-amber-500" />
              <span>.ZIP File</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('folder')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'folder'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-500" />
              <span>Folder Select</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('local_path')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'local_path'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5 text-violet-500" />
              <span>Local Path</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sample')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'sample'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>Demo Sample</span>
            </button>
          </div>
        </div>

        {/* Tab 1: ZIP Upload */}
        {activeTab === 'zip' && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleZipDrop}
            onClick={() => zipInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-50/50'
                : selectedZipFile
                ? 'border-emerald-400/80 bg-emerald-50/20'
                : 'border-slate-300 hover:border-slate-400 bg-white'
            }`}
          >
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setSelectedZipFile(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                {selectedZipFile ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                ) : (
                  <UploadCloud className="w-6 h-6 text-slate-400" />
                )}
              </div>
              {selectedZipFile ? (
                <div>
                  <p className="text-sm font-semibold text-slate-800 font-mono">
                    {selectedZipFile.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(selectedZipFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready to unpack and process
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Drag and drop your <span className="font-semibold text-slate-900">.zip</span> archive here, or <span className="text-emerald-600 font-semibold underline underline-offset-2">browse files</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports archives containing notes directories or root files (e.g. all_soap_notes_673_deid.zip)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Folder Upload */}
        {activeTab === 'folder' && (
          <div
            onClick={() => folderInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white rounded-xl p-6 text-center cursor-pointer transition-all"
          >
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore
              webkitdirectory=""
              directory=""
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setSelectedFolderFiles(e.target.files);
                }
              }}
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                {selectedFolderFiles ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                ) : (
                  <FolderOpen className="w-6 h-6 text-sky-500" />
                )}
              </div>
              {selectedFolderFiles ? (
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Selected {selectedFolderFiles.length} files
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Folder content ready for parsing and de-id grouping
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Select a local folder containing clinical notes
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Uses Chrome HTML5 Directory selector to read all files in your folder directly
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Local Directory Path */}
        {activeTab === 'local_path' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Server / Local Directory Root Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={localPathInput}
                onChange={(e) => setLocalPathInput(e.target.value)}
                placeholder="/path/to/all_soap_notes_673_deid or ./sample_data"
                className="flex-1 px-3 py-2 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => setLocalPathInput('./all_soap_notes_673_deid')}
                className="px-3 py-2 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg cursor-pointer"
              >
                Reset Default
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              The backend server inspects this path recursively for <code className="font-mono text-slate-600">_raw.txt</code>, <code className="font-mono text-slate-600">.deid.json</code>, and <code className="font-mono text-slate-600">.txt</code> files matching the Python script.
            </p>
          </div>
        )}

        {/* Tab 4: Demo Sample */}
        {activeTab === 'sample' && (
          <div className="bg-emerald-50/40 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-900">
                  Pre-configured Clinical SOAP Notes Dataset
                </h4>
                <p className="text-xs text-emerald-700/80 mt-0.5">
                  Includes 5 complete clinical cases (Cardiology, Emergency, Neurology, Pediatrics, Oncology) with verified de-id redaction tags and JSON metadata.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLoadSample}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
            >
              Load Demo Dataset
            </button>
          </div>
        )}
      </div>

      {/* Middle section: S3 Configuration */}
      <div className="p-4 sm:p-5 border-b border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-800">
              2. S3 Storage & Presigned Links Configuration
            </h3>
            {s3TestResult?.success && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" />
                Bucket Verified
              </span>
            )}
            {s3TestResult && !s3TestResult.success && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                Connection Error
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onTestS3Connection}
              disabled={isTestingS3}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTestingS3 ? 'animate-spin' : ''}`} />
              <span>{isTestingS3 ? 'Testing Access...' : 'Test S3 Bucket'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAdvancedS3(!showAdvancedS3)}
              className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{showAdvancedS3 ? 'Hide Credentials' : 'AWS Credentials'}</span>
            </button>
          </div>
        </div>

        {/* Live Test Connection Result Notification */}
        {s3TestResult && (
          <div
            className={`mb-3.5 p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
              s3TestResult.success
                ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                : 'bg-rose-50/90 border-rose-200 text-rose-900'
            }`}
          >
            {s3TestResult.success ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="font-semibold">{s3TestResult.message}</p>
              {s3TestResult.errorDetail && (
                <p className="text-[11px] font-mono text-rose-700 mt-1 break-all bg-rose-100/60 p-1.5 rounded">
                  {s3TestResult.errorDetail}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              S3 Bucket Name
            </label>
            <input
              type="text"
              value={s3Config.bucket}
              onChange={(e) =>
                onS3ConfigChange({ ...s3Config, bucket: e.target.value })
              }
              placeholder="int-shaip-bucket"
              className="w-full px-3 py-2 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              S3 Key Prefix
            </label>
            <input
              type="text"
              value={s3Config.prefix}
              onChange={(e) =>
                onS3ConfigChange({ ...s3Config, prefix: e.target.value })
              }
              placeholder="interns-test-data/SEP8/"
              className="w-full px-3 py-2 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Presign Expiration (Days)
            </label>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={7}
                value={s3Config.presignExpiresDays}
                onChange={(e) =>
                  onS3ConfigChange({
                    ...s3Config,
                    presignExpiresDays: Math.max(1, parseInt(e.target.value) || 7),
                  })
                }
                className="w-full px-3 py-2 text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 pl-8"
              />
              <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        {/* Checkbox: Auto-Upload to S3 */}
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={s3Config.uploadToS3}
              onChange={(e) =>
                onS3ConfigChange({ ...s3Config, uploadToS3: e.target.checked })
              }
              className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
            />
            <span className="text-xs font-medium text-slate-700">
              Auto-upload notes & review workbook to AWS S3 bucket during pipeline execution
            </span>
          </label>

          {hasFilesToUpload && onUploadToS3 && (
            <button
              type="button"
              onClick={onUploadToS3}
              disabled={isUploadingS3 || isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isUploadingS3 ? 'animate-bounce' : ''}`} />
              <span>{isUploadingS3 ? 'Uploading to S3...' : 'Upload Current Files to S3'}</span>
            </button>
          )}
        </div>

        {/* Advanced S3 settings if toggled */}
        {showAdvancedS3 && (
          <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 mb-1">AWS Region</label>
              <input
                type="text"
                value={s3Config.awsRegion || 'us-east-1'}
                onChange={(e) =>
                  onS3ConfigChange({ ...s3Config, awsRegion: e.target.value })
                }
                placeholder="us-east-1"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">AWS Access Key ID</label>
              <input
                type="text"
                value={s3Config.accessKeyId || ''}
                onChange={(e) =>
                  onS3ConfigChange({ ...s3Config, accessKeyId: e.target.value })
                }
                placeholder="AKIA..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">AWS Secret Access Key</label>
              <input
                type="password"
                value={s3Config.secretAccessKey || ''}
                onChange={(e) =>
                  onS3ConfigChange({ ...s3Config, secretAccessKey: e.target.value })
                }
                placeholder="••••••••••••"
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-600 mb-1">
                AWS Session Token <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="password"
                value={s3Config.sessionToken || ''}
                onChange={(e) =>
                  onS3ConfigChange({ ...s3Config, sessionToken: e.target.value })
                }
                placeholder="STS session token..."
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div className="col-span-full flex items-center gap-2 pt-1 text-slate-500 text-[11px]">
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Provide credentials for direct S3 upload via AWS SDK. If omitted, the server can also use environment variables (<code className="font-mono text-slate-700">AWS_ACCESS_KEY_ID</code>) or default IAM container credentials.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Footer */}
      <div className="p-4 sm:p-5 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-slate-500 flex items-center gap-2">
          {isProcessing ? (
            <div className="flex items-center gap-2 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{statusMessage || 'Processing pipeline...'}</span>
            </div>
          ) : (
            <span className="text-slate-500">
              Matches OpenPyXL & Boto3 logic: 2-tier Excel headers, tag extraction, presigned URLs.
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleRunCurrentMode}
          disabled={isRunDisabled}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer ${
            isRunDisabled
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-700/20 active:scale-98'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isProcessing ? 'Processing...' : 'Run Pipeline & Review'}</span>
        </button>
      </div>
    </div>
  );
};
