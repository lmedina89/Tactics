# ForgeRTS v0.5.1 Test Report

## Release target

**ForgeRTS v0.5.1 — Construction Validation + Mobile Command UI**

This release intentionally focuses on proving the v0.5.0 construction/economy/production architecture through a player-facing mobile scenario rather than adding another major simulation subsystem.

## Automated suite

Command: `npm test`

Result: **53/53 tests passing**.

New v0.5.1 coverage verifies:

- the playable validation map starts with only Command Post, Aegis-X, HMMWV-50, and Harvester for the player
- player begins with $8,500 and no prebuilt Power Node / Refinery / Barracks / Vehicle Factory / Guardian Turret
- Power Node is initially legal while later tech is prerequisite-locked
- constructing a real Power Node unlocks Refinery and Barracks while Vehicle Factory remains locked until Refinery exists
- the client loads the dedicated validation map and exposes explicit command-dock / placement-banner guidance
- the playable scenario can complete an end-to-end Power → Refinery → begin harvesting → Barracks → Rifleman production sequence using the real simulation systems

All previous movement, steering/reverse, combat, armor, projectile, docking, economy, production, construction, snapshot, gesture, terrain, module, and map regression tests remain passing.

## Static validation

- **37** JavaScript / MJS files passed `node --check`.
- **46** JSON files parsed successfully.
- `ASSET_HASHES.sha256` passed for every listed production GLB and terrain texture.
- Production GLBs were not modified.
- Snapshot schema remains **v8**; this release does not add simulation-state fields.

## Packaging validation

The final release is packaged with `index.html` at the ZIP root for direct GitHub Pages/static-host deployment. The dedicated playable map is `maps/construction_validation.json`; the complete prebuilt `maps/training_ground.json` remains available as the regression fixture.

A localhost HTTP smoke test was attempted in the execution environment, but loopback connections are blocked here even while the local server process is running. No browser-runtime claim is based on that unavailable check; the release relies on the automated simulation/UI-source/static validation above plus the user's real iPhone/GitHub Pages test.

## Manual iPhone focus

1. Load the page and confirm the Command Post is already selected and centered.
2. Confirm BUILD controls are visible and locked structures state their prerequisite.
3. Place a Power Node and verify live green/red placement feedback and specific invalid reasons.
4. Build Refinery, harvest crystals, and observe cargo/credits.
5. Build Barracks and train a Rifleman.
6. Build Vehicle Factory and produce a vehicle.
7. Build Guardian Turret and confirm the FIELD TEST objective reports completion.
