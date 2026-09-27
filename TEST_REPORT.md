# ForgeRTS v0.3.0 Validation Report

## Automated tests

`npm test` passes **32/32** tests.

Combat coverage includes:

- armor data and weapon data registry families
- meaningful armor coefficients: rifle fire is nearly ineffective against heavy tank armor while cannon damage remains significant
- persistent ATTACK order with attack-range approach behavior
- independent Aegis-X turret aiming and deterministic projectile fire
- HMMWV hitscan weapon defeating infantry and destruction-state cleanup
- autonomous Guardian Turret target acquisition and firing
- projectile/weapon/combat snapshot and restore determinism

Existing regression coverage remains intact for:

- deterministic persistent MOVE / STOP behavior
- static building clearance and destination correction
- MapManifest v2 persistent-world fields
- splat terrain normalization and water passability
- gesture classification before gameplay command emission
- GameObject module composition
- explicit resource-docking and factory-rollout interaction protocols
- real-map repeated movement for player tank, HMMWV, and Rifleman
- tracked hull pivot/facing behavior
- wheeled arc steering without center-pivot snapping
- wheeled reverse behavior with stable hull facing
- authored GLB forward-axis heading calibration

## Syntax / data validation

All project JavaScript and MJS sources pass `node --check`. All JSON data files parse successfully.

## Asset integrity

`sha256sum -c ASSET_HASHES.sha256` passes. All **16 production GLBs** are byte-for-byte unchanged from v0.2.2. Existing terrain textures are unchanged.

## Combat implementation notes

- `ATTACK` is a serialized command and persists as UnitAI target intent.
- UnitAI computes a firing-position approach point rather than simply moving onto the victim.
- Aegis-X, HMMWV, and Guardian use independent world-space `turretYaw`; Rifleman uses a high-rate body aim module.
- hitscan and projectile delivery are distinct simulation paths.
- ArmorSet coefficients transform weapon damage before Body health changes.
- Guardian Turrets are the first auto-acquiring defensive objects.
- destroyed objects remain present as darkened wrecks but are no longer selectable or active combatants.
- snapshot format is v5 and includes attack intent, weapon runtime, turret state, damage state, and in-flight projectiles.

## Intentionally deferred

Full projectile collision masks, line-of-fire occlusion, splash/radius damage, anti-air weapons, reactive guard behavior, and production/economy are deferred so the initial combat layer can be validated independently.
