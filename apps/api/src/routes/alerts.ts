import { Router } from 'express';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AlertService } from '../services/alertService.js';

const router = Router();

// GET /api/alerts - Liste des alertes
router.get('/', requireAuth, async (_req, res) => {
  try {
    const alerts = await AlertService.getAllAlerts();
    return res.json(alerts);
  } catch (error) {
    console.error('Erreur lors de la récupération des alertes:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la récupération des alertes.' });
  }
});

// PATCH /api/alerts/:id/resolve - Marquer une alerte comme traitée
router.patch('/:id/resolve', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const alertId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const resolvedBy = req.user?.email ?? 'system';

    const updatedAlert = await AlertService.resolveAlert(alertId, resolvedBy);

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