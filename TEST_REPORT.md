# ForgeRTS v0.5.3 Test Report

## Release target

**ForgeRTS v0.5.3 — Client Animation Foundation**

This release builds on the validated v0.5.2 tactical-command/resource-readability slice and adds a generic, data-driven client-animation layer before strategic enemy AI. Simulation state remains authoritative; animation is presentation-only.

## Automated suite

- Client-animation binding audit validates every configured embedded clip, exact pivot, prefix, generated pivot parent, driver, and axis against the production GLBs.
- Runtime-source regression check forbids concrete ForgeRTS object-name branching inside the generic animation subsystem.

Command: `npm test`

Result: **66/66 tests passing**.

New v0.5.3 animation coverage verifies:

- all configured authored clip names, mechanical nodes, node prefixes, pivots, axes, and generic drivers resolve against the real production GLBs
- the complete GLB inventory contains embedded animation clips only where the audit says it does: Rifleman (`CombatWalk`, `AimFire`) and reference-only legacy BTR (`Btr anima`)
- the generic animation runtime contains no branches on concrete ForgeRTS unit/building IDs
- production GLB bytes remain unchanged

The existing v0.5.2 tactical-command/resource coverage still verifies:

- simulation-authoritative ownership rejects a player order against an enemy unit while an appropriately issued AI order remains valid
- appended MOVE commands persist as a deterministic/serializable waypoint-like queue
- Attack Move acquires/destroys a hostile and then resumes to its terminal destination
- Guard Position persists and engages hostiles inside data-defined guard behavior
- idle GUARD stance auto-acquires hostiles through `UnitAIUpdate` definition policy
- combat CommandSet data exposes Attack Move / Guard / queue / stance controls
- resource definitions expose renderer-only multi-cluster/glow presentation data
- `construction_validation` and `training_ground` have distinct stable IDs
- completed interaction history can be pruned without deleting active sessions
- player `resourcesHarvested` accounting advances from real finite-resource harvesting
- snapshot v9 remains deterministic across construction/economy/production/combat state
- v8 tactical AI state without the new queue/stance fields is normalized safely before new appended orders

All prior movement, steering/reverse, combat, armor, projectile, docking, economy, production, construction, placement, gesture, terrain, module, interaction, and mobile vertical-slice regression tests remain passing.

## Static validation

- **40** JavaScript / MJS files pass `node --check`.
- **47** JSON files parse successfully.
- `ASSET_HASHES.sha256` passes for every listed production GLB and terrain texture.
- Production GLBs were not modified.
- Snapshot schema is **v9**; restore accepts v8 or v9.

## Browser smoke-test limitation

A localhost static server is available in the execution environment, but the page imports Three.js from jsDelivr and the environment cannot resolve external DNS. A headless Chromium visual/runtime smoke test therefore cannot load the external Three.js module here. No claim of browser-render verification is based on that unavailable dependency; the release is validated by the automated simulation/source/static checks and should receive the normal real iPhone/GitHub Pages visual check.

## Manual iPhone focus

1. Confirm rich/dense mineral deposits read as obvious multi-cluster glowing fields from normal RTS camera height.
2. Harvest a field and confirm visual clusters reduce as the authoritative resource depletes and credits still arrive through the Refinery.
3. Use BOX to select several combat units; test additive selection.
4. Issue Attack Move through hostile territory and confirm engagement followed by resumed movement.
5. Issue Guard to terrain and to a friendly object; confirm the unit protects/returns to the guard area.
6. Toggle QUEUE and issue several movement/tactical destinations; confirm they execute in order.
7. Cycle stance and verify idle GUARD auto-acquisition while HOLD POSITION does not chase outside its intended policy.
8. Pan away from map origin and pinch/zoom; confirm zoom stays around the current camera focus.
9. Re-run the existing Command Post → Power → Refinery → harvest → Barracks → Rifleman → Vehicle Factory → vehicle → Guardian Turret chain.
10. Confirm client animation presentation:
   - Rifleman feet/body cycle while walking and `AimFire` plays on shots.
   - HMMWV wheels spin and front wheels steer without affecting pathing.
   - Aegis-X road gear turns with travel.
   - Harvester wheels/steering move normally and collector drum/arms animate only while harvesting.
   - Power/Refinery/Barracks/Vehicle Factory/Command Post fans or radar animate only when operational.
   - Talon main/tail rotors animate when that unit is spawned/integrated.
