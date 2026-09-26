'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '../../components/dashboard-shell';
import { apiFetch } from '../../lib/api-client';
import { useRealtimeRefresh } from '../../lib/use-realtime-refresh';

type Role = 'admin' | 'agent';

type User = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  isActive: boolean;
};
type CreatedOrganization = { organization: { slug: string; name: string }; collectorToken: string };

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  agent: 'Utilisateur',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('agent');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [createdOrganization, setCreatedOrganization] = useState<CreatedOrganization | null>(null);
  const sharedUserAccount = users.find((user) => user.role === 'agent' && user.isActive);

  async function loadUsers(quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const res = await apiFetch('/api/users');
      if (!res.ok) throw new Error('load-failed');
      setUsers(await res.json());
      setError(null);
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);
  useRealtimeRefresh(() => loadUsers(true), 15000);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const res = await apiFetch(role === 'agent' ? '/api/users/shared-account' : '/api/users', {
        method: role === 'agent' ? 'PUT' : 'POST',
        body: JSON.stringify({ fullName: name, email, role, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.message ?? 'Impossible de créer ce compte.');
        return;
      }

      setName('');
      setEmail('');
      setRole('agent');
      setPassword('');
      await loadUsers();
    } catch {
      setError('Impossible de créer ce compte.');
    } finally {
      setCreating(false);
    }
  }

  async function handleCreateOrganization(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreatingOrganization(true);
    setCreatedOrganization(null);
    setError(null);
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      slug: form.get('organizationSlug'),
      name: form.get('organizationName'),
      label: form.get('organizationLabel'),
      admin: { fullName: form.get('adminName'), email: form.get('adminEmail'), password: form.get('adminPassword') },
      agent: { fullName: form.get('agentName'), email: form.get('agentEmail'), password: form.get('agentPassword') },
    };
    try {
      const response = await apiFetch('/api/organizations', { method: 'POST', body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message ?? 'Impossible de créer la structure.');
      setCreatedOrganization(result);
      formElement.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de créer la structure.');
    } finally { setCreatingOrganization(false); }
  }

  return (
    <DashboardShell title="Comptes et accès" subtitle="Créer et gérer les comptes des utilisateurs et administrateurs du Wi-Fi.">
      {error && <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Créer une structure</h3>
        <p className="mt-2 text-sm text-slate-500">Chaque structure reçoit son propre espace de données et ses comptes administrateur et agent.</p>
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleCreateOrganization}>
          <label className="text-sm font-medium text-slate-700">Nom de la structure<input name="organizationName" required minLength={2} maxLength={100} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" /></label>
          <label className="text-sm font-medium text-slate-700">Code de connexion<input name="organizationSlug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={80} placeholder="ex. centre-nord" className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" /><span className="mt-1 block text-xs font-normal text-slate-500">À saisir sur la page de connexion de la structure.</span></label>
          <label className="text-sm font-medium text-slate-700">Intitulé de l’espace<input name="organizationLabel" defaultValue="Portail de connexion Wi-Fi" maxLength={120} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5" /></label>
          <div className="hidden md:block" />
          <fieldset className="rounded-2xl border border-slate-200 p-4"><legend className="px-2 text-sm font-semibold">Compte administrateur</legend><div className="space-y-3"><input name="adminName" required minLength={2} placeholder="Nom complet" aria-label="Nom de l’administrateur" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /><input name="adminEmail" required type="email" placeholder="E-mail administrateur" aria-label="E-mail administrateur" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /><input name="adminPassword" required minLength={8} type="password" placeholder="Mot de passe (8 caractères minimum)" aria-label="Mot de passe administrateur" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></div></fieldset>
          <fieldset className="rounded-2xl border border-slate-200 p-4"><legend className="px-2 text-sm font-semibold">Compte agent</legend><div className="space-y-3"><input name="agentName" required minLength={2} placeholder="Nom complet" aria-label="Nom de l’agent" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /><input name="agentEmail" required type="email" placeholder="E-mail agent" aria-label="E-mail agent" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /><input name="agentPassword" required minLength={8} type="password" placeholder="Mot de passe (8 caractères minimum)" aria-label="Mot de passe agent" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm" /></div></fieldset>
          <div className="md:col-span-2"><button disabled={creatingOrganization} className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{creatingOrganization ? 'Création en cours…' : 'Créer la structure et ses comptes'}</button></div>
        </form>
        {createdOrganization && <div role="status" className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><p className="font-semibold">{createdOrganization.organization.name} est créée.</p><p className="mt-1">Code de connexion : <code className="font-bold">{createdOrganization.organization.slug}</code></p><p className="mt-2">Jeton du collecteur à copier dans la configuration réseau de cette structure (affiché une seule fois) :</p><code className="mt-1 block break-all rounded-lg bg-white p-3">{createdOrganization.collectorToken}</code></div>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Comptes du personnel</h3>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 pr-4 font-medium">Nom</th>
                  <th className="py-3 pr-4 font-medium">E-mail</th>
                  <th className="py-3 pr-4 font-medium">Rôle</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={3} className="py-4 text-slate-500">Chargement...</td></tr>
                )}
                {!loading && users.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-slate-500">Aucun compte pour le moment.</td></tr>
                )}
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-slate-700">{user.fullName}</td>
                    <td className="py-3 pr-4">{user.email}{user.role === 'agent' && user.isActive && <span className="ml-2 text-xs text-brand-700">Compte partagé</span>}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{role === 'agent' && sharedUserAccount ? 'Modifier le compte partagé' : 'Créer un compte'}</h3>
          <p className="mt-2 text-sm text-slate-500">Un seul compte utilisateur est partagé par les usagers du Wi-Fi. Les comptes administrateur restent individuels.</p>
          <form className="mt-5 space-y-4" onSubmit={handleCreate}>
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">Nom complet</label>
              <input
                id="name" value={name} onChange={(e) => setName(e.target.value)} required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">E-mail</label>
              <input
                id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>
            <div>
              <label htmlFor="role" className="mb-2 block text-sm font-medium text-slate-700">Rôle</label>
              <select
                id="role" value={role} onChange={(e) => {
                  const nextRole = e.target.value as Role;
                  setRole(nextRole);
                  if (nextRole === 'agent' && sharedUserAccount) {
                    setName(sharedUserAccount.fullName);
                    setEmail(sharedUserAccount.email);
                    setPassword('');
                  } else if (nextRole === 'admin') {
                    setName('');
                    setEmail('');
                    setPassword('');
                  }
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500 focus:bg-white"
              >
                <option value="agent">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">Mot de passe</label>
              <input
                id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={8}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500 focus:bg-white"
              />
            </div>
            <button
              type="submit" disabled={creating}
              className="w-full rounded-2xl bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {creating ? 'Enregistrement...' : role === 'agent' && sharedUserAccount ? 'Enregistrer les identifiants partagés' : 'Créer le compte'}
            </button>
          </form>
        </section>
      </div>
    </DashboardShell>
  );
}
