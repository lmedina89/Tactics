# ForgeRTS v0.1.0 — Deterministic Core

ForgeRTS is a clean, separate browser-native RTS engine. It does **not** modify the existing WorldForge / Skirmish project.

The architecture is intentionally modeled around proven classic RTS boundaries: deterministic simulation, data-driven definitions, serializable commands, persistent orders, pathfinding separated from locomotion, player/faction state, and renderer/UI adapters. v0.1.0 is an original JavaScript implementation; no EA art/assets are included and no EA source code is copied into this milestone.

The project is intentionally licensed GPL-3.0-or-later so future selective ports from compatible GPL source can be integrated without forcing a later license migration. Any future directly ported code must be explicitly marked with its provenance/notices.

## v0.1.0 scope

- fixed 30 Hz deterministic simulation loop
- stable entity IDs from the map manifest
- seeded deterministic RNG service with serializable state
- building footprints folded into the static navigation layer before pathfinding
- JSON asset, faction, unit, building, and locomotor definitions
- serializable `MOVE` and `STOP` command bus
- persistent MOVE destinations
- static-grid A* pathfinding with nearest-walkable destination correction
- separate infantry / wheeled / tracked locomotor tuning
- friendly local separation
- Three.js renderer as a view of simulation state only
- touch/mouse selection, terrain move orders, free drag camera, pinch zoom
- two factions using runtime material tinting
- current approved WorldForge GLB library copied into the new project byte-for-byte

## Asset pipeline

WorldForge remains the content/asset laboratory. ForgeRTS consumes exported GLBs and data manifests. Current asset catalog includes tanks, HMMWV, Harvester, Talon, Rifleman, command structures, refinery, barracks, factory, turret, power structures, and Rich/Dense crystal deposits.

## Next engine milestones

The intended order is: robust path/locomotion validation → weapon/armor/damage core → faction economy/power → production → AI teams/planners → mission trigger/action engine → shroud/radar → upgrades/veterancy → replay/network determinism.

## Run

Serve the folder from any static HTTP server or deploy directly to GitHub Pages. `index.html` is at the project root.
