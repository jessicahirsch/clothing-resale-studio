'use client';

import { useEffect, useState } from 'react';
import { GarmentCollage } from './garment-collage';
import { CRS_TEMPLATE, type CollageImages } from '../lib/collage-template';

export function CollagePreview({ photos }: { photos: File[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  const [selected, setSelected] = useState(['', '', '', '', '']);
  useEffect(() => {
    const resources = photos.map(photo => URL.createObjectURL(photo));
    // Browser resource ownership follows the selected local files.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrls(resources);
    return () => resources.forEach(url => URL.revokeObjectURL(url));
  }, [photos]);
  const indexes = selected.map(Number);
  const complete = selected.every(value => value !== '') && new Set(indexes).size === 5 && indexes.every(i => urls[i]);
  return <details className="mt-6 rounded-xl border border-stone-200 p-4">
    <summary className="cursor-pointer font-medium">Preview approved collage layout</summary>
    <p className="mt-3 text-sm text-stone-600">Choose one approved mannequin photo and four original photographs. Each photo has its own slot; the five-panel layout stays fixed.</p>
    <div className="my-4 grid gap-3 sm:grid-cols-2">
      {CRS_TEMPLATE.slots.map((slot, index) => <label key={slot.role} className="text-sm">{slot.label}
        <select className="mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2" value={selected[index]} onChange={event => setSelected(current => current.map((value, i) => i === index ? event.target.value : value))}>
          <option value="">Choose a photo</option>
          {photos.map((photo, i) => <option key={i} value={i}>{i + 1}. {photo.name}</option>)}
        </select>
      </label>)}
    </div>
    {complete ? <GarmentCollage images={indexes.map(i => urls[i]) as unknown as CollageImages} /> : <p className="text-sm text-stone-500">Select five distinct photos to preview. Supporting slots use your selected original files.</p>}
    <p className="mt-3 text-xs text-stone-500">Preview only; saving a garment preserves originals. Check hem, neckline, garment proportions, and label accuracy separately from layout. HEIC preview support varies by browser.</p>
  </details>;
}
