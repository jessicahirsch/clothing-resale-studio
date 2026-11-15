import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planMarketplaces } from '../scripts/marketplaces/registry.mjs';
const target = (marketplace, accountRef = 'my-account') => ({ marketplace, accountRef });
const plan = destinations => planMarketplaces({ itemId: 'CRS-0001', listingRevision: 1, destinations });
test('routes only explicitly selected marketplace accounts', () => {
  const result = plan([target('ebay')]);
  assert.deepEqual(result.destinations.map(d => d.marketplace), ['ebay']);
  assert.equal(result.destinations[0].canPublish, false);
  assert.equal(result.mode, 'plan-only');
});
test('cross-post selection produces independent plans, never fake publication success', () => {
  const result = plan(['poshmark', 'ebay', 'depop'].map(name => target(name)));
  assert.equal(result.destinations.length, 3);
  assert.ok(result.destinations.every(d => d.status === 'publisher-not-implemented' && !d.publisherImplemented && !d.canPublish));
});
test('rejects unknown marketplaces, duplicate destinations and empty selection', () => {
  for (const targets of [[target('other')], [target('toString')], [target('ebay'), target('ebay')], []]) assert.throws(() => plan(targets));
  assert.equal(plan([target('ebay', 'first'), target('ebay', 'second')]).destinations.length, 2);
});
test('requires a revision and account reference and rejects credential fields', () => {
  assert.throws(() => planMarketplaces({ itemId: 'CRS-0001', listingRevision: 0, destinations: [target('ebay')] }));
  assert.throws(() => plan([target('ebay', 'https://example.com')]));
  assert.throws(() => plan([{ ...target('ebay'), password: 'secret' }]));
});
