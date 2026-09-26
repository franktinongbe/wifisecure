import { Router } from 'express';
import { getLiveStats, getSummary } from '../services/statsService.js';
import { requireAuth, requireRole, type AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

router.get('/live', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  const stats = await getLiveStats(req.user!.organizationId);
  res.json(stats);
});

router.get('/summary', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res) => {
  const period = req.query.period;
  const safePeriod = period === 'day' || period === 'week' || period === 'month' ? period : 'week';
  const stats = await getSummary(safePeriod, req.user!.organizationId);
  res.json(stats);
});

export default router;
