
"use client";

import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [photos, setPhotos] = useState<File[]>([]);

  function handlePhotos(files: FileList | null) {
    if (!files) return;
    setPhotos((prev) => [...prev, ...Array.from(files)]);
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
              Select multiple images
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => handlePhotos(e.target.files)}
            />
          </label>

          {photos.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium">
                Your photos ({photos.length})
              </h3>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo, index) => (
                  <PhotoPreview
                    key={`${photo.name}-${index}`}
                    file={photo}
                  />
                ))}
              </div>

              <button
                className="mt-6 w-full rounded-xl bg-stone-900 px-5 py-4 font-medium text-white disabled:opacity-50"
                onClick={() =>
                  alert("Next up: AI garment analysis!")
                }
              >
                Continue →
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function PhotoPreview({ file }: { file: File }) {
  const [url] = useState(() => URL.createObjectURL(file));

  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-stone-100">
      <Image
        src={url}
        alt={file.name}
        fill
        unoptimized
        className="object-cover"
      />
    </div>
  );
}
