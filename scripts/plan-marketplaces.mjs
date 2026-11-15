import { readFile } from 'node:fs/promises';
import { planMarketplaces } from './marketplaces/registry.mjs';

try {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/plan-marketplaces.mjs data/marketplace-plan.json');
  const manifest = JSON.parse(await readFile(process.argv[2], 'utf8'));
  console.log(JSON.stringify(planMarketplaces(manifest), null, 2));
} catch (error) {
  // Do not echo raw manifests, local paths, or parser errors containing secrets.
  console.error(error instanceof SyntaxError ? 'Invalid marketplace plan JSON.' : error.code ? 'Unable to read marketplace plan.' : error.message);
  process.exitCode = 1;
}
