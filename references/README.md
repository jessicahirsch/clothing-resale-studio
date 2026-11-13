# CRS-0001 — canonical approved collage

`CRS-0001-approved.png` is the user's final approved reference, copied without modification. This specifically approved reference is intentionally kept in the repository; other garment photos, manifests containing local paths, and exports remain in ignored `data/` or `exports/` directories. Never place credentials here.

## Fixed composition

Canvas: **1086 × 1448** (3:4). Coordinates are measured from the top left. No outer padding, panel rounding, titles, or borders. Six-pixel dividers separate the panels. Keep this same arrangement on mobile; scale the entire canvas uniformly rather than stacking panels.

| Slot | Source | x | y | Width | Height |
| --- | --- | ---: | ---: | ---: | ---: |
| Main | Approved mannequin photograph | 0 | 0 | 726 | 1448 |
| Back | User's original back photograph | 732 | 0 | 354 | 407 |
| Texture | User's original fabric detail | 732 | 413 | 354 | 343 |
| Brand | User's original brand/size label | 732 | 762 | 354 | 263 |
| Care | User's original care label | 732 | 1031 | 354 | 417 |

The renderer and React preview share `src/lib/collage-template.ts`. Images are center-cropped to the slot bounds without stretching. Supply photos already framed for those bounds to preserve important content. Dividers use a uniform warm white (`#faf5ef`); the AI reference contains small color variations at its divider edges.

## Visual direction and garment fidelity

The approved main photograph establishes the beige linen dress form, wooden finial, warm neutral background, soft lighting, framing, and visual hierarchy. For CRS-0001, preserve the approved cropped hem and slightly higher neckline. Do not reshape, extend, shorten, or regenerate the garment as part of collage composition. For future garments, keep their actual proportions and construction; do not force every garment to match this top's silhouette.

The template controls placement, not scene generation. An approved main photograph must be supplied. It does not generate a mannequin or infer garment proportions. The four supporting photographs must be original user photographs; do not synthesize missing details, labels, or back views. A provenance declaration is a user assertion, not an automated detector of AI imagery.

The attached collage alone does not provide four independently verifiable original files. Cropping it is permitted only for the layout regression test and must never be presented as original source photography for a new garment.

## In-app preview

Unlock the studio to inspect the unchanged approved reference. In an upload batch, open **Preview approved collage layout** and assign five distinct photos explicitly. Supporting slots use the selected local originals, without AI recreation. The preview does not persist slot assignments or export images; **Save garment** continues to save unchanged original photographs.

## Export a reusable collage

After saving the four original supporting photographs as a garment, create an ignored manifest, for example `data/collage.json`:

```json
{
  "garmentId": "the-saved-garment-uuid",
  "main": "approved-main.png",
  "supportingSource": "user-original",
  "supporting": [
    "back-original-generated-filename.jpg",
    "texture-original-generated-filename.jpg",
    "brand-original-generated-filename.jpg",
    "care-original-generated-filename.jpg"
  ]
}
```

Use actual filenames from that garment's `listing.json`, in the order above. `main` resolves relative to the manifest file. Confirm the main photo is approved and the supporting files are your original photographs before declaring `user-original`.

Run `npm run collage -- data/collage.json`. The command verifies that the four distinct supporting filenames belong to the saved garment's original uploads. It uses the shared geometry and writes `exports/{garmentId}-CRS-0001.png`; it refuses to overwrite an existing export. It does not change originals or listing metadata. Sharp's HEIC decoding depends on the installed native build; if decoding is unsupported, provide a user-created compatible export of the original photo without recreating its content.

## Regression and review

`npm test` checks the approved file's SHA-256, fixed slot coordinates, proportional mobile scaling, and a rendered composite against the approved image. Reference panel pixels must match exactly in this deterministic crop-and-recompose fixture; a small full-canvas tolerance permits the reference's uneven divider colors. These tests lock composition, not AI content generation and not a browser screenshot.

Review garment fidelity separately: hem, neckline, sleeve width, body length, texture, and readable labels. Compare lighting, dress form, background, and framing to the unchanged reference visually. Do not claim pixel-perfect reproduction of generated garment imagery. No new garment collage can be considered approved solely because layout tests pass.
