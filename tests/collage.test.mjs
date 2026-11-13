import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { CRS_TEMPLATE, slotStyle } from '../src/lib/collage-template.ts';
import { composePanels, renderCollage } from '../scripts/collage-renderer.mjs';

const reference = new URL('../references/CRS-0001-approved.png', import.meta.url);
test('approved reference remains byte-identical to the supplied canonical image', async () => {
  const bytes = await readFile(reference);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'ddfff64a911401eb978b7b869692e85987e6ad87498e9dad80c73f48a9927f07');
});
test('fixed geometry scales as a whole at mobile and desktop widths', () => {
  assert.deepEqual(CRS_TEMPLATE.slots.map(({ x, y, width, height }) => [x, y, width, height]), [[0,0,726,1448],[732,0,354,407],[732,413,354,343],[732,762,354,263],[732,1031,354,417]]);
  for (const width of [320, 375, 768, 1086]) {
    for (const slot of CRS_TEMPLATE.slots) {
      const style = slotStyle(slot);
      assert.ok(Math.abs(parseFloat(style.width) / 100 * width - slot.width * width / 1086) < 1e-8);
      assert.ok(Math.abs(parseFloat(style.top) / 100 * (width * 1448 / 1086) - slot.y * width / 1086) < 1e-8);
    }
  }
});
test('visual regression: five reference crops return to their canonical positions', async () => {
  // Crops are regression fixtures, NOT claimed as original supporting photographs.
  const bytes = await readFile(reference);
  const panels = await Promise.all(CRS_TEMPLATE.slots.map(({ x, y, width, height }) => sharp(bytes).extract({ left: x, top: y, width, height }).png().toBuffer()));
  const rendered = await composePanels(panels);
  const actual = await sharp(rendered).raw().toBuffer();
  const expected = await sharp(bytes).raw().toBuffer();
  assert.equal(actual.length, expected.length);
  for (const { x, y, width, height } of CRS_TEMPLATE.slots) {
    for (let row = y; row < y + height; row++) {
      const start = (row * CRS_TEMPLATE.width + x) * 3;
      assert.deepEqual(actual.subarray(start, start + width * 3), expected.subarray(start, start + width * 3));
    }
  }
  // The AI reference has slightly uneven divider colors. Geometry/panel pixels
  // are exact; the reusable template uses one neutral divider color.
  const meanError = actual.reduce((total, value, i) => total + Math.abs(value - expected[i]), 0) / actual.length;
  assert.ok(meanError < 0.25, `Full-canvas average channel difference: ${meanError}`);
});
test('production rendering refuses missing or generated supporting photographs', async () => {
  await assert.rejects(renderCollage({ main: Buffer.alloc(0), supporting: [] }), /Four user-original/);
  await assert.rejects(renderCollage({ main: Buffer.alloc(0), supporting: Array.from({ length: 4 }, () => ({ source: 'ai-generated', bytes: Buffer.alloc(0) })) }), /Synthetic substitutions/);
  await assert.rejects(composePanels([]), /exactly five/);
});
test('export command uses saved originals, preserves them, and refuses overwrite or unlisted files', async () => {
  const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const { spawnSync } = await import('node:child_process');
  const workspace = await mkdtemp(path.join(tmpdir(), 'crs-collage-'));
  const id = '12345678-1234-4123-8123-123456789abc';
  const directory = path.join(workspace, 'data', 'garments', id);
  const script = fileURLToPath(new URL('../scripts/render-collage.mjs', import.meta.url));
  try {
    await mkdir(path.join(directory, 'originals'), { recursive: true });
    // Small artificial test fixtures only; no personal photographs used here.
    const fixture = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#b6a18d' } }).png().toBuffer();
    const filenames = ['back.png', 'texture.png', 'brand.png', 'care.png'];
    for (const filename of filenames) await writeFile(path.join(directory, 'originals', filename), fixture);
    await writeFile(path.join(directory, 'listing.json'), JSON.stringify({ photos: filenames.map(filename => ({ filename })) }));
    await writeFile(path.join(workspace, 'main.png'), fixture);
    const manifest = { garmentId: id, main: 'main.png', supportingSource: 'user-original', supporting: filenames };
    const manifestPath = path.join(workspace, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest));
    const run = () => spawnSync(process.execPath, ['--experimental-strip-types', script, manifestPath], { cwd: workspace, encoding: 'utf8' });
    const success = run();
    assert.equal(success.status, 0, success.stderr);
    const output = await sharp(path.join(workspace, 'exports', `${id}-CRS-0001.png`)).metadata();
    assert.equal(output.width, 1086); assert.equal(output.height, 1448);
    for (const filename of filenames) assert.deepEqual(await readFile(path.join(directory, 'originals', filename)), fixture);
    assert.notEqual(run().status, 0, 'existing exports must not be overwritten');
    manifest.supporting[0] = '../outside.png';
    await writeFile(manifestPath, JSON.stringify(manifest));
    const invalid = run();
    assert.notEqual(invalid.status, 0); assert.match(invalid.stderr, /listed uploaded originals/);
  } finally { await rm(workspace, { recursive: true, force: true }); }
});
