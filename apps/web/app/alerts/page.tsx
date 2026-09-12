'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '../../components/dashboard-shell';

interface Session {
  id: string;
  userId: string;
  domain?: string | null;
}

interface Alert {
  id: string;
  type: string;
  status: 'active' | 'resolved';
  createdAt: string;
  session?: Session | null;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Chargement des alertes depuis le backend
  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      if (!response.ok) throw new Error('Impossible de charger les alertes');
      const data = await response.json();
      setAlerts(data);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Action pour marquer une alerte comme traitée
  const handleResolveAlert = async (alertId: string) => {
    setUpdatingId(alertId);
    try {
      const response = await fetch(`/api/alerts/${alertId}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Échec de la mise à jour de l\'alerte');
      }

      const { alert: updatedAlert } = await response.json();

      // Mise à jour de l'état local
      setAlerts((prevAlerts) =>
        prevAlerts.map((item) => (item.id === alertId ? updatedAlert : item))
      );
    } catch (err: any) {
      alert(err.message || 'Erreur lors du traitement de l\'alerte');
    } finally {
      setUpdatingId(null);
    }
  };

  // Calcul des compteurs d'alertes
  const activeAlertsCount = alerts.filter((a) => a.status === 'active').length;
  const blockedDomainCount = alerts.filter(
    (a) => a.type.toLowerCase() === 'domaine bloqué' || a.type.toLowerCase() === 'blocked_domain'
  ).length;
  const highVolumeCount = alerts.filter(
    (a) => a.type.toLowerCase() === 'volume élevé' || a.type.toLowerCase() === 'high_volume'
  ).length;

  return (
    <DashboardShell
      title="Alertes"
      subtitle="Analyse des sessions signalées et suivi des actions du personnel."
    >
      <div className="space-y-5">
        {/* Cartes de statistiques */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Alertes actives</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{activeAlertsCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Domaines bloqués</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{blockedDomainCount}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Volume élevé</p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">{highVolumeCount}</p>
          </div>
        </div>

        {/* Tableau des sessions signalées */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Sessions signalées</h3>
            <button className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors">
              Filtrer
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">Chargement des alertes...</div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-rose-500">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="py-3 pr-4 font-medium">ID</th>
                    <th className="py-3 pr-4 font-medium">Usager</th>
                    <th className="py-3 pr-4 font-medium">Type</th>
                    <th className="py-3 pr-4 font-medium">Domaine</th>
                    <th className="py-3 pr-4 font-medium">Créé</th>
                    <th className="py-3 pr-4 font-medium">État</th>
                    <th className="py-3 pr-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        Aucune alerte enregistrée.
                      </td>
                    </tr>
                  ) : (
                    alerts.map((alertItem) => (
                      <tr key={alertItem.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-3 pr-4 font-medium text-slate-700">{alertItem.id}</td>
                        <td className="py-3 pr-4">{alertItem.session?.userId ?? '—'}</td>
                        <td className="py-3 pr-4 capitalize text-slate-700">{alertItem.type}</td>
                        <td className="py-3 pr-4">{alertItem.session?.domain ?? '—'}</td>
                        <td className="py-3 pr-4">
                          {new Date(alertItem.createdAt).toLocaleDateString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              alertItem.status === 'active'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {alertItem.status === 'active' ? 'Active' : 'Traité'}
                          </span>
                        </td>
                        <td className="py-3 pr-4">
                          {alertItem.status === 'active' ? (
                            <button
                              disabled={updatingId === alertItem.id}
                              onClick={() => handleResolveAlert(alertItem.id)}
                              className="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                            >
                              {updatingId === alertItem.id ? 'Traitement...' : 'Marquer traité'}
                            </button>
                          ) : (
                            <button className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors">
                              Voir
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}