/** Routing metadata only. A registered destination is not a working publisher. */
export const marketplaceRegistry = Object.freeze({
  poshmark: Object.freeze({ label: 'Poshmark', methodCandidate: 'authorized-integration-to-be-verified', publisherImplemented: false }),
  ebay: Object.freeze({ label: 'eBay', methodCandidate: 'official-api', publisherImplemented: false }),
  depop: Object.freeze({ label: 'Depop', methodCandidate: 'partner-api-access-required', publisherImplemented: false }),
});

export function planMarketplaces(input) {
  if (!input || typeof input.itemId !== 'string' || !input.itemId.trim() || !Number.isSafeInteger(input.listingRevision) || input.listingRevision < 1) {
    throw new Error('Supply an itemId and positive integer listingRevision.');
  }
  if (!Array.isArray(input.destinations) || !input.destinations.length) throw new Error('Select at least one destination.');
  const seen = new Set();
  const destinations = input.destinations.map(target => {
    if (!target || !Object.hasOwn(marketplaceRegistry, target.marketplace)) throw new Error('Unknown marketplace. Register its adapter before selecting it.');
    if (typeof target.accountRef !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(target.accountRef)) throw new Error('Use a local account reference, not credentials or a URL.');
    if (Object.keys(target).some(key => !['marketplace', 'accountRef'].includes(key))) throw new Error('Destination plans accept only marketplace and accountRef. Keep credentials outside listing manifests.');
    const key = `${target.marketplace}:${target.accountRef}`;
    if (seen.has(key)) throw new Error('Duplicate marketplace/account destination.');
    seen.add(key);
    return {
      marketplace: target.marketplace,
      accountRef: target.accountRef,
      ...marketplaceRegistry[target.marketplace],
      status: 'publisher-not-implemented',
      canPublish: false,
    };
  });
  return { mode: 'plan-only', itemId: input.itemId, listingRevision: input.listingRevision, destinations };
}
