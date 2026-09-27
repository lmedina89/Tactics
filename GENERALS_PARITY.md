# ForgeRTS — Generals Parity Matrix

ForgeRTS uses the officially released Command & Conquer: Generals / Zero Hour GPL source as a behavioral and architectural reference. Browser/platform/rendering code is ForgeRTS-native. This matrix is the guardrail against ad-hoc RTS systems.

| System | Generals reference family | ForgeRTS owner | v0.2.0 status |
|---|---|---|---|
| Fixed game simulation | `GameLogic` / game update | `engine/sim/Simulation` | Foundation implemented |
| Serializable commands | `MessageStream` / GUI commands | `engine/commands/CommandBus` | MOVE / STOP implemented |
| Unit AI requested destination/state | `AIUpdate` module family | `engine/ai/unit-ai-update.js` | MOVE state, persistent request, blocked/repath states |
| Locomotor templates | `GameLogic/Locomotor.h` | `engine/locomotion/locomotor.js` + JSON locomotors | Separate legs/wheels/treads/rotary-air data |
| Pathfinder destination correction | AI/pathfinder family | `engine/pathfinding/grid-pathfinder.js` | nearest-valid destination + route + clearance |
| Terrain/passability separation | `MapReaderWriterInfo.h` | `MapManifest` + `TerrainSampler` + Pathfinder | Implemented foundation |
| Height/blend terrain | WorldBuilder / blend-tile map data | `renderer/terrain-renderer.js` | 3-layer splat terrain + cliffs/slope weights |
| Roads | WorldBuilder road tools | Map `roads[]` + terrain carve + renderer strips | Foundation implemented |
| Rivers/water | map trigger/water data + terrain tools | Map `water` + terrain carve + water renderer | Foundation implemented |
| Stable starts/waypoints | `GameLogic.cpp` player start/rally waypoints | Map `waypoints[]` | Data implemented |
| Persistent/save state | Snapshot/Xfer patterns | `Simulation.snapshot/restore` | Foundation implemented |
| Weapons | `WeaponTemplate` / `Weapon` | `engine/combat` | NEXT |
| Armor/damage | Damage/armor definitions | `engine/combat` | NEXT |
| Player economy/power | `Player` | `FactionState` | Planned |
| Production | production update modules | `ProductionSystem` | Planned |
| Teams/attack groups | `Team` / `AIGroup` | `TeamManager` | Planned |
| Strategic AI | `AIPlayer` | `AIController` | Planned |
| Mission conditions/actions | Scripts / ScriptConditions / ScriptActions | `MissionSystem` | Planned; must not own world lifetime |
| Fog/shroud/radar | shroud/radar systems | `VisibilitySystem` | Planned |
| Veterancy/upgrades/sciences | experience / upgrade systems | data modules | Planned |
| Bridges/path layers | terrain/path layers | navigation layers | Planned |

## Verified source landmarks used for v0.2.0 design

- `GeneralsMD/Code/GameEngine/Include/GameLogic/Locomotor.h`
- `GeneralsMD/Code/GameEngine/Source/GameLogic/System/GameLogic.cpp`
- `Generals/Code/GameEngine/Include/Common/MapReaderWriterInfo.h`
- `GeneralsMD/Code/Tools/WorldBuilder/include/WorldBuilder.h`

Do not copy EA art, audio, names, trademarks, or map artwork into ForgeRTS. Any future direct GPL code translation must be marked with source/provenance and licensing notices.
