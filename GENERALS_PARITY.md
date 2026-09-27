# ForgeRTS — C&C Parity Matrix

ForgeRTS uses three C&C generations as complementary engineering references while remaining a browser-native game with our own assets, factions, maps, UI, story, balance, and future open-world systems.

- **Original Red Alert:** simple and robust unit/building state machines, explicit docking/service handshakes, cells/regions/base concepts.
- **Generals / Zero Hour:** primary reference for the full 3D RTS simulation architecture, commands, AIUpdate, locomotors, pathfinding, weapons, players, production, teams, AI, missions, fog/radar, upgrades, veterancy, bridges, save/replay behavior.
- **Red Alert 3 schemas/modding data:** primary reference for mature data-driven `GameObject` composition and behavior/module definitions.

| System | Red Alert reference | Generals / ZH reference | RA3-style data lesson | ForgeRTS owner | v0.2.2 status |
|---|---|---|---|---|---|
| Fixed game simulation | deterministic game loop/state | `GameLogic` | simulation separate from presentation | `engine/sim/Simulation` | Foundation implemented |
| Serializable commands | mission/action orders | `MessageStream` / GUI commands | behavior receives data, not UI events | `engine/commands/CommandBus` | MOVE / STOP implemented |
| GameObject composition | object classes + explicit state | object/update-module architecture | `GameObject` composed from Body/AI/Draw/Behaviors/etc. | `engine/entities/game-object.js` + JSON modules | **Implemented foundation** |
| Unit AI requested destination/state | mission/state handling | `AIUpdate` module family | AI behavior as module | `engine/ai/unit-ai-update.js` | MOVE state + repath implemented |
| Locomotor templates | movement classes | `Locomotor.h` family (`FOUR_WHEELS`, `TREADS`, turn rate, wheel angle, reverse state) | locomotor set data | `engine/locomotion/locomotor.js` + JSON | **Tracks pivot/turn; wheels steer on curvature; legs/air separate; facing is simulation state** |
| Pathfinder destination correction | cell movement | AI/pathfinder family | geometry/pathing data separate | `engine/pathfinding/grid-pathfinder.js` | nearest-valid destination + clearance |
| Interaction protocols | refinery/harvester radio/docking handshakes | production/contain/dock behavior families | behavior modules/endpoints | `engine/interactions/interaction-protocol.js` | **Dock + rollout protocol foundation** |
| Gesture/context input | classic click orders | selection/context translation | client behavior separate from simulation | `ui/gesture-resolver.js` + InputController | **TAP/LONG_PRESS/PAN/PINCH classification** |
| Terrain/passability separation | map cells/regions | `MapReaderWriterInfo.h` | terrain appearance vs gameplay data | `MapManifest` + TerrainSampler + Pathfinder | Implemented foundation |
| Height/blend terrain | tile/cell terrain | WorldBuilder blend terrain | layered terrain data | `renderer/terrain-renderer.js` | 3-layer splat terrain |
| Roads | map overlays | WorldBuilder roads | data-defined terrain feature | map `roads[]` + renderer | Foundation implemented |
| Rivers/water | map cells/water logic | terrain/water systems | water as independent feature data | map `water` + renderer | Foundation implemented |
| Strategic regions | base/cell threat concepts | AI/map areas | future region metadata | `map.region.strategic` + Simulation region state | **Owner/threat/resources/activity/discovery implemented** |
| Stable starts/waypoints | cell/waypoint mission logic | player start/rally waypoints | named anchors | map `waypoints[]` | Data implemented |
| Persistent/save state | saveable world state | Snapshot/Xfer patterns | module state serialized | `Simulation.snapshot/restore` | v4 includes modules/interactions/regions/facing-steering state |
| Weapons | weapon/projectile behavior | `WeaponTemplate` / `Weapon` | WeaponSet modules | `engine/combat` | NEXT major system |
| Armor/damage | armor/warhead relationships | damage/armor definitions | ArmorSet | `engine/combat` | NEXT major system |
| Player economy/power | house/resources | `Player` | player/faction data | `FactionState` | Planned |
| Production | factory queues/service | production update modules | Production behavior | `ProductionSystem` | Data hooks added; runtime planned |
| Teams/attack groups | teams/groups | `Team` / `AIGroup` | team data | `TeamManager` | Planned |
| Strategic AI | house AI | `AIPlayer` | AI modules/data | `AIController` | Planned |
| Mission conditions/actions | triggers/actions | Scripts / Conditions / Actions | script data | `MissionSystem` | Planned; never owns world lifetime |
| Fog/shroud/radar | map visibility | shroud/radar systems | client/game visibility split | `VisibilitySystem` | Planned |
| Veterancy/upgrades/sciences | veteran/unit upgrades | experience / upgrades | upgrade modules | data modules | Planned |
| Bridges/path layers | cell/bridge movement | terrain/path layers | layered traversal | navigation layers | Planned |

## Current implementation rule

Before implementing a major system, update this matrix with the source/reference family and intended ForgeRTS owner. Do not add a bespoke unit-specific system if a general C&C-style subsystem can own the behavior.

## Licensing / content boundary

Do not copy EA art, audio, names, trademarks, map artwork, or proprietary later-game engine code into ForgeRTS. Any future direct translation of GPL-covered released source must be explicitly marked with provenance and applicable notices.
