# ForgeRTS v0.7.0 Test Report

## Release focus

Mission / Trigger / Objective Foundation built on the verified v0.6.6.10 production-queue baseline.

## Automated validation

- Node test suite: **163/163 passed**
- Content validation: **0 errors / 0 warnings**
- Registered content: **26 definitions / 34 assets / 3 maps**
- Asset audit: **34 assets audited**
- Tracked production asset hashes: **45/45 SHA-256 checks passed**
- JS/MJS syntax validation: **75/75 passed**
- JSON parse validation: **98/98 passed**

## Mission-system regression coverage

v0.7.0 adds focused coverage for:

1. Mission definition validation against authored players, trigger areas, waypoints, objectives, and typed vocabulary.
2. Circle, rotated-rectangle, and polygon trigger membership.
3. Deterministic ENTERED / INSIDE / EXITED transitions.
4. Objective activation/completion from authored trigger entry.
5. Mission victory after an authoritative world-state condition.
6. `FROM_SCRIPT` MOVE orders travelling through the normal CommandBus.
7. Mission flags, counters, timers, script state, and directional relation actions.
8. Snapshot v17 exact mission/trigger-state restore and continued deterministic simulation.
9. Legacy v16 non-mission snapshot restore without false trigger-entry events.
10. Map-manifest rejection of duplicate/malformed trigger areas.
11. Browser preservation of the normal construction field test plus opt-in `MISSION` validation mode.

## Snapshot compatibility

- Current snapshot version: **17**.
- Snapshot v17 adds trigger-area occupancy and MissionSystem runtime state.
- Existing v8-v16 snapshots remain accepted.
- Restoring a v17 mission snapshot requires the same mission definition id; mission source data remains an external versioned asset.

## Preservation checks against v0.6.6.10

- `/assets`: **byte-for-byte unchanged**.
- `/maps`: **byte-for-byte unchanged**.
- Existing engine changes are restricted to:
  - `engine/sim/simulation.js`
  - `engine/maps/map-manifest.js`
  - new `engine/missions/` subsystem
- Existing production, construction, combat, projectile, locomotion, local avoidance, economy, resource, AI, Team, player-relation, interaction, and pathfinding source files are unchanged.
- v0.6.6.10 five-slot mobile queue behavior remains covered by the full regression suite.
- v0.6.6.9 rollout/deadlock recovery remains covered by the full regression suite.

## Browser validation scenario

The normal root page remains the build-from-foundation field test. The new `MISSION` button opens `?mission=first_contact`, which loads the unchanged Training Ground plus `missions/first_contact_validation.json`.

Validation chain:

1. Move an Aegis unit into `center_zone`.
2. `reach_center` completes and `destroy_enemy_tank` activates.
3. Destroy `e_tank`.
4. Second objective completes and the mission outcome becomes `VICTORY`.

The mission mode is deliberately small. It proves the new scripting architecture without mixing in reinforcement spawning, cinematics, fog/radar, bridges, upgrades, or WorldForge changes.

## Released-source reference audit

The implementation follows the architectural separation visible in the released Generals/Zero Hour source: GameLogic instantiates separate script actions, script conditions, and script engine subsystems; `Script` carries enabled/one-shot/condition/action and snapshot semantics; object state contains trigger-entry/exit housekeeping. ForgeRTS implements those ideas as original browser-native JavaScript around its existing deterministic CommandBus and snapshot architecture.
