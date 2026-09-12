import { prisma } from '../lib/db.js';

export async function getLiveStats() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [activeSessions, recentSessions] = await Promise.all([
    prisma.session.count({
      where: {
        fin: null,
        debut: { lte: new Date() },
      },
    }),
    prisma.session.findMany({
      where: {
        debut: { gte: fiveMinutesAgo },
      },
      select: { volumeOctets: true },
    }),
  ]);

  const totalBytes = recentSessions.reduce((sum, session) => sum + Number(session.volumeOctets), 0);

  const completedSessions = await prisma.session.findMany({
    where: { fin: { not: null } },
    select: { debut: true, fin: true },
  });

  const averageSessionMinutes = completedSessions.length
    ? completedSessions.reduce((sum, session) => {
        const durationMs = new Date(session.fin!).getTime() - new Date(session.debut).getTime();
        return sum + durationMs / 60000;
      }, 0) / completedSessions.length
    : 0;

  return {
    activeUsers: activeSessions,
    bandwidthLast5Minutes: totalBytes,
    averageSessionMinutes,
  };
}

export async function getSummary(period: 'day' | 'week' | 'month') {
  const now = new Date();
  const start = new Date(now);

  if (period === 'day') start.setDate(now.getDate() - 1);
  if (period === 'week') start.setDate(now.getDate() - 7);
  if (period === 'month') start.setMonth(now.getMonth() - 1);

  const [sessions, uniqueUsers, totalVolume] = await Promise.all([
    prisma.session.findMany({
      where: { debut: { gte: start } },
      select: { volumeOctets: true, debut: true, fin: true },
    }),
    prisma.session.groupBy({
      by: ['identifiantUsager'],
      where: { debut: { gte: start } },
    }),
    prisma.session.aggregate({
      where: { debut: { gte: start } },
      _sum: { volumeOctets: true },
    }),
  ]);

  const totalSessionsSeconds = sessions.reduce((sum, session) => {
    if (!session.fin) return sum;
    const durationMs = new Date(session.fin).getTime() - new Date(session.debut).getTime();
    return sum + durationMs / 1000;
  }, 0);

  return {
    period,
    totalVolumeBytes: Number(totalVolume._sum.volumeOctets ?? 0),
    uniqueUsers: uniqueUsers.length,
    averageSessionMinutes: sessions.length ? (totalSessionsSeconds / sessions.length) / 60 : 0,
  };
}
