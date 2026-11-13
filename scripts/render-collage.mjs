import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { renderCollage } from './collage-renderer.mjs';
import { validId } from '../src/lib/garments.ts';

// Usage: npm run collage -- /path/to/manifest.json
// Supporting files must resolve to the selected garment's uploaded originals.
try {
  if (!process.argv[2]) throw new Error('Pass a collage manifest JSON path. See references/README.md.');
  const manifest = JSON.parse(await readFile(process.argv[2], 'utf8'));
  if (!validId(manifest.garmentId) || typeof manifest.main !== 'string' || !Array.isArray(manifest.supporting) || manifest.supporting.length !== 4 || new Set(manifest.supporting).size !== 4 || manifest.supportingSource !== 'user-original') {
    throw new Error('Specify an approved main image, garmentId, four distinct original filenames, and supportingSource: user-original.');
  }
  const directory = path.join(process.cwd(), 'data', 'garments', manifest.garmentId);
  const listing = JSON.parse(await readFile(path.join(directory, 'listing.json'), 'utf8'));
  const supporting = await Promise.all(manifest.supporting.map(async filename => {
    if (typeof filename !== 'string' || path.basename(filename) !== filename || !listing.photos.some(photo => photo.filename === filename)) throw new Error('Supporting photographs must be listed uploaded originals.');
    return { source: 'user-original', bytes: await readFile(path.join(directory, 'originals', filename)) };
  }));
  const bytes = await renderCollage({ main: await readFile(path.resolve(path.dirname(process.argv[2]), manifest.main)), supporting });
  const output = path.join(process.cwd(), 'exports', `${manifest.garmentId}-CRS-0001.png`);
  await mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
  await writeFile(output, bytes, { flag: 'wx', mode: 0o600 });
  console.log(`Saved ${output}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
