# ForgeRTS — C&C Parity Matrix

ForgeRTS uses three C&C generations as complementary engineering references while remaining a browser-native game with our own assets, factions, maps, UI, story, balance, and future open-world systems.

- **Original Red Alert:** simple and robust unit/building state machines, explicit docking/service handshakes, cells/regions/base concepts.
- **Generals / Zero Hour:** primary reference for the full 3D RTS simulation architecture, commands, AIUpdate, locomotors, pathfinding, weapons, players, production, teams, AI, missions, fog/radar, upgrades, veterancy, bridges, save/replay behavior.
- **Red Alert 3 schemas/modding data:** primary reference for mature data-driven `GameObject` composition and behavior/module definitions.

| System | Red Alert reference | Generals / ZH reference | RA3-style data lesson | ForgeRTS owner | v0.5.4 status |
|---|---|---|---|---|---|
| Fixed game simulation | deterministic game loop/state | `GameLogic` | simulation separate from presentation | `engine/sim/Simulation` | Foundation implemented |
| Serializable commands | mission/action orders | `MessageStream` / GUI/AI commands + command origin | behavior receives data, not UI events | `engine/commands/CommandBus` | **MOVE / STOP / ATTACK / ATTACK_MOVE / GUARD / stance + issuer/source metadata** |
| GameObject composition | object classes + explicit state | object/update-module architecture | `GameObject` composed from Body/AI/Draw/Behaviors/etc. | `engine/entities/game-object.js` + JSON modules | Implemented foundation |
| Unit AI requested destination/state | mission/state handling | `AIUpdate` commands incl. attack-move/guard/path append | AI behavior as module | `engine/ai/unit-ai-update.js` | **MOVE / ATTACK / ATTACK_MOVE / GUARD, queued orders, data-defined stance/acquisition** |
| Locomotor templates | movement classes | `Locomotor.h` family (`FOUR_WHEELS`, `TREADS`, turn rate, wheel angle, reverse state) | locomotor set data | `engine/locomotion/locomotor.js` + JSON | Tracks pivot/turn; wheels steer on curvature with bounded reverse + three-point turn-around; legs/air separate; facing simulation-owned |
| Pathfinder destination correction | cell movement | AI/pathfinder family | geometry/pathing data separate | `engine/pathfinding/grid-pathfinder.js` | nearest-valid destination + clearance + attack approach point |
| Object collision geometry | cell/object occupancy | `Object` `GeometryInfo`, collision/partition hooks | geometry independent from Draw/AI | `Geometry` module + `collisionShape()` | **BOX/CYLINDER physical footprints implemented for mobile units** |
| Dynamic local avoidance | local occupancy/separation | partition/repulsor + AI/path/locomotor families | behavior parameters in data | `engine/locomotion/local-avoidance-system.js` | **Deterministic spatial hash + predictive yield/steer + hard OBB/circle resolver** |
| Weapons / Weapon templates/runtime | projectile/warhead behavior | `WeaponTemplate` / `Weapon` | `WeaponSet` modules | `engine/combat/weapon-system.js` + `data/weapons` | **Implemented initial hitscan/projectile, prefire, cadence, clip/reload, target masks** |
| Weapon slots / selection | weapon/warhead choices | primary/secondary/tertiary weapon slots + damage estimation | WeaponSet data | `engine/combat/targeting.js` | **Generic slots + armor-adjusted best-weapon scoring implemented** |
| Armor/damage | armor/warhead relationships | `ArmorTemplate` / DamageType / Body | `ArmorSet` | `engine/combat/damage-system.js` + `data/armors` | **Implemented coefficients, health states, destruction** |
| Turret/body aim | turreted vehicle fire logic | `TurretAI` under AIUpdate | turret behavior module | CombatSystem + Render turret bindings | **Independent turret yaw; body-aim infantry; Guardian auto-acquire** |
| Projectile objects | projectile classes | projectile Thing/Object weapon delivery | projectile behavior data | `engine/combat/projectile-system.js` | **Deterministic projectile runtime + snapshot** |
| Interaction protocols | refinery/harvester radio/docking handshakes | production/contain/dock behavior families | behavior modules/endpoints | `engine/interactions/interaction-protocol.js` | **Resource docking + infantry/vehicle rollout used by live systems** |
| Gesture/context input | classic click/group orders | selection/context translation | client behavior separate from simulation | `ui/gesture-resolver.js` + InputController | **TAP/LONG_PRESS/PAN/PINCH + box/add selection + group tactical contexts** |
| Terrain/passability separation | map cells/regions | `MapReaderWriterInfo.h` | terrain appearance vs gameplay data | `MapManifest` + TerrainSampler + Pathfinder | Implemented foundation |
| Height/blend terrain | tile/cell terrain | WorldBuilder blend terrain | layered terrain data | `renderer/terrain-renderer.js` | 3-layer splat terrain |
| Roads | map overlays | WorldBuilder roads | data-defined terrain feature | map `roads[]` + renderer | Foundation implemented |
| Rivers/water | map cells/water logic | terrain/water systems | water as independent feature data | map `water` + renderer | Foundation implemented |
| Strategic regions | base/cell threat concepts | AI/map areas | future region metadata | `map.region.strategic` + Simulation region state | Owner/threat/resources/activity/discovery implemented |
| Stable starts/waypoints | cell/waypoint mission logic | player start/rally waypoints | named anchors | map `waypoints[]` | Data implemented |
| Persistent/save state | saveable world state | Snapshot/Xfer patterns | module state serialized | `Simulation.snapshot/restore` | **v9 adds queued tactical orders/stances and resource-harvest accounting; v8 restore accepted** |
| Player economy/power | house/resources | `Player` | player/faction data | `FactionEconomySystem` / player state | **Credits + power + low-power policy implemented** |
| Production | factory queues/service | production update modules | Production behavior | `engine/production/production-system.js` | **Generic queues, costs, build time, cancellation, dynamic spawn, rollout/rally implemented** |
| Command sets / contextual UI | sidebar/build lists | `CommandButton` / control bar / GUI command staging | `CommandSet` on `GameObject` | `data/commandsets/*` + HUD renderer | **BUILD / PRODUCE / RETURN / CANCEL + tactical ATTACK_MOVE / GUARD / QUEUE / STANCE presentation** |
| Build eligibility / tech tree | house build rules | `Player` buildability / affordability / prerequisite checks | `Buildable`, prerequisites, build cost | `engine/construction/tech-tree.js` | **Builder permission, prerequisites, build limits and affordability implemented** |
| Structure placement | cell legality | `InGameUI` build-place mode / legal build feedback | `StructurePlacementBehavior`, projected buildability | `engine/construction/placement-validator.js` + placement ghost | **Client ghost + authoritative terrain/footprint/radius validation implemented** |
| Construction state | building creation | `DozerAIUpdate` build task / structure construction lifecycle | `BuildTime`, `RefundValue`, construction-yard/placement modules | `engine/construction/construction-system.js` | **Real damageable sites, progress, cancellation/refund, completion/activation implemented** |
| Construction approach sockets | docking/build approach points | `DozerAIUpdate` build dock locations | structure behavior data | `Construction.sockets[]` | **Data foundation implemented; current Command Post uses yard style, mobile-builder path is scaffolded** |
| Dynamic structure occupancy | cell occupancy | pathing/object footprint integration | geometry/placement separate from art | `GridPathfinder` dynamic obstacles | **New/cancelled structures update navigation at runtime** |
| Resource-field presentation | ore/gem field readability | supply-resource visual readability | client visual modules separate from resource behavior | `ResourceFieldVisual` + renderer | **One logical Resource renders deterministic multi-cluster GLB field/glow/depletion cues** |
| Client animation / draw-state motion | unit/building visual anim | GameClient / Draw modules | Draws / ClientUpdates / ClientBehaviors / model animation states | `ClientAnimation` data + `renderer/client-animation-system.js` | **Embedded GLB clips + procedural authored pivots; presentation-only, simulation remains authoritative** |
| Command authority/source | house/player ownership | player/script/AI command-origin distinction | commands are data, owner checks in gameplay | `CommandBus` + `Simulation._apply` | **Issuer/source metadata + authoritative ownership validation** |
| Group/queued tactical orders | grouped orders | attack-move / guard / appended user paths | generic behavior command data | InputController + UnitAIUpdate | **Multi-select, box/add, ATTACK_MOVE, GUARD, serialized appended order queue** |
| Teams/attack groups | teams/groups | `Team` / `AIGroup` | team data | `TeamManager` | Planned |
| Strategic AI | house AI | `AIPlayer` | AI modules/data | `AIController` | Planned |
| Mission conditions/actions | triggers/actions | Scripts / Conditions / Actions | script data | `MissionSystem` | Planned; never owns world lifetime |
| Fog/shroud/radar | map visibility | shroud/radar systems | client/game visibility split | `VisibilitySystem` | Planned |
| Veterancy/upgrades/sciences | veteran/unit upgrades | experience / upgrades | upgrade modules | data modules | Planned |
| Bridges/path layers | cell/bridge movement | terrain/path layers | layered traversal | navigation layers | Planned |

## Current implementation rule

Before implementing a major system, update this matrix with the source/reference family and intended ForgeRTS owner. Do not add a bespoke unit-specific system if a general C&C-style subsystem can own the behavior.

## v0.3.1 locomotor/combat reference boundary

ForgeRTS v0.3.1 preserves the v0.3.0 combat separation and tightens locomotor behavior around a C&C-style principle: reverse/turn-around is explicit locomotor state rather than a permanent alternate travel mode. The implementation uses the persistent terminal order to distinguish short tactical reverse from long-distance movement, adds deterministic wheeled turn-around phases, and keeps tracked long-route movement biased toward pivot + forward travel. ATTACK approach also uses range hysteresis to avoid edge-of-range MOVE/FIRE oscillation. The code remains an original browser-native implementation rather than a direct translation.


## v0.4.0 economy / production reference boundary

ForgeRTS v0.4.0 activates the interaction and module foundations that were intentionally laid down earlier. Harvester/Refinery behavior uses an explicit docking workflow instead of collision inference; production is a generic queue driven by GameObject modules and ProductionCost data; faction credits and power are simulation state; produced units use explicit rollout state before ordinary movement resumes. Enemy strategic decision-making remains deferred, so enemy economy structures currently exist as passive test-world content rather than a full AI economy. The implementation remains original browser-native JavaScript rather than a direct C&C source translation.

## v0.5.0 construction / command reference boundary

ForgeRTS v0.5.0 follows the released C&C separation between player build eligibility, client-side build placement interaction, builder/construction behavior, and data-defined GameObject commands. Generals `Player` is the reference for centralized build permission/affordability/prerequisite checks; `InGameUI` is the reference for a pending build-place interaction that is separate from simulation authority; `DozerAIUpdate` is the reference for explicit construction task/approach state; RA3 `GameObject` schemas reinforce data-driven `CommandSet`, `BuildTime`, `RefundValue`, buildability and placement behavior. ForgeRTS keeps those boundaries but implements them as compact browser-native systems (`TechTreeSystem`, `PlacementValidator`, `ConstructionSystem`) and does not directly translate EA source code.

## Licensing / content boundary

Do not copy EA art, audio, names, trademarks, map artwork, or proprietary later-game engine code into ForgeRTS. Any future direct translation of GPL-covered released source must be explicitly marked with provenance and applicable notices.


## v0.5.1 construction validation boundary

v0.5.1 does not add another C&C subsystem. It validates the existing v0.5.0 construction/CommandSet/tech-tree boundaries through a build-from-foundation scenario and a clearer mobile client. The UI can predict and explain placement/eligibility, but authoritative build acceptance still lives in `TechTreeSystem` + `PlacementValidator` + `ConstructionSystem`. The prebuilt training map remains a regression fixture; the player-facing map intentionally starts without tech structures so no authored object can silently satisfy prerequisites.


## v0.5.2 tactical command / resource readability reference boundary

v0.5.2 uses the released Generals / Zero Hour command vocabulary as an architectural reference: move, attack-move, guard-position/object, appended paths, and explicit command origin are high-level AI/game commands rather than UI-specific behaviors. ForgeRTS mirrors that separation with serializable CommandBus records and persistent UnitAI state, but the implementation is original JavaScript rather than a line-for-line source port. Combat acquisition/leash/return policy is definition data so future AIPlayer/Team logic can issue the same orders as the human client.

Mineral readability remains deliberately renderer-side. `ResourceFieldVisual` composes deterministic copies of the existing GLB plus emissive/ground-glow cues around one simulation Resource. This follows the broader RA3-style client/game separation without multiplying authoritative resource objects.


## v0.5.3 client-animation reference boundary

The C&C family keeps visual presentation separate from authoritative GameLogic, and the RA3 data model exposes draw/client behavior separately from gameplay behaviors. ForgeRTS follows that boundary with a data-driven `ClientAnimation` module. Authored GLB clips are played by the renderer, while named mechanical pivots are driven procedurally from authoritative speed, steering, combat events, harvesting state, or harmless client-time presentation state. No EA animation implementation was translated directly; the runtime is original JavaScript/Three.js.


## v0.5.4 movement / collision reference boundary

The released Generals / Zero Hour architecture is used here for the **separation of concerns** rather than a line-for-line port: physical object geometry/collision/partition concepts live with the GameObject, while locomotor definitions own movement-specific behavior and tuning. ForgeRTS maps that shape to a compact browser-native `Geometry` module plus data-driven locomotor avoidance fields and a deterministic `LocalAvoidanceSystem`.

No EA collision or locomotor implementation was copied into v0.5.4. The local avoidance, OBB/circle overlap solver, spatial hash, yielding policy, and browser-facing integration are original ForgeRTS JavaScript. If a later system (for example layered bridges, crushability, formation routing, or aircraft altitude collision) would materially benefit from a direct GPL-covered translation, that will remain an explicit provenance/licensing decision rather than an implicit copy.
