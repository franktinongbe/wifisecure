import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), asyncHandler(async (_req, res) => {
  const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
  res.json(settings);
}));

router.put('/threshold', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const schema = z.object({ value: z.number().positive() });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: 'Seuil invalide.', errors: parsed.error.flatten() });
  }

  const setting = await prisma.setting.upsert({
    where: { key: 'session_volume_alert_threshold_bytes' },
    update: { value: String(parsed.data.value) },
    create: { key: 'session_volume_alert_threshold_bytes', value: String(parsed.data.value) },
  });

  res.json(setting);
}));

router.get('/domains', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const role = req.query.role === 'admin' ? 'admin' : 'agent';
  const domains = await prisma.blockedDomain.findMany({ where: { role }, orderBy: { domain: 'asc' } });
  res.json(domains);
}));

router.post('/domains', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const schema = z.object({ domain: z.string().min(3), role: z.enum(['admin', 'agent']) });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: 'Domaine invalide.', errors: parsed.error.flatten() });
  }

  const domain = await prisma.blockedDomain.upsert({
    where: { domain_role: { domain: parsed.data.domain, role: parsed.data.role } },
    update: { active: true },
    create: { domain: parsed.data.domain, role: parsed.data.role, active: true },
  });

  res.status(201).json(domain);
}));

router.delete('/domains/:role/:domain', requireAuth, requireRole('admin'), asyncHandler(async (req, res) => {
  const domain = req.params.domain;
  const role = req.params.role === 'admin' ? 'admin' : req.params.role === 'agent' ? 'agent' : null;
  if (!role) return res.status(400).json({ message: 'Rôle invalide.' });

  try {
    await prisma.blockedDomain.delete({ where: { domain_role: { domain, role } } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return res.status(404).json({ message: 'Domaine introuvable.' });
    }
    throw err;
  }

  res.json({ message: 'Domaine supprimé.' });
}));

export default router;
