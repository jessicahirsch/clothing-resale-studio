"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ApprovedReference } from "../components/approved-reference";
import { CollagePreview } from "../components/collage-preview";
import type { FlawStatus, Garment, GarmentCondition, PhotoRole } from "../lib/garments";

type PendingPhoto = { id: string; file: File; role: PhotoRole };
const PHOTO_SLOTS: { role: PhotoRole; title: string; help: string; multiple: boolean }[] = [
  { role: "front", title: "Front", help: "Full garment, straight on", multiple: false },
  { role: "back", title: "Back", help: "Full back of the garment", multiple: false },
  { role: "label", title: "Labels", help: "Brand, size, fabric, and care", multiple: true },
  { role: "closeup", title: "Close-ups", help: "Texture and special details", multiple: true },
  { role: "flaw", title: "Flaws", help: "Wear, marks, or damage", multiple: true },
  { role: "other", title: "Other", help: "Any extra useful views", multiple: true },
];
const CONDITION_LABELS: Record<GarmentCondition, string> = {
  unspecified: "Not reviewed yet",
  "new-without-tags": "New without tags",
  excellent: "Excellent — minimal signs of wear",
  good: "Good — some signs of wear",
  fair: "Fair — noticeable wear or flaws",
};

export default function Home() {
  const [password, setPassword] = useState("");
  const [garments, setGarments] = useState<Garment[]>([]);
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [condition, setCondition] = useState<GarmentCondition>("unspecified");
  const [flawStatus, setFlawStatus] = useState<FlawStatus>("unreviewed");
  const [flawNotes, setFlawNotes] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const editing = garments.find(garment => garment.id === editingId);
  const existingCount = editing?.photos.length ?? 0;
  const pendingFiles = useMemo(() => pending.map(photo => photo.file), [pending]);

  async function loadGarments(headers = { Authorization: `Bearer ${password}` }) {
    const response = await fetch("/api/garments", { headers, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setGarments(result);
    setUnlocked(true);
    return result as Garment[];
  }

  async function unlock() {
    setBusy(true); setError(""); setStatus("");
    try { await loadGarments(); }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }

  function addPhotos(role: PhotoRole, files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (existingCount + pending.length + selected.length > 12 || selected.some(file => !file.size || file.size > 20 * 1024 * 1024)) {
      setError("A garment can have up to 12 photos, each no larger than 20 MB.");
      return;
    }
    setError("");
    setPending(current => [...current, ...selected.map((file, index) => ({ id: `${Date.now()}-${index}-${file.name}-${file.lastModified}`, file, role }))]);
  }

  function resetDraft() {
    setEditingId(null); setPending([]); setCondition("unspecified"); setFlawStatus("unreviewed"); setFlawNotes("");
  }

  function continueDraft(garment: Garment) {
    setEditingId(garment.id); setPending([]); setCondition(garment.condition); setFlawStatus(garment.flawStatus); setFlawNotes(garment.flawNotes); setError(""); setStatus("");
    document.getElementById("garment-intake")?.scrollIntoView({ behavior: "smooth" });
  }

  async function saveDraft() {
    if (!unlocked) { setError("Open your saved garments before saving."); return; }
    if (!editing && !pending.some(photo => photo.role === "front")) { setError("Add a front photo to start this garment."); return; }
    if (flawStatus === "noted" && !flawNotes.trim()) { setError("Describe the flaws you noted."); return; }
    setBusy(true); setError(""); setStatus("");
    try {
      const body = new FormData();
      pending.forEach(photo => body.append("photos", photo.file));
      body.append("roles", JSON.stringify(pending.map(photo => photo.role)));
      body.append("condition", condition);
      body.append("flawStatus", flawStatus);
      body.append("flawNotes", flawStatus === "noted" ? flawNotes : "");
      if (editing) body.append("revision", String(editing.revision));
      const response = await fetch(editing ? `/api/garments/${editing.id}` : "/api/garments", {
        method: editing ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${password}` },
        body,
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) await loadGarments();
        throw new Error(result.error);
      }
      await loadGarments();
      setStatus(`${result.itemCode} saved. You can reopen it anytime to add more photos.`);
      resetDraft();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save this garment. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-[#F8F6F2] px-4 py-8 text-[#292724]">
    <div className="mx-auto max-w-3xl">
      <header className="mb-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Your personal resale assistant</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Clothing Resale Studio</h1>
        <p className="mt-3 text-stone-600">Photograph it. Style it. List it.</p>
      </header>

      <form onSubmit={event => { event.preventDefault(); void unlock(); }} className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
        <label htmlFor="password" className="text-sm font-medium">Studio password</label>
        <input id="password" type="password" autoComplete="current-password" disabled={busy} value={password} onChange={event => { setPassword(event.target.value); setUnlocked(false); setGarments([]); resetDraft(); }} required className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3" />
        <button disabled={busy} className="mt-3 rounded-lg bg-stone-900 px-4 py-3 text-white disabled:opacity-50">{busy ? "Working…" : "Open saved garments"}</button>
        <p className="mt-2 text-xs text-stone-500">Your password stays in memory for this visit.</p>
      </form>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
      <p role="status" className="mb-4 text-sm text-stone-600">{status}</p>
      {unlocked && <ApprovedReference password={password} />}

      <section id="garment-intake" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{editing ? editing.itemCode : "New garment"}</p>
            <h2 className="mt-1 text-xl font-semibold">{editing ? "Continue this draft" : "Add a garment"}</h2>
            <p className="mt-2 text-sm text-stone-500">Start with the front. Save now and add the other views later.</p>
          </div>
          {editing && <button type="button" disabled={busy} onClick={resetDraft} className="text-sm underline">Cancel</button>}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PHOTO_SLOTS.map(slot => {
            const saved = editing?.photos.filter(photo => photo.role === slot.role).length ?? 0;
            const queued = pending.filter(photo => photo.role === slot.role).length;
            return <label key={slot.role} className="flex min-h-36 cursor-pointer flex-col justify-between rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-4 active:bg-stone-100">
              <span><span className="block font-medium">{slot.title}</span><span className="mt-1 block text-xs text-stone-500">{slot.help}</span></span>
              <span className="mt-3 text-xs font-medium">{saved || queued ? `${saved} saved · ${queued} ready` : "Take or choose photo"}</span>
              <input type="file" accept="image/*" multiple={slot.multiple} disabled={busy || existingCount + pending.length >= 12} className="sr-only" onChange={event => { addPhotos(slot.role, event.target.files); event.target.value = ""; }} />
            </label>;
          })}
        </div>
        <p className="mt-3 text-xs text-stone-500">Up to 12 photos · 20 MB each · JPEG, PNG, WebP, or HEIC. Originals are saved unchanged.</p>

        {pending.length > 0 && <div className="mt-6">
          <h3 className="mb-3 text-sm font-medium">Ready to save ({pending.length})</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pending.map(photo => <div key={photo.id}>
              <PhotoPreview file={photo.file} role={photo.role} />
              <button type="button" disabled={busy} onClick={() => setPending(current => current.filter(candidate => candidate.id !== photo.id))} className="mt-2 text-sm underline">Remove</button>
            </div>)}
          </div>
          {pending.length >= 5 && <CollagePreview key={pending.map(photo => photo.id).join("|")} photos={pendingFiles} />}
        </div>}

        <div className="mt-7 border-t border-stone-200 pt-6">
          <h3 className="font-medium">Condition review</h3>
          <label className="mt-4 block text-sm">Condition
            <select value={condition} onChange={event => setCondition(event.target.value as GarmentCondition)} className="mt-1 block w-full rounded-lg border border-stone-300 bg-white p-3">
              {Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <fieldset className="mt-4">
            <legend className="text-sm">Known flaws</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label><input type="radio" name="flaws" checked={flawStatus === "unreviewed"} onChange={() => { setFlawStatus("unreviewed"); setFlawNotes(""); }} /> <span className="ml-1">Not reviewed yet</span></label>
              <label><input type="radio" name="flaws" checked={flawStatus === "none"} onChange={() => { setFlawStatus("none"); setFlawNotes(""); }} /> <span className="ml-1">No known flaws</span></label>
              <label><input type="radio" name="flaws" checked={flawStatus === "noted"} onChange={() => setFlawStatus("noted")} /> <span className="ml-1">Flaws noted</span></label>
            </div>
          </fieldset>
          {flawStatus === "noted" && <label className="mt-4 block text-sm">Describe the flaws
            <textarea value={flawNotes} maxLength={2000} onChange={event => setFlawNotes(event.target.value)} rows={3} className="mt-1 block w-full rounded-lg border border-stone-300 p-3" />
          </label>}
        </div>

        <button type="button" disabled={busy || !unlocked || (!editing && !pending.length)} onClick={() => void saveDraft()} className="mt-6 w-full rounded-xl bg-stone-900 px-5 py-4 font-medium text-white disabled:opacity-50">{busy ? "Saving…" : editing ? `Save updates to ${editing.itemCode}` : "Save garment draft →"}</button>
      </section>

      {unlocked && <section className="mt-10" aria-label="Saved garments">
        <h2 className="text-xl font-semibold">Saved garments ({garments.length})</h2>
        {!garments.length && <p className="mt-3 text-stone-500">Your saved garments will appear here.</p>}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {garments.map(garment => <article key={garment.id} className="rounded-xl border border-stone-200 bg-white p-3">
            <SavedPhoto garment={garment} password={password} />
            <p className="mt-3 font-medium">{garment.itemCode}</p>
            <p className="mt-1 text-sm text-stone-600">{garment.photos.length} photo{garment.photos.length === 1 ? "" : "s"}</p>
            <p className="mt-1 text-xs text-stone-500">{CONDITION_LABELS[garment.condition]}</p>
            <button type="button" disabled={busy} onClick={() => continueDraft(garment)} className="mt-3 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium">Continue draft</button>
            <details className="mt-2 text-sm"><summary className="cursor-pointer">All photos</summary>{garment.photos.map(photo => <SavedPhoto key={photo.filename} garment={{ ...garment, photos: [photo] }} password={password} />)}</details>
          </article>)}
        </div>
      </section>}
    </div>
  </main>;
}

function PhotoPreview({ file, role }: { file: File; role: PhotoRole }) {
  const [failed, setFailed] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <div><div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-100">
    {failed && <p className="p-3 text-xs text-stone-600">Preview unavailable. The original can still be saved.</p>}
    {url && !failed && <Image onError={() => setFailed(true)} src={url} alt={file.name} fill unoptimized className="object-cover" />}
  </div><p className="mt-1 text-xs capitalize text-stone-500">{role}</p></div>;
}

function SavedPhoto({ garment, password }: { garment: Garment; password: string }) {
  const photo = garment.photos[0];
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    fetch(`/api/garments/${garment.id}/photos/${photo.filename}`, { headers: { Authorization: `Bearer ${password}` }, signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error("Unable to load photo"); const blob = await response.blob(); if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [garment.id, photo.filename, password]);
  return <div className="mt-2"><div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-100">
    {url && !failed && <Image src={url} alt={photo.originalName} fill unoptimized className="object-cover" onError={() => setFailed(true)} />}
    {failed && <p className="p-3 text-xs text-stone-600">Preview unavailable. HEIC previews require a compatible browser.</p>}
  </div><div className="mt-2 flex justify-between gap-2 text-xs"><span className="capitalize text-stone-500">{photo.role}</span>{url && <a href={url} download={photo.originalName} className="underline">Download</a>}</div></div>;
}
