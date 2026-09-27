# ForgeRTS v0.3.0 — Combat Core

ForgeRTS is a clean, separate browser-native RTS engine. It does **not** modify the existing WorldForge / Skirmish project.

v0.3.0 is the first combat milestone. The implementation follows the same broad separation we have been studying in Command & Conquer: Generals / Zero Hour: ATTACK is persistent UnitAI intent, weapons are data-driven templates with runtime reload state, armor adjusts incoming damage, projectiles are simulation objects, and turret facing is independent from hull locomotion. The implementation is original ForgeRTS JavaScript; no EA game assets or copied EA source are included.

## Player-facing changes

- select a green friendly combat unit, then tap a red hostile to issue **ATTACK**
- Aegis-X and HMMWV turrets rotate independently from their moving hulls
- Riflemen stop and turn their bodies to aim
- Guardian Turrets automatically acquire hostile ground targets in range
- rifle/HMMWV fire uses hitscan/tracer delivery
- Aegis-X and Guardian Turret cannon fire uses deterministic projectile objects
- targets take armor-adjusted damage, transition through damage states, and become non-selectable wrecks at zero HP
- selected-unit HUD health updates continuously

## Data-driven combat foundation

New content families:

- `data/weapons/` — damage type, range, minimum range, cadence, prefire, clip/reload, delivery type, aim tolerance, targeting masks, projectile parameters
- `data/armors/` — damage-type multipliers for infantry, light vehicles, heavy tanks, industrial vehicles, aircraft, structures, heavy structures, and fortified targets
- `WeaponSet`, `ArmorSet`, `TurretAI`, and `BodyAim` GameObject modules

Initial weapon set:

- Rifleman Service Rifle — SMALL_ARMS / hitscan
- HMMWV-50 .50 Cal — HEAVY_MACHINE_GUN / hitscan
- Aegis-X 120mm — CANNON / projectile
- Guardian Twin Cannon — CANNON / projectile

The initial balance intentionally relies on armor coefficients rather than inflated HP. Rifle fire is dangerous to infantry, reduced against light vehicles, and nearly irrelevant against heavy tank armor. The 120mm cannon is a heavy anti-vehicle weapon.

## Simulation architecture

The combat chain is now:

`ATTACK command → UnitAI persistent target → attack approach position → independent turret/body aim → weapon runtime → hitscan/projectile delivery → armor adjustment → Body health/damage state → destruction`

Weapons support primary/secondary/tertiary-style slot data even though the current units use only a primary slot. Weapon selection already estimates armor-adjusted damage so later multi-weapon units can choose sensibly without unit-name branching.

Snapshot format is now **v5** and preserves weapon runtime, turret state, damage state, explicit attack intent, and in-flight projectile state.

## What remains intentionally deferred

- full line-of-fire collision masks and terrain/building occlusion
- splash/radius damage
- secondary/tertiary weapon switching in production content
- anti-air targeting and Talon weapons
- reactive unit auto-acquisition/guard behavior beyond Guardian Turrets
- economy, harvesting, production queues, strategic enemy AI, fog/radar, veterancy, upgrades

Those systems now have a combat substrate to build on instead of requiring bespoke unit logic.

## Validation focus

1. Select Aegis-X, HMMWV, or Rifleman and tap a red hostile.
2. Confirm the unit approaches only until it reaches weapon range rather than moving onto the target.
3. Watch Aegis-X/HMMWV turret orientation independently from the hull.
4. Approach an enemy Guardian Turret and confirm it automatically defends its base.
5. Destroy a target and confirm it stops acting/selecting while remaining visually as a darkened wreck.

## Run

Serve the folder from any static HTTP server or deploy directly to GitHub Pages. `index.html` is at the project root.
