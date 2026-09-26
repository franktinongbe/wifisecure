import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../lib/async-handler.js';

const router = Router();
const organizationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  label: z.string().trim().max(120),
  contactEmail: z.union([z.string().email(), z.literal('')]),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(200),
  logoUrl: z.union([z.string().url(), z.literal('')]),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

router.get('/organization', requireAuth, asyncHandler(async (req: any, res) => {
  const organization = await prisma.organization.findUnique({ where: { id: req.user.organizationId }, select: { name: true, label: true, contactEmail: true, phone: true, address: true, logoUrl: true, primaryColor: true } });
  if (!organization) return res.status(404).json({ message: 'Structure introuvable.' });
  res.json(organization);
}));

router.put('/organization', requireAuth, requireRole('admin'), asyncHandler(async (req: any, res) => {
  const parsed = organizationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Informations de structure invalides.', errors: parsed.error.flatten() });
  const organization = await prisma.organization.update({ where: { id: req.user.organizationId }, data: parsed.data });
  res.json({ name: organization.name, label: organization.label, contactEmail: organization.contactEmail, phone: organization.phone, address: organization.address, logoUrl: organization.logoUrl, primaryColor: organization.primaryColor });
}));

router.get('/', requireAuth, requireRole('admin'), asyncHandler(async (req: any, res) => {
  res.json(await prisma.setting.findMany({ where: { organizationId: req.user.organizationId }, orderBy: { key: 'asc' } }));
}));

router.put('/threshold', requireAuth, requireRole('admin'), asyncHandler(async (req: any, res) => {
  const parsed = z.object({ value: z.number().positive() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Seuil invalide.', errors: parsed.error.flatten() });
  const setting = await prisma.setting.upsert({
    where: { organizationId_key: { organizationId: req.user.organizationId, key: 'session_volume_alert_threshold_bytes' } },
    update: { value: String(parsed.data.value) },
    create: { organizationId: req.user.organizationId, key: 'session_volume_alert_threshold_bytes', value: String(parsed.data.value) },
  });
  res.json(setting);
}));

router.get('/domains', requireAuth, requireRole('admin'), asyncHandler(async (req: any, res) => {
  const role = req.query.role === 'admin' ? 'admin' : 'agent';
  res.json(await prisma.blockedDomain.findMany({ where: { organizationId: req.user.organizationId, role }, orderBy: { domain: 'asc' } }));
}));

router.post('/domains', requireAuth, requireRole('admin'), asyncHandler(async (req: any, res) => {
  const parsed = z.object({ domain: z.string().min(3), role: z.enum(['admin', 'agent']) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Domaine invalide.', errors: parsed.error.flatten() });
  const domain = await prisma.blockedDomain.upsert({
    where: { organizationId_domain_role: { organizationId: req.user.organizationId, domain: parsed.data.domain, role: parsed.data.role } },
    update: { active: true },
    create: { organizationId: req.user.organizationId, domain: parsed.data.domain, role: parsed.data.role, active: true },
  });
  res.status(201).json(domain);
}));

router.delete('/domains/:role/:domain', requireAuth, requireRole('admin'), asyncHandler(async (req: any, res) => {
  const domain = Array.isArray(req.params.domain) ? req.params.domain[0] : req.params.domain;
  const role = req.params.role === 'admin' ? 'admin' : req.params.role === 'agent' ? 'agent' : null;
  if (!role) return res.status(400).json({ message: 'Rôle invalide.' });
  const existing = await prisma.blockedDomain.findFirst({ where: { organizationId: req.user.organizationId, domain, role } });
  if (!existing) return res.status(404).json({ message: 'Domaine introuvable.' });
  try { await prisma.blockedDomain.delete({ where: { id: existing.id } }); }
  catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') return res.status(404).json({ message: 'Domaine introuvable.' });
    throw err;
  }
  res.json({ message: 'Domaine supprimé.' });
}));

export default router;
