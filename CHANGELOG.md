# Changelog

## v0.5.2 — Tactical Commands + Resource Readability

- Added data-driven `ResourceFieldVisual` presentation: each logical mineral deposit can render deterministic multi-cluster copies of the existing GLB with definition-controlled radius, scale variation, crystal-material matching, emissive strength, glow color, and ground glow.
- Resource-field depletion now progressively removes/fades visual clusters while the authoritative simulation remains one finite Resource GameObject; production GLBs are unchanged.
- Added brief HARVEST target feedback for resource-field taps.
- Added data-driven combat CommandSet with `ATTACK_MOVE`, `GUARD`, queued-order toggle, and stance cycling.
- Added multi-unit selection, drag/box selection, additive selection, and group order issuing in the client layer.
- Expanded `UnitAIUpdate` with persistent `ATTACK_MOVE`, `GUARD_POSITION`, `GUARD_OBJECT`, serializable appended order queues, GUARD/AGGRESSIVE/HOLD_POSITION stance state, and data-defined idle auto-acquisition/scan/leash/return policy.
- Added command-source/issuer metadata (`FROM_PLAYER`, `FROM_SCRIPT`, `FROM_AI`, `FROM_SYSTEM`) and authoritative simulation ownership checks; the UI now consumes command results instead of assuming acceptance.
- Friendly-unit separation now revalidates candidate positions against pathfinding walkability.
- Interaction cleanup now bounds completed-session history while retaining active sessions; docking provider capacity is respected.
- Production rollout adds same-producer exit reservation through a `WAITING_EXIT` state instead of spawning another unit into an occupied rollout.
- Player resource-harvest totals are explicit simulation state, preventing field-test progress from depending on future enemy depletion.
- Fixed duplicate validation-map ID and made camera zoom operate around maintained camera focus rather than world origin.
- Snapshot format advanced to **v9** for tactical AI/order state and harvest accounting, with v8 restore compatibility.
- Added regression coverage for authority rejection, queued orders, Attack Move resume, Guard engagement, idle stance auto-acquisition, v8 AI-state normalization, resource-visual definitions/map identity, interaction-history pruning, and player harvest accounting.
- Full suite: **62/62 tests passing**.

## v0.5.1 — Construction Validation + Mobile Command UI

- Added a dedicated `construction_validation.json` playable scenario while preserving the full `training_ground.json` regression map.
- Player now begins with only Command Post, Aegis-X, HMMWV-50, Harvester, and $8,500; all player tech structures must be constructed through the real v0.5.0 systems.
- Added an 8-step FIELD TEST objective sequence covering power, refinery, harvesting, Barracks, infantry production, Vehicle Factory, vehicle production, and Guardian Turret.
- Command Post is auto-selected and camera-centered at startup so the construction flow is immediately discoverable on mobile.
- Reworked contextual controls into an explicit mobile command dock with BUILD / PRODUCTION / HARVESTER / CONSTRUCTION headings and concise interaction hints.
- Locked build commands remain visible and report missing prerequisites / funds / limits.
- Added a dedicated placement banner with live VALID / invalid-reason feedback while the world-space building ghost moves.
- Placement preview changes now notify the UI continuously instead of only when entering/leaving placement mode.
- Added `InputController.selectById()` for deterministic initial UI selection without synthesizing touch input.
- Snapshot format remains v8; no new simulation-state schema was required.
- Added dedicated vertical-slice regression coverage, including an end-to-end Power → Refinery → harvest → Barracks → Rifleman sequence.
- Full suite: **53/53 tests passing**.
- Production GLBs and terrain textures remain unchanged.

## v0.5.0 — Base Construction + Tech Tree + Command Sets

- Added data-driven `CommandSet` registry and selected-object command rendering for construction, production, cargo return, and queue cancellation.
- Added serializable `BUILD_STRUCTURE` and `CANCEL_CONSTRUCTION` CommandBus commands.
- Added `TechTreeSystem` for builder permission, operational prerequisites, build limits, and affordability.
- Added `PlacementValidator` with authoritative builder-radius, map-bounds, water, slope, height-variation, blocked-terrain, building-footprint, and resource-blocker checks.
- Added translucent valid/invalid placement ghost, 90° rotation, and build-placement cancellation on mobile/desktop input.
- Added `ConstructionSystem` with real selectable/damageable construction-site GameObjects, deterministic progress, partial refund, completion state, and operational module activation.
- Added data-defined construction costs/times/prerequisites/build limits/refund fractions and construction sockets for Power Node, Refinery, Barracks, Vehicle Factory, and Guardian Turret.
- Added a generic `Builder` module to the Tactical Command Post using construction-yard style placement; mobile-builder socket approach logic is scaffolded for a future dedicated builder unit.
- Under-construction Power/Production/Docking/Weapon systems are gated until completion.
- Construction health grows with progress while preserving combat damage; destroyed sites never activate.
- Pathfinder building occupancy is now dynamic: runtime structures register footprint obstacles and cancelled sites remove them without rebuilding authored map data.
- Added resource placement blockers so mineral fields reject structure overlap without becoming movement obstacles.
- Snapshot format advanced to **v8**, preserving construction/operational state and the new construction-system serial state in addition to prior economy/combat/locomotion data.
- Added construction regression coverage for CommandSets, valid/invalid placement, credit reservation, module gating, cancellation/refunds, prerequisites, damage preservation, destroyed sites, and v8 deterministic restore.
- Full automated suite now passes **49/49** tests.
- All production GLBs remain byte-for-byte unchanged.

## v0.4.0 — Faction Economy + Production + Docking

- Added deterministic `FactionEconomySystem` with credits, data-driven power production/consumption, low-power state, deposits, withdrawals, and production-rate effects.
- Added serializable `HARVEST`, `RETURN_CARGO`, `PRODUCE`, and `CANCEL_PRODUCTION` commands to the shared CommandBus.
- Added `ResourceSystem` with finite resource depletion, Harvester cargo, explicit resource-target orders, automatic return-to-refinery behavior, and resume-after-unload behavior.
- Wired the existing `resource_docking` interaction protocol into real runtime docking: request, grant, approach, dock, unload, release, exit, complete.
- Added generic `ProductionSystem` for Barracks and Vehicle Factory queues, queue-time credit costs, cancellation refunds, build progress, low-power slowdown, deterministic dynamic entity creation, and rollout/rally behavior.
- Wired vehicle and infantry rollout protocols into production runtime rather than spawning units directly into normal movement.
- Added data-driven `ProductionCost`, `Production`, `PowerProducer`, `PowerConsumer`, `ResourceCollector`, `DockingProvider`, and `Resource` module usage.
- Added player Power Node, Refinery, Barracks, Harvester, and Rich/Dense mineral fields to the training map; mirrored economy structures for the enemy faction as passive test content.
- Added context-sensitive mobile/desktop production controls and Harvester `RETURN CARGO` control.
- Resource GLBs now scale down visually as their simulation capacity depletes.
- Snapshot format advanced to **v7**, preserving faction economy, collector state, resource depletion, production queues, active rollouts, dynamically produced entities, interactions, combat, and locomotion state.
- Added economy/production regression tests for harvesting/docking/unloading, finite depletion, vehicle production, infantry production, cancellation refunds, rollout protocols, power state, and v7 snapshot restore.
- Preserved v0.3.1 locomotion/turn-around behavior and v0.3.0 combat architecture.
- All production GLBs remain byte-for-byte unchanged.

## v0.3.1 — Reverse / Turnaround + Combat Approach Stability

- Reworked reverse selection to consider the persistent terminal destination, not only the next short path waypoint.
- Added bounded short-reverse behavior for nearby behind-the-hull destinations.
- Added deterministic wheeled turn-around states: `THREE_POINT_REVERSE` and `THREE_POINT_FORWARD`.
- Added data-driven maximum reverse distance, forward-preference distance, reverse entry/exit angles, three-point reverse distance/speed/steer limits, timeout, and reverse re-entry cooldown.
- Tracked vehicles now reserve reverse for short tactical destinations and pivot toward long behind-orders.
- UnitAI stuck/repath detection now recognizes deliberate three-point maneuvers and does not discard their route while they temporarily move away from the terminal destination.
- Added ATTACK range hysteresis so already-engaged units hold firing position across small target-distance changes instead of oscillating between approach and firing.
- Added locomotor maneuver state to deterministic entity state and snapshot format v6.
- Added debug HUD visibility for non-forward maneuver modes.
- Expanded locomotor tests for short reverse, long-route turn-around, tracked long-route forward preference, and bounded reverse travel.
- Preserved all v0.3.0 combat architecture and all production GLBs unchanged.

## v0.3.0 — Combat Core

- Added serializable `ATTACK` CommandBus command and persistent UnitAI attack intent.
- Added target approach routing that moves units to a valid firing position instead of treating ATTACK as MOVE-to-target.
- Added generic `WeaponSet` runtime with slot, prefire, cadence, clip, and reload state.
- Added four initial data-defined weapons: Rifleman rifle, HMMWV .50 cal, Aegis-X 120mm cannon, Guardian twin cannon.
- Added data-driven ArmorSet definitions and damage-type multipliers.
- Added hitscan and deterministic projectile delivery paths.
- Added independent `TurretAI` world-facing state for Aegis-X, HMMWV, and Guardian Turret; Rifleman uses body aiming.
- Added autonomous Guardian Turret hostile acquisition.
- Added Body damage states and destruction behavior; destroyed units are non-selectable and retain darkened wreck visuals.
- Added projectile and tracer rendering without giving rendering ownership of gameplay damage.
- Added hostile tap resolution and red ATTACK feedback ring on mobile/desktop input.
- Snapshot format advanced to v5 and includes combat, weapon, turret, damage, and projectile state.
- DataRegistry now validates references from GameObject definitions to assets, locomotors, interactions, weapons, and armors.
- Added combat regression tests covering armor relationships, ATTACK persistence, tank projectile combat, HMMWV hitscan, autonomous Guardian Turret fire, destruction, and snapshot determinism.
- Preserved all v0.2.2 locomotion/facing, GameObject modules, interaction protocols, map/terrain, and persistent-world foundations.
- All production GLBs remain byte-for-byte unchanged.

## v0.2.2 — Locomotor Facing + Vehicle Steering

- Corrected Aegis-X and HMMWV Render heading offsets to match their authored `+X` forward axes; corrected Harvester to its authored `+Z` forward axis.
- Split locomotion behavior into explicit tread, wheel, leg, and air paths.
- Added tracked pivot-turn behavior with separate moving/pivot turn rates and backward movement state.
- Added wheel steering based on steering angle, wheelbase, curvature, speed reduction on hard turns, and correct reverse steering.
- Added `wheeled_heavy` locomotor profile for the Field Harvester.
- Runtime/snapshot state now persists angular speed, steering angle, and reverse state. Snapshot format advanced to v4.
- Added locomotor-facing tests for track pivoting, wheeled arcs, reverse behavior, and asset heading calibration.
- Preserved all v0.2.1 module, interaction, input, strategic-region, terrain, navigation, and persistent-order foundations.
- All production GLBs remain byte-for-byte unchanged.

## v0.2.1 — GameObject Modules + Interaction Core

- Migrated all production object definitions to explicit composable GameObject modules.
- Added `engine/entities/game-object.js` for generic module parsing, validation, runtime creation, rendering/footprint lookup, and transitional v0.2 compatibility.
- Added serializable `InteractionManager` with role-checked, data-defined state transitions.
- Added `resource_docking` and `factory_rollout` interaction protocols.
- Added `GestureResolver` so TAP / LONG_PRESS / PAN / PINCH are classified before gameplay commands are emitted.
- Added persistent region strategic state: owner, threat, resource value, AI activity, discovered-by factions/players.
- Snapshot format advanced to v3 and includes runtime module state, interaction sessions, and region state.
- Renderer now obtains model asset/scale/heading from the Render module rather than unit-specific top-level fields.
- Navigation obtains structure footprints through the Footprint module.
- Expanded the C&C parity matrix to combine Red Alert, Generals/Zero Hour, and RA3-style data lessons.
- Preserved all v0.2.0 terrain/map foundations and all existing production GLBs unchanged.

## v0.2.0 — Core Parity + World Foundation

- Added Generals parity matrix and stricter architecture contract.
- Added UnitAIUpdate state layer with persistent MOVE intent, destination correction, blocked state and throttled repathing.
- Pathfinder now evaluates explicit obstacles, per-locomotor clearance, terrain slope and water separately from rendering.
- Locomotors now operate only on UnitAI goals and are data-driven for legs, wheels, treads and rotary air.
- Added versioned snapshot/restore state.
- Replaced hard-coded registry file lists with `data/registry.json`.
- Upgraded training map to MapManifest v2 with future-region metadata, terrain materials, roads, river, passability, waypoints, trigger areas, resources, AI anchors and environment.
- Added real heightfield rendering with grass/dirt/rock splat textures and slope-driven cliff weighting.
- Added terrain-conforming road surfaces/shoulders and continuous river rendering/carving.
- Added definitions for the existing Harvester, Talon, resource GLBs and additional WorldForge structures.
- Preserved all existing production GLBs unchanged.
