# ForgeRTS v0.6.6.6 Test Report

## Automated regression suite

- 134 / 134 tests passed
- 0 failed
- Snapshot schema remains v16
- Existing Aegis/Crimson economy, production, combat, movement, relationships, strategic AI, tactical AI and construction tests all pass
- Added explicit regression coverage for Crimson Citadel routing, authored no-tint mode, Citadel/Gate hierarchy preservation, wall-kit registration, deterministic wall snapping, and rear-fortification route safety

## Content validation

- 0 errors
- 0 warnings
- 23 registered definitions
- 27 active catalog assets
- 3 maps

## Static validation

- 86 / 86 JSON files parsed
- 64 / 64 JS/MJS files pass `node --check`
- 42 runtime/tool modules audited for static import cycles
- 0 circular imports

## Asset preservation

- 38 / 38 files tracked in `ASSET_HASHES.sha256`
- All 32 assets from v0.6.6.5 remain byte-for-byte unchanged
- Exactly 6 new authored GLBs were added: Command Citadel, four wall modules, and Armored Gate
- Each new GLB matches its accepted production source SHA-256 exactly

## Runtime-change boundary

`engine/`, `renderer/`, and `ui/` are byte-for-byte unchanged from v0.6.6.5. The integration uses existing data-driven faction asset routing, authored-color mode, ClientAnimation, GameObject modules, and WallConnection metadata.

## Gate limitation retained intentionally

The gate is registered and present in the active map as a real closed pathing obstacle, but automatic opening/closing and dynamic path-block changes are not implemented in this patch. The rear/east showcase section is intentionally non-enclosing, and regression coverage verifies the Crimson main route and Harvester resource route remain open.
