import { prisma } from '../lib/db.js';

export interface UniFiClientSnapshot {
  id: string;
  name?: string;
  type?: string;
  ipAddress?: string;
  macAddress?: string;
  connectedAt?: string;
}

export async function syncUniFiClients(
  organizationId: string,
  siteId: string,
  clients: UniFiClientSnapshot[],
) {
  const observedAt = new Date();
  const writes = clients.map((client) => prisma.unifiClient.upsert({
    where: {
      organizationId_siteId_controllerClientId: {
        organizationId,
        siteId,
        controllerClientId: client.id,
      },
    },
    create: {
      organizationId,
      siteId,
      controllerClientId: client.id,
      name: client.name,
      type: client.type,
      ipAddress: client.ipAddress,
      macAddress: client.macAddress,
      connectedAt: client.connectedAt ? new Date(client.connectedAt) : null,
      lastSeenAt: observedAt,
      online: true,
    },
    update: {
      name: client.name,
      type: client.type,
      ipAddress: client.ipAddress,
      macAddress: client.macAddress,
      connectedAt: client.connectedAt ? new Date(client.connectedAt) : null,
      lastSeenAt: observedAt,
      online: true,
    },
  }));

  const offlineFilter = clients.length > 0
    ? { controllerClientId: { notIn: clients.map((client) => client.id) } }
    : {};
  const markOffline = prisma.unifiClient.updateMany({
    where: { organizationId, siteId, online: true, ...offlineFilter },
    data: { online: false, updatedAt: observedAt },
  });

  await prisma.$transaction([...writes, markOffline]);
  return { siteId, received: clients.length, syncedAt: observedAt };
}

export async function listUniFiClients(organizationId: string, siteId?: string) {
  const where = { organizationId, ...(siteId ? { siteId } : {}) };
  const [items, total] = await Promise.all([
    prisma.unifiClient.findMany({
      where,
      orderBy: [{ online: 'desc' }, { lastSeenAt: 'desc' }],
      take: 1000,
    }),
    prisma.unifiClient.count({ where }),
  ]);
  return { items, total };
}