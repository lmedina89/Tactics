# Changelog

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
