import { prisma } from '../lib/db.js';
import { env } from '../config/env.js';

const BENIN_OFFSET_MS = 60 * 60 * 1000;
const STORAGE_TIMEOUT_MS = 30_000;

function beninDate(date: Date) {
  return new Date(date.getTime() + BENIN_OFFSET_MS).toISOString().slice(0, 10);
}

function beninDayBounds(day: string) {
  const [year, month, date] = day.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, date) - BENIN_OFFSET_MS);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

function storageConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseSecretKey && env.supabaseArchiveBucket);
}

function objectUrl(operation: 'list' | 'upload' | 'download', objectPath = '') {
  const base = env.supabaseUrl.replace(/\/$/, '');
  const bucket = encodeURIComponent(env.supabaseArchiveBucket);
  const encodedPath = objectPath.split('/').map(encodeURIComponent).join('/');
  if (operation === 'list') return `${base}/storage/v1/object/list/${bucket}`;
  if (operation === 'upload') return `${base}/storage/v1/object/${bucket}/${encodedPath}`;
  return `${base}/storage/v1/object/authenticated/${bucket}/${encodedPath}`;
}

function storageHeaders(extra?: Record<string, string>) {
  return {
    apikey: env.supabaseSecretKey,
    ...extra,
  };
}

async function storageFetch(url: string, init?: RequestInit) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(STORAGE_TIMEOUT_MS) });
}

export function isArchiveConfigured() {
  return storageConfigured();
}

export async function archiveDay(day: string, organizationId: string, organizationSlug: string) {
  if (!storageConfigured()) throw new Error('ARCHIVE_STORAGE_NOT_CONFIGURED');

  const { start, end } = beninDayBounds(day);
  const sessions = await prisma.session.findMany({
    where: { organizationId, debut: { gte: start, lt: end } },
    orderBy: { debut: 'asc' },
    include: { alerts: { orderBy: { createdAt: 'asc' } } },
  });
  const archive = {
    format: 'wifisecure-connection-history-v1',
    date: day,
    timezone: 'Africa/Porto-Novo',
    generatedAt: new Date().toISOString(),
    sessionCount: sessions.length,
    alertCount: sessions.reduce((count, item) => count + item.alerts.length, 0),
    sessions: sessions.map((item) => ({
      ...item,
      volumeOctets: item.volumeOctets.toString(),
    })),
  };

  const response = await storageFetch(objectUrl('upload', organizationSlug === 'legacy' ? `${day}.json` : `${organizationSlug}/${day}.json`), {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json', 'x-upsert': 'true' }),
    body: JSON.stringify(archive),
  });
  if (!response.ok) {
    console.error(`Archive upload failed (${response.status}).`);
    throw new Error(response.status === 404 ? 'ARCHIVE_BUCKET_MISSING' : 'ARCHIVE_UPLOAD_FAILED');
  }
  return { day, sessionCount: archive.sessionCount, alertCount: archive.alertCount };
}

export async function listArchives(organizationSlug: string) {
  if (!storageConfigured()) throw new Error('ARCHIVE_STORAGE_NOT_CONFIGURED');
  const response = await storageFetch(objectUrl('list'), {
    method: 'POST',
    headers: storageHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefix: organizationSlug === 'legacy' ? '' : `${organizationSlug}/`, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'desc' } }),
  });
  if (!response.ok) {
    console.error(`Archive listing failed (${response.status}).`);
    throw new Error(response.status === 404 ? 'ARCHIVE_BUCKET_MISSING' : 'ARCHIVE_LIST_FAILED');
  }
  const files = await response.json() as Array<{ name?: string; id?: string; updated_at?: string; created_at?: string; metadata?: { size?: number } }>;
  return files
    .filter((file) => (organizationSlug === 'legacy' ? /^\d{4}-\d{2}-\d{2}\.json$/ : /^\d{4}-\d{2}-\d{2}\.json$/).test((file.name ?? '').replace(`${organizationSlug}/`, '')))
    .map((file) => ({
      date: file.name!.replace(`${organizationSlug}/`, '').slice(0, 10),
      name: file.name!,
      updatedAt: file.updated_at ?? file.created_at ?? null,
      size: file.metadata?.size ?? null,
    }));
}

export async function downloadArchive(day: string, organizationSlug: string) {
  if (!storageConfigured()) throw new Error('ARCHIVE_STORAGE_NOT_CONFIGURED');
  const response = await storageFetch(objectUrl('download', organizationSlug === 'legacy' ? `${day}.json` : `${organizationSlug}/${day}.json`), {
    headers: storageHeaders(),
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error('ARCHIVE_NOT_FOUND');
    console.error(`Archive download failed (${response.status}).`);
    throw new Error('ARCHIVE_DOWNLOAD_FAILED');
  }
  return response;
}

let scheduled = false;
let runningDay: string | null = null;

async function archivePreviousDay() {
  const today = beninDate(new Date());
  const { start } = beninDayBounds(today);
  const previousDay = beninDate(new Date(start.getTime() - 1));
  if (runningDay === previousDay) return;
  runningDay = previousDay;
  try {
    const organizations = await prisma.organization.findMany({ select: { id: true, slug: true } });
    for (const organization of organizations) {
      try { await archiveDay(previousDay, organization.id, organization.slug); }
      catch (error) { console.error(`Daily archive failed for ${organization.slug}/${previousDay}: ${error instanceof Error ? error.message : 'unknown error'}`); }
    }
    console.info(`Connection history archived for ${previousDay} across ${organizations.length} structure(s).`);
  } catch (error) {
    console.error(`Daily connection archive failed for ${previousDay}: ${error instanceof Error ? error.message : 'unknown error'}`);
  } finally {
    runningDay = null;
  }
}

function scheduleNextArchive() {
  const now = new Date();
  const today = beninDate(now);
  const { start } = beninDayBounds(today);
  const nextMidnightUtc = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const delay = Math.max(1000, nextMidnightUtc.getTime() - now.getTime());
  setTimeout(() => {
    void archivePreviousDay().finally(scheduleNextArchive);
  }, delay).unref();
}

export function startDailyArchiveScheduler() {
  if (scheduled) return;
  scheduled = true;
  if (!storageConfigured()) {
    console.warn('Daily connection archive is disabled: Supabase Storage credentials are missing.');
    return;
  }
  void archivePreviousDay();
  scheduleNextArchive();
}
