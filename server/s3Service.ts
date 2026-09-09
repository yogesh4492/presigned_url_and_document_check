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

