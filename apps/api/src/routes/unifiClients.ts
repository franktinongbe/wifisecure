import { createHash, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../lib/async-handler.js';
import { prisma } from '../lib/db.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { listUniFiClients, syncUniFiClients } from '../services/unifiClientService.js';

const router = Router();

const syncSchema = z.object({
  siteId: z.string().min(1).max(200),
  clients: z.array(z.object({
    id: z.string().min(1).max(200),
    name: z.string().max(300).optional(),
    type: z.string().max(80).optional(),
    ipAddress: z.string().max(64).optional(),
    macAddress: z.string().max(64).optional(),
    connectedAt: z.string().datetime({ offset: true }).optional(),
  })).max(10000),
});

router.post('/sync', asyncHandler(async (req, res) => {
  const organizationSlug = req.header('x-wifi-organization') ?? 'legacy';
  const providedToken = req.header('x-wifi-ingest-token') ?? '';
  const organization = await prisma.organization.findUnique({
    where: { slug: organizationSlug },
    select: { id: true, ingestTokenHash: true },
  });
  if (!organization) return res.status(404).json({ message: 'Structure inconnue.' });

  const expected = organizationSlug === 'legacy'
    ? Buffer.from(env.wifiIngestToken)
    : Buffer.from(organization.ingestTokenHash, 'hex');
  const provided = organizationSlug === 'legacy'
    ? Buffer.from(providedToken)
    : createHash('sha256').update(providedToken).digest();
  if (!expected.length) return res.status(503).json({ message: 'La collecte réseau n’est pas configurée.' });
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return res.status(401).json({ message: 'Clé de collecte invalide.' });
  }

  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Inventaire UniFi invalide.' });

  const result = await syncUniFiClients(organization.id, parsed.data.siteId, parsed.data.clients);
  return res.status(200).json(result);
}));

router.get('/clients', requireAuth, requireRole('admin'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const siteId = typeof req.query.siteId === 'string' ? req.query.siteId : undefined;
  res.json(await listUniFiClients(req.user!.organizationId, siteId));
}));

export default router;