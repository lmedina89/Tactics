# ForgeRTS v0.6.3 — Combat / Projectile Audit

## Why this gate existed

v0.6.2 projectile delivery aimed at a target position captured at fire time and only checked the designated target when the projectile reached that destination. Fast lateral vehicle motion could therefore evade otherwise correctly aimed cannon rounds for implementation reasons rather than weapon/target behavior. The old impact test also used a legacy center radius instead of the v0.5.4 `Geometry` module.

## C&C source lessons applied

The Generals / Zero Hour source keeps weapon firing and intended-victim state in authoritative GameLogic and gives Objects explicit geometry/collision information. C&C content also distinguishes unguided projectile behavior from guided missile AI rather than treating every projectile as the same delivery type. ForgeRTS keeps those boundaries but uses an original fixed-step JS implementation suited to the current engine.

## v0.6.3 implementation

- `engine/geometry/collision-geometry.js` centralizes BOX/CYLINDER/SPHERE collision shapes, aim points and swept segment/entity intersection.
- Projectiles store velocity and designated `targetId`; impact no longer depends on reaching one frozen endpoint.
- `DUMB_PROJECTILE` solves an intercept lead at launch from authoritative target velocity, then flies that trajectory without homing.
- `GUIDED_PROJECTILE` uses the same projectile state but may rotate velocity toward an updated aim point only up to `guidanceTurnRate * dt`.
- Each fixed step performs swept projectile-vs-designated-target collision against real Geometry and compensates for target movement during the same fixed step.
- Projectile radius and impact padding inflate the target geometry in the sweep instead of replacing it with an arbitrary hit circle.
- Damage still occurs only through `CombatSystem` after an authoritative projectile impact event.
- DataRegistry validates projectile policy fields and behavior names.

## Current weapon policy

Aegis-X 120 mm and Guardian cannon use `DUMB_PROJECTILE`, launch lead, designated-target collision and real geometry. Their projectile speeds were raised to match the ForgeRTS world scale well enough that ordinary vehicle motion no longer makes physical cannon fire systematically ineffective. Hitscan weapons remain hitscan. No production asset was changed.

## Deliberately deferred

v0.6.4 closes the ordinary world-obstruction gap: physical shells now choose the earliest eligible intervening hostile unit/building or terrain collision while keeping designated-target collision independent. Ballistic gravity/arcing artillery, penetration/ricochet, splash/area damage, terrain deformation and projectile-interception remain separate combat layers.

## Regression coverage

Tests cover moving lateral HMMWV impact, real BOX Geometry hit/miss, unguided non-homing behavior, bounded guided turning, and deterministic in-flight snapshot/restore.


## v0.6.4 world-collision extension

Projectile definitions now expose data-driven `worldCollision` policy. The fixed-step solver evaluates designated-target collision, eligible intervening GameObject Geometry and terrain, then resolves the earliest deterministic hit. Production buildings now define BOX Geometry with gameplay footprints and explicit heights, so structure interception is a real 3D combat volume rather than the old tiny fallback. See `SKIRMISH_DEFENSE_COMBAT_AUDIT.md`.
