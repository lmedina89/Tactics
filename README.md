# ForgeRTS v0.2.2 — Locomotor Facing + Vehicle Steering

ForgeRTS is a clean, separate browser-native RTS engine. It does **not** modify the existing WorldForge / Skirmish project.

This milestone finishes the vehicle-facing foundation before combat. The implementation remains data-driven and browser-native while following the same architectural lesson found in Generals/Zero Hour: locomotion owns facing/turning behavior, with separate movement rules for treads, wheels, legs, and air units. No EA art/assets or copied EA source are included.

## v0.2.2 scope

- corrected authored model-forward metadata without modifying any GLB bytes:
  - Aegis-X local forward is `+X`, so Render heading offset is now `-90°`
  - HMMWV-50 local forward is `+X`, so Render heading offset is now `-90°`
  - Field Harvester local forward is `+Z`, so Render heading offset is now `0°`
- refactored locomotion into separate tread, wheel, leg, and air stepping paths
- tracked vehicles now support low-speed/pivot turning, moving turn rate, pivot turn rate, and backward movement while preserving hull orientation
- wheeled vehicles now use steering-angle + wheelbase curvature instead of rotating around their center like a tank
- reversing a wheeled vehicle inverts steering response correctly so the hull remains physically coherent
- added a dedicated `wheeled_heavy` locomotor profile for the Field Harvester
- runtime state now includes `angularSpeed`, `steeringAngle`, and `movingBackward`
- snapshot format advanced to v4 so facing/steering state remains deterministic across save/restore
- added locomotor-facing regression tests covering tread pivoting, wheeled arc steering, reverse behavior, and GLB heading calibration
- retained the v0.2.1 GameObject modules, interaction protocols, gesture resolver, strategic-region state, terrain, roads, river, and persistent UnitAI foundations
- all 16 production GLBs remain byte-for-byte unchanged

## Why this comes before weapons

Facing cannot be cosmetic once combat exists. Hull orientation affects movement, reverse behavior, firing arcs, target approach, formation behavior, and eventually independent turret orientation. Locking simulation-owned vehicle facing now prevents the future Weapon/Attack system from depending on renderer-derived rotation.

## Current validation focus

Select the Aegis-X and HMMWV and give each multiple destinations that require 45°, 90°, and 180° changes in direction. The tank should pivot/turn its hull toward the route. The HMMWV should follow a visible arc rather than spinning in place. Order the HMMWV to a point directly behind it and it should reverse without visually flipping the hull.

The Harvester now has a slower/heavier wheeled profile, but harvesting/production gameplay is still intentionally deferred to the economy milestone.

## Next milestone

Once v0.2.2 is visually validated, the recommended next milestone is **ForgeRTS v0.3.0 — Weapons / Armor / Damage Core**: ATTACK commands, WeaponSet data, target state, range/facing/reload, projectile/hitscan execution, damage types versus ArmorSet data, health/death state, autonomous Guardian Turret behavior, and sensible unit/building durability.

## Run

Serve the folder from any static HTTP server or deploy directly to GitHub Pages. `index.html` is at the project root.
