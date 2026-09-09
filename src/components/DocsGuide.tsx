import React, { useState } from 'react';
import {
  BookOpen,
  Terminal,
  Github,
  Cloud,
  Database,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowRight,
  Code2,
  Server,
  FolderGit2,
} from 'lucide-react';

export const DocsGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'local' | 'github' | 'usecases' | 'aws'>('local');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const localInstallCommands = `# 1. Clone the repository
git clone https://github.com/your-org/deid-clinical-notes-s3-pipeline.git
cd deid-clinical-notes-s3-pipeline

# 2. Install dependencies (Node.js 20+ required)
npm install

# 3. Create your local environment configuration
cp .env.example .env

# 4. Start the development server (runs on port 3000)
npm run dev`;

  const productionCommands = `# 1. Compile client assets and bundle backend server
npm run build

# 2. Start the production server
npm start`;

  const gitPushCommands = `# 1. Initialize git and stage all files
git init
git add .
git commit -m "feat: clinical de-id pipeline & 7-day s3 presigned url suite"

# 2. Set main branch and link your GitHub remote
git branch -M main
git remote add origin https://github.com/your-username/deid-clinical-notes-s3-pipeline.git

# 3. Push to GitHub
git push -u origin main`;

  const dockerCommands = `# Build Docker image
docker build -t clinical-s3-pipeline .

# Run container binding port 3000
docker run -d -p 3000:3000 \\
  -e S3_BUCKET_NAME="int-shaip-bucket" \\
  -e AWS_REGION="us-east-1" \\
  --name clinical-app clinical-s3-pipeline`;

  const awsCorsJson = `[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD", "PUT", "POST"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag", "Content-Type", "Content-Disposition", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]`;

  const awsIamPolicyJson = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3PresignedPipeline",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::int-shaip-bucket",
        "arn:aws:s3:::int-shaip-bucket/*"
      ]
    }
  ]
}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <BookOpen className="w-6 h-6" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Documentation & Setup Guide
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Enterprise v2.5
              </span>
            </div>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Complete guide for running on your local machine, publishing to GitHub, deploying to Cloud Run / Docker / AWS, and detailed walkthroughs for all clinical and S3 workflows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              <Github className="w-4 h-4" />
              <span>GitHub Docs</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setActiveSection('local')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'local'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>1. Local System Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('github')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'github'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <FolderGit2 className="w-4 h-4" />
            <span>2. Host & GitHub Workflow</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('usecases')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'usecases'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. Use Case Walkthroughs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('aws')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSection === 'aws'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>4. AWS S3 & CORS Setup</span>
          </button>
        </div>
      </div>

      {/* Section 1: Local System Setup */}
      {activeSection === 'local' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Terminal className="w-5 h-5 text-indigo-600" />
                <span>Running Locally on Your Computer (macOS / Linux / Windows)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Follow these 4 simple steps to get the full-stack application running on your workstation.
              </p>
            </div>

            {/* Prerequisites */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <span className="font-bold text-slate-800 uppercase tracking-wider block">
                System Requirements:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Node.js</strong>: v20.x or higher</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>npm</strong>: v10.x or higher</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span><strong>Port</strong>: 3000 available</span>
                </li>
              </ul>
            </div>

            {/* Step 1 to 4 Commands */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Development Mode (Live Reloading)
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopy(localInstallCommands, 'dev-commands')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {copiedCode === 'dev-commands' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'dev-commands' ? 'Copied!' : 'Copy Commands'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-inner">
                {localInstallCommands}
              </pre>
            </div>

            {/* Production Mode */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Production Build & Launch
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopy(productionCommands, 'prod-commands')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {copiedCode === 'prod-commands' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'prod-commands' ? 'Copied!' : 'Copy Commands'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-inner">
                {productionCommands}
              </pre>
            </div>

            {/* URL Notice */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div className="text-xs text-emerald-800">
                <strong>Access App:</strong> Once started, open <code className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-300">http://localhost:3000</code> in any web browser.
              </div>
              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-emerald-700 hover:underline inline-flex items-center gap-1"
              >
                <span>Open localhost:3000</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Change Port to 0.0.0.0:8000 for IP Access by Team Members */}
            <div className="p-5 bg-indigo-50/70 rounded-2xl border border-indigo-200 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Want to Change Port to 0.0.0.0:8000 for Team/IP Access?
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-200 text-indigo-800">
                      LAN / IP Access
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    The backend server already binds to <code className="font-mono font-semibold text-indigo-700">0.0.0.0</code> (all network interfaces). This allows anyone on your local network (LAN) or office subnet to connect directly using your computer&apos;s IP address.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Option 1 */}
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Method 1: Change PORT in server.ts</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('const PORT = 8000;', 'port-code')}
                      className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode === 'port-code' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode === 'port-code' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    In <code className="font-mono text-slate-700">server.ts</code> (line 34), change:
                  </p>
                  <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`// server.ts
const PORT = 8000;`}
                  </pre>
                  <p className="text-slate-500 text-[11px]">
                    Then run <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">npm run dev</code> or <code className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">npm start</code>.
                  </p>
                </div>

                {/* Option 2 */}
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Method 2: Docker Port Forwarding</span>
                    <button
                      type="button"
                      onClick={() => handleCopy('docker run -d -p 8000:3000 --name clinical-app clinical-s3-pipeline', 'docker-port')}
                      className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode === 'docker-port' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedCode === 'docker-port' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    No code changes needed! Map port 8000 directly:
                  </p>
                  <pre className="p-2.5 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`docker run -d -p 8000:3000 clinical-s3-pipeline`}
                  </pre>
                  <p className="text-slate-500 text-[11px]">
                    Docker maps your host&apos;s 0.0.0.0:8000 to the container.
                  </p>
                </div>
              </div>

              {/* Finding IP */}
              <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 text-xs text-slate-700 space-y-1">
                <span className="font-bold text-indigo-950 block">How your team accesses it:</span>
                <p className="text-slate-600 text-[11px]">
                  1. Find your IP: run <code className="font-mono bg-slate-100 px-1 rounded">ip a</code> or <code className="font-mono bg-slate-100 px-1 rounded">ifconfig</code> (Linux/macOS) or <code className="font-mono bg-slate-100 px-1 rounded">ipconfig</code> (Windows). Example IP: <code className="font-mono text-indigo-700 font-semibold">192.168.1.50</code>.
                </p>
                <p className="text-slate-600 text-[11px]">
                  2. Make sure firewall allows port 8000 (<code className="font-mono bg-slate-100 px-1 rounded">sudo ufw allow 8000/tcp</code> on Ubuntu).
                </p>
                <p className="text-slate-600 text-[11px]">
                  3. Share with your team: <code className="font-mono bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">http://&lt;YOUR_IP&gt;:8000</code> (e.g. <code className="font-mono text-indigo-700 font-bold">http://192.168.1.50:8000</code>).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Host & GitHub Workflow */}
      {activeSection === 'github' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-indigo-600" />
                <span>Host on GitHub & Deploy to Cloud</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Push your codebase to GitHub so team members can clone, collaborate, and deploy the application anywhere.
              </p>
            </div>

            {/* Push to GitHub */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Github className="w-4 h-4 text-slate-800" />
                  <span>Pushing to GitHub</span>
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopy(gitPushCommands, 'git-commands')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {copiedCode === 'git-commands' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'git-commands' ? 'Copied!' : 'Copy Commands'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-inner">
                {gitPushCommands}
              </pre>
            </div>

            {/* Docker Containerization */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span>Docker Container Deployment</span>
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopy(dockerCommands, 'docker-commands')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {copiedCode === 'docker-commands' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'docker-commands' ? 'Copied!' : 'Copy Commands'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-inner">
                {dockerCommands}
              </pre>
            </div>

            {/* Cloud Run Instructions */}
            <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-2 text-xs text-sky-900">
              <div className="font-bold flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-sky-600" />
                <span>Google Cloud Run Deployment (1-Command):</span>
              </div>
              <p>
                Deploy effortlessly to Cloud Run by running:
              </p>
              <code className="block bg-white p-2.5 rounded-lg border border-sky-300 font-mono text-[11px] text-slate-800 select-all">
                gcloud run deploy clinical-s3-pipeline --source . --port 3000 --allow-unauthenticated
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Use Cases Walkthrough */}
      {activeSection === 'usecases' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Use Case 1: Clinical SOAP De-ID Review
                </h3>
                <span className="text-[11px] text-slate-500">HIPAA Safe Harbor Compliance</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload ZIP archives, clinical folders, or sample datasets. Automatically scans 18+ HIPAA redaction tags (`[PATIENT_NAME]`, `[DATE]`, `[PHONE]`, `[DOCTOR]`), detects entity spans, and generates openpyxl-compliant Excel workbooks with dual-tier color headers (`LIGHT_GREEN_FILL` for de-identified and `LIGHT_RED_FILL` for flagged raw text).
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-semibold">
              <span>Location: Tab &quot;Clinical De-ID Review&quot;</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                <Code2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Use Case 2: Redacted Tag Count & Inspector
                </h3>
                <span className="text-[11px] text-slate-500">Granular Note Verification</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Click &quot;Inspect Note&quot; on any clinical record to open a modal displaying real-time frequency count badges for every detected tag (e.g. `[PATIENT_NAME]` × 3), side-by-side diff comparison with colored highlights, and a structured JSON Entities tree with 1-click copy.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-purple-700 font-semibold">
              <span>Location: Click &quot;Inspect Note&quot; in Review Table</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Use Case 3: `s3path` CSV Bulk Presigner
                </h3>
                <span className="text-[11px] text-indigo-600 font-semibold">Scenario 1 (7-Day Validity)</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upload or paste a CSV file containing an `s3path` header column (supporting `s3://bucket/key`, S3 HTTPS URLs, or relative paths). The system preserves all original columns and appends 7-day validity inline-onclick openable URLs with one-click Excel (.xlsx) and CSV (.csv) exports.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-700 font-semibold">
              <span>Location: &quot;Any-File S3 Uploader&quot; &gt; &quot;1. Share s3path CSV&quot;</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Database className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Use Case 4: Bucket & Prefix Auto-Detector
                </h3>
                <span className="text-[11px] text-emerald-600 font-semibold">Scenario 2 (Auto Scan)</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Specify your S3 Bucket (e.g. `int-shaip-bucket`) and Prefix (e.g. `interns-test-data/SEP8/`). The pipeline uses `ListObjectsV2` to scan and detect all files, generating 7-day validity inline-openable presigned URLs for every file with formatted Excel and CSV reports.
            </p>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-700 font-semibold">
              <span>Location: &quot;Any-File S3 Uploader&quot; &gt; &quot;2. Auto-Detect S3 Files&quot;</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Section 4: AWS S3 & CORS Setup */}
      {activeSection === 'aws' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600" />
                <span>AWS S3 Bucket CORS & IAM Permissions Setup</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure CORS and IAM policies so that presigned URLs open inline directly inside browser tabs.
              </p>
            </div>

            {/* S3 CORS JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    1. S3 Bucket CORS Configuration (Mandatory for Inline Open)
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Apply under AWS Console &gt; S3 &gt; <code className="font-mono">int-shaip-bucket</code> &gt; Permissions &gt; Cross-origin resource sharing
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(awsCorsJson, 'cors-json')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {copiedCode === 'cors-json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'cors-json' ? 'Copied!' : 'Copy CORS JSON'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-inner">
                {awsCorsJson}
              </pre>
            </div>

            {/* AWS IAM Policy */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2. Least-Privilege IAM User / Role Policy
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    Grants read, write, and prefix listing permissions for bucket <code className="font-mono">int-shaip-bucket</code>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(awsIamPolicyJson, 'iam-json')}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {copiedCode === 'iam-json' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode === 'iam-json' ? 'Copied!' : 'Copy Policy JSON'}</span>
                </button>
              </div>
              <pre className="p-4 bg-slate-950 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto border border-slate-800 shadow-inner">
                {awsIamPolicyJson}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
