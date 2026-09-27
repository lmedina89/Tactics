# ForgeRTS v0.5.0 Validation Report

## Automated tests

`npm test` passes **49/49** tests.

New construction / tech-tree coverage includes:

- CommandSet data exposes HQ construction and existing Barracks/Vehicle Factory production through generic commands
- authoritative placement accepts clear terrain and rejects occupied footprints / out-of-radius locations
- construction deducts credits and creates a real non-operational site
- under-construction power and production modules remain inactive
- completed Power Node activates its power module
- cancellation removes the runtime pathfinding footprint and returns the configured partial refund
- operational prerequisites can lock construction when a prerequisite structure is lost
- damage taken during construction remains damage after completion rather than being healed away
- destroyed construction sites never activate completed-building modules
- snapshot **v8** restores active construction and continues deterministically

Economy / production coverage remains intact for:

- faction credits and data-driven power budget
- finite mineral harvesting
- explicit Refinery docking/unloading protocol
- credit income and resource depletion
- Barracks and Vehicle Factory production
- queue-time costs and cancellation refunds
- controlled rollout / rally behavior
- dynamically produced entity snapshot restore

Combat regression coverage remains intact for:

- armor/weapon relationships
- persistent ATTACK approach behavior
- independent Aegis-X turret aiming and projectile fire
- HMMWV hitscan vs infantry
- autonomous Guardian Turret acquisition
- destruction and projectile snapshot determinism

Locomotion/input/map regression coverage remains intact for:

- tracked pivot behavior
- bounded short reverse and long-route forward preference
- wheeled three-point turnaround state
- persistent MOVE / STOP
- dynamic building-aware path clearance
- real-map repeated movement
- TAP / PAN / LONG_PRESS / PINCH classification
- GameObject module validation
- MapManifest v2 terrain/passability/region foundations

## Syntax / data validation

All JavaScript and MJS files pass `node --check`. All JSON files parse successfully. The browser `DataRegistry` was also loaded under a file-backed test `fetch` implementation and successfully validated all definitions and **4 CommandSets**.

## Asset integrity

`sha256sum -c ASSET_HASHES.sha256` passes. All **16 production GLBs** remain byte-for-byte unchanged. Existing terrain textures remain unchanged.

## Construction implementation notes

- CommandBus now carries `BUILD_STRUCTURE` and `CANCEL_CONSTRUCTION` in addition to the previous movement/combat/economy/production commands.
- `TechTreeSystem` owns builder permission, prerequisites, build limits, and affordability.
- `PlacementValidator` is the authoritative placement rule owner; the renderer ghost is prediction/presentation only.
- `ConstructionSystem` owns construction-site progress, health growth, cancellation/refund, source builder linkage, and completion.
- under-construction objects exist as real GameObjects and reserve their footprint immediately.
- runtime building obstacles are registered dynamically in `GridPathfinder`, allowing construction cancellation to remove occupancy cleanly.
- `operational === false` gates power, production, Refinery docking, and autonomous weapon use until completion.
- snapshot format is **v8**.

## Intentionally deferred

A dedicated mobile builder/dozer asset, assisted construction, repair/rearm, structure selling, advanced projected buildability/base expansion, upgrades/sciences, enemy base-building AI, teams, and mission scripting remain deferred.
