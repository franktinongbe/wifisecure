'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '../../components/dashboard-shell';
import { apiFetch } from '../../lib/api-client';
import { useRealtimeRefresh } from '../../lib/use-realtime-refresh';

const THRESHOLD_KEY = 'session_volume_alert_threshold_bytes';
type Organization = { name: string; label: string; contactEmail: string; phone: string; address: string; logoUrl: string; primaryColor: string };
const defaultOrganization: Organization = { name: 'Ma structure', label: 'Portail de connexion Wi-Fi', contactEmail: '', phone: '', address: '', logoUrl: '', primaryColor: '#2148a6' };

function bytesToGo(bytes: number) {
  return (bytes / 1024 ** 3).toFixed(1);
}

export default function SettingsPage() {
  const [thresholdBytes, setThresholdBytes] = useState<number | null>(null);
  const [domains, setDomains] = useState<string[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [domainRole, setDomainRole] = useState<'agent' | 'admin'>('agent');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thresholdDirty, setThresholdDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization>(defaultOrganization);
  const [organizationSaving, setOrganizationSaving] = useState(false);
  const [organizationMessage, setOrganizationMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, domainsRes, organizationRes] = await Promise.all([
          apiFetch('/api/settings'),
          apiFetch(`/api/settings/domains?role=${domainRole}`),
          apiFetch('/api/settings/organization'),
        ]);

        if (!settingsRes.ok || !domainsRes.ok || !organizationRes.ok) throw new Error('load-failed');

        const settings: { key: string; value: string }[] = await settingsRes.json();
        const domainList: { domain: string }[] = await domainsRes.json();
        setOrganization({ ...defaultOrganization, ...await organizationRes.json() });

        const threshold = settings.find((s) => s.key === THRESHOLD_KEY);
        setThresholdBytes(threshold ? Number(threshold.value) : 2 * 1024 ** 3);
        setThresholdDirty(false);
        setDomains(domainList.map((d) => d.domain));
      } catch {
        setError('Impossible de charger les paramètres.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [domainRole]);

  async function refreshSettings() {
    try {
      const [settingsRes, domainsRes] = await Promise.all([
        apiFetch('/api/settings'),
        apiFetch(`/api/settings/domains?role=${domainRole}`),
      ]);
      if (!settingsRes.ok || !domainsRes.ok) return;
      const settings: { key: string; value: string }[] = await settingsRes.json();
      const domainList: { domain: string }[] = await domainsRes.json();
      const threshold = settings.find((setting) => setting.key === THRESHOLD_KEY);
      if (!thresholdDirty) setThresholdBytes(threshold ? Number(threshold.value) : 2 * 1024 ** 3);
      setDomains(domainList.map((domain) => domain.domain));
      setError(null);
    } catch {
      // Keep the latest displayed values if a background refresh fails.
    }
  }
  useRealtimeRefresh(refreshSettings, 15000);

  async function saveOrganization(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOrganizationSaving(true);
    setOrganizationMessage(null);
    try {
      const response = await apiFetch('/api/settings/organization', { method: 'PUT', body: JSON.stringify(organization) });
      if (!response.ok) throw new Error('save-failed');
      setOrganization({ ...defaultOrganization, ...await response.json() });
      setOrganizationMessage('Les informations de la structure sont enregistrées et visibles dans les espaces admin et agent.');
    } catch {
      setOrganizationMessage("Impossible d'enregistrer les informations de la structure.");
    } finally { setOrganizationSaving(false); }
  }

  async function handleSaveThreshold(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (thresholdBytes === null) return;

    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch('/api/settings/threshold', {
        method: 'PUT',
        body: JSON.stringify({ value: thresholdBytes }),
      });
      if (!res.ok) throw new Error('save-failed');
      setThresholdDirty(false);
    } catch {
      setError("Impossible d'enregistrer le seuil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddDomain(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;

    setError(null);
    try {
      const res = await apiFetch('/api/settings/domains', {
        method: 'POST',
        body: JSON.stringify({ domain, role: domainRole }),
      });
      if (!res.ok) throw new Error('add-failed');
      setDomains((prev) => (prev.includes(domain) ? prev : [...prev, domain].sort()));
      setNewDomain('');
    } catch {
      setError("Impossible d'ajouter ce domaine.");
    }
  }

  async function handleRemoveDomain(domain: string) {
    setError(null);
    const previous = domains;
    setDomains((prev) => prev.filter((d) => d !== domain)); // mise à jour optimiste

    try {
      const res = await apiFetch(`/api/settings/domains/${domainRole}/${encodeURIComponent(domain)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('remove-failed');
    } catch {
      setDomains(previous); // rollback si l'appel échoue
      setError('Impossible de retirer ce domaine.');
    }
  }

  return (
    <DashboardShell title="Paramètres" subtitle="Gestion du seuil de volume et des domaines bloqués pour les alertes du réseau.">
      {error && <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Identité de la structure</h3>
        <p className="mt-2 text-sm text-slate-500">Ces informations personnalisent l’en-tête des espaces administrateur et agent ainsi que le portail Wi-Fi.</p>
        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={saveOrganization}>
          <label className="text-sm font-medium text-slate-700">Nom de la structure<input required minLength={2} maxLength={100} value={organization.name} onChange={(e) => setOrganization({ ...organization, name: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-slate-700">Intitulé affiché<input maxLength={120} value={organization.label} onChange={(e) => setOrganization({ ...organization, label: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-slate-700">E-mail de contact<input type="email" value={organization.contactEmail} onChange={(e) => setOrganization({ ...organization, contactEmail: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-slate-700">Téléphone<input maxLength={40} value={organization.phone} onChange={(e) => setOrganization({ ...organization, phone: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-slate-700">Adresse<input maxLength={200} value={organization.address} onChange={(e) => setOrganization({ ...organization, address: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-slate-700">URL du logo<input type="url" value={organization.logoUrl} onChange={(e) => setOrganization({ ...organization, logoUrl: e.target.value })} placeholder="https://..." className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" /></label>
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">Couleur principale<input type="color" value={organization.primaryColor} onChange={(e) => setOrganization({ ...organization, primaryColor: e.target.value })} className="h-10 w-16 rounded-lg border border-slate-200 p-1" /><span>{organization.primaryColor}</span></label>
          <div className="flex items-center gap-4 sm:col-span-2">{organization.logoUrl && <img src={organization.logoUrl} alt="Aperçu du logo" className="h-12 max-w-32 object-contain" />}<button disabled={organizationSaving} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{organizationSaving ? 'Enregistrement…' : 'Enregistrer l’identité'}</button>{organizationMessage && <p role="status" className="text-sm text-slate-600">{organizationMessage}</p>}</div>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Seuil d'alerte</h3>
          <p className="mt-2 text-sm text-slate-500">Configurez le volume maximal d'une session avant déclenchement d'une alerte.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSaveThreshold}>
            <div>
              <label htmlFor="threshold" className="mb-2 block text-sm font-medium text-slate-700">
                Volume maximum (en octets)
              </label>
              <input
                id="threshold"
                type="number"
                min={1}
                value={thresholdBytes ?? ''}
                onChange={(e) => { setThresholdBytes(Number(e.target.value)); setThresholdDirty(true); }}
                disabled={loading}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500 focus:bg-white disabled:opacity-60"
              />
            </div>
            {thresholdBytes !== null && (
              <div className="rounded-2xl bg-brand-50 p-3 text-sm text-brand-700">
                Seuil actuel : {bytesToGo(thresholdBytes)} Go
              </div>
            )}
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Domaines bloqués</h3>
          <p className="mt-2 text-sm text-slate-500">Tout est autorisé par défaut. Choisissez le rôle auquel appliquer cette liste de blocage.</p>
          <div className="mt-4 flex gap-2" role="tablist" aria-label="Rôle de la liste de blocage">
            <button type="button" role="tab" aria-selected={domainRole === 'agent'} onClick={() => setDomainRole('agent')} className={`rounded-xl px-3 py-2 text-sm ${domainRole === 'agent' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Utilisateurs</button>
            <button type="button" role="tab" aria-selected={domainRole === 'admin'} onClick={() => setDomainRole('admin')} className={`rounded-xl px-3 py-2 text-sm ${domainRole === 'admin' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Administrateurs</button>
          </div>

          <form className="mt-5 flex gap-3" onSubmit={handleAddDomain}>
            <input
              type="text"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="Ajouter un domaine"
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500 focus:bg-white"
            />
            <button type="submit" className="rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">
              Ajouter
            </button>
          </form>

          <div className="mt-5 space-y-2">
            {loading && <p className="text-sm text-slate-500">Chargement...</p>}
            {!loading && domains.length === 0 && (
              <p className="text-sm text-slate-500">Aucun domaine bloqué pour le moment.</p>
            )}
            {domains.map((domain) => (
              <div key={domain} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <span>{domain}</span>
                <button onClick={() => handleRemoveDomain(domain)} className="text-red-600 hover:text-red-700">
                  Retirer
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
