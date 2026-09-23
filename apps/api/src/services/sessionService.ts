import { prisma } from '../lib/db.js';
import { evaluateAlerts } from '../lib/alertRules.js';

export type SessionCreateInput = {
  identifiant_usager: string;
  appareil: string;
  debut: string;
  fin?: string | null;
  volume_octets: number;
  domaine_dns?: string | null;
  role?: 'admin' | 'agent';
};

export async function getThresholdBytes() {
  const setting = await prisma.setting.findUnique({ where: { key: 'session_volume_alert_threshold_bytes' } });
  return Number(setting?.value ?? 2_147_483_648);
}

export async function getBlockedDomains(role: 'admin' | 'agent' = 'agent') {
  const domains = await prisma.blockedDomain.findMany({
    where: { active: true, role },
    select: { domain: true },
  });

  return domains.map((entry) => entry.domain);
}

export async function ingestSession(input: SessionCreateInput) {
  const threshold = await getThresholdBytes();
  const role = input.role ?? 'agent';
  const blockedDomains = await getBlockedDomains(role);

  const session = await prisma.session.create({
    data: {
      identifiantUsager: input.identifiant_usager,
      appareil: input.appareil,
      role,
      debut: new Date(input.debut),
      fin: input.fin ? new Date(input.fin) : null,
      volumeOctets: BigInt(Math.round(input.volume_octets)),
      domaineDns: input.domaine_dns ?? null,
    },
  });

  const alerts = evaluateAlerts({
    volumeOctets: Number(session.volumeOctets),
    domain: session.domaineDns,
    thresholdBytes: threshold,
    blockedDomains,
  });

  for (const alert of alerts) {
    await prisma.alert.create({
      data: {
        sessionId: session.id,
        type: alert.alertType,
        message: alert.message,
        status: 'active',
      },
    });
  }

  if (alerts.length > 0) {
    await prisma.session.update({
      where: { id: session.id },
      data: { status: 'needs_review' },
    });
  }

  return session;
}

export async function listSessions({
  page = 1,
  pageSize = 20,
  dateFrom,
  dateTo,
  status,
}: {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: 'normal' | 'needs_review';
}) {
  const where: any = {};

  if (dateFrom || dateTo) {
    where.debut = {};
    if (dateFrom) where.debut.gte = new Date(dateFrom);
    if (dateTo) where.debut.lte = new Date(dateTo);
  }

  if (status) {
    where.status = status;
  }

  const [items, total] = await Promise.all([
    prisma.session.findMany({
      where,
      orderBy: { debut: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        alerts: true,
      },
    }),
    prisma.session.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
