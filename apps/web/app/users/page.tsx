'use client';

import { useEffect, useState } from 'react';
import { DashboardShell } from '../../components/dashboard-shell';
import { apiFetch } from '../../lib/api-client';

type Role = 'admin' | 'agent';

type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  agent: 'Agent',
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

  async function loadUsers() {
    try {
      const res = await apiFetch('/api/users');
      if (!res.ok) throw new Error('load-failed');
      setUsers(await res.json());
    } catch {
      setError('Impossible de charger les utilisateurs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, role, password }),
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
    <DashboardShell title="Utilisateurs" subtitle="Créer et gérer les comptes du personnel selon leur rôle d'accès.">
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
                    <td className="py-3 pr-4 font-medium text-slate-700">{user.name}</td>
                    <td className="py-3 pr-4">{user.email}</td>
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
          <h3 className="text-lg font-semibold">Ajouter un compte</h3>
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
                id="role" value={role} onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500 focus:bg-white"
              >
                <option value="agent">Agent</option>
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
              {creating ? 'Création...' : 'Créer le compte'}
            </button>
          </form>
        </section>
      </div>
    </DashboardShell>
  );
}