import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { authorize, failure, imageType, listGarments, MAX_BODY, MAX_FILE, root, saveGarment, upload, validId } from '../src/lib/garments.ts';

const originalCwd = process.cwd();
const originalPassword = process.env.STUDIO_PASSWORD;
const password = 'test-password-with-entropy';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=', 'base64');
let temporary;
before(async () => { temporary = await mkdtemp(path.join(tmpdir(), 'resale-test-')); process.chdir(temporary); process.env.STUDIO_PASSWORD = password; });
after(async () => { process.chdir(originalCwd); if (originalPassword === undefined) delete process.env.STUDIO_PASSWORD; else process.env.STUDIO_PASSWORD = originalPassword; await rm(temporary, { recursive: true, force: true }); });
const photo = () => new File([png], '../../personal.png', { type: 'image/png' });
function request({ method = 'POST', token = password, origin = 'http://localhost:3000', body, contentType } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  if (origin) headers.Origin = origin;
  if (contentType) headers['Content-Type'] = contentType;
  return new Request('http://localhost:3000/api/garments', { method, headers, body });
}

test('empty storage returns an empty gallery', async () => { assert.deepEqual(await listGarments(), []); });
test('upload persists unchanged bytes and metadata, and survives a fresh read', async () => {
  const form = new FormData(); form.append('photos', photo());
  const saved = await upload(request({ body: form }));
  assert.ok(validId(saved.id));
  assert.equal(saved.photos[0].originalName, 'personal.png');
  assert.equal(saved.photos[0].size, png.length);
  assert.deepEqual(await readFile(path.join(root(), saved.id, 'originals', saved.photos[0].filename)), png);
  assert.deepEqual(JSON.parse(await readFile(path.join(root(), saved.id, 'listing.json'), 'utf8')), saved);
  assert.deepEqual(await listGarments(), [saved]);
  assert.ok((await readdir(root())).every(name => !name.startsWith('.upload-')));
});
test('simultaneous uploads have separate garment IDs', async () => {
  const results = await Promise.all([saveGarment([photo()]), saveGarment([photo()])]);
  assert.notEqual(results[0].id, results[1].id);
});
test('authentication fails closed for missing, short and wrong passwords', () => {
  assert.throws(() => authorize(request({ token: 'wrong' })), { status: 401 });
  delete process.env.STUDIO_PASSWORD;
  assert.throws(() => authorize(request()), { status: 503 });
  process.env.STUDIO_PASSWORD = 'short';
  assert.throws(() => authorize(request()), { status: 503 });
  process.env.STUDIO_PASSWORD = password;
  authorize(request({ method: 'GET' }));
});
test('cross-origin, absent Origin, and cross-site uploads are denied', () => {
  assert.throws(() => authorize(request({ origin: 'https://attacker.example' })), { status: 403 });
  assert.throws(() => authorize(request({ origin: '' })), { status: 403 });
  const req = request(); req.headers.set('Sec-Fetch-Site', 'cross-site');
  assert.throws(() => authorize(req), { status: 403 });
});
test('rejects invalid counts, empty/oversize files, and spoofed image types without writing', async () => {
  const initial = await readdir(root());
  for (const files of [[], Array.from({ length: 13 }, photo), [new File([], 'empty.jpg')], [new File([new Uint8Array(MAX_FILE + 1)], 'large.png')], [new File(['<script>alert(1)</script>'], 'fake.png', { type: 'image/png' })]]) {
    await assert.rejects(saveGarment(files), { status: 400 });
  }
  assert.deepEqual(await readdir(root()), initial);
});
test('request validates content type, multipart fields and truncated data', async () => {
  await assert.rejects(upload(request({ body: 'x', contentType: 'text/plain' })), { status: 415 });
  const form = new FormData(); form.append('photos', 'not a file');
  await assert.rejects(upload(request({ body: form })), { status: 400 });
  await assert.rejects(upload(request({ body: 'broken', contentType: 'multipart/form-data; boundary=x' })), { status: 400 });
});
test('limits streamed request size even without Content-Length', async () => {
  await assert.rejects(upload(request({ body: new Uint8Array(MAX_BODY + 1), contentType: 'multipart/form-data; boundary=x' })), { status: 413 });
});
test('accepts iPhone HEIC and desktop image signatures; rejects SVG', () => {
  assert.equal(imageType(Buffer.from([255, 216, 255, 224])).type, 'image/jpeg');
  assert.equal(imageType(Buffer.from('RIFF0000WEBP')).type, 'image/webp');
  assert.equal(imageType(Buffer.from('\0\0\0\x18ftypheic')).type, 'image/heic');
  assert.equal(imageType(Buffer.from('<svg/>')), undefined);
  assert.equal(validId('../outside'), false);
});
test('incomplete and corrupt listings do not break the gallery', async () => {
  await mkdir(path.join(root(), '.upload-interrupted'), { recursive: true });
  const id = '12345678-1234-4123-8123-123456789abc';
  await mkdir(path.join(root(), id));
  await writeFile(path.join(root(), id, 'listing.json'), '{}');
  const before = console.error; console.error = () => {};
  try { assert.equal((await listGarments()).length, 3); } finally { console.error = before; }
});
test('errors expose useful validation messages without internal filesystem details', async () => {
  const before = console.error; console.error = () => {};
  try {
    const response = failure(new Error('/secret/path'));
    assert.equal(response.status, 500);
    assert.ok(!(await response.text()).includes('/secret/path'));
  } finally { console.error = before; }
});
test('filesystem failures reject the upload without publishing a listing', async () => {
  const blocked = await mkdtemp(path.join(tmpdir(), 'resale-blocked-'));
  try {
    process.chdir(blocked);
    await mkdir('data');
    await writeFile(path.join('data', 'garments'), 'not a directory');
    await assert.rejects(saveGarment([photo()]));
    assert.equal(await readFile(path.join('data', 'garments'), 'utf8'), 'not a directory');
  } finally { process.chdir(temporary); await rm(blocked, { recursive: true, force: true }); }
});
