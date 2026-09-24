'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Archive, Bell, BookOpenText, LayoutDashboard, LogOut, Settings, ShieldCheck, Users, List, Newspaper } from 'lucide-react';
import { API_URL, apiFetch } from '../lib/api-client';
import { useRealtimeRefresh } from '../lib/use-realtime-refresh';

const navItems = [
  { href: '/', label: 'Synthèse', icon: LayoutDashboard },
  { href: '/alerts', label: 'Alertes', icon: Bell },
  { href: '/liste-jaune', label: 'Liste Jaune', icon: List },
  { href: '/archives', label: 'Archives', icon: Archive },
  { href: '/actualites', label: 'Actualités', icon: Newspaper },
  { href: '/settings', label: 'Paramètres', icon: Settings },
  { href: '/users', label: 'Utilisateurs', icon: Users },
];

export function DashboardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<{ email: string; fullName: string; role: 'admin' | 'agent' } | null>(null);
  const [authorized, setAuthorized] = useState(false);
  async function refreshUser() {
    try {
      const response = await apiFetch('/api/auth/me');
      if (!response.ok) { window.location.assign('/login'); return; }
      const result = await response.json();
      if (result.user.role !== 'admin') { window.location.assign('/wifi'); return; }
      setUser(result.user);
      setAuthorized(true);
    } catch {
      window.location.assign('/login');
    }
  }
  useEffect(() => { void refreshUser(); }, []);
  useRealtimeRefresh(refreshUser, 30000);

  if (!authorized) return <main className="flex min-h-screen items-center justify-center text-slate-500">Vérification de l’accès…</main>;

  async function logout() {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); }
    finally { window.location.assign('/login'); }
  }

  const visibleNavItems = navItems.filter(({ href }) => user?.role === 'admin' || (href !== '/users' && href !== '/settings'));
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6">
        <nav aria-label="Navigation principale" className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
          <Link href="/" className="font-semibold text-brand-700">WiFiSecure</Link>
          <div className="flex items-center gap-3 text-sm">
            {visibleNavItems.map(({ href, label }) => <Link key={href} href={href} className="text-slate-600 hover:text-brand-700">{label}</Link>)}
            <button onClick={logout} className="text-slate-600 hover:text-rose-700" aria-label="Déconnexion"><LogOut className="h-4 w-4" /></button>
          </div>
        </nav>
      </div>
      <div className="mx-auto flex max-w-7xl gap-6 px-4 pb-6 lg:px-6">
        <aside className="hidden w-72 shrink-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <BookOpenText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Bibliothèque</p>
              <h1 className="text-xl font-semibold">WiFiSecure</h1>
            </div>
          </div>

          <nav className="mt-6 space-y-2">
            {visibleNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-2xl bg-brand-50 p-4 text-sm text-brand-700">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              Accès sécurisé
            </div>
            <p className="mt-2 text-brand-600">{user ? `${user.fullName} · ${user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}` : 'Chargement du compte…'}</p>
          </div>

          <button onClick={logout} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </aside>

        <main className="flex-1">
          <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Tableau de bord</p>
                <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <a href={`${API_URL}/api/export?format=csv&period=week`} className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  Exporter CSV
                </a>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                  <span className="text-sm font-semibold">{user?.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() ?? '…'}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-6">{children}</div>
          <footer className="mt-10 border-t border-slate-200 py-5 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} WiFiSecure · CAEB – Fondation Vallet
          </footer>
        </main>
      </div>
    </div>
  );
}
