'use client';

import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, ShieldCheck, Wifi } from 'lucide-react';
import { DashboardShell } from '../components/dashboard-shell';
import { StatCard } from '../../components/ui/stat-card';
import { StatusBadge } from '../../components/ui/status-badge';
import { DataTable, Column } from '../../components/ui/data-table';
import { DashboardFilters, DashboardFilterState } from '../../components/dashboard/dashboard-filters';

interface SessionData {
  id: string;
  user: string;
  device: 'pc' | 'mobile' | 'tablet';
  status: 'active' | 'resolved' | 'blocked';
  domain: string;
  volume: string;
  createdAt: string;
}

const initialSessions: SessionData[] = [
  { id: 'S-101', user: 'U-011', device: 'pc', status: 'blocked', domain: 'youtube.com', volume: '1.2 GB', createdAt: '2026-09-12' },
  { id: 'S-102', user: 'U-003', device: 'mobile', status: 'active', domain: 'wikipedia.org', volume: '45 MB', createdAt: '2026-09-12' },
  { id: 'S-103', user: 'U-018', device: 'pc', status: 'resolved', domain: 'facebook.com', volume: '350 MB', createdAt: '2026-09-11' },
  { id: 'S-104', user: 'U-021', device: 'tablet', status: 'active', domain: 'nationalgeographic.com', volume: '120 MB', createdAt: '2026-09-10' },
];

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilterState>({
    dateRange: 'all',
    status: 'all',
    deviceType: 'all',
  });

  const handleResetFilters = () => {
    setFilters({ dateRange: 'all', status: 'all', deviceType: 'all' });
  };

  // Filtrage dynamique des données
  const filteredSessions = useMemo(() => {
    return initialSessions.filter((session) => {
      if (filters.status !== 'all' && session.status !== filters.status) return false;
      if (filters.deviceType !== 'all' && session.device !== filters.deviceType) return false;
      return true;
    });
  }, [filters]);

  // Colonnes du tableau réutilisable
  const columns: Column<SessionData>[] = [
    { header: 'ID Session', accessorKey: 'id' },
    { header: 'Usager', accessorKey: 'user' },
    { header: 'Appareil', accessorKey: 'device' },
    { header: 'Domaine visité', accessorKey: 'domain' },
    { header: 'Volume', accessorKey: 'volume' },
    {
      header: 'Statut',
      cell: (item) => <StatusBadge status={item.status} />,
    },
  ];

  return (
    <DashboardShell
      title="Synthèse"
      subtitle="Aperçu global de l'activité du réseau WiFi et gestion des filtres."
    >
      <div className="space-y-6">
        {/* Cartes de statistiques réutilisables */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Sessions actives"
            value="128"
            icon={Wifi}
            trend={{ value: '12%', isPositive: true }}
          />
          <StatCard
            label="Alertes en cours"
            value="7"
            icon={AlertTriangle}
            trend={{ value: '3', isPositive: false }}
          />
          <StatCard
            label="Domaines bloqués"
            value="14"
            icon={ShieldCheck}
          />
          <StatCard
            label="Bande passante"
            value="4.2 Gbps"
            icon={Activity}
            description="Utilisation optimale"
          />
        </div>

        {/* Composant de Filtres */}
        <DashboardFilters
          filters={filters}
          onChange={setFilters}
          onReset={handleResetFilters}
        />

        {/* Tableau réutilisable */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Activité récente des sessions</h3>
          <DataTable
            columns={columns}
            data={filteredSessions}
            keyExtractor={(item) => item.id}
          />
        </div>
      </div>
    </DashboardShell>
  );
}