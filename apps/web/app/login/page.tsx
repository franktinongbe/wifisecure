'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(e.currentTarget);
    const email = form.get('email');
    const password = form.get('password');

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, organizationSlug: form.get('organizationSlug') }),
      });

      if (!res.ok) {
        setError(res.status === 401 || res.status === 400
          ? 'Adresse e-mail ou mot de passe incorrect.'
          : 'Le service de connexion est momentanément indisponible. Réessayez plus tard.');
        return;
      }

      const { user } = await res.json();
      router.push(user.role === 'admin' ? '/' : '/actualites');
      router.refresh();
    } catch {
      setError('Impossible de se connecter au serveur. Réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 p-4">
      <nav aria-label="Navigation principale" className="mx-auto mb-6 flex w-full max-w-5xl items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
        <a href="/login" className="font-semibold text-brand-700">WiFiSecure</a>
        <span className="text-sm text-slate-500">Portail de connexion Wi-Fi</span>
      </nav>
      <div className="mx-auto grid w-full max-w-5xl flex-1 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-soft lg:grid-cols-2">
        <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-8 text-white">
          <p className="text-xs uppercase tracking-[0.26em] text-brand-100">CAEB – Fondation Vallet</p>
          <h1 className="mt-8 text-4xl font-semibold">WiFiSecure</h1>
          <p className="mt-4 max-w-sm text-sm text-brand-100">
            Suivi du réseau public, détection des usages à risque et gestion rapide des alertes pour le personnel.
          </p>

          <div className="mt-10 space-y-4 text-sm text-brand-50">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="font-medium">Protection du réseau</div>
              <div className="mt-1 text-brand-100">Surveillance des sessions actives et des activités suspectes.</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="font-medium">Alertes configurables</div>
              <div className="mt-1 text-brand-100">Détection de volumes élevés et de domaines bloqués.</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Connexion</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Accès au tableau de bord</h2>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="organizationSlug" className="mb-2 block text-sm font-medium text-slate-700">Code de la structure</label>
                <input id="organizationSlug" name="organizationSlug" defaultValue="legacy" required autoComplete="organization" className="mb-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-brand-500 focus:bg-white" />
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  Adresse e-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                  Mot de passe
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-brand-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input type="checkbox" name="remember" className="h-4 w-4 rounded border-slate-300" />
                  Se souvenir de moi
                </label>
                <button type="button" className="text-brand-600 hover:text-brand-700">
                  Mot de passe oublié ?
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="block w-full rounded-2xl bg-brand-600 px-4 py-3 text-center text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <footer className="mx-auto mt-6 w-full max-w-5xl py-3 text-center text-xs text-slate-500">© {new Date().getFullYear()} WiFiSecure · CAEB – Fondation Vallet</footer>
    </main>
  );
}
