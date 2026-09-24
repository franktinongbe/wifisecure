'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, Database, RefreshCw, ShieldCheck, Wifi } from 'lucide-react';
import Link from 'next/link';
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

const initialFilters: DashboardFilterState = { dateRange: 'today', status: 'all', deviceType: 'all' };
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
  const [totalSessions, setTotalSessions] = useState(0);

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
        sessionsResponse.json() as Promise<{ items: ApiSession[]; total: number }>,
        statsResponse.json() as Promise<SessionStats>,
        alertsResponse.json() as Promise<AlertCounts>,
      ]);
      setSessions(sessionResult.items);
      setTotalSessions(sessionResult.total);
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
  useRealtimeRefresh(() => loadDashboard(true), 15000);

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
        <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-blue-800 px-6 py-7 text-white shadow-lg shadow-blue-950/10 sm:px-8 sm:py-8">
          <div aria-hidden="true" className="absolute -right-16 -top-28 -z-10 h-80 w-80 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-4 -top-16 -z-10 h-56 w-56 rounded-full border border-white/10" />
          <div className="absolute -bottom-28 right-20 -z-10 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-medium text-emerald-100">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" /></span>
                Supervision en direct
              </div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Votre réseau, en un coup d’œil.</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-blue-100/80">Suivez les connexions, repérez les activités à vérifier et gardez le contrôle de votre réseau Wi-Fi.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/alerts" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-950 shadow-sm transition hover:bg-blue-50">Voir les alertes <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/liste-jaune" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"><ShieldCheck className="h-4 w-4" /> Liste Jaune</Link>
            </div>
          </div>
          <div className="relative mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs text-blue-100/70">
            <span className="inline-flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5" /> Actualisation automatique toutes les 15 secondes</span>
            <span>{updatedAt ? `Dernière mise à jour à ${updatedAt.toLocaleTimeString('fr-FR')}` : 'Connexion aux données en cours…'}</span>
          </div>
        </section>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Sessions actives" value={stats ? numberFormat.format(stats.activeUsers) : '\u2014'} icon={Wifi} tone="blue" description="Appareils connectés actuellement" />
          <StatCard label="Alertes en cours" value={activeAlerts === null ? '\u2014' : numberFormat.format(activeAlerts)} icon={AlertTriangle} tone="rose" description="Événements à examiner" />
          <StatCard label="Volume récent · 5 min" value={stats ? formatBytes(stats.bandwidthLast5Minutes) : '\u2014'} icon={Activity} tone="violet" description={stats ? `Durée moyenne : ${numberFormat.format(stats.averageSessionMinutes)} min` : 'Trafic observé sur le réseau'} />
          <StatCard label="Sessions sur la période" value={numberFormat.format(totalSessions)} icon={Database} tone="emerald" description="Selon les filtres sélectionnés" />
        </div>
        <DashboardFilters filters={filters} onChange={setFilters} onReset={() => setFilters(initialFilters)} />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500" aria-live="polite">
          <p>{updatedAt ? `Donnees actualisees a ${updatedAt.toLocaleTimeString('fr-FR')} · actualisation automatique toutes les 15 s` : 'Connexion aux donnees...'}</p>
          <button type="button" onClick={() => void loadDashboard(true)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>
        {error && <div role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}<button className="ml-3 underline" onClick={() => void loadDashboard()}>Réessayer</button></div>}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Sessions récentes</h3>
          {loading ? <p className="py-8 text-center text-sm text-slate-500">Chargement...</p> : <DataTable columns={columns} data={filteredSessions} keyExtractor={(session) => session.id} emptyMessage="Aucune session recue pour ces filtres. Verifiez que le routeur ou controleur Wi-Fi transmet ses evenements a l'API de collecte." />}
          {!loading && totalSessions > sessions.length && <p className="mt-3 text-xs text-slate-500">Les {sessions.length} sessions les plus recentes sont affichees sur {numberFormat.format(totalSessions)} correspondantes.</p>}
        </section>
      </div>
    </DashboardShell>
  );
}
