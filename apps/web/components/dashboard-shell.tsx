import Link from 'next/link';
import { Bell, BookOpenText, LayoutDashboard, LogOut, Settings, ShieldCheck, Users } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Synthèse', icon: LayoutDashboard },
  { href: '/alerts', label: 'Alertes', icon: Bell },
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
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 lg:px-6">
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
            {navItems.map(({ href, label, icon: Icon }) => (
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
            <p className="mt-2 text-brand-600">Rôle : administrateur</p>
          </div>

          <button className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200">
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
                <button className="rounded-2xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  Exporter CSV
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
                  <span className="text-sm font-semibold">AL</span>
                </div>
              </div>
            </div>
          </header>

          <div className="mt-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
