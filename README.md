# ForgeRTS v0.5.1 — Construction Validation + Mobile Command UI

ForgeRTS is a separate browser-native RTS engine. WorldForge / Skirmish remains untouched and serves only as the older asset/reference project.

v0.5.1 is deliberately a **validation build**, not another large engine layer. v0.5.0 already added the C&C-style CommandSet, tech-tree, placement, construction, economy, production, combat, and locomotion foundations. This update makes those systems easy to prove end-to-end on a phone before enemy AI is added.

## What changed

The browser now loads a dedicated `construction_validation.json` scenario instead of the fully prebuilt regression map.

The player starts with only:

- Tactical Command Post
- Aegis-X
- HMMWV-50
- Field Harvester
- **$8,500**

There is **no prebuilt Power Node, Refinery, Barracks, Vehicle Factory, Guardian Turret, or Rifleman** on the player side. The enemy side remains populated as a combat target/reference.

The intended playable chain is therefore real:

`Command Post → Power Node → Refinery → harvest crystals → Barracks → Rifleman → Vehicle Factory → produced vehicle → Guardian Turret`

## Mobile command / placement UI

- The Command Post is selected and centered automatically on load.
- A persistent **FIELD TEST** objective walks through the build/economy/production chain.
- The selected object's contextual actions now live in an explicit bottom **command dock**.
- Selecting the Command Post shows the full build list immediately.
- Locked structures stay visible and show the exact prerequisite / affordability reason rather than disappearing.
- Placement mode has a dedicated banner showing:
  - structure being placed
  - `VALID · TAP TERRAIN TO CONFIRM`
  - or the specific rejection reason, such as outside build radius, object overlap, resource field, water, or terrain slope.
- `ROTATE 90°` and `CANCEL BUILD` remain available during placement.
- Selecting a construction site shows construction progress and the cancellation refund.
- Completed Barracks / Vehicle Factory immediately expose their existing production CommandSets.
- Harvester selection explains the crystal-field interaction and refinery requirement.

## Field-test sequence

1. The Command Post should already be selected. Tap **POWER NODE**.
2. Move the translucent ghost around. Confirm that valid areas read **VALID** and blocked/illegal areas show a reason.
3. Place and finish the Power Node.
4. Return to the Command Post and build a **REFINERY**.
5. Select the Harvester and tap a crystal field. Cargo should begin increasing; with a working Refinery it can return/unload into faction credits.
6. Build a **BARRACKS**, select it after completion, and train a Rifleman.
7. Build a **VEHICLE FACTORY**, select it, and produce HMMWV / Harvester / Aegis-X.
8. Build a **GUARDIAN TURRET**.
9. The FIELD TEST banner should report the construction/economy/production chain complete.

Useful negative tests:

- try placing beyond the Command Post build radius
- try placing over another structure
- try placing on/near a crystal field
- try steep/water/blocked terrain
- rotate before placement
- cancel a half-built structure and confirm the refund / footprint removal
- select a locked structure command before its prerequisite exists and confirm its requirement remains visible

## Architecture preserved

v0.5.1 does **not** replace the v0.5.0 construction architecture. It validates it.

- `CommandSet` — data-defined contextual actions
- `TechTreeSystem` — builder permission, prerequisites, limits, affordability
- `PlacementValidator` — authoritative placement legality
- `ConstructionSystem` — real construction-site objects, progress, cancel/refund, module activation
- `FactionEconomySystem` — credits / power
- `ResourceSystem` — finite crystals + Harvester docking loop
- `ProductionSystem` — generic Barracks / Factory queues and rollout
- `CombatSystem` — weapons, armor, projectiles, turret behavior
- `UnitAIUpdate` + locomotor system — persistent movement and vehicle steering

The old `training_ground.json` remains in the package as the complete prebuilt regression scenario used by the automated tests. The playable page uses `construction_validation.json` so the player actually has to build the base.

## Snapshot format

Snapshot format remains **v8** because v0.5.1 changes the playable scenario and client validation UI rather than simulation-state structure.

## Validation

The release test suite now covers the dedicated field-test scenario in addition to all previous regression coverage. It verifies that the map starts without player tech structures, prerequisites unlock only after real construction, and the same scenario can build Power → Refinery → Barracks, begin harvesting, and train a Rifleman end-to-end.

## Run

Serve the folder with any static HTTP server or deploy it directly to GitHub Pages. `index.html` is at the ZIP root.
