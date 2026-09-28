# ForgeRTS v0.6.5 Test Report

**Release:** ForgeRTS v0.6.5 — Content Expansion + World Composition Foundation  
**Content contract:** v1  
**Snapshot schema:** v15 (restore accepts v8-v15)

## Automated regression suite

- **116 / 116 tests pass**.
- Existing construction, economy, production, harvesting, AI, Team, movement/collision, client-animation and projectile/combat regressions remain green.
- New content-foundation coverage verifies:
  - content-contract/template validation
  - explicit `ContentMeta` on registered production definitions
  - batch content-pack registration without engine/root-definition edits
  - category/affiliation indexing
  - generic wall/gate socket metadata
  - deterministic wall snapping without concrete wall IDs
  - ownerless CIVILIAN/NEUTRAL authoritative GameObjects
  - GLB audit coverage and non-authoritative visual-bound suggestions
  - v15 snapshot compatibility through the existing snapshot regression suite
  - release version metadata consistency

## Static validation

- **60 / 60 JS/MJS files** pass `node --check`.
- **75 / 75 JSON files** parse successfully (including generated machine-readable reports).
- `npm run validate:content`: **0 errors / 0 warnings** across:
  - 18 GameObject definitions
  - 16 registered GLB assets
  - 8 content templates
  - 1 content pack
  - 3 maps
- **21 / 21 production asset hashes** match `ASSET_HASHES.sha256`.
- No production GLB or terrain asset bytes changed in v0.6.5.

## Asset-ingestion audit

`npm run audit:assets` successfully inventories all 16 registered GLBs and emits:

- transformed visual bounds
- embedded animation clips
- mesh/material names
- likely mechanical/animation pivot hints
- advisory Geometry envelope suggestions

The audit is deliberately non-authoritative: it never writes gameplay collision/balance from the GLB.

## Engineering sanity run

Using the production `construction_validation` map after a 300-tick warmup:

- measured simulation ticks: 3,000
- final tick: 3,300
- measured time: 988.874 ms total
- average: **~0.3296 ms/tick** in this container
- alive entities: 24
- runtime Team records: 2
- snapshot version: 15

This is an engineering sanity measurement, **not an iPhone benchmark**. v0.6.5 intentionally adds very little per-tick work; most new work happens during registry/content/map load and validation.

## Browser / phone validation

Container headless rendering remains unsuitable for the project's external jsDelivr Three.js import because external DNS is unavailable in that environment. Real GitHub Pages/iPhone validation is still recommended, although v0.6.5 intentionally leaves existing production assets/render/gameplay behavior unchanged.

## Release criteria

PASS. The content contract, content-pack registry, neutral/civilian object foundation, wall/gate metadata, GLB audit, content validator and validation map are ready for field use and for the next asset-authoring batch.
