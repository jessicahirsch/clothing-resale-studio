/** Canonical pixel geometry measured from references/CRS-0001-approved.png.
 * Never reflow the five panels. Scale the complete canvas uniformly.
 */
export const CRS_TEMPLATE = {
  id: 'CRS-0001',
  width: 1086,
  height: 1448,
  divider: '#faf5ef',
  slots: [
    { role: 'main', label: 'Approved mannequin photograph', x: 0, y: 0, width: 726, height: 1448 },
    { role: 'back', label: 'Original back photograph', x: 732, y: 0, width: 354, height: 407 },
    { role: 'texture', label: 'Original fabric detail', x: 732, y: 413, width: 354, height: 343 },
    { role: 'brand', label: 'Original brand and size label', x: 732, y: 762, width: 354, height: 263 },
    { role: 'care', label: 'Original care label', x: 732, y: 1031, width: 354, height: 417 },
  ],
} as const;

export type CollageImages = readonly [string, string, string, string, string];
export function slotStyle(slot: typeof CRS_TEMPLATE.slots[number]) {
  return {
    left: `${slot.x / CRS_TEMPLATE.width * 100}%`,
    top: `${slot.y / CRS_TEMPLATE.height * 100}%`,
    width: `${slot.width / CRS_TEMPLATE.width * 100}%`,
    height: `${slot.height / CRS_TEMPLATE.height * 100}%`,
  };
}
