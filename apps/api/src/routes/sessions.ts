import { Router } from 'express';
import { z } from 'zod';
import { listSessions, ingestSession } from '../services/sessionService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
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
});

router.post('/ingest', async (req, res) => {
  const parsed = ingestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: 'Payload invalide.', errors: parsed.error.flatten() });
  }

  const session = await ingestSession(parsed.data);
  return res.status(201).json({ message: 'Session enregistrée.', session });
});

export default router;
