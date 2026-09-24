'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Ban, CheckCircle2, RefreshCw, Search } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard-shell';
import { StatusBadge } from '../../components/ui/status-badge';
import { apiFetch } from '../../lib/api-client';
import { useRealtimeRefresh } from '../../lib/use-realtime-refresh';

interface YellowListSession {
  identifiantUsager: string;
  appareil: string;
  adresseIp: string | null;
  adresseMac: string | null;
  navigateur: string | null;
  domaineDns: string | null;
}
interface YellowListEntry {
  id: string;
  type: string;
  status: 'active' | 'resolved';
  message: string;
  createdAt: string;
  resolvedAt: string | null;
  session: YellowListSession;
}
interface BlockedDevice {
  id: string;
  adresseMac: string;
  identifiantUsager: string;
  appareil: string;
  blockedAt: string;
  blockedBy: string;
  infraction: string;
}

export default function YellowListPage() {
  const [entries, setEntries] = useState<YellowListEntry[]>([]);
  const [blockedDevices, setBlockedDevices] = useState<BlockedDevice[]>([]);
  const [unifiConfigured, setUnifiConfigured] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadList = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [alertsResponse, blocksResponse, integrationResponse] = await Promise.all([
        apiFetch('/api/alerts'), apiFetch('/api/blocks'), apiFetch('/api/alerts/integrations'),
      ]);
      if ([alertsResponse, blocksResponse, integrationResponse].some((response) => response.status === 401)) {
        window.location.assign('/login');
        return;
      }
      if (!alertsResponse.ok || !blocksResponse.ok || !integrationResponse.ok) throw new Error('Impossible de charger la Liste Jaune.');
      const [alerts, blocks, integrations] = await Promise.all([
        alertsResponse.json() as Promise<YellowListEntry[]>,
        blocksResponse.json() as Promise<BlockedDevice[]>,
        integrationResponse.json() as Promise<{ unifiConfigured: boolean }>,
      ]);
      setEntries(alerts);
      setBlockedDevices(blocks);
      setUnifiConfigured(integrations.unifiConfigured);
      setUpdatedAt(new Date());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadList(); }, [loadList]);
  useRealtimeRefresh(() => loadList(true), 15000);

  async function refreshNow() {
    setRefreshing(true);
    await loadList(true);
    setRefreshing(false);
  }

  async function blockEntry(entry: YellowListEntry) {
    setUpdatingId(entry.id);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch('/api/blocks', { method: 'POST', body: JSON.stringify({ alertId: entry.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? 'Impossible de bloquer cet usager.');
      setNotice(result.message);
      await loadList(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le blocage a échoué.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function unblockEntry(device: BlockedDevice) {
    setUpdatingId(device.id);
    setError(null);
    setNotice(null);
    try {
      const response = await apiFetch(`/api/blocks/${device.id}/unblock`, { method: 'PATCH' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? 'Impossible de débloquer cet usager.');
      setNotice(result.message);
      await loadList(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le déblocage a échoué.');
    } finally {
      setUpdatingId(null);
    }
  }

  const blockedByMac = useMemo(() => new Map(blockedDevices.map((device) => [device.adresseMac.toLowerCase(), device])), [blockedDevices]);
  const visibleEntries = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
      if (!term) return true;
      return [entry.session.identifiantUsager, entry.session.appareil, entry.session.adresseIp, entry.session.adresseMac,
        entry.session.navigateur, entry.session.domaineDns, entry.message]
        .some((value) => value?.toLowerCase().includes(term));
    });
  }, [entries, search, statusFilter]);
  const activeEntries = entries.filter((entry) => entry.status === 'active').length;

  return (
    <DashboardShell title="Liste Jaune" subtitle="Usagers signalés pour infraction et contrôle de leur accès au réseau.">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <CountCard label="Infractions recensées" count={entries.length} icon={AlertTriangle} tone="amber" />
          <CountCard label="À examiner" count={activeEntries} icon={Ban} tone="rose" />
          <CountCard label="Appareils actuellement bloqués" count={blockedDevices.length} icon={CheckCircle2} tone="slate" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500" aria-live="polite">{updatedAt ? `Données actualisées à ${updatedAt.toLocaleTimeString('fr-FR')} · mise à jour toutes les 15 s` : 'Chargement…'}</p>
          <button type="button" onClick={() => void refreshNow()} disabled={loading || refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser</button>
        </div>

        {!unifiConfigured && <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Le contrôleur UniFi n’est pas configuré. La Liste Jaune reste consultable, mais les boutons de blocage et déblocage seront indisponibles.</p>}
        {error && <div role="alert" className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}<button onClick={() => void refreshNow()} className="underline">Réessayer</button></div>}
        {notice && <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-semibold">Registre des infractions</h2><p className="mt-1 text-xs text-slate-500">Une entrée par infraction détectée ; les actions de blocage sont conservées par appareil.</p></div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un usager ou appareil" className="w-56 bg-transparent py-2 text-sm outline-none" /></label>
              <select aria-label="Filtrer les infractions par état" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"><option value="all">Tous les états</option><option value="active">À examiner</option><option value="resolved">Traitées</option></select>
            </div>
          </div>

          {loading ? <p className="py-10 text-center text-sm text-slate-500">Chargement de la Liste Jaune…</p> : <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500"><tr><th className="py-3 pr-4 font-medium">Date / infraction</th><th className="py-3 pr-4 font-medium">Usager / appareil</th><th className="py-3 pr-4 font-medium">IP / MAC</th><th className="py-3 pr-4 font-medium">Navigateur / domaine</th><th className="py-3 pr-4 font-medium">Suivi</th><th className="py-3 pr-4 font-medium">Contrôle d’accès</th></tr></thead>
              <tbody>{visibleEntries.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-slate-500">{entries.length === 0 ? 'Aucune infraction enregistrée. Les nouvelles entrées seront ajoutées à partir des alertes reçues.' : 'Aucune entrée ne correspond à la recherche ou aux filtres.'}</td></tr> : visibleEntries.map((entry) => {
                const blocked = entry.session.adresseMac ? blockedByMac.get(entry.session.adresseMac.toLowerCase()) : undefined;
                return <tr key={entry.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="py-3 pr-4"><div className="whitespace-nowrap text-slate-600">{new Date(entry.createdAt).toLocaleString('fr-FR')}</div><div className="mt-1 font-medium text-slate-800">{entry.message}</div></td>
                  <td className="py-3 pr-4"><div className="font-medium">{entry.session.identifiantUsager}</div><div className="text-xs text-slate-500">{entry.session.appareil}</div></td>
                  <td className="py-3 pr-4"><div>{entry.session.adresseIp ?? '—'}</div><div className="text-xs text-slate-500">{entry.session.adresseMac ?? 'MAC indisponible'}</div></td>
                  <td className="max-w-xs py-3 pr-4"><div className="truncate" title={entry.session.navigateur ?? ''}>{entry.session.navigateur ?? 'Navigateur inconnu'}</div><div className="text-xs text-slate-500">{entry.session.domaineDns ?? 'Domaine inconnu'}</div></td>
                  <td className="py-3 pr-4"><StatusBadge status={entry.status} label={entry.status === 'active' ? 'À examiner' : 'Traitée'} /></td>
                  <td className="py-3 pr-4">{blocked ? <button disabled={updatingId === blocked.id || !unifiConfigured} onClick={() => void unblockEntry(blocked)} className="whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{updatingId === blocked.id ? 'En cours…' : 'Débloquer'}</button> : <button disabled={updatingId === entry.id || !unifiConfigured || !entry.session.adresseMac} title={!entry.session.adresseMac ? 'La MAC manque dans les données collectées' : undefined} onClick={() => void blockEntry(entry)} className="whitespace-nowrap rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">{updatingId === entry.id ? 'En cours…' : 'Bloquer'}</button>}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>}
        </section>
      </div>
    </DashboardShell>
  );
}

function CountCard({ label, count, icon: Icon, tone }: { label: string; count: number; icon: typeof AlertTriangle; tone: 'amber' | 'rose' | 'slate' }) {
  const toneClass = tone === 'amber' ? 'bg-amber-50 text-amber-700' : tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700';
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-5 w-5" /></span></div><p className="mt-4 text-3xl font-semibold text-slate-900">{count}</p></div>;
}
