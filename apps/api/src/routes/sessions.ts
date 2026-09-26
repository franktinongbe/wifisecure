import { Router } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { listSessions, ingestSession } from '../services/sessionService.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/db.js';
import { env } from '../config/env.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), async (req: any, res) => {
  const query = req.query;
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 20);

  const result = await listSessions({
    organizationId: req.user.organizationId,
    page,
    pageSize,
    dateFrom: typeof query.dateFrom === 'string' ? query.dateFrom : undefined,
    dateTo: typeof query.dateTo === 'string' ? query.dateTo : undefined,
    status: typeof query.status === 'string' && (query.status === 'normal' || query.status === 'needs_review')
      ? query.status
      : undefined,
  });

  res.json(result);
});

const ingestSchema = z.object({
  identifiant_usager: z.string().min(1),
  appareil: z.string().min(1),
  debut: z.string().datetime(),
  fin: z.string().datetime().nullable().optional(),
  volume_octets: z.number().nonnegative(),
  domaine_dns: z.string().optional().nullable(),
  adresse_ip: z.string().max(64).optional().nullable(),
  adresse_mac: z.string().max(64).optional().nullable(),
  navigateur: z.string().max(512).optional().nullable(),
});

router.post('/ingest', async (req, res) => {
  const providedToken = req.header('x-wifi-ingest-token') ?? '';
  const organizationSlug = req.header('x-wifi-organization') ?? 'legacy';
  const organization = await prisma.organization.findUnique({ where: { slug: organizationSlug }, select: { id: true, ingestTokenHash: true } });
  if (!organization) return res.status(404).json({ message: 'Structure inconnue.' });
  const expected = organizationSlug === 'legacy' ? Buffer.from(env.wifiIngestToken) : Buffer.from(organization.ingestTokenHash, 'hex');
  const provided = organizationSlug === 'legacy' ? Buffer.from(providedToken) : createHash('sha256').update(providedToken).digest();
  if (!expected.length) return res.status(503).json({ message: 'La collecte r?seau n?est pas configur?e.' });
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return res.status(401).json({ message: 'Cl? de collecte invalide.' });

  const parsed = ingestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Payload invalide.', errors: parsed.error.flatten() });

  const session = await ingestSession({ ...parsed.data, organizationId: organization.id, role: 'agent' });
  return res.status(201).json({ message: 'Session enregistr?e.', session });
});

export default router;
