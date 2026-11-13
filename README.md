# Clothing Resale Studio

Mobile-first Next.js app with private, local photo storage. No database or cloud service.

## Run locally

Use Node.js 22.18+ (native TypeScript tests), run `npm install`, copy `.env.example` to `.env.local`, and set `STUDIO_PASSWORD` to a unique random password of at least 16 characters. Run `npm run dev -- --hostname 127.0.0.1` and open http://localhost:3000. Enter that password to access uploads and saved garments. Missing/short server passwords disable all garment API access. Passwords are kept only in browser memory, never URLs or browser storage.

For iPhone access on a trusted private network, bind to your LAN interface and browse to the computer's LAN address. Use HTTPS through a trusted local TLS setup when accessing across a network: HTTP transmits the password and photos without encryption. Do not expose this local app through public tunnels or port forwarding. Authentication applies to listing, uploads, and photo downloads; uploads additionally require the exact same Origin and reject cross-site requests.

Select multiple photos using Safari's photo picker or camera, then save one garment per batch. Supports JPEG, PNG, WebP, and HEIC signatures; limits are 12 photos, 20 MB per photo, and 65 MB per multipart request. Originals are preserved without conversion (including EXIF metadata). HEIC display depends on the browser; download originals if no preview is available. Signature checking rejects unsupported content but is not a full image decoder. No image processing or marketplace publishing occurs.

## Storage

`data/garments/{uuid}/listing.json` records the garment ID, creation time, and each photo's generated filename, original name, MIME type, and byte size. Original bytes live in `originals/`. Generated names prevent filename traversal. Uploads are validated first, written to a private staging directory, and atomically renamed into the gallery only after all writes succeed. Failed writes clean up staging; interrupted processes may leave hidden `.upload-*` directories, which the gallery ignores. Malformed listings are skipped with server diagnostics.

Keep `data/` on persistent local disk and back it up privately. It, exports, and `.env*` credentials are gitignored; `.env.example` is safe to track. Photos are served through authenticated routes, never `public/`. This app is designed for one trusted household/studio, not multi-tenant or public hosting.

## Checks

- `npm run lint`
- `npm test` (isolated temporary storage; no personal photos used)
- `npx tsc --noEmit`

Manual browser check: open the studio, unlock, select photos, remove one, save, reload/unlock and verify the garment and original downloads remain. On iPhone Safari test camera/photo-library selection and HEIC fallback. Verify incorrect passwords cannot list, save, or download photos.
