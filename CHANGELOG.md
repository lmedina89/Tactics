# Changelog

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
