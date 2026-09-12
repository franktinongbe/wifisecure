const stats = [
  { label: 'Usagers connectés', value: '42', tone: 'blue' },
  { label: 'Bande passante', value: '3.8 GB', tone: 'green' },
  { label: 'Durée moyenne', value: '28 min', tone: 'amber' },
  { label: 'Alertes actives', value: '7', tone: 'red' },
];

const recentSessions = [
  { id: 'S-1042', user: 'U-003', device: 'Smartphone', duration: '34 min', status: 'normal', volume: '820 MB' },
  { id: 'S-1043', user: 'U-011', device: 'Ordinateur portable', duration: '58 min', status: 'needs_review', volume: '2.4 GB' },
  { id: 'S-1044', user: 'U-008', device: 'Tablette', duration: '21 min', status: 'normal', volume: '430 MB' },
  { id: 'S-1045', user: 'U-005', device: 'iPhone', duration: '48 min', status: 'normal', volume: '1.1 GB' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Bibliothèque</p>
            <h1 className="mt-2 text-2xl font-semibold">WiFiSecure</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">Exporter CSV</button>
            <button className="rounded-lg bg-[#2148a6] px-4 py-2 text-sm font-medium text-white shadow-sm">Connexion</button>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{stat.label}</p>
                <span className={`h-2.5 w-2.5 rounded-full ${
                  stat.tone === 'blue' ? 'bg-blue-500' :
                  stat.tone === 'green' ? 'bg-emerald-500' :
                  stat.tone === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                }`} />
              </div>
              <p className="mt-5 text-3xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sessions récentes</h2>
            <div className="flex gap-2">
              <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">Tout</button>
              <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">Normal</button>
              <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm">À vérifier</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="py-3 pr-4 font-medium">ID</th>
                  <th className="py-3 pr-4 font-medium">Usager</th>
                  <th className="py-3 pr-4 font-medium">Appareil</th>
                  <th className="py-3 pr-4 font-medium">Durée</th>
                  <th className="py-3 pr-4 font-medium">Volume</th>
                  <th className="py-3 pr-4 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentSessions.map((session) => (
                  <tr key={session.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-slate-700">{session.id}</td>
                    <td className="py-3 pr-4">{session.user}</td>
                    <td className="py-3 pr-4">{session.device}</td>
                    <td className="py-3 pr-4">{session.duration}</td>
                    <td className="py-3 pr-4">{session.volume}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        session.status === 'normal'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {session.status === 'normal' ? 'Normal' : 'À vérifier'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
