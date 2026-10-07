import dotenv from 'dotenv';
import { createUnifiProvider } from './unifi/unifi-client.js';
dotenv.config({ path: '../../.env' });
const apiBaseUrl = (process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000').replace(/\/+$/, '');
const ingestToken = process.env.WIFI_INGEST_TOKEN ?? '';
const organizationSlug = process.env.WIFI_ORGANIZATION_SLUG ?? 'legacy';
const configuredSiteId = process.env.UNIFI_SITE_ID;
const intervalMs = Math.max(5_000, Number(process.env.INGESTOR_INTERVAL_MS ?? 15_000));
if (!ingestToken) {
    throw new Error('WIFI_INGEST_TOKEN est requis pour envoyer les données à WiFiSecure.');
}
const provider = createUnifiProvider();
let stopped = false;
let timer;
async function syncOnce() {
    const sites = await provider.listSites();
    const selectedSites = configuredSiteId
        ? sites.filter((site) => site.id === configuredSiteId)
        : sites;
    if (selectedSites.length === 0) {
        throw new Error(configuredSiteId
            ? `Le site UniFi configuré (${configuredSiteId}) est introuvable.`
            : 'Aucun site UniFi disponible.');
    }
    for (const site of selectedSites) {
        const clients = await provider.listClients(site.id);
        const response = await fetch(`${apiBaseUrl}/api/unifi/sync`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-wifi-ingest-token': ingestToken,
                'x-wifi-organization': organizationSlug,
            },
            body: JSON.stringify({ siteId: site.id, clients }),
            signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
            const detail = (await response.text()).slice(0, 300);
            throw new Error(`L’API WiFiSecure a répondu ${response.status} : ${detail}`);
        }
        console.info(`Inventaire UniFi synchronisé : site=${site.id}, clients=${clients.length}`);
    }
}
async function run() {
    while (!stopped) {
        try {
            await syncOnce();
        }
        catch (error) {
            console.error('Échec de la synchronisation UniFi :', error instanceof Error ? error.message : error);
        }
        if (!stopped) {
            await new Promise((resolve) => {
                timer = setTimeout(resolve, intervalMs);
            });
        }
    }
}
function stop() {
    stopped = true;
    if (timer)
        clearTimeout(timer);
}
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
void run();
