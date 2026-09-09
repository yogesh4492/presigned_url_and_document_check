/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { Navbar } from './components/Navbar';
import { StatsOverview } from './components/StatsOverview';
import { ConfigPanel } from './components/ConfigPanel';
import { ReviewTable } from './components/ReviewTable';
import { NoteInspectorModal } from './components/NoteInspectorModal';
import { TagAnalytics } from './components/TagAnalytics';
import { PipelineLogs } from './components/PipelineLogs';
import { HelpModal } from './components/HelpModal';
import { GenericS3Uploader } from './components/GenericS3Uploader';
import { SAMPLE_SOAP_NOTES } from './services/sampleData';
import { processRawFileList } from './services/processor';
import { generateReviewWorkbook } from './services/excelGenerator';
import { NoteRecord, S3Config, PipelineLog, S3UploadStats } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'clinical' | 'generic-s3'>('clinical');
  const [s3Config, setS3Config] = useState<S3Config>({
    bucket: 'int-shaip-bucket',
    prefix: 'interns-test-data/SEP8/',
    presignExpiresDays: 7,
    awsRegion: 'us-east-1',
    accessKeyId: '',
    secretAccessKey: '',
    sessionToken: '',
    uploadToS3: false,
  });

  const [records, setRecords] = useState<NoteRecord[]>([]);
  const [detectedTags, setDetectedTags] = useState<string[]>([]);
  const [currentFiles, setCurrentFiles] = useState<{ name: string; content: string; size?: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [inspectedRecord, setInspectedRecord] = useState<NoteRecord | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [logs, setLogs] = useState<PipelineLog[]>([]);

  // S3 operational states
  const [isTestingS3, setIsTestingS3] = useState<boolean>(false);
  const [s3TestResult, setS3TestResult] = useState<{
    success: boolean;
    message: string;
    errorCode?: string;
    errorDetail?: string;
  } | null>(null);
  const [isUploadingS3, setIsUploadingS3] = useState<boolean>(false);
  const [s3WorkbookUrl, setS3WorkbookUrl] = useState<string | null>(null);
  const [, setS3UploadStats] = useState<S3UploadStats | null>(null);

  const addLog = useCallback((level: 'info' | 'success' | 'warn' | 'error', message: string) => {
    const now = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp: now, level, message }]);
  }, []);

  // Helper to test AWS S3 connection and bucket access
  const handleTestS3Connection = async () => {
    setIsTestingS3(true);
    setS3TestResult(null);
    addLog('info', `Testing S3 bucket connection for s3://${s3Config.bucket} (region: ${s3Config.awsRegion || 'us-east-1'})...`);

    try {
      const res = await fetch('/api/s3/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bucket: s3Config.bucket,
          prefix: s3Config.prefix,
          awsRegion: s3Config.awsRegion,
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
          sessionToken: s3Config.sessionToken,
        }),
      });

      const data = await res.json();
      setS3TestResult(data);

      if (data.success) {
        addLog('success', `[S3 Connected] ${data.message}`);
      } else {
        addLog('error', `[S3 Connection Error] ${data.message} ${data.errorDetail ? '(' + data.errorDetail + ')' : ''}`);
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to connect to backend server';
      setS3TestResult({
        success: false,
        message: msg,
      });
      addLog('error', `[S3 Connection Failed] ${msg}`);
    } finally {
      setIsTestingS3(false);
    }
  };

  // Direct upload of loaded files to S3 on-demand
  const handleUploadToS3 = async () => {
    if (currentFiles.length === 0) {
      addLog('warn', 'No note files currently loaded to upload to S3.');
      return;
    }

    setIsUploadingS3(true);
    addLog('info', `Initiating S3 upload for ${currentFiles.length} files -> s3://${s3Config.bucket}/${s3Config.prefix}...`);

    try {
      const res = await fetch('/api/s3/upload-and-presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: currentFiles,
          s3Bucket: s3Config.bucket,
          s3Prefix: s3Config.prefix,
          presignExpiresDays: s3Config.presignExpiresDays,
          awsRegion: s3Config.awsRegion,
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
          sessionToken: s3Config.sessionToken,
          uploadWorkbook: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || 'S3 upload failed');
      }

      setRecords(data.records);
      setDetectedTags(data.allDetectedTags);
      setS3UploadStats(data.uploadStats);
      if (data.uploadStats?.workbookUpload?.s3Url) {
        setS3WorkbookUrl(data.uploadStats.workbookUpload.s3Url);
      }

      addLog(
        'success',
        `[S3 Upload Complete] Uploaded ${data.uploadStats.uploadedCount} of ${data.uploadStats.totalFiles} files to s3://${s3Config.bucket}/${s3Config.prefix}`,
      );

      if (data.uploadStats?.workbookUpload?.s3Url) {
        addLog(
          'success',
          `[S3 Workbook Uploaded] Presigned link created for: ${data.uploadStats.workbookUpload.s3Key}`,
        );
      }
    } catch (err: any) {
      console.error('Direct S3 upload failed:', err);
      addLog('error', `[S3 Upload Error] ${err.message || String(err)}`);
      alert(`S3 Upload Failed: ${err.message || String(err)}\n\nPlease check your AWS credentials, region, and IAM permissions (s3:PutObject) for bucket "${s3Config.bucket}".`);
    } finally {
      setIsUploadingS3(false);
    }
  };

  // Helper to process a raw array of file contents
  const executeFileProcessing = useCallback(
    async (
      files: { name: string; content: string; size?: number }[],
      sourceLabel: string,
    ) => {
      setIsProcessing(true);
      setStatusMessage(`Processing ${files.length} files...`);
      setCurrentFiles(files);
      addLog('info', `Initiating pipeline for ${files.length} files from ${sourceLabel}`);

      // If user enabled auto-upload to S3, call the backend upload-and-presign endpoint
      if (s3Config.uploadToS3) {
        try {
          addLog('info', `[S3 Auto-Upload] Uploading files directly to s3://${s3Config.bucket}/${s3Config.prefix}...`);
          const res = await fetch('/api/s3/upload-and-presign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              files,
              s3Bucket: s3Config.bucket,
              s3Prefix: s3Config.prefix,
              presignExpiresDays: s3Config.presignExpiresDays,
              awsRegion: s3Config.awsRegion,
              accessKeyId: s3Config.accessKeyId,
              secretAccessKey: s3Config.secretAccessKey,
              sessionToken: s3Config.sessionToken,
              uploadWorkbook: true,
            }),
          });

          const data = await res.json();
          if (res.ok && data.success) {
            setRecords(data.records);
            setDetectedTags(data.allDetectedTags);
            setS3UploadStats(data.uploadStats);
            if (data.uploadStats?.workbookUpload?.s3Url) {
              setS3WorkbookUrl(data.uploadStats.workbookUpload.s3Url);
            }

            const completeCount = data.records.filter((r: NoteRecord) => r.isComplete).length;
            const totalRedactions = data.records.reduce((sum: number, r: NoteRecord) => sum + r.totalRedacted, 0);

            addLog(
              'success',
              `[S3 Auto-Upload Success] Uploaded ${data.uploadStats.uploadedCount} files to s3://${s3Config.bucket}/${s3Config.prefix}`,
            );
            addLog(
              'info',
              `Grouped ${data.records.length} clinical notes (${completeCount} complete, ${data.records.length - completeCount} incomplete, ${totalRedactions} redactions)`,
            );
            setStatusMessage('Pipeline and S3 upload completed successfully.');
            setIsProcessing(false);
            return;
          } else {
            addLog('warn', `[S3 Auto-Upload Notice] ${data.error || data.message || 'AWS S3 upload could not complete'}. Falling back to standard local processing with presigned URLs.`);
          }
        } catch (s3Err: any) {
          console.error('S3 auto-upload error:', s3Err);
          addLog('warn', `[S3 Auto-Upload Error] ${s3Err.message || String(s3Err)}. Proceeding with standard spreadsheet generation.`);
        }
      }

      try {
        const { records: processedRecords, allDetectedTags } = processRawFileList(
          files,
          s3Config.bucket,
          s3Config.prefix,
          s3Config.presignExpiresDays,
        );

        setRecords(processedRecords);
        setDetectedTags(allDetectedTags);

        const completeCount = processedRecords.filter((r) => r.isComplete).length;
        const totalRedactions = processedRecords.reduce((sum, r) => sum + r.totalRedacted, 0);

        addLog(
          'info',
          `Collected note files: ${processedRecords.length} note groups identified (${completeCount} complete, ${processedRecords.length - completeCount} incomplete)`,
        );

        addLog(
          'info',
          `Generated S3 presigned URLs for ${processedRecords.length * 3} files with target s3://${s3Config.bucket}/${s3Config.prefix.replace(/\/+$/, '')} (expires in ${s3Config.presignExpiresDays} days)`,
        );

        addLog(
          'info',
          `Detected ${allDetectedTags.length} distinct redaction classes with ${totalRedactions} total tag matches`,
        );

        // Pre-generate Excel workbook
        await generateReviewWorkbook(processedRecords, allDetectedTags);

        addLog(
          'success',
          `Updated workbook: De-Identification — Human-in-the-Loop Text Review.xlsx with dual-tier headers (LIGHT_GREEN & LIGHT_RED fills)`,
        );

        setStatusMessage('Pipeline completed successfully.');
      } catch (err: any) {
        console.error('Processing error:', err);
        addLog('error', `Pipeline execution failed: ${err.message || String(err)}`);
        setStatusMessage('Error executing pipeline.');
      } finally {
        setIsProcessing(false);
      }
    },
    [s3Config, addLog],
  );

  // Initialize with sample clinical SOAP notes on first load
  useEffect(() => {
    const initialFiles = SAMPLE_SOAP_NOTES.map((f) => ({
      name: f.name,
      content: f.content,
      size: f.content.length,
    }));
    addLog('info', 'De-ID Review Pipeline initialized. Loading sample clinical SOAP notes...');
    executeFileProcessing(initialFiles, 'Clinical Sample Dataset');
  }, []);

  // Handle uploaded ZIP file
  const handleProcessZip = async (file: File) => {
    setIsProcessing(true);
    setStatusMessage(`Unpacking ZIP archive: ${file.name}...`);
    addLog('info', `Loading ZIP archive: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);
      const extracted: { name: string; content: string; size: number }[] = [];

      const entries = Object.entries(loadedZip.files);
      for (const [filename, entry] of entries) {
        if (entry.dir) continue;
        if (filename.includes('__MACOSX') || filename.endsWith('.DS_Store')) continue;

        const content = await entry.async('string');
        extracted.push({
          name: filename,
          content,
          size: content.length,
        });
      }

      addLog('info', `Extracted ${extracted.length} files from ZIP archive`);
      await executeFileProcessing(extracted, file.name);
    } catch (err: any) {
      console.error('ZIP extraction error:', err);
      addLog('error', `Failed to unpack ZIP archive: ${err.message || String(err)}`);
      setIsProcessing(false);
    }
  };

  // Handle uploaded Folder
  const handleProcessFolder = async (fileList: FileList) => {
    setIsProcessing(true);
    setStatusMessage(`Reading ${fileList.length} files from folder...`);
    addLog('info', `Reading ${fileList.length} files from browser folder selection`);

    try {
      const extracted: { name: string; content: string; size: number }[] = [];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (file.name.startsWith('.~lock.') || file.name.startsWith('.')) continue;
        const text = await file.text();
        extracted.push({
          name: file.name,
          content: text,
          size: file.size,
        });
      }

      await executeFileProcessing(extracted, 'Selected Folder');
    } catch (err: any) {
      console.error('Folder read error:', err);
      addLog('error', `Failed to read folder contents: ${err.message || String(err)}`);
      setIsProcessing(false);
    }
  };

  // Handle Local Path on server
  const handleProcessLocalPath = async (localPath: string) => {
    setIsProcessing(true);
    setStatusMessage(`Scanning server directory: ${localPath}...`);
    addLog('info', `Querying server filesystem for directory: ${localPath}`);

    try {
      const response = await fetch('/api/process-local-dir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          localPath,
          s3Bucket: s3Config.bucket,
          s3Prefix: s3Config.prefix,
          presignExpiresDays: s3Config.presignExpiresDays,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.records) {
        setRecords(data.records);
        setDetectedTags(data.allDetectedTags || []);
        addLog(
          'success',
          `Loaded ${data.records.length} note records from ${data.sourcePath} (${data.isFallbackSample ? 'demonstration sample' : 'disk scan'})`,
        );
      }
    } catch (err: any) {
      console.error('Local path error:', err);
      addLog('warn', `Server local scan notice: ${err.message}. Defaulting to clinical sample dataset.`);
      // Fallback to sample dataset
      const initialFiles = SAMPLE_SOAP_NOTES.map((f) => ({
        name: f.name,
        content: f.content,
        size: f.content.length,
      }));
      await executeFileProcessing(initialFiles, 'Fallback Clinical Dataset');
    } finally {
      setIsProcessing(false);
    }
  };

  // 1-Click Load Demo Samples
  const handleLoadSample = async () => {
    const sampleFiles = SAMPLE_SOAP_NOTES.map((f) => ({
      name: f.name,
      content: f.content,
      size: f.content.length,
    }));
    await executeFileProcessing(sampleFiles, 'Clinical Sample SOAP Notes');
  };

  // Direct Excel Download
  const handleDownloadExcel = async () => {
    if (records.length === 0) return;

    addLog('info', 'Generating Excel workbook with openpyxl styling (LIGHT_RED_FILL & LIGHT_GREEN_FILL)...');
    try {
      const buffer = await generateReviewWorkbook(records, detectedTags);
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'De-Identification — Human-in-the-Loop Text Review.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addLog('success', 'Workbook downloaded: De-Identification — Human-in-the-Loop Text Review.xlsx');
    } catch (err: any) {
      console.error('Download error:', err);
      addLog('error', `Failed to generate workbook download: ${err.message || String(err)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onDownloadExcel={handleDownloadExcel}
        onOpenHelp={() => setIsHelpOpen(true)}
        onLoadSample={handleLoadSample}
        isProcessing={isProcessing}
        notesCount={records.length}
        s3Bucket={s3Config.bucket}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {activeTab === 'clinical' ? (
          <>
            {/* Step 1: Stats Overview banner */}
            <StatsOverview records={records} detectedTags={detectedTags} />

            {/* Step 2: Configuration & Input Panel */}
            <ConfigPanel
              s3Config={s3Config}
              onS3ConfigChange={setS3Config}
              onProcessZip={handleProcessZip}
              onProcessFolder={handleProcessFolder}
              onProcessLocalPath={handleProcessLocalPath}
              onLoadSample={handleLoadSample}
              isProcessing={isProcessing}
              statusMessage={statusMessage}
              onTestS3Connection={handleTestS3Connection}
              isTestingS3={isTestingS3}
              s3TestResult={s3TestResult}
              onUploadToS3={handleUploadToS3}
              isUploadingS3={isUploadingS3}
              hasFilesToUpload={currentFiles.length > 0}
            />

            {/* Step 3: Interactive Review Spreadsheet */}
            <ReviewTable
              records={records}
              detectedTags={detectedTags}
              onInspectNote={(record) => setInspectedRecord(record)}
              onDownloadExcel={handleDownloadExcel}
              onUploadToS3={handleUploadToS3}
              isUploadingS3={isUploadingS3}
              s3WorkbookUrl={s3WorkbookUrl}
              s3Bucket={s3Config.bucket}
              s3Prefix={s3Config.prefix}
            />

            {/* Step 4: Redaction Tag Distribution Breakdown */}
            {detectedTags.length > 0 && (
              <TagAnalytics records={records} detectedTags={detectedTags} />
            )}
          </>
        ) : (
          /* Feature: Any-File S3 Uploader & Presigned URL Excel/CSV Generator */
          <GenericS3Uploader
            s3Config={s3Config}
            onS3ConfigChange={setS3Config}
            onTestS3Connection={handleTestS3Connection}
            isTestingS3={isTestingS3}
            s3TestResult={s3TestResult}
          />
        )}

        {/* Step 5: Terminal / Pipeline Execution Logs */}
        <PipelineLogs
          logs={logs}
          s3Bucket={s3Config.bucket}
          s3Prefix={s3Config.prefix}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            De-ID Clinical Review Pipeline &bull; Compliant with HIPAA Safe Harbor & Expert Determination de-identification
          </span>
          <span className="font-mono text-slate-400">
            OpenPyXL &bull; Boto3 &bull; ExcelJS &bull; React
          </span>
        </div>
      </footer>

      {/* Side-by-Side Note Inspector Modal */}
      <NoteInspectorModal
        record={inspectedRecord}
        onClose={() => setInspectedRecord(null)}
      />

      {/* Help / Documentation Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
