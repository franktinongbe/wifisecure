import { Router } from 'express';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';
import { AlertService } from '../services/alertService.js';
import { isWhatsAppConfigured } from '../services/whatsappService.js';
import { isUniFiConfigured } from '../services/unifiService.js';

const router = Router();

router.get('/integrations', requireAuth, requireRole('admin'), (_req, res) => {
  res.json({ whatsappConfigured: isWhatsAppConfigured(), unifiConfigured: isUniFiConfigured() });
});

router.get('/counts', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res) => {
  try {
  const grouped = await AlertService.getAlertCounts(_req.user!.organizationId);
    return res.json({
      active: grouped.find((item) => item.status === 'active')?._count._all ?? 0,
      resolved: grouped.find((item) => item.status === 'resolved')?._count._all ?? 0,
    });
  } catch (error) {
    console.error('Erreur lors du comptage des alertes:', error);
    return res.status(500).json({ error: 'Erreur serveur lors du comptage des alertes.' });
  }
});

// GET /api/alerts - Liste des alertes
router.get('/', requireAuth, requireRole('admin'), async (_req: AuthenticatedRequest, res) => {
  try {
    const alerts = await AlertService.getAllAlerts(_req.user!.organizationId);
    return res.json(alerts);
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la récupération des alertes.' });
  }
});

// PATCH /api/alerts/:id/resolve - Marquer une alerte comme traitée
router.patch('/:id/resolve', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  try {
    const alertId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const resolvedBy = req.user?.email ?? 'system';

    const updatedAlert = await AlertService.resolveAlert(alertId, resolvedBy, req.user!.organizationId);

    return res.json({
      message: 'Alerte marquée comme traitée.',
      alert: updatedAlert,
    });
  } catch (error: any) {
    if (error.message === 'ALERT_NOT_FOUND') {
      return res.status(404).json({ error: 'Alerte non trouvée.' });
    }
    console.error('Erreur lors de la mise à jour de l\'alerte:', error);
    return res.status(500).json({ error: 'Erreur serveur lors du traitement de l\'alerte.' });
  }
});

export default router;
