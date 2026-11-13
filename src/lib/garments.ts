import { randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

export type Garment = { id: string; createdAt: string; photos: { filename: string; originalName: string; type: string; size: number }[] };
export const root = () => path.join(process.cwd(), 'data', 'garments');
export const MAX_FILE = 20 * 1024 * 1024;
export const MAX_BODY = 65 * 1024 * 1024;
export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function authorize(request: Request) {
  const password = process.env.STUDIO_PASSWORD;
  if (!password || password.length < 16) throw new UploadError('Configure STUDIO_PASSWORD with at least 16 characters on the server.', 503);
  const supplied = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${password}`;
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new UploadError('Enter the studio password to access your garments.', 401);
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new UploadError('Cross-origin uploads are not allowed.', 403);
  }
}
export function failure(error: unknown) {
  if (!(error instanceof UploadError)) console.error('Garment storage error:', error);
  return Response.json({ error: error instanceof UploadError ? error.message : 'Unable to access garment storage. Please try again.' }, { status: error instanceof UploadError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } });
}
export function imageType(b: Buffer): { type: string; extension: string } | undefined {
  if (b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255) return { type: 'image/jpeg', extension: 'jpg' };
  if (b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { type: 'image/png', extension: 'png' };
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return { type: 'image/webp', extension: 'webp' };
  if (b.toString('ascii', 4, 8) === 'ftyp' && ['heic','heix','hevc','hevx'].includes(b.toString('ascii', 8, 12))) return { type: 'image/heic', extension: 'heic' };
}
export async function saveGarment(files: File[]) {
  if (!files.length || files.length > 12) throw new UploadError('Choose between 1 and 12 photos.');
  const validated = [];
  for (const file of files) {
    if (!file.size || file.size > MAX_FILE) throw new UploadError('Each photo must be between 1 byte and 20 MB.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const format = imageType(bytes);
    if (!format) throw new UploadError('Use JPEG, PNG, WebP, or HEIC photos.');
    validated.push({ bytes, format, file });
  }
  const id = randomUUID();
  const staging = path.join(root(), `.upload-${id}`);
  const garment: Garment = { id, createdAt: new Date().toISOString(), photos: [] };
  try {
    await mkdir(path.join(staging, 'originals'), { recursive: true, mode: 0o700 });
    for (const { bytes, format, file } of validated) {
      const filename = `${randomUUID()}.${format.extension}`;
      await writeFile(path.join(staging, 'originals', filename), bytes, { flag: 'wx', mode: 0o600 });
      garment.photos.push({ filename, originalName: path.basename(file.name).slice(0, 255), type: format.type, size: bytes.length });
    }
    await writeFile(path.join(staging, 'listing.json'), JSON.stringify(garment, null, 2), { flag: 'wx', mode: 0o600 });
    await rename(staging, path.join(root(), id));
    return garment;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}
export const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
export async function listGarments(): Promise<Garment[]> {
  let entries;
  try { entries = await readdir(root(), { withFileTypes: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
  const listings: Garment[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !validId(entry.name)) continue;
    try {
      const listing = JSON.parse(await readFile(path.join(root(), entry.name, 'listing.json'), 'utf8')) as Garment;
      if (listing.id !== entry.name || typeof listing.createdAt !== 'string' || !Number.isFinite(Date.parse(listing.createdAt)) || !Array.isArray(listing.photos) || !listing.photos.length || listing.photos.some(p => !p || typeof p.originalName !== 'string' || typeof p.type !== 'string' || !Number.isSafeInteger(p.size) || p.size <= 0 || !/^[\da-f-]+\.(jpg|png|webp|heic)$/.test(p.filename))) throw new Error('Invalid listing');
      listings.push(listing);
    } catch (error) { console.error(`Skipping unreadable garment ${entry.name}`, error); }
  }
  return listings.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function upload(request: Request) {
  authorize(request);
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new UploadError('Send photos using multipart form data.', 415);
  const declaredSize = Number(request.headers.get('content-length'));
  if (declaredSize > MAX_BODY) throw new UploadError('Upload must be under 65 MB in total.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new UploadError('Choose photos to upload.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > MAX_BODY) { await reader.cancel(); throw new UploadError('Upload must be under 65 MB in total.', 413); }
    chunks.push(chunk.value);
  }
  let form: FormData;
  try { form = await new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData(); }
  catch { throw new UploadError('The photo upload could not be read. Please select your photos again.'); }
  const files = form.getAll('photos');
  if ([...form.keys()].some(k => k !== 'photos') || files.some(f => typeof f === 'string')) throw new UploadError('Invalid photo upload.');
  return saveGarment(files as File[]);
}
