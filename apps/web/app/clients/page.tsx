'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, Wifi, WifiOff } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard-shell';
import { apiFetch } from '../../lib/api-client';
import { useRealtimeRefresh } from '../../lib/use-realtime-refresh';

interface UnifiClient {
  id: string;
  siteId: string;
  controllerClientId: string;
  name: string | null;
  type: string | null;
  ipAddress: string | null;
  macAddress: string | null;
  connectedAt: string | null;
  lastSeenAt: string;
  online: boolean;
}

interface ClientResponse {
  items: UnifiClient[];
  total: number;
}

export default function UnifiClientsPage() {
  const [clients, setClients] = useState<UnifiClient[]>([]);
  const [search, setSearch] = useState('');
  const [siteFilter, setSiteFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadClients = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await apiFetch('/api/unifi/clients');
      if (response.status === 401) {
        window.location.assign('/login');
        return;
      }
      if (!response.ok) throw new Error('Impossible de charger les appareils UniFi.');
      const result = await response.json() as ClientResponse;
      setClients(result.items);
      setUpdatedAt(new Date());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadClients(); }, [loadClients]);
  useRealtimeRefresh(() => loadClients(true), 15000);

  async function refreshNow() {
    setRefreshing(true);
    await loadClients(true);
    setRefreshing(false);
  }

  const sites = useMemo(() => [...new Set(clients.map((client) => client.siteId))].sort(), [clients]);
  const visibleClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((client) => {
      if (siteFilter !== 'all' && client.siteId !== siteFilter) return false;
      if (statusFilter === 'online' && !client.online) return false;
      if (statusFilter === 'offline' && client.online) return false;
      if (!term) return true;
      return [client.name, client.type, client.ipAddress, client.macAddress, client.siteId]
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [clients, search, siteFilter, statusFilter]);

  const onlineCount = clients.filter((client) => client.online).length;

  return (
    <DashboardShell title="Appareils Wi-Fi" subtitle="Clients observés par le contrôleur UniFi, séparés des sessions de connexion.">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SummaryCount label="Connectés actuellement" count={onlineCount} icon={Wifi} tone="emerald" />
          <SummaryCount label="Déconnectés récemment" count={clients.length - onlineCount} icon={WifiOff} tone="slate" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500" aria-live="polite">
            {updatedAt ? `Relevé actualisé à ${updatedAt.toLocaleTimeString('fr-FR')} · collecte selon l’intervalle configuré` : 'Chargement…'}
          </p>
          <button type="button" onClick={() => void refreshNow()} disabled={loading || refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>

        {error && <div role="alert" className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}<button onClick={() => void refreshNow()} className="underline">Réessayer</button></div>}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Inventaire UniFi</h2><p className="mt-1 text-xs text-slate-500">{clients.length} appareil{clients.length > 1 ? 's' : ''} mémorisé{clients.length > 1 ? 's' : ''}</p></div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher IP, MAC, nom" className="w-48 bg-transparent py-2 text-sm outline-none" /></label>
              <select aria-label="Filtrer par site UniFi" value={siteFilter} onChange={(event) => setSiteFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="all">Tous les sites</option>{sites.map((site) => <option key={site} value={site}>{site}</option>)}</select>
              <select aria-label="Filtrer par état de connexion" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="all">Tous les états</option><option value="online">En ligne</option><option value="offline">Hors ligne</option></select>
            </div>
          </div>

          {loading ? <p className="py-10 text-center text-sm text-slate-500">Chargement des appareils…</p> : <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500"><tr><th className="py-3 pr-4 font-medium">État</th><th className="py-3 pr-4 font-medium">Appareil</th><th className="py-3 pr-4 font-medium">Adresse IP / MAC</th><th className="py-3 pr-4 font-medium">Site</th><th className="py-3 pr-4 font-medium">Dernière observation</th></tr></thead>
              <tbody>
                {visibleClients.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-slate-500">{clients.length === 0 ? 'Aucun appareil reçu. Vérifiez la configuration UniFi et le démarrage de l’ingestor.' : 'Aucun appareil ne correspond à la recherche ou aux filtres.'}</td></tr> : visibleClients.map((client) => <tr key={client.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="py-3 pr-4"><span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium ${client.online ? 'text-emerald-700' : 'text-slate-500'}`}><span className={`h-2 w-2 rounded-full ${client.online ? 'bg-emerald-500' : 'bg-slate-400'}`} />{client.online ? 'En ligne' : 'Hors ligne'}</span></td>
                  <td className="py-3 pr-4"><div className="font-medium">{client.name || 'Appareil sans nom'}</div><div className="text-xs text-slate-500">{client.type || 'Type inconnu'}</div></td>
                  <td className="py-3 pr-4"><div>{client.ipAddress || 'IP indisponible'}</div><div className="text-xs text-slate-500">{client.macAddress || 'MAC indisponible'}</div></td>
                  <td className="py-3 pr-4">{client.siteId}</td>
                  <td className="py-3 pr-4 whitespace-nowrap text-slate-600">{new Date(client.lastSeenAt).toLocaleString('fr-FR')}</td>
                </tr>)}
              </tbody>
            </table>
          </div>}
        </section>
      </div>
    </DashboardShell>
  );
}

function SummaryCount({ label, count, icon: Icon, tone }: { label: string; count: number; icon: typeof Wifi; tone: 'emerald' | 'slate' }) {
  const toneClass = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700';
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-5 w-5" /></span></div><p className="mt-4 text-3xl font-semibold text-slate-900">{count}</p></div>;
}