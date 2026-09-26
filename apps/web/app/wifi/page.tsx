'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api-client';

export default function WifiPortalPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [ready, setReady] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [organization, setOrganization] = useState({ name: 'WiFiSecure', label: 'Portail Wi-Fi', contactEmail: '', phone: '', address: '' });

  useEffect(() => {
    async function connect() {
      try {
        const response = await apiFetch('/api/auth/me');
        if (!response.ok) { router.replace('/login'); return; }
        const { user } = await response.json();
        const organizationResponse = await apiFetch('/api/settings/organization');
        if (organizationResponse.ok) { const organizationData = await organizationResponse.json(); setOrganization((current) => ({ ...current, ...organizationData })); }
        if (user.role === 'admin') { router.replace('/'); return; }
        setName(user.fullName);

        const access = await apiFetch('/api/auth/network/connect', { method: 'POST' });
        if (!access.ok) { setConnectionError(true); return; }
        setReady(true);
      } catch {
        router.replace('/login');
      }
    }
    void connect();
  }, [router]);

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  if (!ready && !connectionError) return <main className="flex min-h-screen items-center justify-center text-slate-500">Activation de l’accès de test…</main>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700" aria-hidden="true">✓</div>
        <p className="mt-6 text-xs uppercase tracking-[0.24em] text-slate-500">WiFiSecure · Bibliothèque</p>
        {ready ? <>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Accès Wi-Fi simulé activé</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Bonjour {name}. Le portail a simulé l’autorisation de votre appareil. Ce mode permet de tester le parcours de connexion ; il ne fournit pas de véritable accès Internet.</p>
        </> : <>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Simulation indisponible</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{connectionError ? 'La simulation réseau est désactivée en production ou l’API ne répond pas.' : 'Vérifiez que le serveur est démarré en mode développement.'}</p>
          <button onClick={() => router.replace('/login')} className="mt-6 rounded-2xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white">Retour à la connexion</button>
        </>}
        {ready && <button onClick={logout} className="mt-7 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Terminer ma session</button>}
      </section>
    </main>
  );
}
