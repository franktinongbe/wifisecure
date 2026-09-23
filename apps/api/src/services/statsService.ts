import { prisma } from '../lib/db.js';

export async function getLiveStats() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [activeSessions, recentVolume, averageDuration] = await Promise.all([
    prisma.session.count({
      where: {
        fin: null,
        debut: { lte: new Date() },
      },
    }),
    prisma.session.aggregate({
      where: {
        debut: { gte: fiveMinutesAgo },
      },
      _sum: { volumeOctets: true },
    }),
    prisma.$queryRaw<Array<{ averageSessionMinutes: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("fin" - "debut")) / 60.0)::double precision AS "averageSessionMinutes"
      FROM "sessions"
      WHERE "fin" IS NOT NULL
    `,
  ]);

  const totalBytes = Number(recentVolume._sum.volumeOctets ?? 0);
  const averageSessionMinutes = averageDuration[0]?.averageSessionMinutes ?? 0;

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

  const [sessionTotals, uniqueUsers, averageDuration] = await Promise.all([
    prisma.session.aggregate({
      where: { debut: { gte: start } },
      _sum: { volumeOctets: true },
      _count: { _all: true },
    }),
    prisma.session.groupBy({
      by: ['identifiantUsager'],
      where: { debut: { gte: start } },
    }),
    prisma.$queryRaw<Array<{ averageSessionMinutes: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM ("fin" - "debut")) / 60.0)::double precision AS "averageSessionMinutes"
      FROM "sessions"
      WHERE "debut" >= ${start} AND "fin" IS NOT NULL
    `,
  ]);

  return {
    period,
    totalVolumeBytes: Number(sessionTotals._sum.volumeOctets ?? 0),
    uniqueUsers: uniqueUsers.length,
    averageSessionMinutes: averageDuration[0]?.averageSessionMinutes ?? 0,
  };
}
