export interface NoteFile {
  name: string;
  kind: 'raw_txt' | 'deid_json' | 'deid_txt';
  content: string;
  size?: number;
  s3Key?: string;
  s3Url?: string;
}

export interface RawEntity {
  coarse?: string;
  text?: string;
  start?: number;
  end?: number;
  confidence?: number;
  [key: string]: any;
}

export interface DeidJsonData {
  raw_note_id?: string;
  raw_filename?: string;
  doc_id?: string;
  entities?: RawEntity[];
  raw_entities?: RawEntity[];
  phi?: Record<string, any>;
  [key: string]: any;
}

export interface NoteRecord {
  noteId: string;
  raw_txt?: NoteFile;
  deid_json?: NoteFile;
  deid_txt?: NoteFile;
  jsonData?: DeidJsonData;
  isComplete: boolean;
  missingKinds: ('raw_txt' | 'deid_json' | 'deid_txt')[];
  redactionCounts: Record<string, number>;
  totalRedacted: number;
  uniqueTagsCount: number;
  entityBuckets?: Record<string, { count: number; texts: string[] }>;
}

export interface S3Config {
  bucket: string;
  prefix: string;
  presignExpiresDays: number;
  awsRegion?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  uploadToS3: boolean;
}

export interface S3UploadStats {
  timestamp: string;
  totalFiles: number;
  uploadedCount: number;
  failedCount: number;
  bucket: string;
  prefix: string;
  workbookUpload?: {
    s3Key: string;
    s3Url: string;
    size: number;
  };
}

export interface PipelineStats {
  totalNotes: number;
  completeGroups: number;
  incompleteGroups: number;
  totalRedactions: number;
  uniqueDetectedTags: string[];
  uploadedFilesCount: number;
  skippedFilesCount: number;
  processingTimeMs: number;
}

export interface PipelineLog {
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
}

export const DETAIL_COLUMNS = [
  '[PERSON_NAME]',
  '[HOSPITAL_NAME]',
  '[ORG_NAME]',
  '[DATE]',
  '[LOCATION]',
  '[ROOM_NO]',
  '[ID]',
  '[TELEPHONE_NO]',
  '[EMAIL_ID]',
  '[WEB_URL]',
  '[SEASON]',
] as const;

export const RAW_DETAIL_COLUMNS = [
  'PERSON_NAME',
  'HOSPITAL_NAME',
  'ORG_NAME',
  'DATE',
  'LOCATION',
  'ROOM_NO',
  'ID',
  'TELEPHONE_NO',
  'EMAIL_ID',
  'WEB_URL',
  'SEASON',
] as const;

export const RAW_TO_DETAIL: Record<string, string> = {
  NAME: 'PERSON_NAME',
  DATE: 'DATE',
  DATE_TIME: 'DATE',
  LOCATION: 'LOCATION',
  ID: 'ID',
  EMAIL: 'EMAIL_ID',
  ROOM: 'ROOM_NO',
  PHONE: 'TELEPHONE_NO',
  URL: 'WEB_URL',
  ORGANIZATION: 'ORG_NAME',
  HOSPITAL: 'HOSPITAL_NAME',
};
