import { Router } from 'express';
import { getLiveStats, getSummary } from '../services/statsService.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/live', requireAuth, requireRole('admin'), async (_req, res) => {
  const stats = await getLiveStats();
  res.json(stats);
});

router.get('/summary', requireAuth, requireRole('admin'), async (req, res) => {
  const period = req.query.period;
  const safePeriod = period === 'day' || period === 'week' || period === 'month' ? period : 'week';
  const stats = await getSummary(safePeriod);
  res.json(stats);
});

export default router;
