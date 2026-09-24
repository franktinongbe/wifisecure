import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { listSessions, ingestSession } from '../services/sessionService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { env } from '../config/env.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const query = req.query;
  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 20);

  const result = await listSessions({
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
  const expected = Buffer.from(env.wifiIngestToken);
  const provided = Buffer.from(providedToken);
  if (!expected.length) return res.status(503).json({ message: 'La collecte réseau n’est pas configurée.' });
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return res.status(401).json({ message: 'Clé de collecte invalide.' });
  }

  const parsed = ingestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide.', errors: parsed.error.flatten() });
  }

  const session = await ingestSession({ ...parsed.data, role: 'agent' });
  return res.status(201).json({ message: 'Session enregistrée.', session });
});

export default router;
