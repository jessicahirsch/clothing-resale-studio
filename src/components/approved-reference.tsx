'use client';
import Image from 'next/image';
import { useEffect, useState } from 'react';
export function ApprovedReference({ password }: { password: string }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let resource = '';
    fetch('/api/references/CRS-0001', { headers: { Authorization: `Bearer ${password}` }, signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Reference unavailable');
        const blob = await response.blob();
        if (controller.signal.aborted) return;
        resource = URL.createObjectURL(blob);
        setUrl(resource);
      }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => { controller.abort(); if (resource) URL.revokeObjectURL(resource); };
  }, [password]);
  return <details className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
    <summary className="cursor-pointer font-medium">CRS-0001 approved visual reference</summary>
    <p className="my-3 text-sm text-stone-600">Canonical arrangement, dress form, lighting, framing, shorter hem, and higher neckline. Compare garment fidelity separately from layout.</p>
    {url && <Image src={url} width={1086} height={1448} unoptimized alt="Approved CRS-0001 collage: large mannequin photograph on the left; original back, fabric, brand, and care photographs on the right" className="h-auto w-full" />}
    {failed && <p role="alert" className="text-sm text-red-800">Unable to load the approved reference. Reopen your studio to retry.</p>}
  </details>;
}
