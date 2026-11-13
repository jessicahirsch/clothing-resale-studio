
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ApprovedReference } from "../components/approved-reference";
import { CollagePreview } from "../components/collage-preview";
import type { Garment } from "../lib/garments";

export default function Home() {
  const [photos, setPhotos] = useState<File[]>([]);

  const [password, setPassword] = useState("");
  const [garments, setGarments] = useState<Garment[]>([]);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  async function access(save = false) {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const headers = { Authorization: `Bearer ${password}` };
      if (save) {
        const body = new FormData();
        photos.forEach(photo => body.append("photos", photo));
        const response = await fetch("/api/garments", { method: "POST", headers, body });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setPhotos([]);
        setStatus("Garment saved.");
      }
      const response = await fetch("/api/garments", { headers, cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setGarments(result);
      setUnlocked(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to connect. Please try again.");
    } finally { setBusy(false); }
  }

  function handlePhotos(files: FileList | null) {
    if (!files) return;
    const selected = Array.from(files);
    if (photos.length + selected.length > 12 || selected.some(f => !f.size || f.size > 20 * 1024 * 1024)) {
      setError("Choose up to 12 photos, each no larger than 20 MB.");
      return;
    }
    setError("");
    setPhotos((prev) => [...prev, ...selected]);
  }

  return (
    <main className="min-h-screen bg-[#F8F6F2] px-4 py-8 text-[#292724]">
      <div className="mx-auto max-w-3xl">
        <header className="mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Your personal resale assistant
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Clothing Resale Studio
          </h1>
          <p className="mt-3 text-stone-600">
            Photograph it. Style it. List it.
          </p>
        </header>

        <form onSubmit={e => { e.preventDefault(); void access(); }} className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
          <label htmlFor="password" className="text-sm font-medium">Studio password</label>
          <input id="password" type="password" autoComplete="current-password" disabled={busy} value={password} onChange={e => { setPassword(e.target.value); setUnlocked(false); setGarments([]); }} required className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-3" />
          <button disabled={busy} className="mt-3 rounded-lg bg-stone-900 px-4 py-3 text-white disabled:opacity-50">{busy ? "Working…" : "Open saved garments"}</button>
          <p className="mt-2 text-xs text-stone-500">Your password stays in memory for this visit.</p>
        </form>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-red-800">{error}</p>}
        <p role="status" className="mb-4 text-sm text-stone-600">{status}</p>
        {unlocked && <ApprovedReference password={password} />}
        <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold">Add a garment</h2>
          <p className="mt-2 text-sm text-stone-500">
            Take photos of the front, back, labels, and details.
          </p>

          <label className="mt-6 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-6 text-center active:bg-stone-100">
            <span className="text-3xl">📸</span>
            <span className="mt-3 font-medium">
              Take or upload photos
            </span>
            <span className="mt-1 text-sm text-stone-500">
              Up to 12 photos · 20 MB each · JPEG, PNG, WebP or HEIC
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              className="sr-only"
              onChange={(e) => { handlePhotos(e.target.files); e.target.value = ""; }}
            />
          </label>

          {photos.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium">
                Your photos ({photos.length})
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, index) => (
                  <div key={`${photo.name}-${index}`}>
                    <PhotoPreview file={photo} />
                    <button disabled={busy} onClick={() => setPhotos(current => current.filter((_, i) => i !== index))} className="mt-2 text-sm underline" aria-label={`Remove photo ${index + 1}`}>Remove</button>
                  </div>
                ))}
              </div>

              <CollagePreview key={photos.map(photo => `${photo.name}:${photo.size}:${photo.lastModified}`).join("|")} photos={photos} />
              <button
                className="mt-6 w-full rounded-xl bg-stone-900 px-5 py-4 font-medium text-white disabled:opacity-50"
                disabled={busy || !unlocked}
                onClick={() => void access(true)}
              >
                {busy ? "Saving…" : "Save garment →"}
              </button>
            </div>
          )}
        </section>
        {unlocked && <section className="mt-10" aria-label="Saved garments">
          <h2 className="text-xl font-semibold">Saved garments ({garments.length})</h2>
          {!garments.length && <p className="mt-3 text-stone-500">Your saved garments will appear here.</p>}
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {garments.map(garment => <article key={garment.id} className="rounded-xl border border-stone-200 bg-white p-3">
              <SavedPhoto garment={garment} password={password} />
              <p className="mt-3 text-sm font-medium">{garment.photos.length} photo{garment.photos.length === 1 ? "" : "s"}</p>
              <p className="mt-1 text-xs text-stone-500">{new Date(garment.createdAt).toLocaleString()}</p>
              <details className="mt-2 text-sm"><summary className="cursor-pointer">All photos</summary>
                {garment.photos.map(photo => <SavedPhoto key={photo.filename} garment={{ ...garment, photos: [photo] }} password={password} />)}
              </details>
            </article>)}
          </div>
        </section>}
      </div>
    </main>
  );
}

function PhotoPreview({ file }: { file: File }) {
  const [failed, setFailed] = useState(false);
  const [url, setUrl] = useState("");
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    // The object URL is an external browser resource whose lifetime follows this file.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-100">
      {failed && <p className="p-3 text-xs text-stone-600">Preview unavailable. The original photo can still be saved.</p>}
      {url && !failed && <Image
        onError={() => setFailed(true)}
        src={url}
        alt={file.name}
        fill
        unoptimized
        className="object-cover"
      />}
    </div>
  );
}

function SavedPhoto({ garment, password }: { garment: Garment; password: string }) {
  const photo = garment.photos[0];
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    fetch(`/api/garments/${garment.id}/photos/${photo.filename}`, {
      headers: { Authorization: `Bearer ${password}` }, signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("Unable to load photo");
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [garment.id, photo.filename, password]);
  return <div className="mt-2">
    <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-100">
      {url && !failed && <Image src={url} alt={photo.originalName} fill unoptimized className="object-cover" onError={() => setFailed(true)} />}
      {failed && <p className="p-3 text-xs text-stone-600">Preview unavailable. HEIC previews require a compatible browser.</p>}
    </div>
    {url && <a href={url} download={photo.originalName} className="mt-2 block text-xs underline">Download original</a>}
  </div>;
}
