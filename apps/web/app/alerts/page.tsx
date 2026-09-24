'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ban, CheckCircle2, Gauge, RefreshCw, ShieldAlert } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard-shell';
import { apiFetch } from '../../lib/api-client';
import { useRealtimeRefresh } from '../../lib/use-realtime-refresh';
import { StatusBadge } from '../../components/ui/status-badge';

interface AlertSession {
  id: string;
  identifiantUsager: string;
  appareil: string;
  domaineDns?: string | null;
  volumeOctets: number | string;
  adresseIp?: string | null;
  adresseMac?: string | null;
  navigateur?: string | null;
}
interface NetworkAlert {
  id: string;
  type: 'volume_eleve' | 'domaine_bloque' | string;
  status: 'active' | 'resolved';
  message: string;
  createdAt: string;
  resolvedAt?: string | null;
  session?: AlertSession | null;
}
interface BlockedDevice {
  id: string;
  identifiantUsager: string;
  appareil: string;
  adresseIp: string | null;
  adresseMac: string;
  navigateur: string | null;
  infraction: string;
  blockedAt: string;
  blockedBy: string;
}

const typeLabel = (type: string) => type === 'domaine_bloque' ? 'Domaine bloqué' : type === 'volume_eleve' ? 'Volume élevé' : type;

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<NetworkAlert[]>([]);
  const [blockedDevices, setBlockedDevices] = useState<BlockedDevice[]>([]);
  const [integrations, setIntegrations] = useState<{ whatsappConfigured: boolean; unifiConfigured: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('active');
  const [typeFilter, setTypeFilter] = useState<'all' | 'domaine_bloque' | 'volume_eleve'>('all');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const fetchAlerts = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [response, blocksResponse, integrationResponse] = await Promise.all([
        apiFetch('/api/alerts'), apiFetch('/api/blocks'), apiFetch('/api/alerts/integrations'),
      ]);
      if ([response, blocksResponse, integrationResponse].some((item) => item.status === 401)) { window.location.assign('/login'); return; }
      if (!response.ok || !blocksResponse.ok || !integrationResponse.ok) throw new Error('Impossible de charger les alertes et les intégrations.');
      const [data, blocks, status] = await Promise.all([
        response.json() as Promise<NetworkAlert[]>,
        blocksResponse.json() as Promise<BlockedDevice[]>,
        integrationResponse.json() as Promise<{ whatsappConfigured: boolean; unifiConfigured: boolean }>,
      ]);
      setAlerts(data);
      setBlockedDevices(blocks);
      setIntegrations(status);
      setUpdatedAt(new Date());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAlerts(); }, [fetchAlerts]);
  useRealtimeRefresh(() => fetchAlerts(true), 15000);

  async function refreshNow() {
    setRefreshing(true);
    await fetchAlerts(true);
    setRefreshing(false);
  }

  async function resolveAlert(alertId: string) {
    setUpdatingId(alertId);
    setActionMessage(null);
    try {
      const response = await apiFetch(`/api/alerts/${alertId}/resolve`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Le traitement de cette alerte a échoué.');
      const { alert: updatedAlert } = await response.json();
      setAlerts((current) => current.map((item) => item.id === alertId ? updatedAlert : item));
      setActionMessage('Alerte marquée comme traitée.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur lors du traitement de l’alerte.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function blockDevice(alert: NetworkAlert) {
    setUpdatingId(alert.id);
    setError(null);
    setActionMessage(null);
    try {
      const response = await apiFetch('/api/blocks', { method: 'POST', body: JSON.stringify({ alertId: alert.id }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? 'Impossible de bloquer cet appareil dans UniFi.');
      setAlerts((current) => current.map((item) => item.id === alert.id ? { ...item, status: 'resolved', resolvedAt: new Date().toISOString() } : item));
      setActionMessage(result.message);
      await fetchAlerts(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le blocage UniFi a échoué.');
    } finally {
      setUpdatingId(null);
    }
  }

  async function unblockDevice(deviceId: string) {
    setUpdatingId(deviceId);
    setError(null);
    setActionMessage(null);
    try {
      const response = await apiFetch(`/api/blocks/${deviceId}/unblock`, { method: 'PATCH' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? 'Impossible de rétablir l’accès dans UniFi.');
      setActionMessage(result.message);
      await fetchAlerts(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Le déblocage UniFi a échoué.');
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = useMemo(() => ({
    active: alerts.filter((item) => item.status === 'active').length,
    resolved: alerts.filter((item) => item.status === 'resolved').length,
    blocked: alerts.filter((item) => item.status === 'active' && item.type === 'domaine_bloque').length,
    volume: alerts.filter((item) => item.status === 'active' && item.type === 'volume_eleve').length,
  }), [alerts]);
  const visibleAlerts = useMemo(() => alerts.filter((item) =>
    (statusFilter === 'all' || item.status === statusFilter) &&
    (typeFilter === 'all' || item.type === typeFilter)
  ), [alerts, statusFilter, typeFilter]);

  return (
    <DashboardShell title="Alertes" subtitle="Alertes déclenchées par les sessions reçues et suivi des actions de l’équipe.">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="À traiter" value={counts.active} icon={ShieldAlert} tone="amber" />
          <SummaryCard label="Domaines bloqués" value={counts.blocked} icon={Ban} tone="rose" />
          <SummaryCard label="Volumes élevés" value={counts.volume} icon={Gauge} tone="orange" />
          <SummaryCard label="Traitées" value={counts.resolved} icon={CheckCircle2} tone="green" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-xs text-slate-500" aria-live="polite">
            {updatedAt ? `Données actualisées à ${updatedAt.toLocaleTimeString('fr-FR')} · actualisation automatique toutes les 15 s` : 'Chargement des données…'}
          </p>
          <button type="button" onClick={() => void refreshNow()} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>

        {integrations && (!integrations.whatsappConfigured || !integrations.unifiConfigured) && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {!integrations.whatsappConfigured && <p>WhatsApp non configuré : les nouvelles alertes restent visibles ici, mais aucune notification ne partira avant la configuration du compte Business Cloud API et du modèle approuvé.</p>}
          {!integrations.unifiConfigured && <p>Le contrôleur réseau n’est pas configuré : le blocage distant sera indisponible jusqu’à la configuration de l’API UniFi.</p>}
        </div>}

        {error && <div role="alert" className="flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}<button onClick={() => void refreshNow()} className="underline">Réessayer</button></div>}
        {actionMessage && <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{actionMessage}</p>}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Alertes réseau</h2>
              <p className="mt-1 text-xs text-slate-500">{visibleAlerts.length} résultat{visibleAlerts.length === 1 ? '' : 's'} · classées de la plus récente à la plus ancienne</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select aria-label="Filtrer les alertes par état" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <option value="active">À traiter</option><option value="all">Tous les états</option><option value="resolved">Traitées</option>
              </select>
              <select aria-label="Filtrer les alertes par type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <option value="all">Tous les types</option><option value="domaine_bloque">Domaine bloqué</option><option value="volume_eleve">Volume élevé</option>
              </select>
            </div>
          </div>

          {loading ? <p className="py-10 text-center text-sm text-slate-500">Chargement des alertes…</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500"><tr>
                  <th className="py-3 pr-4 font-medium">Déclenchement</th><th className="py-3 pr-4 font-medium">Usager / appareil</th><th className="py-3 pr-4 font-medium">Infraction et réseau</th><th className="py-3 pr-4 font-medium">État</th><th className="py-3 pr-4 font-medium">Action</th>
                </tr></thead>
                <tbody>
                  {visibleAlerts.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-slate-500">
                    {alerts.length === 0 ? 'Aucune alerte reçue. Les alertes sont créées automatiquement à partir des sessions collectées et des règles configurées.' : 'Aucune alerte ne correspond à ces filtres.'}
                  </td></tr> : visibleAlerts.map((item) => <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap py-3 pr-4 text-slate-600">{new Date(item.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}<div className="mt-1"><StatusBadge status={item.type} label={typeLabel(item.type)} /></div></td>
                    <td className="py-3 pr-4"><span className="font-medium text-slate-800">{item.session?.identifiantUsager ?? '—'}</span><div className="mt-1 text-xs text-slate-500">{item.session?.appareil ?? 'Appareil inconnu'}</div></td>
                    <td className="max-w-md py-3 pr-4 text-slate-700">{item.message}<div className="mt-1 space-y-1 text-xs text-slate-500"><p>IP : {item.session?.adresseIp ?? '—'} · MAC : {item.session?.adresseMac ?? '—'}</p><p>Domaine : {item.session?.domaineDns ?? '—'}</p><p className="max-w-xs truncate" title={item.session?.navigateur ?? ''}>Navigateur : {item.session?.navigateur ?? '—'}</p></div></td>
                    <td className="py-3 pr-4"><StatusBadge status={item.status} label={item.status === 'active' ? 'À traiter' : 'Traitée'} /></td>
                    <td className="py-3 pr-4">{item.status === 'active' ? <div className="flex flex-col items-start gap-2"><button disabled={updatingId === item.id || !integrations?.unifiConfigured || !item.session?.adresseMac} title={!item.session?.adresseMac ? 'Le collecteur doit transmettre l’adresse MAC' : undefined} onClick={() => void blockDevice(item)} className="whitespace-nowrap rounded-xl bg-rose-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">{updatingId === item.id ? 'En cours…' : 'Bloquer l’usager'}</button><button disabled={updatingId === item.id} onClick={() => void resolveAlert(item.id)} className="text-xs text-slate-500 underline disabled:opacity-50">Marquer traitée sans bloquer</button></div> : <span className="text-xs text-slate-500">{item.resolvedAt ? new Date(item.resolvedAt).toLocaleDateString('fr-FR') : 'Terminée'}</span>}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4"><h2 className="text-lg font-semibold">Usagers bloqués</h2><p className="mt-1 text-xs text-slate-500">{blockedDevices.length} appareil{blockedDevices.length === 1 ? '' : 's'} · déblocage manuel disponible depuis WiFiSecure</p></div>
          {blockedDevices.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">Aucun appareil bloqué actuellement.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-slate-500"><tr><th className="py-3 pr-4 font-medium">Usager / appareil</th><th className="py-3 pr-4 font-medium">Adresse IP / MAC</th><th className="py-3 pr-4 font-medium">Infraction</th><th className="py-3 pr-4 font-medium">Bloqué le / par</th><th className="py-3 pr-4 font-medium">Action</th></tr></thead><tbody>{blockedDevices.map((device) => <tr key={device.id} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-4">{device.identifiantUsager}<div className="text-xs text-slate-500">{device.appareil}</div></td><td className="py-3 pr-4">{device.adresseIp ?? '—'}<div className="text-xs text-slate-500">{device.adresseMac}</div></td><td className="py-3 pr-4">{device.infraction}</td><td className="py-3 pr-4">{new Date(device.blockedAt).toLocaleString('fr-FR')}<div className="text-xs text-slate-500">{device.blockedBy}</div></td><td className="py-3 pr-4"><button disabled={updatingId === device.id} onClick={() => void unblockDevice(device.id)} className="whitespace-nowrap rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{updatingId === device.id ? 'En cours…' : 'Débloquer l’usager'}</button></td></tr>)}</tbody></table></div>}
        </section>
      </div>
    </DashboardShell>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof ShieldAlert; tone: 'amber' | 'rose' | 'orange' | 'green' }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    orange: 'bg-orange-50 text-orange-700',
    green: 'bg-emerald-50 text-emerald-700',
  };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span></div>
    <p className="mt-4 text-3xl font-semibold text-slate-900">{value}</p>
  </div>;
}
