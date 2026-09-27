# ForgeRTS v0.3.1 Validation Report

## Automated tests

`npm test` passes **35/35** tests.

New locomotor coverage includes:

- tracked vehicles reverse only for short tactical behind-destinations
- tracked long behind-orders pivot toward forward travel
- wheeled short reverse preserves stable hull facing
- wheeled long behind-orders invoke a deterministic turn-around maneuver
- long wheeled orders transition back to forward movement instead of reversing the entire route
- reverse travel during turn-around is explicitly bounded
- authored GLB forward-axis heading calibration remains intact

Combat regression coverage remains intact for:

- armor/weapon data families and meaningful damage relationships
- persistent ATTACK approach behavior
- independent Aegis-X turret aiming and deterministic projectile fire
- HMMWV hitscan vs infantry
- autonomous Guardian Turret acquisition
- projectile/combat snapshot determinism

Existing regression coverage remains intact for deterministic MOVE/STOP, static building clearance, MapManifest v2, splat terrain, water passability, gesture classification, GameObject modules, resource docking/factory rollout protocols, and repeated real-map movement.

## Syntax / data validation

All project JavaScript and MJS sources pass `node --check`. All JSON data files parse successfully.

## Asset integrity

`sha256sum -c ASSET_HASHES.sha256` passes. All **16 production GLBs** remain byte-for-byte unchanged from v0.3.0. Existing terrain textures are unchanged.

## Locomotor implementation notes

- locomotors inspect both the current route waypoint and persistent terminal destination
- short reverse remains available for nearby tactical movement
- long wheeled behind-orders use `THREE_POINT_REVERSE → THREE_POINT_FORWARD → FORWARD`
- long tracked behind-orders prefer pivot + forward travel
- UnitAI does not trigger stuck/repath recovery during deliberate three-point phases
- snapshot format is **v6** and includes `locomotionState`
- ATTACK approach uses entry/hold range hysteresis to reduce range-edge oscillation

## Intentionally deferred

Full obstacle-aware multi-stage three-point planning, parking/docking-specific reverse corridors, wheel animation, steering-wheel visual animation, and formation-level vehicle maneuver coordination remain deferred. The current goal is deterministic, bounded and believable route-level vehicle behavior.
