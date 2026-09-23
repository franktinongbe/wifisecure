import { prisma } from '../lib/db.js';

export class AlertService {
  static async getAlertCounts() {
    return prisma.alert.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
  }

  /**
   * Récupère la liste des alertes triées par date de création avec la session associée.
   */
  static async getAllAlerts() {
    return prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        session: true,
      },
    });
  }

  /**
   * Marque une alerte comme traitée ('resolved').
   */
  static async resolveAlert(alertId: string, resolvedBy: string) {
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new Error('ALERT_NOT_FOUND');
    }

    return prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy,
      },
      include: {
        session: true,
      },
    });
  }
}
