import { prisma } from '../lib/db.js';
import { evaluateAlerts } from '../lib/alertRules.js';
import { sendWhatsAppIncidentAlert } from './whatsappService.js';

export type SessionCreateInput = {
  identifiant_usager: string;
  appareil: string;
  debut: string;
  fin?: string | null;
  volume_octets: number;
  domaine_dns?: string | null;
  adresse_ip?: string | null;
  adresse_mac?: string | null;
  navigateur?: string | null;
  role?: 'admin' | 'agent';
};

export async function getThresholdBytes(organizationId: string) {
  const setting = await prisma.setting.findUnique({ where: { organizationId_key: { organizationId, key: 'session_volume_alert_threshold_bytes' } } });
  return Number(setting?.value ?? 2_147_483_648);
}

export async function getBlockedDomains(organizationId: string, role: 'admin' | 'agent' = 'agent') {
  const domains = await prisma.blockedDomain.findMany({
    where: { organizationId, active: true, role },
    select: { domain: true },
  });

  return domains.map((entry) => entry.domain);
}

export async function ingestSession(input: SessionCreateInput & { organizationId: string }) {
  const threshold = await getThresholdBytes(input.organizationId);
  const role = input.role ?? 'agent';
  const blockedDomains = await getBlockedDomains(input.organizationId, role);

  const session = await prisma.session.create({
    data: {
      organizationId: input.organizationId,
      identifiantUsager: input.identifiant_usager,
      appareil: input.appareil,
      role,
      debut: new Date(input.debut),
      fin: input.fin ? new Date(input.fin) : null,
      volumeOctets: BigInt(Math.round(input.volume_octets)),
      domaineDns: input.domaine_dns ?? null,
      adresseIp: input.adresse_ip ?? null,
      adresseMac: input.adresse_mac ?? null,
      navigateur: input.navigateur ?? null,
    },
  });

  const alerts = evaluateAlerts({
    volumeOctets: Number(session.volumeOctets),
    domain: session.domaineDns,
    thresholdBytes: threshold,
    blockedDomains,
  });

  for (const alert of alerts) {
    const createdAlert = await prisma.alert.create({
      data: {
        sessionId: session.id,
        type: alert.alertType,
        message: alert.message,
        status: 'active',
      },
      include: { session: true },
    });
    void sendWhatsAppIncidentAlert(createdAlert).catch(() => {
      console.error('WhatsApp incident notification could not be sent.');
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
  organizationId,
}: {
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
  status?: 'normal' | 'needs_review';
  organizationId: string;
}) {
  const where: any = { organizationId };

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
