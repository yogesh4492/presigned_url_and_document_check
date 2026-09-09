import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3CredentialsConfig {
  bucket: string;
  prefix: string;
  presignExpiresDays?: number;
  awsRegion?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

export interface S3UploadResultItem {
  name: string;
  kind?: string;
  noteId?: string;
  s3Key: string;
  s3Url?: string;
  success: boolean;
  size?: number;
  error?: string;
}

export interface S3BatchUploadResult {
  success: boolean;
  totalFiles: number;
  uploadedCount: number;
  failedCount: number;
  bucket: string;
  prefix: string;
  items: S3UploadResultItem[];
  workbookUpload?: {
    s3Key: string;
    s3Url: string;
    size: number;
  };
  error?: string;
}

/**
 * Creates an AWS S3Client instance with explicit or environment credentials
 */
export function getS3Client(config: Partial<S3CredentialsConfig>): S3Client {
  const region =
    (config.awsRegion || process.env.AWS_REGION || 'us-east-1').trim();

  const accessKeyId = (
    config.accessKeyId ||
    process.env.AWS_ACCESS_KEY_ID ||
    ''
  ).trim();

  const secretAccessKey = (
    config.secretAccessKey ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    ''
  ).trim();

  const sessionToken = (
    config.sessionToken ||
    process.env.AWS_SESSION_TOKEN ||
    ''
  ).trim();

  if (accessKeyId && secretAccessKey) {
    return new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
        ...(sessionToken ? { sessionToken } : {}),
      },
    });
  }

  // Fallback to default AWS SDK credential provider chain (IAM role, environment, or ~/.aws)
  return new S3Client({ region });
}

/**
 * Tests connection to the target S3 bucket and verifies read/write permissions
 */
export async function testS3BucketAccess(
  config: S3CredentialsConfig,
): Promise<{
  success: boolean;
  message: string;
  bucket: string;
  region: string;
  errorDetail?: string;
  errorCode?: string;
}> {
  const bucket = (config.bucket || 'int-shaip-bucket').trim();
  const region = (config.awsRegion || process.env.AWS_REGION || 'us-east-1').trim();

  if (!bucket) {
    return {
      success: false,
      message: 'S3 bucket name is missing.',
      bucket: '',
      region,
      errorCode: 'MISSING_BUCKET',
    };
  }

  const s3 = getS3Client(config);

  try {
    // 1. Check if bucket exists and is accessible
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));

    // 2. Perform a lightweight list check to verify IAM credentials can list/access objects
    await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: (config.prefix || '').replace(/^\/+/, ''),
        MaxKeys: 1,
      }),
    );

    return {
      success: true,
      message: `Connection successful: Bucket "${bucket}" is accessible in region "${region}".`,
      bucket,
      region,
    };
  } catch (err: any) {
    console.error('S3 connection test failed:', err);
    const code = err.name || err.code || err.$metadata?.httpStatusCode || 'UNKNOWN';
    let userMsg = `Failed to access S3 bucket "${bucket}".`;

    if (code === 'NotFound' || code === 'NoSuchBucket' || err.$metadata?.httpStatusCode === 404) {
      userMsg = `Bucket "${bucket}" was not found in AWS region "${region}". Please verify the bucket name and region.`;
    } else if (code === 'AccessDenied' || code === 'Forbidden' || err.$metadata?.httpStatusCode === 403) {
      userMsg = `Access Denied for bucket "${bucket}". Check that your AWS Access Key ID and Secret Access Key have "s3:ListBucket", "s3:GetObject", and "s3:PutObject" permissions.`;
    } else if (code === 'InvalidAccessKeyId' || code === 'UnrecognizedClientException') {
      userMsg = `Invalid AWS Access Key ID. The key does not exist in AWS.`;
    } else if (code === 'SignatureDoesNotMatch') {
      userMsg = `AWS Secret Access Key is incorrect or signature calculation mismatch.`;
    } else if (code === 'CredentialsProviderError' || err.message?.includes('credentials')) {
      userMsg = `No valid AWS credentials provided. Please enter your AWS Access Key ID & Secret Access Key in the S3 configuration panel.`;
    } else {
      userMsg = err.message || `AWS S3 error (${code})`;
    }

    return {
      success: false,
      message: userMsg,
      bucket,
      region,
      errorCode: String(code),
      errorDetail: err.message,
    };
  }
}

/**
 * Concurrency helper to upload files to S3 in batches
 */
export async function uploadFilesToS3(
  files: {
    name: string;
    content: string;
    kind?: string;
    noteId?: string;
  }[],
  config: S3CredentialsConfig,
): Promise<S3BatchUploadResult> {
  const bucket = (config.bucket || 'int-shaip-bucket').trim();
  const prefix = (config.prefix || 'interns-test-data/SEP8/').replace(/\/+$/, '');
  const presignDays = Math.max(1, Math.min(7, config.presignExpiresDays || 7));
  const expiresSeconds = presignDays * 24 * 60 * 60;

  const s3 = getS3Client(config);
  const items: S3UploadResultItem[] = [];

  let uploadedCount = 0;
  let failedCount = 0;

  // Process files with bounded concurrency (5 workers)
  const CONCURRENCY = 5;
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const basename = file.name.split(/[/\\]/).pop() || file.name;
      const s3Key = `${prefix}/${basename}`;
      
      // Determine content-type
      let contentType = 'text/plain; charset=utf-8';
      if (basename.endsWith('.json')) {
        contentType = 'application/json; charset=utf-8';
      }

      const bodyBuffer = Buffer.from(file.content, 'utf-8');

      try {
        // Upload object to AWS S3
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: bodyBuffer,
            ContentType: contentType,
          }),
        );

        // Generate real AWS S3 Presigned URL
        let presignedUrl = '';
        try {
          presignedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: bucket,
              Key: s3Key,
            }),
            { expiresIn: expiresSeconds },
          );
        } catch (presignErr: any) {
          console.warn(`Presigning failed for ${s3Key}, falling back to HTTPS url:`, presignErr);
          presignedUrl = `https://${bucket}.s3.amazonaws.com/${s3Key}`;
        }

        items.push({
          name: basename,
          kind: file.kind,
          noteId: file.noteId,
          s3Key,
          s3Url: presignedUrl,
          success: true,
          size: bodyBuffer.length,
        });

        uploadedCount++;
      } catch (err: any) {
        console.error(`Failed to upload ${s3Key} to S3:`, err);
        failedCount++;
        items.push({
          name: basename,
          kind: file.kind,
          noteId: file.noteId,
          s3Key,
          success: false,
          error: err.message || 'S3 PutObject failed',
          size: bodyBuffer.length,
        });
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker());
  await Promise.all(workers);

  return {
    success: failedCount === 0 && uploadedCount > 0,
    totalFiles: files.length,
    uploadedCount,
    failedCount,
    bucket,
    prefix,
    items,
  };
}

/**
 * Upload the generated review Excel workbook directly to S3 (matching the Python script)
 */
export async function uploadWorkbookToS3(
  workbookBuffer: Uint8Array,
  config: S3CredentialsConfig,
  filename: string = 'De-Identification — Human-in-the-Loop Text Review.xlsx',
): Promise<{
  success: boolean;
  s3Key: string;
  s3Url: string;
  size: number;
  error?: string;
}> {
  const bucket = (config.bucket || 'int-shaip-bucket').trim();
  const prefix = (config.prefix || 'interns-test-data/SEP8/').replace(/\/+$/, '');
  const s3Key = `${prefix}/${filename}`;
  const presignDays = Math.max(1, Math.min(7, config.presignExpiresDays || 7));
  const expiresSeconds = presignDays * 24 * 60 * 60;

  const s3 = getS3Client(config);
  const buffer = Buffer.from(workbookBuffer);

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );

    let presignedUrl = '';
    try {
      presignedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: bucket,
          Key: s3Key,
        }),
        { expiresIn: expiresSeconds },
      );
    } catch {
      presignedUrl = `https://${bucket}.s3.amazonaws.com/${s3Key}`;
    }

    return {
      success: true,
      s3Key,
      s3Url: presignedUrl,
      size: buffer.length,
    };
  } catch (err: any) {
    console.error(`Failed to upload workbook to S3:`, err);
    return {
      success: false,
      s3Key,
      s3Url: '',
      size: buffer.length,
      error: err.message || 'Failed to upload workbook to S3',
    };
  }
}

/**
 * Maps common file extensions to standard MIME types with inline rendering support
 */
export function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain; charset=utf-8',
    text: 'text/plain; charset=utf-8',
    log: 'text/plain; charset=utf-8',
    json: 'application/json; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
    tsv: 'text/tab-separated-values; charset=utf-8',
    xml: 'application/xml; charset=utf-8',
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    py: 'text/x-python; charset=utf-8',
    js: 'application/javascript; charset=utf-8',
    ts: 'text/typescript; charset=utf-8',
  };
  return map[ext] || 'application/octet-stream';
}

export interface GenericFileInput {
  name: string;
  buffer: Buffer;
  mimeType?: string;
  size?: number;
}

export interface GenericUploadedItem {
  name: string;
  size: number;
  mimeType: string;
  s3Key: string;
  s3Url: string;
  success: boolean;
  error?: string;
  uploadedAt: string;
}

/**
 * Upload ANY arbitrary files (images, PDFs, documents, audio, data files, zips, etc.) to S3
 * and generate authentic inline-onclick openable presigned URLs
 */
export async function uploadAnyFilesToS3(
  files: GenericFileInput[],
  config: S3CredentialsConfig,
): Promise<{
  success: boolean;
  totalFiles: number;
  uploadedCount: number;
  failedCount: number;
  bucket: string;
  prefix: string;
  items: GenericUploadedItem[];
}> {
  const bucket = (config.bucket || 'int-shaip-bucket').trim();
  const prefix = (config.prefix || 'generic-uploads/').replace(/\/+$/, '');
  const presignDays = Math.max(1, Math.min(7, config.presignExpiresDays || 7));
  const expiresSeconds = presignDays * 24 * 60 * 60;

  const s3 = getS3Client(config);
  const items: GenericUploadedItem[] = [];

  let uploadedCount = 0;
  let failedCount = 0;

  const CONCURRENCY = 6;
  const queue = [...files];

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift();
      if (!file) break;

      const basename = file.name.split(/[/\\]/).pop() || file.name;
      const s3Key = prefix ? `${prefix}/${basename}` : basename;
      const mimeType = file.mimeType && file.mimeType !== 'application/octet-stream'
        ? file.mimeType
        : guessMimeType(basename);

      try {
        // Upload object to AWS S3 with inline content-disposition
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: s3Key,
            Body: file.buffer,
            ContentType: mimeType,
            ContentDisposition: `inline; filename="${encodeURIComponent(basename)}"`,
          }),
        );

        // Generate authentic AWS S3 Presigned URL configured for inline browser display
        let presignedUrl = '';
        try {
          presignedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({
              Bucket: bucket,
              Key: s3Key,
              ResponseContentDisposition: `inline; filename="${encodeURIComponent(basename)}"`,
              ResponseContentType: mimeType,
            }),
            { expiresIn: expiresSeconds },
          );
        } catch (presignErr: any) {
          console.warn(`Presigning failed for ${s3Key}, falling back to direct URL:`, presignErr);
          presignedUrl = `https://${bucket}.s3.amazonaws.com/${s3Key}`;
        }

        items.push({
          name: basename,
          size: file.buffer.length,
          mimeType,
          s3Key,
          s3Url: presignedUrl,
          success: true,
          uploadedAt: new Date().toISOString(),
        });

        uploadedCount++;
      } catch (err: any) {
        console.error(`Generic upload failed for ${s3Key}:`, err);
        failedCount++;
        items.push({
          name: basename,
          size: file.buffer.length,
          mimeType,
          s3Key,
          s3Url: '',
          success: false,
          error: err.message || 'S3 PutObject failed',
          uploadedAt: new Date().toISOString(),
        });
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker());
  await Promise.all(workers);

  return {
    success: failedCount === 0 && uploadedCount > 0,
    totalFiles: files.length,
    uploadedCount,
    failedCount,
    bucket,
    prefix,
    items,
  };
}

/**
 * Parses diverse S3 URI/path formats:
 * - s3://bucket-name/folder/file.ext
 * - https://bucket-name.s3.amazonaws.com/folder/file.ext
 * - /folder/file.ext (uses defaultBucket)
 * - folder/file.ext (uses defaultBucket)
 * - bucket-name/folder/file.ext
 */
export function parseS3Uri(
  rawPath: string,
  defaultBucket: string = 'int-shaip-bucket',
): { bucket: string; key: string } {
  let cleaned = (rawPath || '').trim();
  cleaned = cleaned.replace(/^["']|["']$/g, '');

  if (cleaned.startsWith('s3://')) {
    const withoutScheme = cleaned.slice(5);
    const slashIdx = withoutScheme.indexOf('/');
    if (slashIdx !== -1) {
      return {
        bucket: withoutScheme.slice(0, slashIdx),
        key: withoutScheme.slice(slashIdx + 1).replace(/^\/+/, ''),
      };
    }
    return { bucket: withoutScheme, key: '' };
  }

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const url = new URL(cleaned);
      const host = url.hostname;
      if (host.includes('s3.amazonaws.com') || host.includes('.s3.') || host.includes('.s3-')) {
        const hostParts = host.split('.');
        if (hostParts.length >= 4) {
          const bucket = hostParts[0];
          const key = url.pathname.replace(/^\/+/, '');
          return { bucket, key };
        }
        if (host === 's3.amazonaws.com') {
          const pathParts = url.pathname.replace(/^\/+/, '').split('/');
          const bucket = pathParts[0];
          const key = pathParts.slice(1).join('/');
          return { bucket, key };
        }
      }
    } catch {
      // ignore URL parsing error
    }
  }

  const normalized = cleaned.replace(/^\/+/, '');

  if (defaultBucket && normalized.startsWith(`${defaultBucket}/`)) {
    return {
      bucket: defaultBucket,
      key: normalized.slice(defaultBucket.length + 1),
    };
  }

  return {
    bucket: defaultBucket || 'int-shaip-bucket',
    key: normalized,
  };
}

export interface S3PathPresignItem {
  index: number;
  originalRow: Record<string, string>;
  s3Path: string;
  bucket: string;
  key: string;
  fileName: string;
  mimeType: string;
  presignedUrl: string;
  success: boolean;
  error?: string;
}

/**
 * Generates 7-day validity inline-openable presigned URLs for an array of items with s3path
 */
export async function presignS3PathList(
  items: Array<{ s3path: string; rowData?: Record<string, string> }>,
  config: S3CredentialsConfig,
): Promise<{
  success: boolean;
  total: number;
  successfulCount: number;
  failedCount: number;
  items: S3PathPresignItem[];
}> {
  const defaultBucket = (config.bucket || 'int-shaip-bucket').trim();
  const presignDays = 7; // strictly 7 days validity per user prompt
  const expiresSeconds = presignDays * 24 * 60 * 60; // 604,800 seconds
  const s3 = getS3Client(config);

  const results: S3PathPresignItem[] = [];
  let successfulCount = 0;
  let failedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const raw = items[i];
    const s3Path = (raw.s3path || '').trim();
    const rowData = raw.rowData || { s3path: s3Path };

    if (!s3Path) {
      results.push({
        index: i + 1,
        originalRow: rowData,
        s3Path: '',
        bucket: defaultBucket,
        key: '',
        fileName: '',
        mimeType: 'application/octet-stream',
        presignedUrl: '',
        success: false,
        error: 'Empty s3path column',
      });
      failedCount++;
      continue;
    }

    const { bucket, key } = parseS3Uri(s3Path, defaultBucket);
    const basename = key.split(/[/\\]/).pop() || key || 'file';
    const mimeType = guessMimeType(basename);

    try {
      const presignedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          ResponseContentDisposition: `inline; filename="${encodeURIComponent(basename)}"`,
          ResponseContentType: mimeType,
        }),
        { expiresIn: expiresSeconds },
      );

      results.push({
        index: i + 1,
        originalRow: rowData,
        s3Path,
        bucket,
        key,
        fileName: basename,
        mimeType,
        presignedUrl,
        success: true,
      });
      successfulCount++;
    } catch (err: any) {
      console.warn(`Presign fallback for s3path ${s3Path}:`, err.message);
      results.push({
        index: i + 1,
        originalRow: rowData,
        s3Path,
        bucket,
        key,
        fileName: basename,
        mimeType,
        presignedUrl: `https://${bucket}.s3.amazonaws.com/${key}`,
        success: false,
        error: err.message || 'Presign failed',
      });
      failedCount++;
    }
  }

  return {
    success: successfulCount > 0,
    total: items.length,
    successfulCount,
    failedCount,
    items: results,
  };
}

export interface S3DetectedObjectItem {
  key: string;
  name: string;
  size: number;
  lastModified?: string;
  mimeType: string;
  presignedUrl: string;
  success: boolean;
  error?: string;
}

/**
 * Lists all files inside an S3 bucket + prefix using ListObjectsV2
 * and generates 7-day validity inline-onclick presigned URLs
 */
export async function listAndPresignBucketObjects(
  config: S3CredentialsConfig,
  limit: number = 2000,
): Promise<{
  success: boolean;
  bucket: string;
  prefix: string;
  totalFound: number;
  items: S3DetectedObjectItem[];
  error?: string;
}> {
  const bucket = (config.bucket || 'int-shaip-bucket').trim();
  const rawPrefix = (config.prefix || '').trim();
  const prefix = rawPrefix.replace(/^\/+/, '');
  const presignDays = 7; // strictly 7 days validity
  const expiresSeconds = presignDays * 24 * 60 * 60; // 604,800 seconds
  const s3 = getS3Client(config);

  try {
    const detected: Array<{ key: string; size: number; lastModified?: Date }> = [];
    let continuationToken: string | undefined = undefined;

    do {
      const response = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
          MaxKeys: Math.min(1000, limit - detected.length),
        }),
      );

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (!obj.Key) continue;
          // Filter out pure folder marker keys
          if (obj.Key.endsWith('/') && (!obj.Size || obj.Size === 0)) {
            continue;
          }
          detected.push({
            key: obj.Key,
            size: obj.Size ?? 0,
            lastModified: obj.LastModified,
          });
          if (detected.length >= limit) break;
        }
      }

      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
    } while (continuationToken && detected.length < limit);

    const items: S3DetectedObjectItem[] = [];

    // Presign each detected file
    for (const obj of detected) {
      const basename = obj.key.split(/[/\\]/).pop() || obj.key;
      const mimeType = guessMimeType(basename);

      try {
        const presignedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: bucket,
            Key: obj.key,
            ResponseContentDisposition: `inline; filename="${encodeURIComponent(basename)}"`,
            ResponseContentType: mimeType,
          }),
          { expiresIn: expiresSeconds },
        );

        items.push({
          key: obj.key,
          name: basename,
          size: obj.size,
          lastModified: obj.lastModified ? obj.lastModified.toISOString() : undefined,
          mimeType,
          presignedUrl,
          success: true,
        });
      } catch (err: any) {
        items.push({
          key: obj.key,
          name: basename,
          size: obj.size,
          lastModified: obj.lastModified ? obj.lastModified.toISOString() : undefined,
          mimeType,
          presignedUrl: `https://${bucket}.s3.amazonaws.com/${obj.key}`,
          success: false,
          error: err.message || 'Presign failed',
        });
      }
    }

    return {
      success: true,
      bucket,
      prefix,
      totalFound: items.length,
      items,
    };
  } catch (err: any) {
    console.error(`Error in listAndPresignBucketObjects for s3://${bucket}/${prefix}:`, err);
    return {
      success: false,
      bucket,
      prefix,
      totalFound: 0,
      items: [],
      error: err.message || 'Failed to list objects in S3 bucket',
    };
  }
}

/**
 * Generates genuine 7-day validity inline presigned URLs for NoteRecords
 */
export async function presignClinicalRecords(
  records: any[],
  config: S3CredentialsConfig,
): Promise<{
  success: boolean;
  records: any[];
  presignedCount: number;
  message: string;
}> {
  const bucket = (config.bucket || 'int-shaip-bucket').trim();
  const presignDays = config.presignExpiresDays || 7;
  const expiresSeconds = presignDays * 24 * 60 * 60; // 604,800 seconds
  const s3 = getS3Client(config);

  let presignedCount = 0;

  for (const record of records) {
    const fileSlots = ['raw_txt', 'deid_json', 'deid_txt'] as const;
    for (const slot of fileSlots) {
      const fileObj = record[slot];
      if (!fileObj || !fileObj.s3Key) continue;

      const cleanKey = fileObj.s3Key.replace(/^\/+/, '');
      const basename = fileObj.name || cleanKey.split(/[/\\]/).pop() || 'file';
      const mimeType = guessMimeType(basename);

      try {
        const presignedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: bucket,
            Key: cleanKey,
            ResponseContentDisposition: `inline; filename="${encodeURIComponent(basename)}"`,
            ResponseContentType: mimeType,
          }),
          { expiresIn: expiresSeconds },
        );
        fileObj.s3Url = presignedUrl;
        presignedCount++;
      } catch (err: any) {
        console.warn(`Presigning failed for ${cleanKey}, using clean URL:`, err.message);
        fileObj.s3Url = `https://${bucket}.s3.amazonaws.com/${cleanKey}`;
      }
    }
  }

  return {
    success: true,
    records,
    presignedCount,
    message: `Generated real presigned URLs for ${presignedCount} file links (expires in ${presignDays} days).`,
  };
}


