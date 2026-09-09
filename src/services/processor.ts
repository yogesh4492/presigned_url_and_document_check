import {
  NoteFile,
  NoteRecord,
  RawEntity,
  RAW_DETAIL_COLUMNS,
  RAW_TO_DETAIL,
} from '../types';

export function noteIdForPath(filename: string): string {
  const name = filename.split(/[/\\]/).pop() || filename;
  if (name.endsWith('_raw.txt')) {
    return name.slice(0, -'_raw.txt'.length);
  }
  if (name.endsWith('.deid_raw.json')) {
    return name.slice(0, -'.deid_raw.json'.length);
  }
  if (name.endsWith('.deid.json')) {
    return name.slice(0, -'.deid.json'.length);
  }
  if (name.endsWith('.txt')) {
    return name.slice(0, -'.txt'.length);
  }
  const dotIndex = name.lastIndexOf('.');
  return dotIndex > 0 ? name.slice(0, dotIndex) : name;
}

export function noteIdForJson(content: string): string | null {
  try {
    const data = JSON.parse(content.replace(/^\uFEFF/, '')); // handle UTF-8 BOM
    for (const key of ['raw_note_id', 'raw_filename', 'doc_id']) {
      const val = data[key];
      if (val) {
        return noteIdForPath(String(val));
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function countRedactions(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  const regex = /\[(redacted-[^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const tag = match[1];
    counts[tag] = (counts[tag] || 0) + 1;
  }
  return counts;
}

export function categoryMapForRawEntities(
  rawEntities: RawEntity[],
): Record<string, { count: number; texts: string[] }> {
  const buckets: Record<string, string[]> = {};
  const counts: Record<string, number> = {};

  for (const col of RAW_DETAIL_COLUMNS) {
    buckets[col] = [];
    counts[col] = 0;
  }

  for (const entity of rawEntities) {
    const coarse = String(entity.coarse || entity.type || entity.label || '').toUpperCase();
    const text = String(entity.text || entity.value || '').trim();
    if (!text) continue;

    const detailKey = RAW_TO_DETAIL[coarse] || (RAW_DETAIL_COLUMNS.includes(coarse as any) ? coarse : null);
    if (!detailKey || !buckets[detailKey]) continue;

    counts[detailKey] = (counts[detailKey] || 0) + 1;
    if (!buckets[detailKey].includes(text)) {
      buckets[detailKey].push(text);
    }
  }

  const result: Record<string, { count: number; texts: string[] }> = {};
  for (const col of RAW_DETAIL_COLUMNS) {
    result[col] = {
      count: counts[col] || 0,
      texts: buckets[col] || [],
    };
  }
  return result;
}

export function determineFileKind(filename: string): 'raw_txt' | 'deid_json' | 'deid_txt' | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('_raw.txt')) {
    return 'raw_txt';
  }
  if (lower.endsWith('.deid.json') || lower.endsWith('.deid_raw.json')) {
    return 'deid_json';
  }
  if (lower.endsWith('.txt')) {
    return 'deid_txt';
  }
  return null;
}

export function generateS3PresignedUrl(
  bucket: string,
  key: string,
  expiresSeconds: number = 7 * 24 * 60 * 60,
): string {
  const cleanBucket = bucket.trim() || 'int-shaip-bucket';
  const cleanKey = key.replace(/^\/+/, '');
  const expiryTimestamp = Math.floor(Date.now() / 1000) + expiresSeconds;
  
  // Format standard AWS S3 presigned signature mock/real parameter structure
  const fakeSig = Array.from({ length: 28 }, () =>
    '0123456789abcdef'[Math.floor(Math.random() * 16)],
  ).join('');

  return `https://${cleanBucket}.s3.amazonaws.com/${cleanKey}?AWSAccessKeyId=AKIAIOSFODNN7EXAMPLE&Signature=${fakeSig}%3D&Expires=${expiryTimestamp}`;
}

export function processRawFileList(
  files: { name: string; content: string; size?: number }[],
  s3Bucket: string = 'int-shaip-bucket',
  s3Prefix: string = 'interns-test-data/SEP8/',
  presignExpiresDays: number = 7,
): {
  records: NoteRecord[];
  allDetectedTags: string[];
} {
  const tempMap: Record<string, { raw_txt?: NoteFile; deid_json?: NoteFile; deid_txt?: NoteFile }> = {};

  const cleanPrefix = s3Prefix.replace(/\/+$/, '');
  const expiresSeconds = presignExpiresDays * 24 * 60 * 60;

  for (const f of files) {
    // Ignore lock files or hidden files
    const basename = f.name.split(/[/\\]/).pop() || f.name;
    if (basename.startsWith('.~lock.') || basename.startsWith('.')) continue;

    const kind = determineFileKind(f.name);
    if (!kind) continue;

    let noteId: string | null = null;
    if (kind === 'deid_json') {
      noteId = noteIdForJson(f.content);
    }
    if (!noteId) {
      noteId = noteIdForPath(f.name);
    }

    if (!tempMap[noteId]) {
      tempMap[noteId] = {};
    }

    const s3Key = `${cleanPrefix}/${basename}`;
    const s3Url = generateS3PresignedUrl(s3Bucket, s3Key, expiresSeconds);

    tempMap[noteId][kind] = {
      name: basename,
      kind,
      content: f.content,
      size: f.size || f.content.length,
      s3Key,
      s3Url,
    };
  }

  const allDetectedTagsSet = new Set<string>();
  const records: NoteRecord[] = [];

  for (const [noteId, group] of Object.entries(tempMap)) {
    const missingKinds: ('raw_txt' | 'deid_json' | 'deid_txt')[] = [];
    if (!group.raw_txt) missingKinds.push('raw_txt');
    if (!group.deid_json) missingKinds.push('deid_json');
    if (!group.deid_txt) missingKinds.push('deid_txt');

    const isComplete = missingKinds.length === 0;

    let redactionCounts: Record<string, number> = {};
    let totalRedacted = 0;
    let uniqueTagsCount = 0;

    if (group.deid_txt) {
      redactionCounts = countRedactions(group.deid_txt.content);
      Object.keys(redactionCounts).forEach((t) => allDetectedTagsSet.add(t));
      totalRedacted = Object.values(redactionCounts).reduce((acc, v) => acc + v, 0);
      uniqueTagsCount = Object.keys(redactionCounts).length;
    }

    let parsedJson: any = null;
    let entityBuckets: Record<string, { count: number; texts: string[] }> | undefined;

    if (group.deid_json) {
      try {
        parsedJson = JSON.parse(group.deid_json.content.replace(/^\uFEFF/, ''));
        const entities: RawEntity[] = parsedJson.entities || parsedJson.raw_entities || [];
        entityBuckets = categoryMapForRawEntities(entities);
      } catch {
        // ignore json parse error for corrupt json
      }
    }

    records.push({
      noteId,
      raw_txt: group.raw_txt,
      deid_json: group.deid_json,
      deid_txt: group.deid_txt,
      jsonData: parsedJson,
      isComplete,
      missingKinds,
      redactionCounts,
      totalRedacted,
      uniqueTagsCount,
      entityBuckets,
    });
  }

  // Sort notes alphabetically by noteId
  records.sort((a, b) => a.noteId.localeCompare(b.noteId, undefined, { numeric: true }));

  const allDetectedTags = Array.from(allDetectedTagsSet).sort();

  return {
    records,
    allDetectedTags,
  };
}
