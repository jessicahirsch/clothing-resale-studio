import Image from 'next/image';
import { CRS_TEMPLATE, slotStyle, type CollageImages } from '../lib/collage-template';

/** Supporting URLs must point to user originals. No synthetic fallback images. */
export function GarmentCollage({ images }: { images: CollageImages }) {
  return <div aria-label="CRS-0001 five-photo garment collage" className="relative w-full overflow-hidden" style={{ aspectRatio: `${CRS_TEMPLATE.width} / ${CRS_TEMPLATE.height}`, background: CRS_TEMPLATE.divider }}>
    {CRS_TEMPLATE.slots.map((slot, index) => <div key={slot.role} className="absolute overflow-hidden" style={slotStyle(slot)}>
      <Image src={images[index]} alt={slot.label} fill unoptimized className="object-cover object-center" sizes="(max-width: 640px) 100vw, 768px" />
    </div>)}
  </div>;
}
