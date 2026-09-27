# ForgeRTS v0.2.0 — Core Parity + World Foundation

ForgeRTS is a clean, separate browser-native RTS engine. It does **not** modify the existing WorldForge / Skirmish project.

ForgeRTS is being built with Command & Conquer: Generals / Zero Hour as the primary gameplay-architecture reference while keeping the browser platform, renderer, assets, maps, factions, UI, sounds, names, story, balance, and future open-world systems our own. v0.2.0 remains an original JavaScript implementation; no EA art/assets or copied EA source are included in this milestone.

The project is licensed GPL-3.0-or-later so later selective GPL-compatible ports can be integrated without a license migration. Any future directly ported code must be explicitly marked with provenance and notices.

## v0.2.0 scope

- fixed 30 Hz deterministic simulation with stable entity IDs and seeded RNG
- `GENERALS_PARITY.md` as the engineering guardrail for subsystem parity
- serializable `MOVE` and `STOP` commands through a central command bus
- Generals-style `UnitAIUpdate` layer between commands and locomotion
- persistent requested destinations, reachable-destination correction, blocked state, and throttled repathing
- separate data-driven infantry / wheeled / tracked / rotary-air locomotors
- static A* pathfinding using building footprints, per-locomotor clearance, terrain slope, and water passability
- versioned simulation snapshot/restore including pending UnitAI intent
- `MapManifest` v2 with persistent-world region metadata, roads, river/water, passability, waypoints, trigger areas, resources, AI anchors, environment, and future region streaming fields
- heightfield terrain rendering with generated grass/dirt/rock splat weights and slope-driven cliff treatment
- terrain-conforming road surfaces and shoulders
- continuous river carving and water rendering
- registry-driven content loading instead of hard-coded file lists
- all 16 current production GLBs preserved byte-for-byte and registered through the asset catalog

## Architecture direction

WorldForge remains the content and asset-authoring pipeline. ForgeRTS consumes GLBs and map/data manifests. Simulation owns gameplay truth; Three.js is a renderer only. Input, future AI, mission scripts, replays, and networking should all issue the same serializable commands.

Traditional skirmish/campaign maps remain supported, but the map/world model is intentionally designed so missions can later run inside a persistent, streamable open world rather than owning the lifetime of the simulation.

See `ARCHITECTURE.md` and `GENERALS_PARITY.md` before adding a new gameplay subsystem.

## Current validation focus

For v0.2.0, test repeated MOVE orders on the Aegis-X, HMMWV-50, and Rifleman; camera pan/zoom; terrain material balance; road conformity; river continuity; and iPhone Safari GLB performance. Weapons/combat are intentionally not part of this milestone.

## Next milestone

The next planned subsystem is the Generals-style weapon / armor / damage core: weapon definitions and slots, targeting/range/reload state, projectile or hitscan execution, damage types, armor interaction, health/death state, and explicit ATTACK commands.

## Run

Serve the folder from any static HTTP server or deploy directly to GitHub Pages. `index.html` is at the project root.
