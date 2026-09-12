import { Router } from 'express';
import { getLiveStats, getSummary } from '../services/statsService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/live', requireAuth, async (_req, res) => {
  const stats = await getLiveStats();
  res.json(stats);
});

router.get('/summary', requireAuth, async (req, res) => {
  const period = req.query.period;
  const safePeriod = period === 'day' || period === 'week' || period === 'month' ? period : 'week';
  const stats = await getSummary(safePeriod);
  res.json(stats);
});

export default router;
