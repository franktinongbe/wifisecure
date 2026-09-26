'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { BookOpen, CalendarDays, Check, Download, Eye, File as FileIcon, FileEdit, LogOut, Newspaper, Plus, Send, Trash2, Upload, X } from 'lucide-react';
import { DashboardShell } from '../../components/dashboard-shell';
import { apiFetch } from '../../lib/api-client';
import { NewsReader } from './news-reader';

type NewsItem = {
  id: string;
  title: string;
  summary: string | null;
  content: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: { fullName: string } | null;
  attachments: NewsAttachment[];
};
type NewsAttachment = { id: string; fileName: string; contentType: string; sizeBytes: number };
type NewsForm = { title: string; summary: string; content: string; published: boolean };
const blankForm: NewsForm = { title: '', summary: '', content: '', published: false };
const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
function formatFileSize(size: number) { return size < 1024 * 1024 ? `${numberFormat.format(size / 1024)} Ko` : `${numberFormat.format(size / 1024 / 1024)} Mo`; }
function isImageAttachment(fileName: string) { return /\.(avif|bmp|gif|jpe?g|png|webp)$/i.test(fileName); }

function NewsImagePreview({ postId, attachment }: { postId: string; attachment: NewsAttachment }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setImageUrl(null);
    setFailed(false);
    apiFetch(`/api/news/${postId}/attachments/${attachment.id}/preview`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Aperçu indisponible');
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) setImageUrl(objectUrl);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [postId, attachment.id]);

  if (failed) return <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Aperçu de l’image indisponible.</p>;
  if (!imageUrl) return <div role="status" className="mt-3 h-40 animate-pulse rounded-xl bg-slate-100" />;
  return <img src={imageUrl} alt={attachment.fileName} draggable={false} onContextMenu={(event) => event.preventDefault()} className="mt-3 max-h-96 w-full rounded-xl bg-slate-50 object-contain" />;
}

function NewsWorkspace({ isAdmin, fullName, onLogout }: { isAdmin: boolean; fullName: string; onLogout: () => Promise<void> }) {
  const [organization, setOrganization] = useState({ name: 'WiFiSecure', label: 'Actualités', contactEmail: '', phone: '', address: '', logoUrl: '', primaryColor: '#2148a6' });
  const [items, setItems] = useState<NewsItem[]>([]);
  const [form, setForm] = useState<NewsForm>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  useEffect(() => { apiFetch('/api/settings/organization').then(async (response) => { if (response.ok) { const organizationData = await response.json(); setOrganization((current) => ({ ...current, ...organizationData })); } }).catch(() => undefined); }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/api/news');
      if (response.status === 401) { window.location.assign('/login'); return; }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Chargement des actualités impossible.');
      setItems(result);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur de chargement.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  function startEdit(item: NewsItem) {
    setEditingId(item.id);
    setForm({ title: item.title, summary: item.summary ?? '', content: item.content, published: item.published });
    setFormOpen(true);
    setSelectedFiles([]);
    setNotice(null);
  }

  function startNew() {
    setEditingId(null);
    setForm(blankForm);
    setFormOpen(true);
    setSelectedFiles([]);
    setNotice(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError(null); setNotice(null);
    try {
      const existingItem = editingId ? items.find((item) => item.id === editingId) : undefined;
      const keepDraftUntilFilesFinish = form.published && selectedFiles.length > 0 && !existingItem?.published;
      const response = await apiFetch(editingId ? `/api/news/${editingId}` : '/api/news', {
        method: editingId ? 'PUT' : 'POST', body: JSON.stringify({ ...form, published: keepDraftUntilFilesFinish ? false : form.published }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Enregistrement impossible.');
      const savedId: string = result.id;
      setEditingId(savedId);
      for (const [index, file] of selectedFiles.entries()) {
        setUploadProgress(`Téléversement du fichier ${index + 1} sur ${selectedFiles.length}…`);
        const fileResponse = await apiFetch(`/api/news/${savedId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) },
          body: file,
        });
        if (!fileResponse.ok) {
          const fileError = await fileResponse.json().catch(() => ({}));
          throw new Error(fileError.message ?? `Le fichier « ${file.name} » n’a pas pu être envoyé.`);
        }
        setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== 0));
      }
      setUploadProgress(null);
      if (keepDraftUntilFilesFinish) {
        const publishResponse = await apiFetch(`/api/news/${savedId}`, {
          method: 'PUT', body: JSON.stringify({ ...form, published: true }),
        });
        if (!publishResponse.ok) throw new Error('Les fichiers sont envoyés, mais la publication a échoué. Modifiez l’actualité pour la publier.');
      }
      setFormOpen(false); setEditingId(null); setForm(blankForm);
      setSelectedFiles([]);
      setNotice(form.published ? 'Actualité publiée pour les usagers.' : 'Brouillon enregistré.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur lors de l’enregistrement.');
      await refresh();
    } finally { setSaving(false); }
  }

  async function remove(item: NewsItem) {
    if (!window.confirm(`Supprimer l’actualité « ${item.title} » ?`)) return;
    const response = await apiFetch(`/api/news/${item.id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? 'Suppression impossible.'); return; }
    setNotice('Actualité supprimée.');
    await refresh();
  }

  async function removeAttachment(postId: string, attachment: NewsAttachment) {
    const response = await apiFetch(`/api/news/${postId}/attachments/${attachment.id}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? 'Suppression du fichier impossible.'); return; }
    setNotice('Fichier supprimé.');
    await refresh();
  }

  async function downloadAttachment(postId: string, attachment: NewsAttachment) {
    const response = await apiFetch(`/api/news/${postId}/attachments/${attachment.id}/download`);
    if (!response.ok) { setError('Téléchargement du fichier impossible.'); return; }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a'); link.href = url; link.download = attachment.fileName; link.click();
    URL.revokeObjectURL(url);
  }

  if (!isAdmin) return <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6"><div className="mx-auto max-w-5xl">
    <header className="mb-7 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BookOpen className="h-5 w-5" /></div><div><p className="text-xs text-slate-500">CAEB · Fondation Vallet</p><p className="font-semibold text-slate-900">Actualités bibliothèque</p></div></div>
      <button onClick={() => void onLogout()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"><LogOut className="h-4 w-4" /><span>Déconnexion</span></button>
    </header>
    <NewsReader items={items} fullName={fullName} loading={loading} error={error} notice={notice} onDownload={(item, attachment) => void downloadAttachment(item.id, attachment)} />
    <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} WiFiSecure · Bibliothèque CAEB</footer>
  </div></main>;

  const content = <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-800 px-6 py-8 text-white shadow-lg sm:px-9">
      <div aria-hidden="true" className="absolute -right-12 -top-24 h-72 w-72 rounded-full border border-white/10" />
      <div aria-hidden="true" className="absolute -right-2 -top-14 h-52 w-52 rounded-full border border-white/10" />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-blue-100"><BookOpen className="h-3.5 w-3.5" /> Bibliothèque · CAEB</span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Les nouvelles de la bibliothèque</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/80">Retrouvez ici les informations, activités et annonces partagées par votre bibliothèque.</p>
        </div>
        {isAdmin && <button onClick={startNew} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-blue-950 shadow-sm transition hover:bg-blue-50"><Plus className="h-4 w-4" /> Rédiger une actualité</button>}
      </div>
      {!isAdmin && <p className="relative mt-6 border-t border-white/10 pt-4 text-xs text-blue-100/70">Bienvenue, {fullName} · consultez les dernières informations mises à votre disposition.</p>}
    </section>

    {error && <div role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
    {notice && <div role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</div>}

    {isAdmin && formOpen && <form onSubmit={submit} className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Espace administration</p><h2 className="mt-1 text-xl font-semibold">{editingId ? 'Modifier l’actualité' : 'Nouvelle actualité'}</h2></div><button type="button" onClick={() => setFormOpen(false)} aria-label="Fermer le formulaire" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
      <div className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">Titre <input required maxLength={180} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ex. Horaires pendant les vacances" className="rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">Résumé <span className="text-xs font-normal text-slate-400">Facultatif, affiché en aperçu</span><input maxLength={360} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Une phrase pour présenter l’information" className="rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <label className="grid gap-1.5 text-sm font-medium text-slate-700">Message <textarea required minLength={10} maxLength={20000} rows={7} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Rédigez l’information destinée aux usagers…" className="resize-y rounded-xl border border-slate-200 px-4 py-3 font-normal leading-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50/50 p-4 sm:p-5">
          <label className="flex cursor-pointer items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm"><Upload className="h-5 w-5" /></span>
            <span className="flex-1"><span className="block text-sm font-semibold text-slate-800">Ajouter des fichiers</span><span className="mt-1 block text-xs leading-5 text-slate-500">Tous types et toutes extensions · aucun nombre maximal de fichiers · 50 Mo maximum par fichier</span></span>
            <input type="file" multiple className="sr-only" onChange={(event) => { const files = Array.from(event.target.files ?? []); setSelectedFiles((current) => [...current, ...files]); event.target.value = ''; }} />
          </label>
          {selectedFiles.length > 0 && <ul className="mt-4 space-y-2 border-t border-blue-100 pt-3">{selectedFiles.map((file, index) => <li key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs"><span className="min-w-0 flex-1 truncate font-medium text-slate-700">{file.name}</span><span className="shrink-0 text-slate-400">{formatFileSize(file.size)}</span><button type="button" disabled={saving} onClick={() => setSelectedFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label={`Retirer ${file.name}`} className="rounded-md p-1 text-slate-500 hover:bg-rose-50 hover:text-rose-600"><X className="h-4 w-4" /></button></li>)}</ul>}
          {uploadProgress && <p role="status" className="mt-3 text-xs font-medium text-blue-800">{uploadProgress}</p>}
        </div>
        <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm"><input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600" /><span><span className="block font-medium text-slate-800">Publier pour les usagers</span><span className="mt-0.5 block text-xs text-slate-500">Sinon, l’actualité est conservée comme brouillon, visible uniquement par l’administration.</span></span></label>
      </div>
      <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setFormOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Annuler</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60">{form.published ? <Send className="h-4 w-4" /> : <Check className="h-4 w-4" />}{saving ? uploadProgress ?? 'Enregistrement…' : form.published ? 'Publier' : 'Enregistrer le brouillon'}</button></div>
    </form>}

    <section>
      <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">À découvrir</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{isAdmin ? 'Toutes les actualités' : 'Dernières actualités'}</h2></div>{isAdmin && <span className="text-sm text-slate-500">{items.length} publication(s) ou brouillon(s)</span>}</div>
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Chargement des actualités…</div> : items.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><Newspaper className="h-6 w-6" /></div><h3 className="mt-4 font-semibold text-slate-800">Aucune actualité pour le moment</h3><p className="mt-1 text-sm text-slate-500">Les nouvelles de la bibliothèque apparaîtront ici dès leur publication.</p></div> : <div className="grid gap-4 lg:grid-cols-2">{items.map((item) => <article key={item.id} className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
        <div className="flex items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.published ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{item.published ? 'Publié' : 'Brouillon'}</span><span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays className="h-3.5 w-3.5" />{new Date(item.publishedAt ?? item.updatedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</span></div>
        <h3 className="mt-4 text-xl font-semibold leading-snug text-slate-900">{item.title}</h3>
        {item.summary && <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{item.summary}</p>}
        <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-7 text-slate-600">{item.content}</p>
        {item.attachments?.length > 0 && <div className="mt-5 space-y-2 border-t border-slate-100 pt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pièces jointes · {item.attachments.length}</p>{item.attachments.map((attachment) => <div key={attachment.id} className="rounded-xl bg-slate-50 p-3">{isImageAttachment(attachment.fileName) && <NewsImagePreview postId={item.id} attachment={attachment} />}<div className="flex items-center gap-2"><span className="text-blue-700"><FileIcon className="h-4 w-4" /></span><span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">{attachment.fileName}</span><span className="shrink-0 text-[11px] text-slate-400">{formatFileSize(attachment.sizeBytes)}</span>{isAdmin && <button type="button" onClick={() => void downloadAttachment(item.id, attachment)} title="Télécharger" aria-label={`Télécharger ${attachment.fileName}`} className="rounded-lg p-1.5 text-blue-700 hover:bg-blue-100"><Download className="h-4 w-4" /></button>}{isAdmin && <button type="button" onClick={() => void removeAttachment(item.id, attachment)} title="Supprimer" aria-label={`Supprimer ${attachment.fileName}`} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}</div></div>)}</div>}
        {isAdmin && <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs text-slate-400">{item.author?.fullName ?? 'Administration'}</span><div className="flex gap-2"><button onClick={() => startEdit(item)} aria-label="Modifier" title="Modifier" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><FileEdit className="h-4 w-4" /></button>{item.published && <span title="Visible par les usagers" className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Eye className="h-4 w-4" /></span>}<button onClick={() => void remove(item)} aria-label="Supprimer" title="Supprimer" className="rounded-lg border border-rose-100 p-2 text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></div>}
      </article>)}</div>}
    </section>
  </div>;

  if (isAdmin) return <DashboardShell title="Actualités" subtitle="Publiez les informations de la bibliothèque pour les usagers.">{content}</DashboardShell>;
  return <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6"><div className="mx-auto max-w-5xl"><header className="mb-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5"><div className="flex items-center gap-3">{organization.logoUrl ? <img src={organization.logoUrl} alt="" className="h-10 w-10 rounded-xl object-contain" /> : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700" style={{ color: organization.primaryColor }}><BookOpen className="h-5 w-5" /></div>}<div><p className="text-xs text-slate-500">{organization.name}</p><p className="font-semibold text-slate-900" style={{ color: organization.primaryColor }}>{organization.label}</p></div></div><button onClick={() => void onLogout()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Déconnexion</span></button></header>{content}<footer className="py-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} {organization.name}{organization.address ? ` · ${organization.address}` : ''}{organization.contactEmail ? ` · ${organization.contactEmail}` : ''}{organization.phone ? ` · ${organization.phone}` : ''}</footer></div></main>;
}

export default function ActualitesPage() {
  const [user, setUser] = useState<{ fullName: string; role: 'admin' | 'agent' } | null>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    apiFetch('/api/auth/me').then(async (response) => {
      if (!response.ok) { window.location.assign('/login'); return; }
      const result = await response.json();
      setUser(result.user);
    }).catch(() => window.location.assign('/login')).finally(() => setChecking(false));
  }, []);
  async function logout() {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); }
    finally { window.location.assign('/login'); }
  }
  if (checking || !user) return <main className="flex min-h-screen items-center justify-center text-sm text-slate-500">Vérification de votre accès…</main>;
  return <NewsWorkspace isAdmin={user.role === 'admin'} fullName={user.fullName} onLogout={logout} />;
}
