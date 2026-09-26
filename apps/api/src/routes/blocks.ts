import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/db.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { setUniFiClientBlocked, UniFiIntegrationError } from '../services/unifiService.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res) => {
  const devices = await prisma.blockedDevice.findMany({ where: { organizationId: _req.user!.organizationId, active: true }, orderBy: { blockedAt: 'desc' } });
  return res.json(devices);
});

router.post('/', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  const parsed = z.object({ alertId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Alerte invalide.' });

  const alert = await prisma.alert.findFirst({ where: { id: parsed.data.alertId, session: { organizationId: req.user!.organizationId } }, include: { session: true } });
  if (!alert) return res.status(404).json({ message: 'Alerte introuvable.' });
  if (!alert.session.adresseMac) return res.status(409).json({ message: 'Adresse MAC absente. Configurez le collecteur pour transmettre cette information.' });
  if (alert.status !== 'active') return res.status(409).json({ message: 'Cette alerte est déjà traitée.' });

  const existing = await prisma.blockedDevice.findFirst({ where: { organizationId: req.user!.organizationId, adresseMac: alert.session.adresseMac } });
  if (existing?.active) return res.status(409).json({ message: 'Cet appareil est déjà bloqué.' });

  try {
    await setUniFiClientBlocked(alert.session.adresseMac, true);
  } catch (error) {
    if (error instanceof UniFiIntegrationError) return res.status(error.statusCode).json({ message: error.message });
    console.error('UniFi block operation failed.');
    return res.status(502).json({ message: 'Impossible de joindre le contrôleur UniFi.' });
  }

  const blockedBy = req.user?.email ?? 'admin';
  const now = new Date();
  const device = await prisma.$transaction(async (tx) => {
    const saved = existing ? await tx.blockedDevice.update({
      where: { id: existing.id },
      data: {
        adresseIp: alert.session.adresseIp,
        identifiantUsager: alert.session.identifiantUsager,
        appareil: alert.session.appareil,
        navigateur: alert.session.navigateur,
        infraction: alert.message,
        sessionId: alert.sessionId,
        active: true,
        blockedAt: now,
        blockedBy,
        unblockedAt: null,
        unblockedBy: null,
      },
    }) : await tx.blockedDevice.create({
      data: {
        organizationId: req.user!.organizationId,
        adresseMac: alert.session.adresseMac!,
        adresseIp: alert.session.adresseIp,
        identifiantUsager: alert.session.identifiantUsager,
        appareil: alert.session.appareil,
        navigateur: alert.session.navigateur,
        infraction: alert.message,
        sessionId: alert.sessionId,
        blockedBy,
      },
    });
    await tx.alert.update({ where: { id: alert.id }, data: { status: 'resolved', resolvedAt: now, resolvedBy: blockedBy } });
    return saved;
  });
  return res.status(201).json({ device, message: 'Appareil bloqué depuis WiFiSecure et alerte traitée.' });
});

router.patch('/:id/unblock', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  const deviceId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const device = await prisma.blockedDevice.findFirst({ where: { id: deviceId, organizationId: req.user!.organizationId } });
  if (!device || !device.active) return res.status(404).json({ message: 'Appareil bloqué introuvable.' });

  try {
    await setUniFiClientBlocked(device.adresseMac, false);
  } catch (error) {
    if (error instanceof UniFiIntegrationError) return res.status(error.statusCode).json({ message: error.message });
    console.error('UniFi unblock operation failed.');
    return res.status(502).json({ message: 'Impossible de joindre le contrôleur UniFi.' });
  }

  const updated = await prisma.blockedDevice.update({
    where: { id: device.id },
    data: { active: false, unblockedAt: new Date(), unblockedBy: req.user?.email ?? 'admin' },
  });
  return res.json({ device: updated, message: 'Accès rétabli depuis WiFiSecure.' });
});

export default router;
