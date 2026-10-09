import { Agent, fetch } from 'undici';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface UnifiSite {
  id: string;
  name: string;
}

export interface UnifiClientInfo {
  id: string;
  name?: string;
  type?: string;
  ipAddress?: string;
  macAddress?: string;
  connectedAt?: string;
  [key: string]: unknown;
}

export interface UnifiProvider {
  ping(): Promise<void>;
  listSites(): Promise<UnifiSite[]>;
  listClients(siteId: string): Promise<UnifiClientInfo[]>;
}

interface HttpConfig {
  baseUrl: string;
  apiKey: string;
  caCertPath?: string;
  insecureTls?: boolean;
  timeoutMs?: number;
}

export class UnifiHttpProvider implements UnifiProvider {
  private dispatcher: Agent;

  constructor(private cfg: HttpConfig) {
    const caPathCandidates = cfg.caCertPath
      ? [resolve(process.cwd(), cfg.caCertPath), resolve(process.cwd(), '..', '..', cfg.caCertPath)]
      : [];
    const caPath = caPathCandidates.find((candidate) => existsSync(candidate));
    if (cfg.caCertPath && !caPath) {
      throw new Error('UNIFI_CA_CERT_PATH ne pointe pas vers un certificat lisible.');
    }
    const ca = caPath ? readFileSync(caPath) : undefined;
    this.dispatcher = new Agent({
      connect: { ca, rejectUnauthorized: !cfg.insecureTls },
    });
  }

  private async get<T>(
    path: string,
    query: Record<string, string | number> = {},
  ): Promise<T> {
    const url = new URL(`/proxy/network/integration/v1${path}`, this.cfg.baseUrl);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }

    let response;
    try {
      response = await fetch(url, {
        headers: { 'X-API-KEY': this.cfg.apiKey, Accept: 'application/json' },
        dispatcher: this.dispatcher,
        signal: AbortSignal.timeout(this.cfg.timeoutMs ?? 10_000),
      });
    } catch (error) {
      const detail = error instanceof Error
        ? [error.message, error.cause instanceof Error ? error.cause.message : undefined]
            .filter(Boolean)
            .join(' : ')
        : String(error);
      throw new Error(
        `UniFi injoignable (${url.origin}). Vérifie l'IP, le réseau et le certificat TLS ` +
          `(UNIFI_CA_CERT_PATH). Détail : ${detail}`,
      );
    }

    if (!response.ok) {
      const body = (await response.text()).slice(0, 300);
      throw new Error(`UniFi ${response.status} sur ${path} : ${body}`);
    }
    return (await response.json()) as T;
  }

  private async getAll<T>(path: string): Promise<T[]> {
    const limit = 200;
    let offset = 0;
    const output: T[] = [];
    for (;;) {
      const page = await this.get<{ data: T[]; totalCount?: number }>(path, {
        offset,
        limit,
      });
      output.push(...page.data);
      offset += page.data.length;
      if (
        page.data.length === 0 ||
        (page.totalCount !== undefined && offset >= page.totalCount)
      ) {
        break;
      }
    }
    return output;
  }

  async ping(): Promise<void> {
    await this.get('/info');
  }

  listSites(): Promise<UnifiSite[]> {
    return this.getAll<UnifiSite>('/sites');
  }

  listClients(siteId: string): Promise<UnifiClientInfo[]> {
    return this.getAll<UnifiClientInfo>(
      `/sites/${encodeURIComponent(siteId)}/clients`,
    );
  }
}

export class MockUnifiProvider implements UnifiProvider {
  async ping(): Promise<void> {}

  async listSites(): Promise<UnifiSite[]> {
    return [{ id: 'mock-site', name: 'Default' }];
  }

  async listClients(_siteId: string): Promise<UnifiClientInfo[]> {
    return Array.from({ length: 5 }, (_, index) => ({
      id: `mock-${index}`,
      name: `Appareil ${index + 1}`,
      type: 'WIRELESS',
      ipAddress: `192.168.20.${10 + index}`,
      macAddress: `02:00:00:00:00:0${index}`,
      connectedAt: new Date().toISOString(),
    }));
  }
}

export function createUnifiProvider(
  env: NodeJS.ProcessEnv = process.env,
): UnifiProvider {
  if (env.UNIFI_MODE === 'mock') return new MockUnifiProvider();

  if (env.NODE_ENV === 'production' && env.UNIFI_INSECURE_TLS === 'true') {
    throw new Error('UNIFI_INSECURE_TLS ne peut pas être activé en production.');
  }

  const UNIFI_BASE_URL = env.UNIFI_BASE_URL ?? env.UNIFI_API_BASE_URL;
  const { UNIFI_API_KEY } = env;
  if (!UNIFI_BASE_URL || !UNIFI_API_KEY) {
    throw new Error(
      'UNIFI_BASE_URL et UNIFI_API_KEY sont requis (ou UNIFI_MODE=mock).',
    );
  }
  return new UnifiHttpProvider({
    baseUrl: UNIFI_BASE_URL,
    apiKey: UNIFI_API_KEY,
    caCertPath: env.UNIFI_CA_CERT_PATH,
    insecureTls: env.UNIFI_INSECURE_TLS === 'true',
    timeoutMs: Number(env.UNIFI_TIMEOUT_MS) || 30_000,
  });
}
