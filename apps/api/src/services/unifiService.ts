import { env } from '../config/env.js';

type UniFiClient = { id: string; macAddress: string };

export class UniFiIntegrationError extends Error {
  constructor(message: string, readonly statusCode = 502) {
    super(message);
    this.name = 'UniFiIntegrationError';
  }
}

export function isUniFiConfigured() {
  return Boolean(env.unifiApiBaseUrl && env.unifiApiKey && env.unifiSiteId);
}

function configuredBaseUrl() {
  if (!env.unifiApiBaseUrl || !env.unifiApiKey || !env.unifiSiteId) {
    throw new UniFiIntegrationError('UniFi API is not configured.', 503);
  }
  const base = new URL(env.unifiApiBaseUrl);
  if (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname))) {
    throw new UniFiIntegrationError('UniFi API must use HTTPS.', 503);
  }
  return base;
}

function normalizeMac(mac: string) {
  const normalized = mac.trim().replaceAll('-', ':').toLowerCase();
  if (!/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/.test(normalized)) {
    throw new UniFiIntegrationError('The device MAC address is invalid.', 400);
  }
  return normalized;
}

async function findClientId(macAddress: string) {
  const base = configuredBaseUrl();
  const mac = normalizeMac(macAddress);
  const url = new URL(base);
  url.pathname = `${base.pathname.replace(/\/+$/, '')}/integration/v1/sites/${encodeURIComponent(env.unifiSiteId)}/clients`;
  url.searchParams.set('filter', `macAddress.eq('${mac}')`);
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'X-API-Key': env.unifiApiKey },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new UniFiIntegrationError(`UniFi client lookup failed (HTTP ${response.status}).`);

  const payload = await response.json() as { data?: UniFiClient[] } | UniFiClient[];
  const clients = Array.isArray(payload) ? payload : payload.data ?? [];
  const client = clients.find((item) => normalizeMac(item.macAddress) === mac);
  if (!client) throw new UniFiIntegrationError('The device was not found among connected UniFi clients.', 404);
  return { clientId: client.id, mac, base };
}

export async function setUniFiClientBlocked(macAddress: string, blocked: boolean) {
  const { clientId, mac, base } = await findClientId(macAddress);
  const url = new URL(base);
  url.pathname = `${base.pathname.replace(/\/+$/, '')}/integration/v1/sites/${encodeURIComponent(env.unifiSiteId)}/clients/${encodeURIComponent(clientId)}/actions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': env.unifiApiKey,
    },
    body: JSON.stringify({ action: blocked ? 'BLOCK' : 'UNBLOCK' }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new UniFiIntegrationError(`UniFi client action failed (HTTP ${response.status}).`);
  return { macAddress: mac };
}
