# ForgeRTS v0.4.0 Validation Report

## Automated tests

`npm test` passes **40/40** tests.

New economy / production coverage includes:

- faction starts with deterministic credits and a data-driven power budget
- power production/consumption is recalculated from live GameObject modules
- Harvester mines a finite mineral field into a bounded cargo hold
- Harvester uses the explicit resource-docking interaction protocol
- unloading deposits credits into faction state and returns/resumes harvesting
- resource capacity depletes deterministically
- Vehicle Factory charges credits at queue time and produces a data-defined HMMWV
- completed vehicles use the rollout/clear/rally protocol
- Barracks uses the same generic production runtime for Riflemen
- cancellation refunds queued production cost
- snapshot v7 restores dynamically produced entities, queues, Harvester cargo, resource capacity, faction economy, interaction state, combat, and locomotion state

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
- wheeled turn-around / three-point maneuver state
- persistent MOVE / STOP
- building-aware path clearance
- real-map repeated movement
- TAP / PAN / LONG_PRESS / PINCH classification
- GameObject module validation
- MapManifest v2 terrain/passability/region foundations

## Syntax / data validation

All project JavaScript and MJS sources pass `node --check`. All JSON data files parse successfully.

## Asset integrity

`sha256sum -c ASSET_HASHES.sha256` passes. All **16 production GLBs** remain byte-for-byte unchanged from v0.3.1. Existing terrain textures are unchanged.

## Economy implementation notes

- CommandBus now carries `HARVEST`, `RETURN_CARGO`, `PRODUCE`, and `CANCEL_PRODUCTION`.
- ResourceSystem owns collector state and uses InteractionManager for refinery docking.
- FactionEconomySystem owns credits/power and exposes the current low-power production policy.
- ProductionSystem is generic across infantry and vehicles and uses data-defined queue types, costs, build times, and rollout protocols.
- map resource fields are simulation GameObjects with persistent capacity; rendering only reflects their state.
- snapshot format is **v7**.

## Intentionally deferred

Full construction/dozer logic, strategic enemy harvesting/production decisions, team AI, mission scripting, repair/rearm service, tech prerequisites/upgrades, selling, advanced multi-bay docking, and open-world regional simulation remain deferred.
