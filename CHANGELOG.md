# Changelog

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
