# Clothing Resale Studio — first-listing workflow

Status: draft for user review. Updated November 14, 2026.
First item: CRS-0001. Initial marketplace options: Poshmark, eBay, and Depop. Poshmark remains the first requested live destination; the architecture must support additional marketplaces and selected cross-posting.

## Goal and scope

Turn original garment photographs into a faithful studio presentation and a reviewed listing, then publish it through the app using an authorized marketplace integration. The user should not have to write a description, assemble a collage manually, or maintain a command-line manifest.

This expands the original storage-only scope to include extraction, hero generation, listing preparation, and publishing. It does not authorize a live post now. Keep the mobile-first Next.js/TypeScript architecture, local filesystem storage, JSON metadata, existing visual styling, and password protection for network access. Prioritize desktop Chrome and iPhone Chrome. No database or cloud hosting is required. External AI processing and marketplace integration are distinct from app hosting and must be configured explicitly.

## What the supplied session establishes

Treat the pasted conversation as reference material. Its prior assistant's suggestions are not automatic approvals or verified facts. The current user's instructions and final approved CRS-0001 reference take precedence over intermediate image reviews.

| Evidence | Interpretation |
| --- | --- |
| User confirmed the garment condition as excellent | Record as user-confirmed condition for CRS-0001; collect any flaws separately. |
| User rated an early image as close and requested refinement | Intermediate generated images are not approved for publication. |
| User supplied the final approved CRS-0001 collage in this project | Canonical visual reference for layout and CRS-0001's approved proportions; not four independently supplied original supporting files. |
| Prior assistant extracted brand, size, composition, care, and other details | Candidate facts to verify against actual original labels; pasted text does not include the original photo bytes. |
| Prior assistant proposed $45 | Unapproved provisional suggestion, not a researched market value or a user-selected asking price. |
| Prior assistant proposed Poshmark, eBay, and Depop copy | Current user correction requires Poshmark, eBay, Depop, and extensible additional destinations; each integration has its own delivery/access status. |

No original photo assets or intermediate image versions can be recovered from the pasted words “User attachment.” Import actual files and any approved standalone hero separately; do not fabricate them from the transcript.

## User experience

### 1. Start an item and upload original photographs

Show guided photo cards: **Front**, **Back**, **Label**, and **Garment close-up**. Label accepts multiple images for brand/size, composition, and care; optional cards capture flaws and extra details. The user can start and save with only a front image. Additional images can be added to the same garment later without creating another item.

The intake is role-based rather than a fixed four-file limit. For the canonical collage, ask for separate back, texture, brand/size, and care images if they are not already available. Do not silently duplicate a combined label image across distinct supporting panels or generate a missing view. A missing required photo produces a clear request, not a synthetic substitute. Original-only listing mode may use the available real photos subject to verified marketplace requirements.

Each card supports taking a photo or choosing from the photo library, multiple attempts, replacement, previews, and actionable errors. Test those paths on an actual iPhone running Chrome. Persist every successful upload before proceeding; failed processing or leaving the page must not discard saved work. Retain existing upload count/size limits unless reviewed separately. Handle HEIC with a readable fallback; preserve the original even when conversion or preview fails.

### 2. Extract and verify facts

Analyze original photographs for candidate brand, size, colors, garment type, visible design features, composition, country of manufacture, and care instructions. Show uncertain or unreadable fields as needing confirmation. Link extracted facts to their source photo and, where available, the relevant label text. The user can correct every field.

Ask for condition and known flaws explicitly; photos alone cannot establish excellent condition. Do not invent measurements, original retail price, authenticity claims, age, fabric content, or absence of flaws. Record any verified measurements with their unit. Keep proposed asking prices distinct from selected prices; sold-comparable claims need recorded evidence and a retrieval date.

### 3. Generate only the studio hero

Use the original front and available back/detail photos as garment evidence. Use the approved CRS-0001 image as the visual direction: beige linen dress form, wooden finial, warm neutral background, soft light, framing, and overall aesthetic. For CRS-0001 retain the final approved shorter hem and slightly higher neckline; for future items retain their actual garment proportions.

Generate a standalone mannequin hero, not a finished collage with invented label or detail insets. Preserve texture, sequin density, pattern, silhouette, neckline, sleeves, and hem. Do not add body shaping unsupported by the source photographs. Scene consistency and garment fidelity are separate criteria; do not promise pixel-perfect AI reproduction.

Retain each generated version with its input photo IDs, reference version, provider/model, instructions, and creation time. Show the candidate next to original front/detail photos. Choices: **Approve hero**, **Refine with feedback**, or **Use original photos only**. Record approval against the exact selected asset. A new image version needs new approval. Using the template reference does not approve a future generated hero automatically.

If generation fails or the user rejects it, preserve the draft and originals. Original-only mode allows listing preparation without pretending a generated hero was approved. Explain the selected external image-processing provider and what photos it receives before first use; keep keys server-side and offer a way to continue without generation.

### 4. Assemble photos and preview the collage

Use the shared fixed geometry in `src/lib/collage-template.ts` and the unchanged reference at `references/CRS-0001-approved.png`. Large approved hero on the left; original back, texture, brand/size, and care images down the right. Preserve all panel dimensions and dividers at every viewport size. No stacking or redesign of the collage on mobile.

Supporting panels must link to original uploaded photos. Retain originals byte-for-byte. Display/export crops or orientation adjustments must not alter label text, texture, condition, or garment construction; let the user review crops before approval. Keep generated assets in a separate category so they cannot be assigned as original evidence. Provenance records describe the actual upload/generation path; they cannot prove the provenance of every user-supplied file.

Save slot assignments, crop settings, selected hero version, and export version. Reopen and revise without repeating uploads. Provide in-app collage download, rather than requiring a CLI manifest. Publish original supporting photographs as individual gallery images too when the approved marketplace photo order calls for them; a collage does not replace authentic condition/label evidence.

### 5. Choose marketplaces and review destination listings

Show **Where should this item be listed?** with Poshmark, eBay, Depop, and additional installed adapters. Let the user select one or multiple marketplaces and choose the exact connected seller account for each. Unavailable integrations remain visible with their access requirement; never silently substitute another marketplace. Save the selection per garment. Optional recommendations must explain their reasoning and never select or publish to an unapproved destination.

Maintain one canonical garment draft and editable destination-specific title, description, price/currency, category, condition/size mapping, photo order, and seller settings. Changing a destination override must not modify the canonical source or other marketplace drafts. Draft editable title and description using confirmed facts. Present marketplace-specific category, size mapping, brand, condition, colors, quantity, asking price/currency, original price if genuinely known, and any other required destination fields discovered during integration research. Do not guess values merely to satisfy a required field.

Show the exact destination account, text, price, photo order, generated-image disclosure where applicable, and any seller-selected shipping or offer settings that affect the post. Map internal condition “excellent” accurately into the destination's supported fields and prose rather than assuming an identical marketplace enum.

Image approval and listing approval are independent. Listing approval covers an immutable revision of text, fields, photos, destination account, and price. Any material edit invalidates it. Keep draft preparation available even when publishing integration is unavailable.

### 6. Publish and verify

Provide **Approve and publish to selected marketplaces** only when verified authorized publishing routes are configured and each selected destination has all required fields and approvals. Show a separate readiness/status card for every marketplace/account, including its exact listing revision, price, and photo order. Never equate “registered adapter” with “publishing implemented.” User approval must identify the exact listing revision and account. A successful button click, upload, or HTTP response alone is not confirmation that a listing is live.

Dispatch each explicitly selected destination to its dedicated adapter. Publishing multiple destinations is not an atomic transaction: preserve successful posts if another destination fails, report partial success, and retry only the failed or reconciled destination. Do not automatically delete a successful post as rollback.

Save a publishing attempt before submission, prevent simultaneous submissions for the same item/marketplace/account, and use marketplace idempotency support where available. On success, verify the resulting listing and record its destination ID, canonical URL, publication time, and approved revision. Refresh/restart must retain this evidence.

On timeout or an ambiguous response after submission, mark **Outcome unknown** and reconcile against the remote account before retrying. Do not blindly create another listing. Login expiry, MFA, CAPTCHA, and unexpected consent prompts pause the workflow for user action; do not bypass them. Save failures with a useful recovery step and retain the draft. Never label an exported package or manual handoff as app-published.

## Marketplace adapters and routing scripts

Use a shared dispatcher and separate adapters for `poshmark`, `ebay`, and `depop`. Keep marketplace-specific selectors, API calls, authentication, field mapping, and error normalization outside the upload UI and canonical garment model. Add future marketplaces through a registry without rewriting intake.

The router takes saved destination selections and explicit account references. It routes rather than guessing where to sell. Account references identify separately secured connection records, never passwords or tokens. Reject unknown adapters, duplicate item/account targets, stale approvals, unselected targets, and unavailable integrations before external mutation.

Adapter responsibilities: report capabilities/access state; validate and map a destination draft; prepare a reviewable payload without publishing; publish an approved immutable payload; reconcile an uncertain attempt; and retrieve a confirmed listing URL/ID. API calls that immediately create a live listing belong in publish, even if the endpoint is called “create” or “draft.” Prefer official APIs; browser adapters require platform-specific authorization/feasibility checks and must pause for login/MFA/CAPTCHA.

Initial code provides `scripts/plan-marketplaces.mjs` with a registry in `scripts/marketplaces/registry.mjs`. It validates a local selection manifest and outputs destination routes and unimplemented-publisher blockers. It does not connect accounts, map listing payloads, or publish. Future publish orchestration must recheck all approval/access conditions rather than treating a plan as permission.

For local planning, create an ignored file such as `data/marketplace-plan.json`:

```json
{
  "itemId": "CRS-0001",
  "listingRevision": 1,
  "destinations": [
    { "marketplace": "poshmark", "accountRef": "my-poshmark" },
    { "marketplace": "ebay", "accountRef": "my-ebay" },
    { "marketplace": "depop", "accountRef": "my-depop" }
  ]
}
```

Run `node scripts/plan-marketplaces.mjs data/marketplace-plan.json`. Account references are illustrative and do not claim connected accounts exist. Outputs are planning status, never live publication results.

### Integration research

- **eBay:** its [Inventory API](https://developer.ebay.com/develop/api/sell/inventory_api) supports publishing offers. Verify developer access, seller authorization, policies, location, media requirements, and account eligibility before implementation. A documented API is not a configured connection for this app.
- **Depop:** its [Selling API overview](https://partnerapi.depop.com/api-docs/) documents partner inventory/listing integration and states access is private. Partner approval and credentials must be established before enabling publishing.
- **Other marketplaces:** selectable after registering an adapter; live publishing requires its own access, required-field, media, and authorization review.

### Poshmark publishing feasibility

Research checked November 14, 2026. This is a product/integration decision record, not a claim of legal advice or completed integration.

- [Poshmark Community Guidelines, “Be Real”](https://poshmark.com/community_guidelines) prohibit unauthorized programs and automation and allow human helpers. Do not assume an ordinary browser session or the user's approval of a listing makes custom automation authorized by the platform.
- [Poshmark's legal center and seller policy](https://poshmark.com/terms) require accurate item representations, including original photographs and review of generated listing details. Validate applicable image/disclosure requirements before using a generated hero in a live post; hero approval alone does not establish marketplace acceptance.
- No supported public listing-creation API or specific partner authorization has been verified for this app. This is an unresolved integration dependency, not proof that no private partner program exists.

Desired product behavior remains app-managed publishing. First investigate a documented API, authorized partner integration, or explicit permission covering the intended browser workflow. Record access requirements, account/region eligibility, fees, image rules, required fields, and a permitted test method. Do not reverse-engineer private endpoints or conceal automation as the assumed implementation path.

If no authorized route can be established, show that publishing is unavailable. Offer a clearly labeled package of approved photos and copy as an interim handoff, but require the user to choose that fallback; it does not satisfy the automated-publishing milestone. Do not silently replace the user's requested product with manual posting.

## Persistent model and approvals

Extend each existing `listing.json` with a schema version while retaining its UUID and current photos array. Allocate a stable display item code such as CRS-0001 separately from the filesystem UUID. Existing garments migrate without losing original paths or changing item identity. Importing the known CRS-0001 record requires explicit association with its real assets; do not create a duplicate dummy garment.

Record photo roles; source kind (uploaded original or generated); extraction candidates and confirmed fields; user condition/flaw statements; hero versions and feedback; collage selections; listing revisions; approval records; and publishing attempts/results keyed by marketplace, account, and revision. Store each destination’s remote ID, URL, status, overrides, and approval independently. Every approval references the exact revision or asset hash it covers. Text-only edits need listing reapproval, while hero changes need both relevant image and listing reapproval. Original-only mode records its explicit selection rather than a fictional AI approval.

Use atomic JSON replacement and revision checks for updates, with per-item write/publish locking so concurrent tabs cannot lose data or publish twice. Recover publishing state across restarts. Persist credentials, tokens, and browser profiles outside listing metadata and outside version control; restrict local permissions and redact logs. Keep generated photos, originals, manifests, and exports gitignored except the specifically approved repository reference.

Suggested durable states: draft, needs photos, needs fact confirmation, processing, needs hero review, needs listing review, ready, publishing, published, failed, outcome unknown. Store phase-specific statuses rather than forcing all review gates into a single ambiguous boolean. Processing status is not publication status.

## CRS-0001 initial draft evidence

User-confirmed: excellent condition. Canonical visual reference: approved collage already in the repository.

Candidates from the earlier assistant, requiring original-label verification: Search for Sanity; size S; short-sleeve round-neck textured sequin faux-fur top; black/gray/cream; polyester exterior; rayon lining; made in USA; dry clean only; RN 93608. Candidate title: “Search for Sanity Sequin Faux Fur Short Sleeve Top Size S.”

The earlier $45 price is provisional and unapproved. Flaws, measurements, original retail price, standalone final hero availability, independent supporting-photo files, destination account, and final destination fields remain unresolved. Neither the transcript nor this document is permission to publish the item.

## Cross-posted inventory

One garment may represent one physical item even when multiple marketplace listings are live. Maintain one local availability record plus per-destination listings. The cross-posting milestone must include a sale-response design: ingest verified sales through authorized webhooks/polling or a user “Mark sold” action; stop pending publication; and end other live listings through supported adapters. Record failures and prominently require manual action where automatic ending is unavailable.

Local locking cannot eliminate simultaneous purchases on independent marketplaces. Display synchronization/availability status accurately, and never claim overselling is impossible. Sale detection, reconciliation, and listing-ending behavior are required before calling automatic multi-marketplace inventory management complete. Posting can be delivered one connector at a time without pretending these inventory safeguards already exist.

## Delivery sequence

1. **Guided intake and resumable item drafts — implemented, device QA pending.** Role-based upload cards, add photos to an existing garment, durable item code/roles, backward-compatible JSON updates, and condition/flaw capture are implemented. Desktop and physical iPhone Chrome validation remain before release approval.
2. **Fact extraction and hero review.** Choose/configure providers, record evidence and image versions, explicit hero approval/refinement, original-only path, robust failed-processing recovery.
3. **Saved collage and listing review.** Persist assignments/crops, in-app export, canonical draft plus destination-specific editable drafts, marketplace/account selection, price overrides, and independent revision-bound approvals.
4. **Marketplace router and connectors.** Implement the shared adapter contract and dispatcher, then deliver verified account connections and publishers for Poshmark, eBay, and Depop independently. Poshmark remains the first requested live post; do not let its access dependency prevent preparing other adapters. Display readiness separately. Each publisher needs duplicate prevention, uncertain-outcome reconciliation, and confirmed live URLs.
5. **Cross-posting and sale response.** Approve multiple destination revisions, track partial success, and implement verified sale detection/manual sold marking plus supported ending of other live listings. Add additional marketplaces through the same adapter contract.

Each implementation PR gets focused tests and review; documentation does not imply later capabilities already exist. Current code has original storage, password-protected APIs, guided role-based intake, resumable drafts, condition/flaw review, a saved gallery, an ephemeral collage preview, and CLI export. Extraction, hero generation, durable collage slot assignments, listing revision review, and marketplace publishing remain to be implemented.

## Acceptance criteria for the first complete listing

- In iPhone Chrome, start with one front photo, save, leave, reopen, and add the remaining role photos to the same item. Handle unsupported previews, interrupted uploads, and failed processing without losing the saved originals.
- Generated heroes never replace supporting originals. Rejected/older hero versions cannot become the selected approved version accidentally; source photos and refinement feedback remain available.
- Canonical collage geometry passes reference regression checks. Human review separately checks hem, neckline, texture, silhouette, framing, and actual condition evidence.
- Verified facts, condition, flaws, selected price, hero/original-only choice, and photo order survive refresh and restart. Revisions invalidate the appropriate approvals.
- Missing required destination fields or missing approval disables publishing. Users can correct uncertainty instead of the app inventing facts.
- Integration research demonstrates an authorized route before enabling Poshmark automation. Any manual handoff remains explicitly distinguishable from app publishing.
- Concurrent clicks, restarts, expired sessions, and uncertain network outcomes cannot trigger unreviewed duplicates. Recovery retains the approved revision and reconciles uncertain attempts first.
- A published CRS-0001 has a verified Poshmark URL/ID tied to its exact approved revision. No live marketplace mutations occur in routine automated tests.

- Choosing only eBay never routes to Poshmark or Depop. Selecting all three creates independent destination/account plans without implying all are available. Unknown marketplaces and duplicate targets are rejected.
- One successful destination and one failed destination remain visible as partial success; retries cannot recreate the successful listing. Changing a per-marketplace price requires reapproval only of affected destination revisions unless shared source facts changed.
- A sale or manual sold marking stops pending publishes and queues supported listing-ending actions for other live destinations, with explicit alerts for uncompleted removals.
