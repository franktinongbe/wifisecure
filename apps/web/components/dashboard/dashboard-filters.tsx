'use client';

import { Calendar, Filter, Laptop, RefreshCw } from 'lucide-react';

export interface DashboardFilterState {
  dateRange: string;
  status: string;
  deviceType: string;
}

interface DashboardFiltersProps {
  filters: DashboardFilterState;
  onChange: (filters: DashboardFilterState) => void;
  onReset: () => void;
}

export function DashboardFilters({ filters, onChange, onReset }: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 pr-2 border-r border-slate-200">
        <Filter className="h-4 w-4 text-slate-500" />
        <span>Filtres</span>
      </div>

      {/* Filtre par Date */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
        <Calendar className="h-4 w-4 text-slate-400" />
        <select
          value={filters.dateRange}
          onChange={(e) => onChange({ ...filters, dateRange: e.target.value })}
          className="bg-transparent font-medium text-slate-700 outline-none"
        >
          <option value="today">Aujourd'hui</option>
          <option value="7days">7 derniers jours</option>
          <option value="30days">30 derniers jours</option>
          <option value="all">Toutes les dates</option>
        </select>
      </div>

      {/* Filtre par Statut */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
        <select
          value={filters.status}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className="bg-transparent font-medium text-slate-700 outline-none"
        >
          <option value="all">Tous les statuts</option>
          <option value="active">Actif / En cours</option>
          <option value="resolved">Traité / Terminé</option>
          <option value="blocked">Bloqué</option>
        </select>
      </div>

      {/* Filtre par Appareil */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
        <Laptop className="h-4 w-4 text-slate-400" />
        <select
          value={filters.deviceType}
          onChange={(e) => onChange({ ...filters, deviceType: e.target.value })}
          className="bg-transparent font-medium text-slate-700 outline-none"
        >
          <option value="all">Tous les appareils</option>
          <option value="pc">PC Portable / Fixe</option>
          <option value="mobile">Mobile / Smartphone</option>
          <option value="tablet">Tablette</option>
        </select>
      </div>

      {/* Réinitialisation */}
      <button
        onClick={onReset}
        className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Réinitialiser
      </button>
    </div>
  );
}