# ForgeRTS v0.2.0 Validation Report

## Automated regression

- `npm test`: **12/12 tests passed**.
- JavaScript syntax: all `.js` / `.mjs` files pass `node --check`.
- Real-map mobility regression: player Aegis-X, HMMWV-50, and Rifleman each accepted two successive persistent MOVE orders on the v2 training map and ended without `BLOCKED` state.
- Determinism regression: repeated fixed-step runs produce identical snapshots.
- STOP regression: clears UnitAI intent and velocity.
- Navigation regression: building footprints plus locomotor clearance alter routes; river cells are blocked for ground profiles.
- Snapshot/restore regression: tick, RNG, player state, entity kinematics, UnitAI intent, and command serial state round-trip exactly.
- MapManifest v2 regression: region, roads, river, waypoints, trigger areas, resource fields, and AI anchors are present and validated.
- Terrain regression: height sampling is deterministic and splat weights remain normalized.

## Asset integrity

- **16/16 existing production GLBs are byte-identical to ForgeRTS v0.1.0.**
- `sha256sum -c ASSET_HASHES.sha256`: all 16 GLBs and all 5 new ForgeRTS terrain/road textures pass.

## Scope limitation

The automated environment validates simulation/data/source integrity but does not replace the required iPhone Safari visual/input test. v0.2.0 should be visually checked for terrain material balance, road conformity, river continuity, camera feel, and real-device GLB performance before the combat milestone begins.
