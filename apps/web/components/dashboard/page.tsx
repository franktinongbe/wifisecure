'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Wifi } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable, Column } from '@/components/ui/data-table';
import { DashboardFilters, DashboardFilterState } from '@/components/dashboard/dashboard-filters';
import { apiFetch } from '@/lib/api-client';
import { useRealtimeRefresh } from '@/lib/use-realtime-refresh';

interface ApiSession {
  id: string;
  identifiantUsager: string;
  appareil: string;
  debut: string;
  fin: string | null;
  volumeOctets: number | string;
  domaineDns: string | null;
  status: 'normal' | 'needs_review';
}
interface SessionStats {
  activeUsers: number;
  bandwidthLast5Minutes: number;
  averageSessionMinutes: number;
}
interface AlertCounts { active: number; resolved: number }

const initialFilters: DashboardFilterState = { dateRange: 'all', status: 'all', deviceType: 'all' };
const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
function formatBytes(value: number) {
  if (value < 1024 ** 2) return `${numberFormat.format(value / 1024)} Ko`;
  if (value < 1024 ** 3) return `${numberFormat.format(value / 1024 ** 2)} Mo`;
  return `${numberFormat.format(value / 1024 ** 3)} Go`;
}
function formatDuration(start: string, end: string | null) {
  const minutes = Math.max(0, Math.round(((end ? Date.parse(end) : Date.now()) - Date.parse(start)) / 60000));
  return `${minutes} min`;
}

export default function DashboardPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [sessions, setSessions] = useState<ApiSession[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const loadDashboard = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '100' });
      const now = new Date();
      if (filters.dateRange !== 'all') {
        const days = filters.dateRange === 'today' ? 1 : filters.dateRange === '7days' ? 7 : 30;
        const from = new Date(now);
        from.setDate(from.getDate() - days + (filters.dateRange === 'today' ? 0 : 1));
        from.setHours(0, 0, 0, 0);
        params.set('dateFrom', from.toISOString());
      }
      if (filters.status !== 'all') params.set('status', filters.status);
      const [sessionsResponse, statsResponse, alertsResponse] = await Promise.all([
        apiFetch(`/api/sessions?${params.toString()}`),
        apiFetch('/api/stats/live'),
        apiFetch('/api/alerts/counts'),
      ]);
      if (sessionsResponse.status === 401 || statsResponse.status === 401 || alertsResponse.status === 401) {
        window.location.assign('/login');
        return;
      }
      if (!sessionsResponse.ok || !statsResponse.ok || !alertsResponse.ok) throw new Error('Chargement des données impossible.');
      const [sessionResult, liveStats, alertCounts] = await Promise.all([
        sessionsResponse.json() as Promise<{ items: ApiSession[] }>,
        statsResponse.json() as Promise<SessionStats>,
        alertsResponse.json() as Promise<AlertCounts>,
      ]);
      setSessions(sessionResult.items);
      setStats(liveStats);
      setActiveAlerts(alertCounts.active);
      setUpdatedAt(new Date());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  useRealtimeRefresh(() => loadDashboard(true), 5000);

  const filteredSessions = useMemo(() => sessions.filter((session) => {
    const device = session.appareil.toLowerCase();
    if (filters.deviceType === 'pc' && !/(pc|ordinateur|laptop|desktop)/.test(device)) return false;
    if (filters.deviceType === 'mobile' && !/(mobile|smartphone|phone|iphone|android)/.test(device)) return false;
    if (filters.deviceType === 'tablet' && !/(tablet|tablette|ipad)/.test(device)) return false;
    return true;
  }), [sessions, filters.deviceType]);

  const columns: Column<ApiSession>[] = [
    { header: 'Usager', accessorKey: 'identifiantUsager' },
    { header: 'Appareil', accessorKey: 'appareil' },
    { header: 'Domaine visité', cell: (session) => session.domaineDns ?? '—' },
    { header: 'Durée', cell: (session) => formatDuration(session.debut, session.fin) },
    { header: 'Volume', cell: (session) => formatBytes(Number(session.volumeOctets)) },
    { header: 'Date', cell: (session) => new Date(session.debut).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) },
    { header: 'Statut', cell: (session) => <StatusBadge status={session.status} label={session.status === 'normal' ? 'Normal' : 'À vérifier'} /> },
  ];

  return (
    <DashboardShell title="Synthèse" subtitle="Activité et alertes du réseau Wi-Fi en temps réel.">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Sessions actives" value={stats ? numberFormat.format(stats.activeUsers) : '—'} icon={Wifi} />
          <StatCard label="Alertes en cours" value={activeAlerts === null ? '—' : numberFormat.format(activeAlerts)} icon={AlertTriangle} />
          <StatCard label="Volume des 5 dernières minutes" value={stats ? formatBytes(stats.bandwidthLast5Minutes) : '—'} icon={Activity} description={stats ? `Durée moyenne : ${numberFormat.format(stats.averageSessionMinutes)} min` : undefined} />
        </div>
        <DashboardFilters filters={filters} onChange={setFilters} onReset={() => setFilters(initialFilters)} />
        <p className="text-right text-xs text-slate-500" aria-live="polite">
          {updatedAt ? `Actualisé à ${updatedAt.toLocaleTimeString('fr-FR')}` : 'Connexion aux données…'}
        </p>
        {error && <div role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}<button className="ml-3 underline" onClick={() => void loadDashboard()}>Réessayer</button></div>}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Sessions récentes</h3>
          {loading ? <p className="py-8 text-center text-sm text-slate-500">Chargement…</p> : <DataTable columns={columns} data={filteredSessions} keyExtractor={(session) => session.id} />}
        </section>
      </div>
    </DashboardShell>
  );
}
