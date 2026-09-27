# ForgeRTS v0.2.1 Validation Report

## Automated results

- `npm test`: **22/22 tests passed**.
- All engine / renderer / UI / test JavaScript and MJS files pass `node --check` syntax validation.
- All **27 JSON files** parse successfully.
- Real training-map regression still verifies repeated persistent MOVE orders for the player Aegis-X, HMMWV-50, and Rifleman without ending in `BLOCKED` state.
- GameObject migration test verifies every production unit/building/resource definition uses explicit object module records and no longer relies on top-level gameplay fields such as `maxHealth`, `asset`, or `locomotor`.
- GameObject factory test verifies runtime Body / Selectable / Locomotor / UnitAI / Render composition.
- Resource docking interaction test verifies the complete request → grant → approach → dock → unload → release → exit → complete handshake.
- Factory rollout interaction test verifies role-gated, data-driven rollout state transitions.
- Interaction state snapshot/restore test passes.
- Gesture tests verify gameplay TAP is not emitted until pointer-up classification, deliberate drags become PAN, long press is distinct, and pinch suppresses accidental taps.
- MapManifest regression verifies strategic region metadata for ownership/threat/resource value/AI activity/discovery.
- Snapshot/restore format v3 preserves deterministic world state, module state, interaction state, region state, command bus, RNG and UnitAI intent.

## Asset integrity

- **16/16 production GLBs are byte-for-byte identical to ForgeRTS v0.2.0.**
- Existing terrain textures are unchanged.
- `ASSET_HASHES.sha256` remains the packaged asset integrity manifest.

## Scope boundary

v0.2.1 intentionally does **not** wire production or harvesting gameplay into the new interaction protocols yet. The protocols and endpoint/module data are the deterministic foundation those systems will use later.

This milestone also does not add weapons/combat. The next recommended major system is the data-driven Weapon / Armor / Damage core.

## Real-device validation still required

Automated validation cannot replace an iPhone Safari test. Verify that selection/MOVE still behave like v0.2.0 and that the new gesture resolver preserves reliable taps while deliberate drag/pinch camera gestures remain smooth. Because the visible world/rendering assets are intentionally unchanged, unexpected visual differences should be treated as regressions.
