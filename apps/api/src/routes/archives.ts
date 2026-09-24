import { Router, type Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { downloadArchive, isArchiveConfigured, listArchives } from '../services/archiveService.js';

const router = Router();
const archiveErrors: Record<string, { status: number; message: string }> = {
  ARCHIVE_STORAGE_NOT_CONFIGURED: { status: 503, message: 'Le stockage des archives n’est pas configuré.' },
  ARCHIVE_BUCKET_MISSING: { status: 503, message: 'Le bucket privé connection-archives doit être créé dans Supabase Storage.' },
  ARCHIVE_LIST_FAILED: { status: 502, message: 'Impossible de récupérer la liste des archives.' },
  ARCHIVE_DOWNLOAD_FAILED: { status: 502, message: 'Impossible de télécharger cette archive.' },
  ARCHIVE_NOT_FOUND: { status: 404, message: 'Archive introuvable.' },
};

function sendArchiveError(res: Response, error: unknown) {
  const code = error instanceof Error ? error.message : '';
  const result = archiveErrors[code] ?? { status: 500, message: 'Erreur lors de l’accès aux archives.' };
  return res.status(result.status).json({ message: result.message });
}

router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  if (!isArchiveConfigured()) return res.status(503).json({ message: 'Le stockage des archives n’est pas configuré.' });
  try {
    return res.json({ configured: true, bucket: 'connection-archives', items: await listArchives() });
  } catch (error) {
    return sendArchiveError(res, error);
  }
});

router.get('/:date/download', requireAuth, requireRole('admin'), async (req, res) => {
  const date = Array.isArray(req.params.date) ? req.params.date[0] : req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return res.status(400).json({ message: 'Date d’archive invalide.' });
  }
  try {
    const archive = await downloadArchive(date);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${date}.json"`);
    return res.send(Buffer.from(await archive.arrayBuffer()));
  } catch (error) {
    return sendArchiveError(res, error);
  }
});

export default router;
