'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, Download, RefreshCw } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard-shell';
import { apiFetch } from '../../lib/api-client';

interface ArchiveFile {
  date: string;
  name: string;
  updatedAt: string | null;
  size: number | null;
}

function formatSize(bytes: number | null) {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} o`;
  return `${(bytes / 1024).toFixed(1)} Ko`;
}

export default function ArchivesPage() {
  const [items, setItems] = useState<ArchiveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/archives');
      const body = await response.json();
      if (!response.ok) throw new Error(body.message ?? 'Impossible de charger les archives.');
      setItems(body.items ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function download(date: string) {
    const response = await apiFetch(`/api/archives/${date}/download`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.message ?? 'Téléchargement impossible.');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${date}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardShell title="Archives de connexion" subtitle="Historique quotidien privé des sessions Wi-Fi collectées">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-50 p-3 text-brand-700"><Archive className="h-5 w-5" /></div>
            <div><h3 className="font-semibold">Fichiers archivés</h3><p className="text-sm text-slate-500">Création automatique à minuit, heure du Bénin</p></div>
          </div>
          <button onClick={() => void refresh()} disabled={loading} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualiser
          </button>
        </div>
        {error && <div role="alert" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}
        {loading ? <p className="py-8 text-center text-sm text-slate-500">Chargement des archives…</p> : items.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">Aucune archive disponible pour le moment. La première sera créée après la prochaine fin de journée.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500"><th className="py-3 pr-4">Journée</th><th className="py-3 pr-4">Mise à jour</th><th className="py-3 pr-4">Taille</th><th className="py-3 text-right">Action</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.name} className="border-b border-slate-100 last:border-0">
              <td className="py-4 pr-4 font-medium">{item.date}</td>
              <td className="py-4 pr-4 text-slate-500">{item.updatedAt ? new Date(item.updatedAt).toLocaleString('fr-FR') : '—'}</td>
              <td className="py-4 pr-4 text-slate-500">{formatSize(item.size)}</td>
              <td className="py-4 text-right"><button onClick={() => void download(item.date)} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"><Download className="h-4 w-4" /> Télécharger</button></td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
    </DashboardShell>
  );
}
