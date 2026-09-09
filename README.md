# Clinical De-ID Notes Pipeline & S3 Presigned URL Suite

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![React 19](https://img.shields.io/badge/React-19.0.1-blue.svg)](https://react.dev/)
[![Vite 6](https://img.shields.io/badge/Vite-6.2.3-purple.svg)](https://vitejs.dev/)
[![Express 4](https://img.shields.io/badge/Express-4.21.2-lightgrey.svg)](https://expressjs.com/)
[![AWS SDK v3](https://img.shields.io/badge/AWS%20SDK%20v3-S3%20Presigner-orange.svg)](https://aws.amazon.com/sdk-for-javascript/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4.1.14-38bdf8.svg)](https://tailwindcss.com/)

A full-stack, enterprise-grade clinical data processing and AWS S3 presigned URL generation suite. It provides:
1. **Clinical SOAP Notes Review Pipeline**: Automated HIPAA redaction tag extraction, entity detection, redacted tag frequency counters, side-by-side inspection, and dual-tier formatted Excel reports.
2. **Any-File S3 Uploader**: Universal upload for any file types (PDF, images, audio, documents, data, zips) with automated **7-day validity inline-onclick openable** presigned URL Excel and CSV reports.
3. **Scenario 1 — `s3path` CSV Bulk Presigner**: Ingest any CSV containing an `s3path` column to enrich and output all original data with active 7-day inline URLs.
4. **Scenario 2 — S3 Bucket & Prefix Auto-Detector**: Automatically scan any S3 bucket and prefix (e.g. `s3://bucket-name/prefix/`) to discover all files and generate 7-day validity inline openable URLs with one-click Excel/CSV exports.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Key Use Cases & Detailed Workflows](#key-use-cases--detailed-workflows)
  - [Use Case 1: Clinical SOAP De-Identification & Tag Analytics](#use-case-1-clinical-soap-de-identification--tag-analytics)
  - [Use Case 2: Note Inspector & Redacted Tag Frequency Counts](#use-case-2-note-inspector--redacted-tag-frequency-counts)
  - [Use Case 3: Universal Any-File S3 Uploader](#use-case-3-universal-any-file-s3-uploader)
  - [Use Case 4: Scenario 1 — `s3path` CSV Processor](#use-case-4-scenario-1--s3path-csv-processor)
  - [Use Case 5: Scenario 2 — Bucket & Prefix Auto-Detector](#use-case-5-scenario-2--bucket--prefix-auto-detector)
- [Local System Setup Guide](#local-system-setup-guide)
  - [Prerequisites](#prerequisites)
  - [1. Clone Repository](#1-clone-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Start the Development Server](#4-start-the-development-server)
  - [5. Production Build & Start](#5-production-build--start)
- [Host & Publish on GitHub](#host--publish-on-github)
  - [1. Initialize Git & First Commit](#1-initialize-git--first-commit)
  - [2. Push to GitHub](#2-push-to-github)
  - [3. GitHub Actions CI Workflow](#3-github-actions-ci-workflow)
- [Cloud Hosting & Deployment Guide](#cloud-hosting--deployment-guide)
  - [Option A: Google Cloud Run (Container Deployment)](#option-a-google-cloud-run-container-deployment)
  - [Option B: Docker Deployment](#option-b-docker-deployment)
  - [Option C: AWS App Runner or EC2](#option-c-aws-app-runner-or-ec2)
- [AWS S3 Permissions & CORS Configuration](#aws-s3-permissions--cors-configuration)
  - [1. S3 Bucket CORS Configuration (Mandatory for Browser Inline Open)](#1-s3-bucket-cors-configuration-mandatory-for-browser-inline-open)
  - [2. Minimal AWS IAM Policy](#2-minimal-aws-iam-policy)
- [API Reference](#api-reference)
- [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Client Browser (SPA)                          │
│   React 19 + Tailwind CSS v4 + Lucide Icons + ExcelJS Client Fallback   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP /api/*
┌────────────────────────────────────▼────────────────────────────────────┐
│                    Node.js + Express Full-Stack Server                   │
│   - server.ts: Central Express server with Vite middleware in dev       │
│   - Multer: High-throughput memory buffer handling (up to 100MB)        │
│   - ExcelJS Engine: Dual-tier headers & clickable HYPERLINK formulas     │
│   - AWS SDK v3: @aws-sdk/client-s3 & @aws-sdk/s3-request-presigner      │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ AWS S3 API Calls
┌────────────────────────────────────▼────────────────────────────────────┐
│                       Amazon Simple Storage Service                     │
│   - Bucket: bucket (or user-configured target bucket)          │
│   - Presigned URLs: 7-Day Validity (604,800s)                           │
│   - ResponseContentDisposition: inline; filename="..."                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Key Use Cases & Detailed Workflows

### Use Case 1: Clinical SOAP De-Identification & Tag Analytics
- **Goal**: Review unstructured clinical progress notes and SOAP documents, verify de-identification efficacy, and generate audit-ready Excel workbooks.
- **Workflow**:
  1. Go to the **Clinical De-ID Review** tab.
  2. Load documents via **Upload ZIP Archive**, **Select Folder**, **Specify Local File Path**, or click **Load Sample Notes**.
  3. The regex engine parses all HIPAA Safe Harbor tags:
     - Identification: `[PATIENT_NAME]`, `[DOCTOR]`, `[HOSPITAL]`, `[PROVIDER]`
     - Demographics & Contact: `[PHONE]`, `[EMAIL]`, `[ADDRESS]`, `[ZIP_CODE]`, `[AGE]`
     - Identifiers: `[SSN]`, `[MRN]`, `[ACCOUNT_NUMBER]`, `[DATE]`, `[DEVICE_ID]`
  4. The system calculates redaction statistics, density per 1,000 words, and flags records exceeding risk thresholds.
  5. Click **Download Review Workbook (.xlsx)** to obtain an openpyxl-compliant workbook featuring:
     - Tier-1 column styling with `LIGHT_GREEN_FILL` for verified de-identified text.
     - Tier-2 column styling with `LIGHT_RED_FILL` for raw content and flagged entities.
     - Active clickable hyperlinks directly opening the S3 source files.

---

### Use Case 2: Note Inspector & Redacted Tag Frequency Counts
- **Goal**: Granular verification of specific clinical notes with exact redacted tag distribution.
- **Workflow**:
  1. In the Review Table, click the **Inspect Note** button on any record.
  2. The inspector modal opens featuring:
     - **Redacted Tag Summary Bar**: Displays the exact frequency count of every detected tag (e.g., `[PATIENT_NAME]` × 3, `[DATE]` × 2, `[HOSPITAL]` × 1).
     - **Side-by-Side Text Comparison**: Real-time diff showing original note text versus redacted text with colored highlight badges.
     - **JSON Entities Visualizer**: Fully interactive JSON tree detailing tag offsets, lengths, and categories with a 1-click **Copy JSON** button.

---

### Use Case 3: Universal Any-File S3 Uploader
- **Goal**: Bulk-upload any file types (PDF, medical scans, DICOM, CSV, XLSX, JSON, MP3 audio recordings, MP4 consultation video, ZIP archives) directly to AWS S3 and receive immediate inline-clickable reports.
- **Workflow**:
  1. Navigate to **Any-File S3 Uploader** > Sub-tab **3. Upload Local Files**.
  2. Drag and drop any files or select a folder.
  3. Expand the **S3 Destination** drawer to customize the bucket name (defaults to `bucket-name`), folder prefix, and validity duration (defaults to 7 days).
  4. Click **Upload to AWS S3 & Generate Presigned Reports**.
  5. The server streams files concurrently to S3 and signs them with `ResponseContentDisposition: inline`.
  6. Download the generated **Excel (.xlsx)** or **CSV (.csv)** reports, or click **Open Inline** to view any uploaded asset directly in a new browser tab without forcing a file download.

---

### Use Case 4: Scenario 1 — `s3path` CSV Processor
- **Goal**: You have an existing CSV export with an `s3path` column (or multiple columns with paths), and need to generate 7-day validity inline presigned URLs for every row while preserving all other data columns.
- **Workflow**:
  1. Open **Any-File S3 Uploader** > Sub-tab **1. Share `s3path` CSV**.
  2. Drag and drop your `.csv` file, or paste CSV text directly into the editor.
  3. (Optional) Click **Load Sample CSV** to load clinical reference data.
  4. The system automatically detects the `s3path` header column (supporting `s3://bucket/key`, S3 HTTPS URLs, and relative paths).
  5. Click **Generate 7-Day URLs**.
  6. The system presigns all S3 paths with **7-day validity (604,800 seconds)** and inline disposition.
  7. Results are rendered in a responsive, searchable data table.
  8. Click **Download .xlsx** (with clickable hyperlinks) or **Download .csv** (with `presigned_url_7days` appended).

---

### Use Case 5: Scenario 2 — Bucket & Prefix Auto-Detector
- **Goal**: Automatically scan an existing S3 bucket directory (e.g. `s3_path`) without needing an inventory CSV, discover every file, and generate 7-day validity inline URLs for team sharing.
- **Workflow**:
  1. Open **Any-File S3 Uploader** > Sub-tab **2. Auto-Detect S3 Files**.
  2. Enter the **S3 Bucket Name** (e.g. `bucket-name`).
  3. Enter the **Prefix / Folder Path** (e.g. `test/` or leave empty for root).
  4. Select scan limit (up to 5,000 files).
  5. Click **Auto-Detect & Generate 7-Day URLs**.
  6. The server invokes S3 `ListObjectsV2`, filters out folder markers, and generates inline presigned URLs for each asset.
  7. Filter or search results by filename, extension, or size.
  8. Download the comprehensive **Excel report (.xlsx)** or **CSV report (.csv)**.

---

## Local System Setup Guide

Follow these steps to clone, configure, and run the application on your local workstation (macOS, Linux, or Windows).

### Prerequisites
- **Node.js**: Version `20.x` or higher (verify via `node -v`)
- **npm**: Version `10.x` or higher (verify via `npm -v`)
- **Git**: Installed and configured (verify via `git --version`)
- **AWS Credentials**: (Optional) IAM user credentials with S3 read/write permissions for `bucketname`.

---

### 1. Clone Repository
```bash
git clone https://github.com/your-organization/deid-clinical-notes-s3-pipeline.git
cd deid-clinical-notes-s3-pipeline
```

---

### 2. Install Dependencies
```bash
npm install
```
*Note: This installs `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `exceljs`, `express`, `jszip`, `motion`, `lucide-react`, `react`, `vite`, `tailwindcss`, and TypeScript.*

---

### 3. Configure Environment Variables
Create your local `.env` file from the provided `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your preferred editor:
```env
# Server Port (default 3000)
PORT=3000

# AWS S3 Configuration (Optional: can also be configured dynamically in the app UI)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="wJalrXUtn..."
AWS_SESSION_TOKEN=""
S3_BUCKET_NAME="bucket"
S3_DEFAULT_PREFIX="SEP8/"

# AI Studio / Gemini API Key (if using AI features)
GEMINI_API_KEY=""
```

> **Security Best Practice**: Never commit your `.env` file containing real AWS access keys to GitHub. The `.gitignore` file already excludes `.env`.

---

### 4. Start the Development Server
```bash
npm run dev
```
Output:
```
Server running on http://localhost:3000
Vite development server mounted successfully.
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

### 5. Production Build & Start
To test the production build locally:

```bash
# 1. Build client bundle and bundle the server using esbuild
npm run build

# 2. Launch production server
npm start
```

---

### 6. Changing Port to 0.0.0.0:8000 for IP Access by Team Members
The server already binds to `0.0.0.0` (all network interfaces), allowing anyone on your local network (LAN) or virtual private cloud (VPC) to access it via your machine's IP address.

To change the port from `3000` to `8000`:

#### Method A: Edit `server.ts` on your local machine
In `server.ts` (around line 34), change:
```ts
const PORT = 8000; // Change 3000 to 8000
```
Then restart the server:
```bash
npm run dev
# or for production:
npm run build && npm start
```

#### Method B: Docker Port Mapping (No code changes needed!)
If running via Docker, you can map port `8000` on your host machine to container port `3000`:
```bash
docker run -d -p 8000:3000 \
  -e S3_BUCKET_NAME="bucket" \
  --name clinical-app clinical-s3-pipeline
```

#### Finding your local IP address for team access:
- **macOS / Linux**: run `ip a` or `ifconfig` or `hostname -I` (e.g. `192.168.1.50` or `10.0.0.12`)
- **Windows**: run `ipconfig` (look for `IPv4 Address`)
- **Firewall**: ensure port 8000 is permitted (`sudo ufw allow 8000/tcp` on Ubuntu/Debian)

Your team can then open:
```
http://<YOUR_LOCAL_IP>:8000
# Example: http://192.168.1.50:8000
```

---

## Host & Publish on GitHub

### 1. Initialize Git & First Commit
If you are initializing a fresh repository:

```bash
git init
git add .
git commit -m "feat: complete de-id clinical pipeline and 7-day s3 presigned url suite"
```

---

### 2. Push to GitHub
```bash
# Rename branch to main
git branch -M main

# Add your GitHub repository remote
git remote add origin https://github.com/your-username/deid-clinical-notes-s3-pipeline.git

# Push code to GitHub
git push -u origin main
```

---

### 3. GitHub Actions CI Workflow
Create `.github/workflows/ci.yml` to automatically validate builds on every push and pull request:

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: 20.x
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Type check & Lint
      run: npm run lint

    - name: Build production bundle
      run: npm run build
```

---

## Cloud Hosting & Deployment Guide

### Option A: Google Cloud Run (Container Deployment)
The application is pre-configured for containerized deployment on Cloud Run:

1. Build and push your container image via Google Cloud Build:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/clinical-s3-pipeline
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy clinical-s3-pipeline \
     --image gcr.io/YOUR_PROJECT_ID/clinical-s3-pipeline \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --port 3000 \
     --set-env-vars="S3_BUCKET_NAME=bucket,AWS_REGION=us-east-1"
   ```

---

### Option B: Docker Deployment
A sample `Dockerfile` for self-hosted container environments:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

Build and run:
```bash
docker build -t clinical-s3-pipeline .
docker run -p 3000:3000 -e S3_BUCKET_NAME="bucket" clinical-s3-pipeline
```

---

### Option C: AWS App Runner or EC2
1. Deploy the Docker image to Amazon ECR.
2. Launch an AWS App Runner service pointing to your ECR image.
3. Attach an IAM Instance Profile or Task Role with S3 read/write access 'bucket` — no hardcoded AWS credentials required!

---

## AWS S3 Permissions & CORS Configuration

### 1. S3 Bucket CORS Configuration (Mandatory for Browser Inline Open)
To enable browser tabs to display files (PDF, images, text) directly instead of throwing cross-origin download errors, configure CORS on your S3 bucket:

1. Go to AWS S3 Console > Select `bucket` > **Permissions** tab.
2. Scroll to **Cross-origin resource sharing (CORS)** and paste:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "HEAD",
      "PUT",
      "POST"
    ],
    "AllowedOrigins": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Type",
      "Content-Disposition",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

---

### 2. Minimal AWS IAM Policy
Attach this least-privilege policy to your IAM user or role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowS3OperationsForClinicalPipeline",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::bucket",
        "arn:aws:s3:::bucket/*"
      ]
    }
  ]
}
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health check and server timestamp |
| `GET` | `/api/sample-data` | Returns embedded sample clinical SOAP notes |
| `POST` | `/api/s3/test-connection` | Tests AWS S3 connection and bucket accessibility |
| `POST` | `/api/s3/upload-generic` | Uploads arbitrary files to S3 with 7-day inline URLs |
| `POST` | `/api/s3/presign-from-csv` | **Scenario 1**: Ingests CSV with `s3path` column and generates 7-day inline URLs |
| `POST` | `/api/s3/auto-detect-and-presign` | **Scenario 2**: Auto-scans S3 bucket & prefix and generates 7-day inline URLs |
| `GET` | `/api/s3/download-csv-presign-excel` | Downloads latest Scenario 1 Excel report (`.xlsx`) |
| `GET` | `/api/s3/download-csv-presign-csv` | Downloads latest Scenario 1 CSV report (`.csv`) |
| `GET` | `/api/s3/download-detected-excel` | Downloads latest Scenario 2 Excel report (`.xlsx`) |
| `GET` | `/api/s3/download-detected-csv` | Downloads latest Scenario 2 CSV report (`.csv`) |

---

## Troubleshooting & FAQ

#### Q: Getting error: "Could not load credentials from any providers"?
**Fix**: Either provide `accessKeyId` and `secretAccessKey` directly in the in-app **S3 Destination** drawer, or add them to your local `.env` file, or configure `~/.aws/credentials` on your machine.

#### Q: Why do links open inline instead of prompting to download?
**Fix**: This is an intentional feature requested by users (`ResponseContentDisposition: inline; filename="..."`). If you need to force a download instead, right-click the link and choose "Save Link As...", or open the downloaded Excel workbook and click the hyperlink.

#### Q: How can I change the default S3 bucket?
**Fix**: The default bucket is `bucket`. You can change it anytime in the application UI input field, or override it in your `.env` file with `S3_BUCKET_NAME=your-bucket-name`.

---

## License & Compliance
This software is intended for clinical data de-identification and research workflows. Ensure proper HIPAA and organizational compliance policies are followed when handling Protected Health Information (PHI).
