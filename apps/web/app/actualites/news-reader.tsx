'use client';

import { useMemo, useState } from 'react';
import { BookOpen, CalendarDays, Download, File as FileIcon, Newspaper, Search } from 'lucide-react';

type NewsAttachment = { id: string; fileName: string; contentType: string; sizeBytes: number };
type NewsItem = {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
  author?: { fullName: string } | null;
  attachments: NewsAttachment[];
};

function formatFileSize(size: number) {
  return size < 1024 * 1024
    ? `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(size / 1024)} Ko`
    : `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(size / 1024 / 1024)} Mo`;
}

export function NewsReader({
  items,
  fullName,
  loading,
  error,
  notice,
  onDownload,
}: {
  items: NewsItem[];
  fullName: string;
  loading: boolean;
  error: string | null;
  notice: string | null;
  onDownload: (item: NewsItem, attachment: NewsAttachment) => void;
}) {
  const [search, setSearch] = useState('');
  const visibleItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    return items.filter((item) => item.published && (!query ||
      [item.title, item.summary ?? '', item.content].some((value) => value.toLocaleLowerCase('fr').includes(query))));
  }, [items, search]);

  return <div className="space-y-8 pb-8">
    <section className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
      <div aria-hidden="true" className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-blue-50" />
      <div aria-hidden="true" className="absolute right-12 top-10 hidden h-28 w-28 rounded-full border-[18px] border-indigo-50 sm:block" />
      <div className="relative max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800"><BookOpen className="h-3.5 w-3.5" /> CAEB · Fondation Vallet</span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Les nouvelles de votre bibliothèque</h1>
        <p className="mt-3 max-w-xl text-base leading-7 text-slate-600">Retrouvez les annonces, activités et informations utiles partagées par l’équipe.</p>
        <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-800"><span className="h-2 w-2 rounded-full bg-emerald-500" />Connecté en tant que {fullName}</p>
      </div>
    </section>

    {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
    {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

    <section aria-labelledby="news-heading">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Le fil de la bibliothèque</p>
          <h2 id="news-heading" className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Actualités publiées</h2>
          {!loading && <p className="mt-1 text-sm text-slate-500">{visibleItems.length} {visibleItems.length === 1 ? 'information' : 'informations'}</p>}
        </div>
        <label className="relative block w-full sm:max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <span className="sr-only">Rechercher dans les actualités</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une information…" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
        </label>
      </div>

      {loading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Chargement des actualités…</div>
        : visibleItems.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Newspaper className="h-7 w-7" /></div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">{search ? 'Aucun résultat trouvé' : 'Aucune actualité pour le moment'}</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{search ? 'Essaie avec un autre mot-clé.' : 'Les prochaines annonces de la bibliothèque apparaîtront ici.'}</p>
          {search && <button type="button" onClick={() => setSearch('')} className="mt-4 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Effacer la recherche</button>}
        </div> : <div className="space-y-4">
          {visibleItems.map((item) => {
            const preview = item.summary?.trim() || item.content.slice(0, 220);
            const hasMore = Boolean(item.summary) || item.content.length > 220;
            return <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-7">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Publié</span>
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{new Date(item.publishedAt ?? item.updatedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</span>
                {item.author?.fullName && <span>Par {item.author.fullName}</span>}
              </div>
              <h3 className="mt-4 text-xl font-bold leading-snug text-slate-950 sm:text-2xl">{item.title}</h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{preview}{!item.summary && item.content.length > 220 ? '…' : ''}</p>
              {hasMore && <details className="group mt-3">
                <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg py-1 text-sm font-semibold text-blue-700 outline-none hover:text-blue-900 focus-visible:ring-2 focus-visible:ring-blue-500">
                  <span className="group-open:hidden">Lire la suite</span><span className="hidden group-open:inline">Réduire</span>
                  <span aria-hidden="true" className="transition group-open:rotate-180">⌄</span>
                </summary>
                <p className="mt-3 whitespace-pre-wrap border-l-2 border-blue-100 pl-4 text-sm leading-7 text-slate-700">{item.content}</p>
              </details>}
              {item.attachments?.length > 0 && <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Fichiers joints</p>
                <div className="flex flex-wrap gap-2">{item.attachments.map((attachment) => <div key={attachment.id} className="inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <FileIcon className="h-4 w-4 shrink-0 text-blue-700" />
                  <span className="max-w-[14rem] truncate text-xs font-medium text-slate-700">{attachment.fileName}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{formatFileSize(attachment.sizeBytes)}</span>
                  <button type="button" onClick={() => onDownload(item, attachment)} aria-label={`Télécharger ${attachment.fileName}`} title="Télécharger" className="rounded-lg p-1 text-blue-700 hover:bg-blue-100"><Download className="h-4 w-4" /></button>
                </div>)}</div>
              </div>}
            </article>;
          })}
        </div>}
    </section>
  </div>;
}
