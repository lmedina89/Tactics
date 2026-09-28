# ForgeRTS v0.6.3 Test Report

## Release

**ForgeRTS v0.6.3 — Projectile Correctness + Strategic Intelligence**

This release was built from the validated v0.6.2 tree. Projectile/combat correctness was treated as a gating foundation task before strategic-AI expansion.

## Automated validation

- **101 / 101 automated tests pass** (`npm test`).
- **53 / 53 JS/MJS files** pass `node --check`.
- **54 / 54 JSON files** parse successfully.
- **21 / 21 production asset hashes** match `ASSET_HASHES.sha256`.
- Production GLBs and terrain textures are unchanged.
- Release-version consistency is tested across `package.json`, the HUD/title/startup label and `asset-catalog.json`.

## New projectile/combat coverage

- Aegis-X 120 mm physical shell impacts a laterally moving HMMWV while the target is still moving.
- Swept projectile collision uses authored BOX Geometry rather than the legacy movement-center radius.
- `DUMB_PROJECTILE` receives launch lead but does not alter velocity to home after firing.
- `GUIDED_PROJECTILE` can turn only through its data-defined bounded guidance rate.
- Active projectile state survives snapshot/restore deterministically.
- Projectile data validation rejects invalid behavior names / invalid numeric policy values.

## New strategic-AI coverage

- Team plan variant selection changes from generic enemy `AITargetable` category counts rather than concrete object IDs.
- Difficulty and real current wealth affect planning cadence/gatherer demand without changing gameplay rules.
- BALANCED / AGGRESSIVE / DEFENSIVE / ECONOMIST personality selection changes strategic pacing/posture from data.
- Expansion requires a real local-resource depletion baseline before selecting a remote field / increasing desired Refinery count.
- Strategic planner state survives v13 snapshot/restore deterministically.
- Existing v0.6.0-v0.6.2 tests continue to cover authoritative `FROM_AI` command flow, harvesting, construction, production, Team recruitment, tactical target valuation, economic defense and retreat/reform/reinforcement.

## Snapshot compatibility

Current snapshot schema: **v13**.

Restore accepts **v8, v9, v10, v11, v12 and v13**.

## Long-run engineering sanity

A construction-validation simulation was warmed for 300 fixed ticks and then measured for 3,000 additional ticks in the container:

- measured average: **~0.178 ms / simulation tick**
- final tick: **3300**
- Team registry: **2 records**
- AI remained bounded while harvesting, building, producing and running strategic/tactical planning

This is an engineering sanity measurement, **not an iPhone performance benchmark**.

## Browser / device validation

The container cannot perform the final real Three.js visual smoke test because the project imports Three.js from jsDelivr and external DNS is unavailable in this environment. The release therefore still requires real iPhone / GitHub Pages validation for visual projectile trajectories, hit feel and strategic behavior.
