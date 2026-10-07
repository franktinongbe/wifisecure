import { Agent, fetch } from 'undici';
import { readFileSync } from 'node:fs';
export class UnifiHttpProvider {
    cfg;
    dispatcher;
    constructor(cfg) {
        this.cfg = cfg;
        const ca = cfg.caCertPath ? readFileSync(cfg.caCertPath) : undefined;
        this.dispatcher = new Agent({
            connect: { ca, rejectUnauthorized: !cfg.insecureTls },
        });
    }
    async get(path, query = {}) {
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
        }
        catch (error) {
            throw new Error(`UniFi injoignable (${url.origin}). Vérifie l'IP, le réseau et le certificat TLS ` +
                `(UNIFI_CA_CERT_PATH). Détail : ${error.message}`);
        }
        if (!response.ok) {
            const body = (await response.text()).slice(0, 300);
            throw new Error(`UniFi ${response.status} sur ${path} : ${body}`);
        }
        return (await response.json());
    }
    async getAll(path) {
        const limit = 200;
        let offset = 0;
        const output = [];
        for (;;) {
            const page = await this.get(path, {
                offset,
                limit,
            });
            output.push(...page.data);
            offset += page.data.length;
            if (page.data.length === 0 ||
                (page.totalCount !== undefined && offset >= page.totalCount)) {
                break;
            }
        }
        return output;
    }
    async ping() {
        await this.get('/info');
    }
    listSites() {
        return this.getAll('/sites');
    }
    listClients(siteId) {
        return this.getAll(`/sites/${encodeURIComponent(siteId)}/clients`);
    }
}
export class MockUnifiProvider {
    async ping() { }
    async listSites() {
        return [{ id: 'mock-site', name: 'Default' }];
    }
    async listClients(_siteId) {
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
export function createUnifiProvider(env = process.env) {
    if (env.UNIFI_MODE === 'mock')
        return new MockUnifiProvider();
    const UNIFI_BASE_URL = env.UNIFI_BASE_URL ?? env.UNIFI_API_BASE_URL;
    const { UNIFI_API_KEY } = env;
    if (!UNIFI_BASE_URL || !UNIFI_API_KEY) {
        throw new Error('UNIFI_BASE_URL et UNIFI_API_KEY sont requis (ou UNIFI_MODE=mock).');
    }
    return new UnifiHttpProvider({
        baseUrl: UNIFI_BASE_URL,
        apiKey: UNIFI_API_KEY,
        caCertPath: env.UNIFI_CA_CERT_PATH,
        insecureTls: env.UNIFI_INSECURE_TLS === 'true',
    });
}
