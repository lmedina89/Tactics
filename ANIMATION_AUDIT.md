# ForgeRTS v0.5.3 — Production GLB Animation Audit

## Rule

Animation is client/presentation state. The simulation remains authoritative for position, heading, steering, combat, harvesting, construction, production, health and ownership. `ClientAnimation` data tells the renderer how to map that state onto authored GLB clips or mechanical pivots. No gameplay system reads animated Three.js transforms back into simulation state.

## Audit result

All **16 production/reference GLBs** were inspected. Only two contain embedded glTF animation clips; most ForgeRTS assets instead contain deliberately named mechanical pivots intended for runtime animation.

| Asset | Embedded clips | Authored movable nodes / result | v0.5.3 integration |
| --- | --- | --- | --- |
| Aegis Rifleman | `CombatWalk`, `AimFire` | Aim/upper-body/muzzle nodes | `CombatWalk` loops from actual movement speed; `AimFire` is triggered by weapon-fire events |
| Aegis-X MBT | none | road wheels, return rollers, idlers, sprockets, turret/gun roots | road gear spins from authoritative vehicle speed; turret yaw remains existing simulation-driven presentation |
| HMMWV-50 | none | wheel-spin roots, steering roots, turret/gun roots, four door roots | wheel spin + front steering active; weapon/turret system remains authoritative; doors reserved |
| Field Harvester | none | six wheel roots, front steering, collector lift/drum, gathering arms, intake belt, hopper doors | wheels + steering active; collector drum and gathering arms animate only while `HARVESTING`; remaining process pivots reserved |
| Talon AH-X | none | main/tail rotor roots, sensor/gun roots | main and tail rotors active; sensor/gun state reserved until aircraft/combat semantics are authoritative |
| Legacy BTR-82 (reference only) | `Btr anima` | clip-authored rotation channels | not bound because the asset is reference-only and is not a current gameplay definition |
| Command Nexus HQ | none | vehicle-bay door, radar yaw/pitch | radar sweep active; bay door/pitch reserved for future authoritative states |
| Field Barracks | none | entry door; three separately-authored roof fan assemblies | three roof fans driven through generated runtime pivots; entry door reserved |
| Power Node | none | two cooling-fan roots | both cooling fans active while operational |
| Field Refinery | none | apron feeder, dust fan, transfer conveyor | dust fan active; feeder/conveyor reserved until unload/process presentation has a precise state mapping |
| Grid Bastion | none | four cooling-fan roots | all four cooling fans active while operational |
| Guardian Turret | none | turret/gun roots, muzzle socket | existing simulation-driven turret yaw retained; gun pitch/recoil reserved until authoritative pitch/recoil state exists |
| Tactical Command Post | none | service bay door; radar-authored pieces | radar sweep uses a generated presentation pivot because source hierarchy is partially baked; service door reserved |
| Vehicle Factory | none | personnel/production doors; two roof-fan assemblies | both roof fans active through generated pivots; doors reserved for production-exit state integration |
| Rich Mineral Cluster | none | none required | handled by `ResourceFieldVisual`, not `ClientAnimation` |
| Dense Mineral Cluster | none | none required | handled by `ResourceFieldVisual`, not `ClientAnimation` |

## Generic drivers

`renderer/client-animation-system.js` contains no concrete ForgeRTS unit/building branches. Definitions may opt into these generic presentation drivers:

- `MOVING` — embedded clip loop selected from authoritative movement state; playback rate may scale with unit speed.
- `WEAPON_FIRE` — one-shot embedded clip triggered by a combat event.
- `WHEEL_SPIN` — wheel/pulley rotation from authoritative linear speed and data-defined radius.
- `STEERING` — authored steering pivot from authoritative steering angle.
- `CONTINUOUS_SPIN` — harmless operational presentation motion such as fans, radar, and rotors.
- `STATE_SPIN` — procedural rotation enabled only when a specified simulation state is active.
- `OSCILLATE` — state-gated oscillation around the authored bind pose.
- `GROUP_SPIN` — creates a runtime pivot for assets whose blades/dish geometry was authored as sibling nodes rather than under a rotatable parent.

## Deliberately dormant pivots

“Has an animation-ready node” is not the same thing as “has enough gameplay semantics to animate it correctly.” The following are intentionally not given arbitrary cosmetic motion yet: production/service doors, HMMWV doors, Harvester hopper/intake/collector-lift details beyond the safe harvesting motion, Refinery feeder/conveyor, gun pitch/recoil, RWS/sensor heads, and some radar pitch mechanisms. They should be activated when their corresponding authoritative state/event exists, using the same data-driven `ClientAnimation` system.

This avoids a common failure mode where a visual animation implies an interaction that GameLogic did not actually perform.
