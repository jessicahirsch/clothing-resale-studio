import sharp from 'sharp';
import { CRS_TEMPLATE } from '../src/lib/collage-template.ts';

/** Low-level compositor, also used with reference crops ONLY in regression tests. */
export async function composePanels(panels) {
  if (panels.length !== 5) throw new Error('CRS-0001 requires exactly five panels.');
  const layers = await Promise.all(CRS_TEMPLATE.slots.map(async (slot, index) => ({
    input: await sharp(panels[index], { limitInputPixels: 80_000_000 }).rotate().resize(slot.width, slot.height, { fit: 'cover', position: 'centre' }).toColourspace('srgb').png().toBuffer(),
    left: slot.x, top: slot.y,
  })));
  return sharp({ create: { width: CRS_TEMPLATE.width, height: CRS_TEMPLATE.height, channels: 3, background: CRS_TEMPLATE.divider } }).composite(layers).removeAlpha().png().toBuffer();
}

export async function renderCollage({ main, supporting }) {
  if (!Array.isArray(supporting) || supporting.length !== 4 || supporting.some(photo => photo.source !== 'user-original' || !Buffer.isBuffer(photo.bytes))) {
    throw new Error('Four user-original supporting photographs are required. Synthetic substitutions are forbidden.');
  }
  return composePanels([main, ...supporting.map(photo => photo.bytes)]);
}
