# ForgeRTS v0.2.1 — GameObject Modules + Interaction Core

ForgeRTS is a clean, separate browser-native RTS engine. It does **not** modify the existing WorldForge / Skirmish project.

This milestone changes the foundation before combat is added. ForgeRTS now deliberately combines three C&C reference strengths: original Red Alert for explicit interaction/state-machine behavior, Generals/Zero Hour for simulation and RTS architecture, and Red Alert 3-style schemas for data-driven GameObject composition. v0.2.1 remains an original JavaScript implementation; no EA art/assets or copied EA source are included.

## v0.2.1 scope

- converted every production unit, building, and resource definition to explicit data-driven GameObject modules
- added generic GameObject factory/runtime composition; engine code no longer depends on top-level `asset`, `maxHealth`, `locomotor`, or `footprint` fields in production definitions
- module families now include `Body`, `Selectable`, `UnitAIUpdate`, `Locomotor`, `Vision`, `Render`, `Footprint`, `Resource`, `Production`, `ResourceCollector`, `DockingProvider`, and `InteractionEndpoint`
- added deterministic, serializable object-to-object Interaction Protocol runtime
- added a Red-Alert-style resource docking handshake definition: request → grant → approach → dock → unload → release → exit → complete
- added a factory rollout protocol definition: spawn → exit grant → controlled exit → clear building → rally → complete
- added touch GestureResolver that classifies TAP / LONG_PRESS / PAN / PINCH before gameplay commands are emitted
- added persistent strategic region state: ownership, threat, resource value, AI activity, discovery
- simulation snapshot format advanced to v3 and now includes GameObject module state, interaction sessions, and region state
- expanded the parity matrix to track Red Alert + Generals/ZH + RA3 data-model lessons together
- preserved the v0.2.0 deterministic UnitAI / locomotor / pathfinder / terrain / roads / river foundation
- all 16 current production GLBs remain byte-for-byte unchanged

## Why this comes before combat

Weapons, production, harvesting, repair, containment, aircraft service, upgrades, veterancy, and AI all need composable behaviors. Locking the GameObject/module and interaction architecture now prevents ForgeRTS from becoming a collection of tank/refinery/factory special cases later.

## Current validation focus

Test repeated MOVE orders and mobile camera gestures as before. The visible game should behave essentially like v0.2.0; most of this milestone is architectural. In particular, taps should only fire after a gesture is classified, while deliberate drags and pinches remain camera gestures.

The docking and rollout protocols are engine/data foundations in v0.2.1; they are covered by automated tests but are not yet wired into harvesting/production gameplay. That will happen when those systems are implemented.

## Next milestone

The next recommended milestone is **ForgeRTS v0.3.0 — Weapons / Armor / Damage Core**: explicit ATTACK commands, target state, WeaponSet data, weapon selection, range/facing/reload, projectile or hitscan execution, damage types versus ArmorSet data, health/death state, and sensible unit/building durability.

## Run

Serve the folder from any static HTTP server or deploy directly to GitHub Pages. `index.html` is at the project root.
