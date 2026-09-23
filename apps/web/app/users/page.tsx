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

  return (
    <DashboardShell title="Comptes et accès" subtitle="Créer et gérer les comptes des utilisateurs et administrateurs du Wi-Fi.">
      {error && <div className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

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
