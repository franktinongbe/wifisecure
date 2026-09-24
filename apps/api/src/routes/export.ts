import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, requireRole('admin'), async (req, res) => {
  const period = req.query.period as 'day' | 'week' | 'month' | undefined;
  const now = new Date();
  const start = new Date(now);

  if (period === 'day') start.setDate(now.getDate() - 1);
  else if (period === 'week') start.setDate(now.getDate() - 7);
  else if (period === 'month') start.setMonth(now.getMonth() - 1);
  else start.setDate(now.getDate() - 7);

  const sessions = await prisma.session.findMany({
    where: { debut: { gte: start } },
    orderBy: { debut: 'desc' },
  });

  const header = ['identifiant_usager', 'appareil', 'debut', 'fin', 'volume_octets', 'domaine_dns', 'status'];
  const rows = sessions.map((session) => [
    session.identifiantUsager,
    session.appareil,
    session.debut.toISOString(),
    session.fin ? session.fin.toISOString() : '',
    Number(session.volumeOctets),
    session.domaineDns ?? '',
    session.status,
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sessions-${period ?? 'week'}.csv"`);
  res.send(csv);
});

export default router;
