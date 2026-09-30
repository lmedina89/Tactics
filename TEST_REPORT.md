# ForgeRTS v0.7.1 Test Report

## Release focus

Mission guidance + Training Ground resource reachability hotfix built directly on the verified v0.7.0 Mission / Trigger / Objective Foundation.

## Automated validation

- Node test suite: **166/166 passed**
- Content validation: **0 errors / 0 warnings**
- Registered content: **26 definitions / 34 assets / 3 maps**
- Asset audit: **34 assets audited**
- JS/MJS syntax validation: **75/75 passed**
- JSON parse validation: **98/98 passed**
- `/assets`: **0 byte changes** from v0.7.0

## Hotfix regression coverage

v0.7.1 adds focused coverage for:

1. Every authored Training Ground mineral field exposes a deterministic valid harvester approach for both starting harvesters.
2. `dense_w` is pinned to the corrected reachable coordinate `(-58, 98)` rather than the unreachable shelf at `(-58, 102)`.
3. Mission objective marker metadata validates against authored trigger areas.
4. Browser mission mode renders the active trigger-area objective with a visible world marker instead of relying on hidden coordinates.

All v0.7.0 MissionSystem tests remain green, including deterministic trigger occupancy, typed conditions/actions, objectives, FROM_SCRIPT commands, victory, snapshot v17, and legacy snapshot restore.

## Snapshot compatibility

- Current snapshot version remains **17**.
- v0.7.1 does not change mission runtime snapshot semantics.
- Objective marker metadata is source-definition/UI guidance and is carried with objective state, but no new snapshot version is required.

## Preservation checks against v0.7.0

- `/assets`: **byte-for-byte unchanged**.
- Engine changes are limited to:
  - `engine/missions/mission-validator.js` — validates optional objective marker references.
  - `engine/missions/objective-manager.js` — preserves optional objective marker metadata.
- Existing production, construction, combat, projectile, locomotion, local avoidance, economy, resource, AI, Team, player-relation, interaction, pathfinding, trigger evaluation, condition evaluation, action execution, and MissionSystem source files are unchanged.
- `maps/training_ground.json` has one gameplay correction: west dense mineral field `dense_w` moves **4 m south**, from `z=102` to `z=98`, after direct pathfinding audit showed the old point had no valid harvester approach.
- `renderer/three-renderer.js` adds the gold terrain-following mission area outline/beacon.
- `main.js` synchronizes the active objective marker and updates mission guidance text.
- `missions/first_contact_validation.json` now declares the `center_zone` trigger area as the marker for the first objective.

## Browser validation scenario

The normal root page remains the build-from-foundation field test. The `MISSION` button opens `?mission=first_contact` on Training Ground.

Validation chain:

1. Follow the **gold center-zone ring/beacon** and move an Aegis unit into it.
2. `reach_center` completes and `destroy_enemy_tank` activates.
3. Destroy `e_tank`.
4. Second objective completes and the mission outcome becomes `VICTORY`.

The mission remains intentionally small. It validates the mission foundation without adding reinforcement spawning, cinematics, fog/radar, bridges, upgrades, or WorldForge dependencies.
