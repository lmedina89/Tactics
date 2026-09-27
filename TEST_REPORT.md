# ForgeRTS v0.2.2 Validation Report

## Automated tests

`npm test` passes **26/26** tests.

Coverage includes:

- deterministic persistent MOVE / STOP behavior
- static building clearance and destination correction
- snapshot / restore determinism
- MapManifest v2 persistent-world fields
- splat terrain normalization and water passability
- registry and asset-catalog integrity
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

`sha256sum -c ASSET_HASHES.sha256` passes. All **16 production GLBs** are byte-for-byte unchanged from v0.2.1. Terrain textures are unchanged as well.

## Implementation notes

- Simulation yaw uses `0 = +Z` world-forward.
- Aegis-X and HMMWV were authored with local `+X` as forward, so their Render modules now apply `-π/2` heading offsets.
- Field Harvester was authored with local `+Z` as forward and therefore uses zero heading offset.
- The renderer continues to consume simulation-owned `yaw`; it does not invent vehicle orientation.
- Tracked vehicles may pivot at low speed while wheeled vehicles use steering curvature based on wheel angle and wheelbase.
- Hull/turret separation is intentionally reserved for the Weapon/Attack milestone.
