# ForgeRTS v0.5.4 — Movement / Collision Audit

## Why this pass exists

The previous mover separation treated a mobile unit primarily as a small circle based on its locomotor radius, then pushed overlapping friendly units apart after movement. That was adequate as an early safety net but visibly failed for long vehicles: two tanks/Harvesters could occupy intersecting hull space even when their center circles were only beginning to touch.

The v0.5.4 correction separates **physical object geometry** from **movement behavior** and adds predictive traffic handling before contact.

## Production-asset measurements and chosen simulation geometry

The GLB measurements below were used only to choose data values. Runtime simulation does not query Three.js/GLB bounds.

| Object | Relevant authored size (approx.) | v0.5.4 Geometry | Notes |
|---|---:|---|---|
| Aegis-X MBT | hull ~7.85 long × 3.24 body-wide; ~3.96 incl. skirts | BOX major 3.95 / minor 2.00 | gun barrel is excluded from physical hull length |
| HMMWV-50 | ~5.14 long × 2.82 overall | BOX major 2.65 / minor 1.22 | compact wheeled footprint |
| Field Harvester | ~8.90 long × 4.10 wide | BOX major 4.35 / minor 1.95 | old radius 2.1 substantially under-represented length |
| Rifleman | ~0.68 wide, ~1.4 authored height envelope | CYLINDER radius 0.42 | simple circular ground footprint remains appropriate |
| Talon AH-X | chosen ~8.4 × 4.2 plan footprint | BOX major 4.20 / minor 2.10 | geometry exists now; dynamic AIR collision intentionally disabled pending altitude/layer semantics |

`majorRadius` / `minorRadius` are half-extents in the 2D simulation plane.

## Runtime pipeline

1. UnitAI resolves the current persistent order/goal.
2. Grid pathfinding supplies the route/waypoint intent.
3. `LocalAvoidanceSystem.prepare()` builds a deterministic spatial hash and predicts nearby mover conflicts.
4. Locomotor-specific code receives transient `speedScale` and `headingOffset` constraints while retaining its own tracked/wheeled/legged semantics.
5. `LocalAvoidanceSystem.resolve()` checks real oriented BOX/CIRCLE overlap and applies a bounded deterministic minimum-translation correction only when preventive avoidance was insufficient.
6. Any correction is navigation-validated; if a trapped pair cannot separate legally, previous legal positions can be restored rather than pushing units through blocked terrain.

## Data ownership

`Geometry` owns physical footprint.

`Locomotor` owns movement/avoidance policy, including:

- `collisionLayer`
- `dynamicCollision`
- `personalSpace`
- `avoidanceBuffer`
- `avoidanceLookAheadSeconds`
- `avoidanceMaxHeadingOffset`
- `avoidanceBraking`
- `collisionMass`
- `collisionPadding`
- `impactSpeedRetention`

There are no concrete `Aegis-X` / `HMMWV` / `Harvester` branches in the collision runtime.

## Determinism / efficiency

- Pair ordering is stable by entity ID.
- Tie-breaking uses deterministic ID hashing.
- The broadphase is a spatial hash, avoiding the previous all-mover O(n²) separation scan in ordinary play.
- Avoidance constraints are transient/derived each tick and are not added to snapshot v9.
- The hard resolver is bounded to three passes.

## Deliberately deferred

These should be added only with their proper simulation semantics rather than guessed now:

- altitude-aware aircraft collision/separation
- bridge/path-layer traffic
- crushability / vehicle-vs-infantry crushing policy
- formations and lane assignment
- destination-slot reservation for large teams
- explicit collision damage / ramming

Those belong naturally with the upcoming Team/AI and layered-navigation work.
