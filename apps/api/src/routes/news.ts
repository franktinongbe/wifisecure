import express, { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { asyncHandler } from '../lib/async-handler.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { downloadNewsFile, MAX_NEWS_FILE_BYTES, newsImageContentType, removeNewsFile, sanitizeNewsFileName, uploadNewsFile } from '../services/newsAttachmentService.js';

const router = Router();
const postSchema = z.object({
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().max(360).optional().nullable(),
  content: z.string().trim().min(10).max(20_000),
  published: z.boolean().optional(),
});

router.get('/', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const isAdmin = req.user?.role === 'admin';
  const items = await prisma.newsPost.findMany({
    where: isAdmin ? {} : { published: true },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    include: { author: { select: { fullName: true } }, attachments: { orderBy: { createdAt: 'asc' } } },
  });
  return res.json(items);
}));

router.post('/', requireAuth, requireRole('admin'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Vérifiez le titre, le résumé et le contenu.', errors: parsed.error.flatten() });
  const published = parsed.data.published ?? false;
  const item = await prisma.newsPost.create({
    data: {
      title: parsed.data.title,
      summary: parsed.data.summary?.trim() || null,
      content: parsed.data.content,
      published,
      publishedAt: published ? new Date() : null,
      createdBy: req.user!.id,
    },
    include: { author: { select: { fullName: true } }, attachments: { orderBy: { createdAt: 'asc' } } },
  });
  return res.status(201).json(item);
}));

router.put('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Vérifiez le titre, le résumé et le contenu.', errors: parsed.error.flatten() });
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const existing = await prisma.newsPost.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!existing) return res.status(404).json({ message: 'Actualité introuvable.' });
  const published = parsed.data.published ?? false;
  const item = await prisma.newsPost.update({
    where: { id },
    data: {
      title: parsed.data.title,
      summary: parsed.data.summary?.trim() || null,
      content: parsed.data.content,
      published,
      publishedAt: published ? (existing.publishedAt ?? new Date()) : null,
    },
    include: { author: { select: { fullName: true } }, attachments: { orderBy: { createdAt: 'asc' } } },
  });
  return res.json(item);
}));

router.post('/:id/attachments', requireAuth, requireRole('admin'), express.raw({
  type: 'application/octet-stream',
  limit: '50mb',
}), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const newsPostId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const contentType = newsImageContentType(sanitizeNewsFileName(req.header('x-file-name'))) ?? 'application/octet-stream';
  if (!Buffer.isBuffer(req.body)) return res.status(400).json({ message: 'Fichier manquant.' });
  if (req.body.length > MAX_NEWS_FILE_BYTES) return res.status(413).json({ message: 'Chaque fichier doit peser 50 Mo maximum.' });

  const newsPost = await prisma.newsPost.findUnique({ where: { id: newsPostId }, select: { id: true } });
  if (!newsPost) return res.status(404).json({ message: 'Actualité introuvable.' });
  const fileName = sanitizeNewsFileName(req.header('x-file-name'));
  let storagePath: string;
  try {
    storagePath = await uploadNewsFile(newsPostId, fileName, contentType, req.body);
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'NEWS_STORAGE_NOT_CONFIGURED') return res.status(503).json({ message: 'Le stockage des fichiers n’est pas configuré côté API.' });
    if (code === 'NEWS_STORAGE_BUCKET_MISSING') return res.status(503).json({ message: 'Le bucket privé configuré dans SUPABASE_NEWS_BUCKET est introuvable.' });
    if (code === 'NEWS_BUCKET_SETUP_CONNECTION_FAILED') return res.status(502).json({ message: 'La connexion à l’API Storage Supabase a échoué pendant la configuration du bucket.' });
    const setupStatus = code.match(/^NEWS_BUCKET_SETUP_FAILED_(\d{3})$/)?.[1];
    if (setupStatus === '401' || setupStatus === '403') return res.status(502).json({ message: 'Supabase refuse la configuration du bucket. Vérifiez la clé secrète SUPABASE_SECRET_KEY.' });
    if (setupStatus === '400') return res.status(502).json({ message: 'Supabase refuse les réglages du bucket. Vérifiez que Storage est activé et que les paramètres du projet autorisent ce bucket.' });
    if (setupStatus) return res.status(502).json({ message: `La configuration du bucket Supabase a échoué (HTTP ${setupStatus}).` });
    if (code === 'NEWS_STORAGE_UNAVAILABLE') return res.status(502).json({ message: 'L’API ne parvient pas à joindre Supabase Storage. Vérifiez la connexion réseau du serveur.' });
    const status = code.match(/^NEWS_FILE_UPLOAD_FAILED_(\d{3})$/)?.[1];
    if (status === '401' || status === '403') return res.status(502).json({ message: 'Supabase Storage a refusé l’accès. Vérifiez que SUPABASE_SECRET_KEY est la clé secrète du même projet Supabase.' });
    if (status === '400') return res.status(502).json({ message: 'Supabase Storage a refusé le fichier. Vérifiez les limites du projet et du bucket.' });
    if (status === '413') return res.status(413).json({ message: 'La limite de taille du projet ou du bucket Supabase est inférieure à la taille de ce fichier.' });
    return res.status(502).json({ message: 'Supabase Storage n’a pas accepté le fichier. Vérifiez le bucket et ses limites.' });
  }
  try {
    const attachment = await prisma.newsAttachment.create({
      data: { newsPostId, fileName, storagePath, contentType, sizeBytes: req.body.length },
    });
    return res.status(201).json(attachment);
  } catch (error) {
    await removeNewsFile(storagePath).catch(() => undefined);
    throw error;
  }
}));

router.delete('/:id/attachments/:attachmentId', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const newsPostId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const attachmentId = Array.isArray(req.params.attachmentId) ? req.params.attachmentId[0] : req.params.attachmentId;
  const attachment = await prisma.newsAttachment.findFirst({ where: { id: attachmentId, newsPostId } });
  if (!attachment) return res.status(404).json({ message: 'Fichier introuvable.' });
  await removeNewsFile(attachment.storagePath);
  await prisma.newsAttachment.delete({ where: { id: attachment.id } });
  return res.json({ message: 'Fichier supprimé.' });
}));

router.get('/:id/attachments/:attachmentId/preview', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const newsPostId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const attachmentId = Array.isArray(req.params.attachmentId) ? req.params.attachmentId[0] : req.params.attachmentId;
  const item = await prisma.newsPost.findUnique({
    where: { id: newsPostId },
    include: { attachments: { where: { id: attachmentId } } },
  });
  const attachment = item?.attachments[0];
  if (!item || !attachment || (!item.published && req.user?.role !== 'admin')) {
    return res.status(404).json({ message: 'Fichier introuvable.' });
  }
  const contentType = newsImageContentType(attachment.fileName);
  if (!contentType) return res.status(415).json({ message: 'Seules les images peuvent être affichées.' });
  const file = await downloadNewsFile(attachment.storagePath);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.setHeader('Cache-Control', 'private, no-store');
  return res.send(Buffer.from(await file.arrayBuffer()));
}));

router.get('/:id/attachments/:attachmentId/download', requireAuth, requireRole('admin'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const newsPostId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const attachmentId = Array.isArray(req.params.attachmentId) ? req.params.attachmentId[0] : req.params.attachmentId;
  const item = await prisma.newsPost.findUnique({
    where: { id: newsPostId },
    include: { attachments: { where: { id: attachmentId } } },
  });
  const attachment = item?.attachments[0];
  if (!item || !attachment || (!item.published && req.user?.role !== 'admin')) {
    return res.status(404).json({ message: 'Fichier introuvable.' });
  }
  const file = await downloadNewsFile(attachment.storagePath);
  const safeName = encodeURIComponent(attachment.fileName).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName.replace(/[^\x20-\x7E]|["\\]/g, '_')}"; filename*=UTF-8''${safeName}`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.send(Buffer.from(await file.arrayBuffer()));
}));

router.delete('/:id', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const item = await prisma.newsPost.findUnique({ where: { id }, include: { attachments: true } });
  if (!item) return res.status(404).json({ message: 'Actualité introuvable.' });
  for (const attachment of item.attachments) {
    await removeNewsFile(attachment.storagePath);
    await prisma.newsAttachment.delete({ where: { id: attachment.id } });
  }
  await prisma.newsPost.delete({ where: { id } });
  return res.json({ message: 'Actualité supprimée.' });
}));

export default router;
