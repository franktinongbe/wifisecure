import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';

export const MAX_NEWS_FILE_BYTES = 50 * 1024 * 1024;
const NEWS_FILE_CONTENT_TYPE = 'application/octet-stream';
const SAFE_IMAGE_TYPES: Record<string, string> = {
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export function newsImageContentType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  return SAFE_IMAGE_TYPES[extension] ?? null;
}

function storageHeaders(extra?: Record<string, string>) {
  return {
    apikey: env.supabaseSecretKey,
    ...extra,
  };
}

function storageObjectUrl(path: string) {
  const bucket = encodeURIComponent(env.supabaseNewsBucket);
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  return `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${bucket}/${encodedPath}`;
}

let bucketSetup: Promise<void> | null = null;

async function configureNewsBucket() {
  if (!env.supabaseUrl || !env.supabaseSecretKey || !env.supabaseNewsBucket) throw new Error('NEWS_STORAGE_NOT_CONFIGURED');
  if (!bucketSetup) {
    bucketSetup = (async () => {
      const baseUrl = `${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/bucket`;
      const headers = storageHeaders({ 'Content-Type': 'application/json' });
      const settings = { public: false, allowed_mime_types: null };
      // Check existence first. Supabase Storage currently answers a missing
      // bucket with HTTP 400 and a NoSuchBucket payload, not necessarily 404.
      let check: Response;
      try {
        check = await fetch(`${baseUrl}/${encodeURIComponent(env.supabaseNewsBucket)}`, {
          method: 'GET', headers, signal: AbortSignal.timeout(30_000),
        });
      } catch {
        throw new Error('NEWS_BUCKET_SETUP_CONNECTION_FAILED');
      }
      const checkError = check.ok ? '' : await safeStorageError(check);
      if (check.ok) {
        let update: Response;
        try {
          update = await fetch(`${baseUrl}/${encodeURIComponent(env.supabaseNewsBucket)}`, {
            method: 'PUT', headers, body: JSON.stringify(settings), signal: AbortSignal.timeout(30_000),
          });
        } catch {
          throw new Error('NEWS_BUCKET_SETUP_CONNECTION_FAILED');
        }
        if (update.ok) return;
        console.error(`News bucket configuration failed (${update.status}): ${await safeStorageError(update)}`);
        throw new Error(`NEWS_BUCKET_SETUP_FAILED_${update.status}`);
      }
      const bucketMissing = check.status === 404 || /NoSuchBucket|Bucket not found/i.test(checkError);
      if (!bucketMissing) {
        console.error(`News bucket lookup failed (${check.status}): ${checkError}`);
        throw new Error(`NEWS_BUCKET_SETUP_FAILED_${check.status}`);
      }
      let create: Response;
      try {
        create = await fetch(baseUrl, {
          method: 'POST', headers,
          body: JSON.stringify({ id: env.supabaseNewsBucket, name: env.supabaseNewsBucket, ...settings }),
          signal: AbortSignal.timeout(30_000),
        });
      } catch {
        throw new Error('NEWS_BUCKET_SETUP_CONNECTION_FAILED');
      }
      if (create.ok || create.status === 409) return;
      console.error(`News bucket creation failed (${create.status}): ${await safeStorageError(create)}`);
      throw new Error(`NEWS_BUCKET_SETUP_FAILED_${create.status}`);
    })().catch((error) => {
      bucketSetup = null;
      throw error;
    });
  }
  await bucketSetup;
}

async function safeStorageError(response: Response) {
  try {
    // Storage error payloads contain diagnostics, not request headers or keys.
    return (await response.text()).replace(/[\r\n\t]+/g, ' ').slice(0, 400);
  } catch {
    return 'No response body';
  }
}

export function sanitizeNewsFileName(value: string | undefined) {
  let decoded = value ?? 'document';
  try { decoded = decodeURIComponent(decoded); } catch { /* Keep the original header if malformed. */ }
  return decoded.replace(/[\\/\0-\x1f\x7f]/g, '_').trim().slice(0, 255) || 'document';
}

export async function uploadNewsFile(newsPostId: string, fileName: string, contentType: string, bytes: Buffer) {
  if (!env.supabaseUrl || !env.supabaseSecretKey || !env.supabaseNewsBucket) throw new Error('NEWS_STORAGE_NOT_CONFIGURED');
  if (bytes.length > MAX_NEWS_FILE_BYTES) throw new Error('NEWS_FILE_SIZE_INVALID');
  await configureNewsBucket();
  const storagePath = `actualites/${newsPostId}/${randomUUID()}`;
  let response: Response;
  try {
    response = await fetch(storageObjectUrl(storagePath), {
      method: 'POST',
      headers: storageHeaders({ 'Content-Type': NEWS_FILE_CONTENT_TYPE, 'x-upsert': 'false' }),
      body: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      signal: AbortSignal.timeout(120_000),
    });
  } catch {
    throw new Error('NEWS_STORAGE_UNAVAILABLE');
  }
  if (!response.ok) {
    console.error(`News file upload failed (${response.status}): ${await safeStorageError(response)}`);
    if (response.status === 404) throw new Error('NEWS_STORAGE_BUCKET_MISSING');
    throw new Error(`NEWS_FILE_UPLOAD_FAILED_${response.status}`);
  }
  return storagePath;
}

export async function removeNewsFile(storagePath: string) {
  if (!env.supabaseUrl || !env.supabaseSecretKey || !env.supabaseNewsBucket) throw new Error('NEWS_STORAGE_NOT_CONFIGURED');
  const bucket = encodeURIComponent(env.supabaseNewsBucket);
  const response = await fetch(`${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${bucket}`, {
    method: 'DELETE',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: [storagePath] }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok && response.status !== 404) {
    console.error(`News file removal failed (${response.status}).`);
    throw new Error('NEWS_FILE_DELETE_FAILED');
  }
}

export async function downloadNewsFile(storagePath: string) {
  if (!env.supabaseUrl || !env.supabaseSecretKey || !env.supabaseNewsBucket) throw new Error('NEWS_STORAGE_NOT_CONFIGURED');
  const response = await fetch(`${env.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/authenticated/${encodeURIComponent(env.supabaseNewsBucket)}/${storagePath.split('/').map(encodeURIComponent).join('/')}`, {
    headers: storageHeaders(),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    console.error(`News file download failed (${response.status}).`);
    throw new Error(response.status === 404 ? 'NEWS_FILE_NOT_FOUND' : 'NEWS_FILE_DOWNLOAD_FAILED');
  }
  return response;
}
