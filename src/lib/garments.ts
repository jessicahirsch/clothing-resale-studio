import { randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const PHOTO_ROLES = ['front', 'back', 'label', 'closeup', 'flaw', 'other'] as const;
export const CONDITIONS = ['unspecified', 'new-without-tags', 'excellent', 'good', 'fair'] as const;
export const FLAW_STATUSES = ['unreviewed', 'none', 'noted'] as const;
export type PhotoRole = typeof PHOTO_ROLES[number];
export type GarmentCondition = typeof CONDITIONS[number];
export type FlawStatus = typeof FLAW_STATUSES[number];
export type GarmentPhoto = { filename: string; originalName: string; type: string; size: number; role: PhotoRole };
export type Garment = {
  schemaVersion: 2;
  id: string;
  itemCode: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  condition: GarmentCondition;
  flawStatus: FlawStatus;
  flawNotes: string;
  photos: GarmentPhoto[];
};

export const root = () => path.join(process.cwd(), 'data', 'garments');
export const MAX_FILE = 20 * 1024 * 1024;
export const MAX_BODY = 65 * 1024 * 1024;
const MAX_PHOTOS = 12;
const locks = new Map<string, Promise<unknown>>();

export class UploadError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

async function withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(operation);
  locks.set(key, current);
  try { return await current; }
  finally { if (locks.get(key) === current) locks.delete(key); }
}

export function authorize(request: Request) {
  const password = process.env.STUDIO_PASSWORD;
  if (!password || password.length < 16) throw new UploadError('Configure STUDIO_PASSWORD with at least 16 characters on the server.', 503);
  const supplied = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${password}`;
  if (Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) throw new UploadError('Enter the studio password to access your garments.', 401);
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (!origin || origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new UploadError('Cross-origin updates are not allowed.', 403);
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

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === 'string' && values.includes(value as T[number]);
}

function metadataFromForm(form: FormData) {
  const condition = form.get('condition') ?? 'unspecified';
  const flawStatus = form.get('flawStatus') ?? 'unreviewed';
  const flawNotes = form.get('flawNotes') ?? '';
  if (!isOneOf(condition, CONDITIONS)) throw new UploadError('Choose a valid garment condition.');
  if (!isOneOf(flawStatus, FLAW_STATUSES)) throw new UploadError('Choose whether flaws have been reviewed.');
  if (typeof flawNotes !== 'string' || flawNotes.length > 2000) throw new UploadError('Flaw notes must be 2,000 characters or fewer.');
  if (flawStatus === 'noted' && !flawNotes.trim()) throw new UploadError('Describe the flaws you noted.');
  if (flawStatus === 'none' && flawNotes.trim()) throw new UploadError('Clear flaw notes when no flaws are known.');
  return { condition, flawStatus, flawNotes: flawNotes.trim() };
}

async function validatePhotos(files: File[], roles: PhotoRole[]) {
  if (files.length !== roles.length) throw new UploadError('Every photo must have one photo role.');
  const validated: { bytes: Buffer; format: { type: string; extension: string }; file: File; role: PhotoRole }[] = [];
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    if (!file.size || file.size > MAX_FILE) throw new UploadError('Each photo must be between 1 byte and 20 MB.');
    if (!isOneOf(roles[index], PHOTO_ROLES)) throw new UploadError('Choose a valid role for every photo.');
    const bytes = Buffer.from(await file.arrayBuffer());
    const format = imageType(bytes);
    if (!format) throw new UploadError('Use JPEG, PNG, WebP, or HEIC photos.');
    validated.push({ bytes, format, file, role: roles[index] });
  }
  return validated;
}

async function readMultipart(request: Request, allowedKeys: string[]) {
  if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new UploadError('Send garment updates using multipart form data.', 415);
  const declaredSize = Number(request.headers.get('content-length'));
  if (declaredSize > MAX_BODY) throw new UploadError('Upload must be under 65 MB in total.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new UploadError('The garment update is empty.');
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
  catch { throw new UploadError('The garment update could not be read. Please select your photos again.'); }
  if ([...form.keys()].some(key => !allowedKeys.includes(key))) throw new UploadError('Invalid garment update.');
  return form;
}

function photoInputFromForm(form: FormData) {
  const values = form.getAll('photos');
  if (values.some(value => typeof value === 'string')) throw new UploadError('Invalid photo upload.');
  const files = values as File[];
  const rolesValue = form.get('roles');
  let roles: PhotoRole[];
  if (rolesValue === null) roles = files.map((_, index) => index === 0 ? 'front' : 'other');
  else {
    if (typeof rolesValue !== 'string') throw new UploadError('Invalid photo roles.');
    try { roles = JSON.parse(rolesValue) as PhotoRole[]; }
    catch { throw new UploadError('Invalid photo roles.'); }
    if (!Array.isArray(roles)) throw new UploadError('Invalid photo roles.');
  }
  return { files, roles };
}

async function writeListing(garment: Garment) {
  const directory = path.join(root(), garment.id);
  const temporary = path.join(directory, `.listing-${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(garment, null, 2), { flag: 'wx', mode: 0o600 });
  await rename(temporary, path.join(directory, 'listing.json'));
}

async function nextItemCode() {
  let entries;
  try { entries = await readdir(root(), { withFileTypes: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'CRS-0001'; throw error; }
  let highest = 0;
  for (const entry of entries) {
    if (!entry.isDirectory() || !validId(entry.name)) continue;
    try {
      const value = JSON.parse(await readFile(path.join(root(), entry.name, 'listing.json'), 'utf8')) as { itemCode?: unknown };
      if (typeof value.itemCode === 'string') {
        const match = /^CRS-(\d{4,})$/.exec(value.itemCode);
        if (match) highest = Math.max(highest, Number(match[1]));
      }
    } catch { /* Corrupt listings are skipped by the gallery. */ }
  }
  return `CRS-${String(highest + 1).padStart(4, '0')}`;
}

export async function saveGarment(files: File[], options: { roles?: PhotoRole[]; condition?: GarmentCondition; flawStatus?: FlawStatus; flawNotes?: string } = {}) {
  if (!files.length || files.length > MAX_PHOTOS) throw new UploadError(`Choose between 1 and ${MAX_PHOTOS} photos.`);
  const roles = options.roles ?? files.map((_, index) => index === 0 ? 'front' : 'other');
  if (!roles.includes('front')) throw new UploadError('Add a front photo to start this garment.');
  if (!isOneOf(options.condition ?? 'unspecified', CONDITIONS) || !isOneOf(options.flawStatus ?? 'unreviewed', FLAW_STATUSES)) throw new UploadError('Invalid garment review.');
  if ((options.flawNotes?.length ?? 0) > 2000 || (options.flawStatus === 'noted' && !options.flawNotes?.trim()) || (options.flawStatus === 'none' && options.flawNotes?.trim())) throw new UploadError('Review the garment flaw details.');
  const validated = await validatePhotos(files, roles);
  return withLock('storage', async () => {
    const id = randomUUID();
    const staging = path.join(root(), `.upload-${id}`);
    const timestamp = new Date().toISOString();
    const garment: Garment = {
      schemaVersion: 2, id, itemCode: await nextItemCode(), revision: 1, createdAt: timestamp, updatedAt: timestamp,
      condition: options.condition ?? 'unspecified', flawStatus: options.flawStatus ?? 'unreviewed', flawNotes: options.flawNotes?.trim() ?? '', photos: [],
    };
    try {
      await mkdir(path.join(staging, 'originals'), { recursive: true, mode: 0o700 });
      for (const { bytes, format, file, role } of validated) {
        const filename = `${randomUUID()}.${format.extension}`;
        await writeFile(path.join(staging, 'originals', filename), bytes, { flag: 'wx', mode: 0o600 });
        garment.photos.push({ filename, originalName: path.basename(file.name).slice(0, 255), type: format.type, size: bytes.length, role });
      }
      await writeFile(path.join(staging, 'listing.json'), JSON.stringify(garment, null, 2), { flag: 'wx', mode: 0o600 });
      await rename(staging, path.join(root(), id));
      return garment;
    } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
  });
}

export const validId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);

function parseGarment(value: unknown, directoryId: string): { garment: Garment; migrated: boolean } {
  if (!value || typeof value !== 'object') throw new Error('Invalid listing');
  const raw = value as Record<string, unknown>;
  if (raw.id !== directoryId || typeof raw.createdAt !== 'string' || !Number.isFinite(Date.parse(raw.createdAt)) || !Array.isArray(raw.photos) || !raw.photos.length) throw new Error('Invalid listing');
  const photos = raw.photos.map(photoValue => {
    if (!photoValue || typeof photoValue !== 'object') throw new Error('Invalid listing');
    const photo = photoValue as Record<string, unknown>;
    if (typeof photo.filename !== 'string' || !/^[\da-f-]+\.(jpg|png|webp|heic)$/.test(photo.filename) || typeof photo.originalName !== 'string' || typeof photo.type !== 'string' || !Number.isSafeInteger(photo.size) || Number(photo.size) <= 0) throw new Error('Invalid listing');
    return { filename: photo.filename, originalName: photo.originalName, type: photo.type, size: Number(photo.size), role: isOneOf(photo.role, PHOTO_ROLES) ? photo.role : 'other' } satisfies GarmentPhoto;
  });
  const itemCode = typeof raw.itemCode === 'string' && /^CRS-\d{4,}$/.test(raw.itemCode) ? raw.itemCode : '';
  const revision = Number.isSafeInteger(raw.revision) && Number(raw.revision) > 0 ? Number(raw.revision) : 1;
  const updatedAt = typeof raw.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt)) ? raw.updatedAt : raw.createdAt;
  const condition = isOneOf(raw.condition, CONDITIONS) ? raw.condition : 'unspecified';
  const flawStatus = isOneOf(raw.flawStatus, FLAW_STATUSES) ? raw.flawStatus : 'unreviewed';
  const flawNotes = typeof raw.flawNotes === 'string' && raw.flawNotes.length <= 2000 ? raw.flawNotes : '';
  const garment: Garment = { schemaVersion: 2, id: directoryId, itemCode, revision, createdAt: raw.createdAt, updatedAt, condition, flawStatus, flawNotes, photos };
  const migrated = raw.schemaVersion !== 2 || !itemCode || raw.revision !== revision || raw.updatedAt !== updatedAt || raw.condition !== condition || raw.flawStatus !== flawStatus || raw.flawNotes !== flawNotes || photos.some((photo, index) => (raw.photos as Record<string, unknown>[])[index]?.role !== photo.role);
  return { garment, migrated };
}

async function readGarment(id: string) {
  if (!validId(id)) throw new UploadError('Garment not found.', 404);
  try { return parseGarment(JSON.parse(await readFile(path.join(root(), id, 'listing.json'), 'utf8')), id); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new UploadError('Garment not found.', 404);
    if (error instanceof UploadError) throw error;
    throw new UploadError('Garment metadata is unreadable.', 500);
  }
}

export async function listGarments(): Promise<Garment[]> {
  return withLock('storage', async () => {
    let entries;
    try { entries = await readdir(root(), { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
    const listings: { garment: Garment; migrated: boolean }[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || !validId(entry.name)) continue;
      try { listings.push(parseGarment(JSON.parse(await readFile(path.join(root(), entry.name, 'listing.json'), 'utf8')), entry.name)); }
      catch (error) { console.error(`Skipping unreadable garment ${entry.name}`, error); }
    }
    listings.sort((a, b) => a.garment.createdAt.localeCompare(b.garment.createdAt));
    const used = new Set(listings.map(({ garment }) => garment.itemCode).filter(Boolean));
    let next = 1;
    for (const listing of listings) {
      if (!listing.garment.itemCode) {
        while (used.has(`CRS-${String(next).padStart(4, '0')}`)) next++;
        listing.garment.itemCode = `CRS-${String(next).padStart(4, '0')}`;
        used.add(listing.garment.itemCode);
        listing.migrated = true;
      }
      if (listing.migrated) await writeListing(listing.garment);
    }
    return listings.map(({ garment }) => garment).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  });
}

export async function upload(request: Request) {
  authorize(request);
  const form = await readMultipart(request, ['photos', 'roles', 'condition', 'flawStatus', 'flawNotes']);
  const { files, roles } = photoInputFromForm(form);
  return saveGarment(files, { roles, ...metadataFromForm(form) });
}

export async function updateGarment(request: Request, id: string) {
  authorize(request);
  const form = await readMultipart(request, ['photos', 'roles', 'revision', 'condition', 'flawStatus', 'flawNotes']);
  const revisionValue = form.get('revision');
  if (typeof revisionValue !== 'string' || !/^\d+$/.test(revisionValue)) throw new UploadError('A garment revision is required.');
  const expectedRevision = Number(revisionValue);
  const { files, roles } = photoInputFromForm(form);
  const metadata = metadataFromForm(form);
  return withLock(`garment:${id}`, async () => {
    const { garment } = await readGarment(id);
    if (garment.revision !== expectedRevision) throw new UploadError('This garment changed in another tab. Reopen it and try again.', 409);
    if (garment.photos.length + files.length > MAX_PHOTOS) throw new UploadError(`A garment can have up to ${MAX_PHOTOS} photos.`);
    if (!files.length && garment.condition === metadata.condition && garment.flawStatus === metadata.flawStatus && garment.flawNotes === metadata.flawNotes) throw new UploadError('No garment changes were provided.');
    const validated = await validatePhotos(files, roles);
    const written: string[] = [];
    try {
      for (const { bytes, format, file, role } of validated) {
        const filename = `${randomUUID()}.${format.extension}`;
        const destination = path.join(root(), id, 'originals', filename);
        await writeFile(destination, bytes, { flag: 'wx', mode: 0o600 });
        written.push(destination);
        garment.photos.push({ filename, originalName: path.basename(file.name).slice(0, 255), type: format.type, size: bytes.length, role });
      }
      garment.condition = metadata.condition;
      garment.flawStatus = metadata.flawStatus;
      garment.flawNotes = metadata.flawNotes;
      garment.revision++;
      garment.updatedAt = new Date().toISOString();
      await writeListing(garment);
      return garment;
    } catch (error) {
      await Promise.all(written.map(filename => unlink(filename).catch(() => undefined)));
      throw error;
    }
  });
}
