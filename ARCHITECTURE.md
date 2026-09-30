# ForgeRTS Architecture Contract

1. **Simulation owns truth.** Renderer/UI cannot directly move, damage, spawn, or mutate game entities.
2. **Fixed timestep.** Gameplay advances at 30 Hz independently of render FPS.
3. **Commands are data.** Player input, AI, mission scripts, replays, and future networking use the same serializable command objects.
4. **Content is data.** Unit/building/faction/weapon/armor/locomotor/mission definitions live outside gameplay code.
5. **GameObjects are composed from modules.** Runtime code asks what modules an object has rather than branching on concrete unit/building names. Core module families begin with `Body`, `Selectable`, `UnitAIUpdate`, `Locomotor`, `Vision`, `Render`, `Footprint`, `Resource`, `Production`, `ResourceCollector`, and `InteractionEndpoint`.
6. **Pathfinding and locomotion are separate.** Pathfinder chooses a route; locomotor physically follows it.
7. **Object-to-object coordination is explicit.** Docking, production rollout, repair, containment, helipad/aircraft service, and similar interactions must use deterministic protocols/state machines rather than collision/pathfinding inference.
8. **Gestures are classified before gameplay commands.** Touch input resolves TAP / LONG_PRESS / PAN / PINCH before gameplay input is emitted; camera motion cannot accidentally become a command.
9. **Stable IDs.** Entities, definitions, assets, players, teams, regions, trigger areas, interactions, and mission scripts use stable string IDs.
10. **World state outlives missions.** Missions/scripts are optional layers over the simulation; region ownership/threat/resources/discovery are persistent world data.
11. **Renderer is disposable.** Three.js can be replaced without rewriting simulation logic.
12. **WorldForge remains separate.** It produces assets/maps; ForgeRTS consumes them.
13. **Reference before invention.** Before adding a major RTS subsystem, inspect the corresponding Red Alert / Generals / Red Alert 3 reference family recorded in `GENERALS_PARITY.md`.
14. **GPL provenance is explicit.** Original ForgeRTS files and any future directly ported GPL files must remain distinguishable and correctly attributed.
15. **Facing is simulation state.** Hull orientation, steering, reverse state, and later turret orientation belong to deterministic locomotion/combat state; the renderer only applies those values plus asset-local heading offsets.
16. **Combat is layered.** ATTACK intent belongs to UnitAI; aiming belongs to body/turret simulation; WeaponRuntime owns cadence/ammo/reload; ProjectileSystem owns projectile travel; DamageSystem owns armor-adjusted health changes.
17. **Armor is not HP inflation.** Damage types are transformed through data-defined ArmorSet coefficients before Body health changes.
18. **Turrets are independent simulation state.** Hull yaw remains locomotor-owned. Turret yaw/aim tolerance/turn rate are deterministic combat state and renderer nodes merely display it.
19. **Weapon slots are generic.** GameObjects may expose PRIMARY/SECONDARY/TERTIARY-style slots without concrete unit-name checks; target suitability and expected armor-adjusted damage drive later weapon selection.
20. **Destroyed objects remain world state.** Death disables gameplay participation but does not require immediate deletion; wreck rendering, salvage, rebuilding, and persistence can be layered later.
21. **Reverse is a maneuver, not a travel mode.** Locomotors may reverse for local tactical corrections, docking, or turn-around setup, but long-distance path intent must evaluate the persistent terminal destination and prefer forward travel unless data explicitly says otherwise.
22. **Wheeled turn-around is stateful.** Three-point/turn-around phases are deterministic locomotor state and may temporarily move away from the terminal destination; UnitAI must not misclassify that intentional maneuver as pathfinding failure.
23. **Attack range uses hysteresis.** UnitAI enters firing range slightly inside maximum range and holds engagement through small range-edge changes to prevent MOVE/FIRE oscillation.
24. **Faction economy is simulation state.** Credits, power produced/used, low-power state, and later tech/build permissions belong to faction/player state rather than UI or structures individually.
25. **Harvesting is an interaction workflow.** Resource collection, docking, unloading, and exit are explicit ResourceSystem + InteractionManager state, not proximity-triggered credit mutations.
26. **Production is generic and data-driven.** Production queues consume `Production`, `ProductionCost`, power, and rollout protocol data; the engine must not branch on Barracks, Factory, Rifleman, HMMWV, Harvester, or Aegis-X names.
27. **Spawn is not rollout.** A produced entity may be created before it is operationally clear of the producer; controlled rollout/clear/rally state must complete before ordinary movement owns the unit.
28. **Resource depletion is persistent world state.** Resource capacity changes belong to the simulation/snapshot and must not be inferred from visual scale or renderer state.
29. **Low power affects systems through policy.** Power shortage is faction state; individual systems query a policy such as production-rate factor rather than hard-coding power logic into each producer.
30. **CommandSets are data.** The selected object exposes generic commands through data-defined CommandSets; UI renders those commands but does not own their gameplay effects.
31. **Placement preview is never authoritative.** The client ghost may predict validity, but `BUILD_STRUCTURE` is accepted only after simulation-side tech and placement validation.
32. **Construction sites are real GameObjects.** Placement creates a selectable, damageable, footprint-reserving simulation object before completion rather than a renderer-only placeholder.
33. **Operational state gates modules.** Power, production, docking, autonomous weapons, and other finished-building systems remain inactive while `operational === false`.
34. **Structure occupancy is dynamic navigation state.** Built/cancelled structures register/remove runtime pathfinding obstacles without rebuilding the authored map or baking construction into static terrain data.
35. **Prerequisites and build limits are centralized.** Tech-tree eligibility is resolved from player-owned operational objects and data-defined requirements rather than individual buttons or concrete building names.
36. **Construction sockets belong to structure data.** Even when the current Command Post uses construction-yard style placement, structure definitions carry reusable approach sockets for future mobile builders, repair, and service workflows.
37. **Command authority is simulation-owned.** Commands carry issuer/source metadata and simulation validates ownership; UI selection restrictions are convenience, never security/authority.
38. **Orders are reusable state-machine vocabulary.** MOVE, ATTACK, ATTACK_MOVE, GUARD and later tactical orders belong to UnitAI and may be issued by player, AI or scripts through the same CommandBus.
39. **Queued orders are deterministic state.** Appended commands become a serializable UnitAI order queue rather than client-only waypoints.
40. **Stance and acquisition policy are data.** Idle auto-acquisition, guard radius, attack-move scan/chase limits, return radius and default stance live in `UnitAIUpdate` definition data.
41. **Selection is client state; group orders are simulation commands.** Box/additive selection never mutates entities. Issuing an order serializes selected IDs through the common command path.
42. **Resource-field multiplicity is visual only.** A mineral deposit remains one Resource GameObject; `ResourceFieldVisual` may render deterministic GLB clones/glow/depletion cues without creating extra economy/pathfinding entities.
43. **Interaction history is bounded.** Completed protocol sessions may be pruned after a deterministic retention window; active sessions may never be discarded by cleanup.
44. **Capacity is provider data.** Dock/service concurrency is governed by module capacity, not an implicit one-session global lock.
45. **Camera focus is client state.** Pan/zoom/center manipulate a maintained view target and must never feed back into simulation truth.
46. **Physical footprint is object data.** `Geometry` describes collision extent independently from render meshes and locomotor behavior; long vehicles must not collapse to width-sized circles.
47. **Dynamic traffic is layered.** Pathfinder supplies the route, local avoidance supplies transient speed/heading constraints, locomotor applies vehicle-specific motion, and hard overlap resolution is only the final safety net.
48. **Collision is ownership-independent.** Ground movers are physically solid based on layer/geometry, not player allegiance.
49. **Visual assets never define gameplay implicitly.** GLB bounds, nodes and animations are inspection/presentation data; authoritative `Geometry`, `Footprint`, health, armor, locomotion and balance remain explicit content data.
50. **Content packs are runtime-neutral registration.** New asset families should enter through validated manifests/definitions, not concrete runtime branches.
51. **Civilian/neutral content classification is not diplomacy.** `ContentMeta.affiliation` organizes authoring/runtime content; authoritative directional SELF/ALLY/NEUTRAL/ENEMY relations belong to simulation-owned `PlayerRelationMap`.
52. **WorldForge is an exporter, never a runtime dependency.** ForgeRTS consumes stable GLB/JSON/content-pack/map data and must run without WorldForge code.
53. **Playable towns remain object-addressable.** Buildings, gates, walls and relevant props are separate authoritative objects whenever later gameplay/mission logic may reference them.
54. **Content is validated before play.** Missing assets/references, invalid modules, impossible authoring bindings and known reachability/placement hazards should be caught headlessly whenever practical.
49. **Avoidance tuning is data.** Personal space, look-ahead, braking/yield response, collision mass, padding, and avoidance steering limits live in locomotor definitions rather than concrete unit branches.
50. **Transient avoidance is derived state.** Local traffic constraints are recomputed deterministically each simulation tick and are not serialized into snapshots.
51. **Team prototypes are invariant data.** Composition, role, instance limits, recruitment/rally policy, stance, and later scripted hooks belong to reusable TeamPrototype definitions; runtime Team instances reference them by stable ID.
52. **Team membership is simulation state.** Runtime teams own stable IDs and member entity IDs. Membership is authoritative, deterministic, and serialized rather than inferred from proximity or client selection.
53. **Strategic AI uses normal commands.** AIPlayer/Team logic may decide intent, but it must issue the same CommandBus commands as player/scripts; it cannot directly move, target, damage, or teleport units.
54. **Strategic thinking is timer-bounded.** Expensive enemy acquisition, recruitment, build planning, and later threat/strategy work use data-defined intervals rather than scanning the whole world every simulation tick.
55. **Team lifecycle is explicit.** Recruitment, rally/staging, activation, destruction, and disbanding are deterministic states; a team is not considered active merely because some matching units happen to be nearby.
56. **Strategy and tactics remain separate.** AIPlayer chooses enemies, plans, teams and objectives; Team coordinates shared intent; UnitAI/Combat/Pathfinding/Locomotor execute ordinary tactical behavior.


## v0.5.1 validation-layer rule

A feature is not considered ready for the next major subsystem merely because its isolated engine tests pass. Core RTS loops must also be exposed through a small playable validation scenario with enough UI feedback for a human tester to prove the chain end-to-end on the target mobile browser. The validation scenario is separate from the dense prebuilt regression map so regression fixtures do not accidentally satisfy tech prerequisites for the player.

The validation UI remains a client layer: objectives, command-dock labels, placement banners, and initial camera/selection do not mutate simulation truth except through the existing CommandBus and authoritative construction/production/resource systems.


## v0.5.2 tactical-command / resource-visual rule

The player command layer must use the same serializable vocabulary intended for future AI, scripts, replay and networking. `InputController` resolves selection and context only; it does not contain combat/pathing implementations. `UnitAIUpdate` owns persistent Attack Move / Guard / stance behavior, and all tunable acquisition/leash/return values are definition data.

Resource readability follows the opposite ownership boundary: multi-cluster mineral fields, emissive emphasis, ground glow and depletion presentation are renderer-only projections of one authoritative resource entity. Visual multiplicity must not multiply resource capacity, blockers, interaction endpoints or snapshot entities.


## v0.5.3 client-animation rule

Client animation is a **presentation-only consumer of authoritative simulation state**. GameLogic never reads wheel, rotor, fan, skeletal, door, or other render transforms back from Three.js. Object definitions opt into a generic `ClientAnimation` module; the renderer may then bind authored GLB clips through `AnimationMixer` or drive named mechanical pivots procedurally from simulation state. This mirrors the C&C family separation between gameplay modules and client/draw behavior while remaining an original browser-native implementation.

Rules:

- Never branch in the animation runtime on a concrete unit/building definition ID.
- Embedded clip names and procedural node/prefix bindings live in data.
- Movement-driven animation consumes authoritative speed/steering state; weapon animation consumes combat events; state-driven machinery consumes authoritative module state.
- Continuous presentation machinery (fans/radar/rotors) is client-time animation and is not serialized because it has no gameplay consequence.
- Only create `AnimationMixer` instances for objects that actually declare embedded clips.
- If an authored pivot lacks a trustworthy gameplay semantic or axis, leave it dormant until the corresponding state exists rather than inventing fake motion.
- Procedural animation must remain disposable with the rendered view and must not enlarge simulation snapshots.


## v0.5.4 dynamic-collision / local-avoidance rule

Dynamic mover handling is a four-layer pipeline:

`Pathfinder route → predictive LocalAvoidance constraints → vehicle-specific Locomotor → hard Geometry overlap resolution`

`Geometry` is the simulation object's physical footprint, while `Locomotor` remains the definition of how that object accelerates, steers, reverses, pivots, yields, and navigates. The renderer's mesh bounds are reference measurements only; gameplay never reads live Three.js bounds back into simulation.

Rules:

- Use BOX/CYLINDER-style physical geometry from data rather than concrete unit-name collision branches.
- Broadphase must remain bounded/scalable; current dynamic mover pairing uses a deterministic spatial hash.
- Local avoidance should prevent overlap by slowing/yielding/steering before contact; hard separation exists only as a safety net.
- Hard separation may never knowingly push a unit into invalid terrain/static obstacles; candidate positions are navigation-validated and may roll back to the previous legal position when trapped.
- Friendly/enemy identity does not change physical solidity.
- Vehicle locomotor semantics remain authoritative: avoidance must not replace tracked pivots, wheeled steering, bounded reversing, or three-point turns with sideways sliding.
- Air/bridge/layer collision should be added only when the corresponding altitude/path-layer semantics exist. Do not fake those systems with a 2D ground collision shortcut.
- No transient pair/constraint state is saved; identical authoritative state and inputs must regenerate the same avoidance result.


## v0.6.0 teams / skirmish-AI rule

ForgeRTS models the first computer player layer after the released Generals / Zero Hour distinction between invariant team-template/prototype information, runtime Team instances, and an AIPlayer controller. Team composition and policy live in JSON; `TeamManager` owns deterministic membership/lifecycle; `SkirmishAIPlayer` performs timer-bounded strategic decisions and expresses them exclusively as ordinary authoritative CommandBus orders.

The current vertical slice intentionally recruits already-authored enemy combat units so the team/strategy/control architecture can be proven before introducing an autonomous AI economy. AI harvesting/construction/production arrived in v0.6.1, common-target coordination/threat valuation/reinforcement-reform in v0.6.2, and strategic difficulty/wealth/personality/adaptive Team selection/resource-driven expansion in v0.6.3. Diplomacy and full formation routing remain later layers and must build on this same separation rather than bypass it.

No EA AI/Team C++ implementation was directly translated for v0.6.0. The released source is the architectural/behavioral reference; the runtime is original ForgeRTS JavaScript designed around the existing browser simulation.


## v0.6.1 autonomous-economy / production rule

`SkirmishAIPlayer` owns strategic intent but does not own gameplay mutation. Its `SkirmishEconomyPlanner` may inspect authoritative state and ask shared systems whether an action is legal, but all resulting actions must enter through `CommandBus` as `FROM_AI` commands.

The planning split is:

`AI profile data → SkirmishEconomyPlanner → CommandBus → Construction / Production / Resource systems → ordinary simulation state`

Rules:

- AI build goals, desired Harvester counts, free-unit reserves, placement policy, and timer cadence are data.
- Existing construction sites count toward desired structure totals.
- AI placement uses the same `ConstructionSystem.eligibility()` / `PlacementValidator` authority as player construction.
- AI production uses the same `ProductionSystem.canQueue()` legality and real producer queues as player production.
- Team composition shortages are work-order demand, not permission to spawn units directly.
- Harvesters use ordinary HARVEST / RETURN_CARGO commands and the existing Resource/Docking interaction path.
- Strategic scans remain timer-bounded and deterministic; no planner decision depends on renderer state, wall-clock time, randomness, or unordered iteration.
- Planner state that affects future decisions is serialized; derived transient search candidates are not.
- No concrete production object ID may become a runtime branch when module/capability data can express the same behavior.

The released Generals / Zero Hour AIPlayer/AISkirmishPlayer source is the architecture/behavior reference for build lists, desired gatherers, factory work orders, and timer-bounded base-building. v0.6.1 remains an original browser-native implementation and does not directly translate those C++ functions.


## v0.6.2 tactical-battlefield-intelligence rule

The released Generals / Zero Hour AI interfaces are the reference for four specific behaviors used here: named attack-priority policy with distance weighting, supply/economy attack detection and guarding, location-safety checks, and Team casualty/common-target coordination. ForgeRTS maps those concepts to original browser-native systems rather than translating the C++ line-for-line.

The tactical split is:

`AI profile / TeamPrototype / AttackPrioritySet data → SkirmishAIPlayer + TargetEvaluator → Team state → CommandBus → ordinary UnitAI/Combat`

Rules:

- Target categories and priorities are data. Strategic AI must not branch on concrete unit/building IDs when a category can express intent.
- Effective target value may be distance-weighted so a nearer combat threat can outrank a higher-value but distant structure.
- Economic defense is event/state driven from authoritative recent-damage fields; the renderer is never consulted.
- Team casualty response is explicit state. `REFORMING` is not a teleport or spawn path: survivors retreat through normal MOVE, and missing composition becomes ordinary production demand.
- `attackCommonTarget` is TeamPrototype policy and uses normal ATTACK commands; a Team never receives privileged direct target mutation.
- AI construction safety is an additional strategic filter only. Final legality remains `ConstructionSystem` + `PlacementValidator`.
- A resource is harvestable only if a compatible collector has a navigation-valid terminal approach that remains inside harvest range after path-grid snapping and arrival tolerance.
- AI resource selection must skip unreachable resource fields rather than repeatedly issuing doomed orders.
- Tactical timers/reform/target state that can change future decisions is serialized; derived target scores and harvest-search candidates are not.

## v0.6.3 projectile-correctness rule

Projectile delivery is simulation state, not a renderer approximation. A projectile definition selects behavior (`DUMB_PROJECTILE` or `GUIDED_PROJECTILE`) and carries speed, radius, collision padding, target lead/guidance policy, target-height policy and lifetime. Unguided shells solve an initial intercept from authoritative target motion but retain their launch trajectory; guided projectiles may rotate velocity only through a bounded turn-rate policy. Every fixed step sweeps the projectile against the designated target's real `Geometry` while accounting for target motion over the same step. Damage is applied only after an authoritative swept impact.

`collision-geometry.js` is the shared primitive library for oriented BOX/CYLINDER/SPHERE simulation geometry. Vehicle collision and projectile collision must reuse this geometry family rather than inventing independent hit circles. Presentation tracers/meshes may visualize projectile state but never decide impact.

## v0.6.3 strategic-AI rule

`StrategicAIPlanner` sits above `SkirmishAIPlayer`, TeamManager and SkirmishEconomyPlanner. It is timer-bounded and produces policy only: wealth state, TeamPrototype choice, difficulty/personality pacing multipliers, gatherer demand adjustment, and optional expansion goals. It cannot spawn objects, change credits, deal damage, or issue low-level movement directly. All execution remains ordinary Team/Economy planning and authoritative `FROM_AI` commands.

Team composition adaptation is data-driven: enemy objects expose generic `AITargetable` categories; Team plan variants declare base priority, counter weights, wealth gates and personality bias. Difficulty/personality alter decision cadence/posture, not simulation rules. Resource expansion requires a real local-resource depletion baseline before increasing desired Refinery count and selecting a deterministic remote field.


## v0.6.4 economic-defense + projectile-world-collision rule

Economic protection is a player-level policy above TeamManager, not a Harvester special case. `EconomicDefenseManager` converts recent authoritative damage on configured economic categories into a threat-sized temporary Team work order; recruitment, factory demand, combat orders and release all use the same shared systems as ordinary AI Teams.

Projectile collision remains simulation-authoritative. Each physical projectile sweeps its fixed-tick segment against designated target Geometry, configured world-entity Geometry and terrain, choosing the earliest deterministic collision. Building `Footprint` remains placement/navigation data while building `Geometry` is authoritative 3D combat volume.

### v0.6.4 emergency Team recall rule

Economic defense may temporarily borrow control of a whole ACTIVE Team selected by data-defined role/threat/distance policy. It does not transfer individual members out of the source Team. While borrowed, normal SkirmishAI orders for that Team are suspended; dedicated response production continues through the ordinary economy planner. Release restores the Team to its normal strategic controller on the next AI update.

## v0.6.5 content expansion + WorldForge boundary

ForgeRTS now consumes a versioned content contract rather than assuming all production objects are hand-wired into a single registry list. `ContentMeta` classifies an object for authoring/runtime queries, while behavior continues to come from ordinary GameObject modules. Content packs may add definitions and asset catalogs without concrete simulation branches.

```text
WorldForge / external authoring
        ↓
GLB + definitions + content pack + placements
        ↓
DataRegistry
        ↓
content/map validation
        ↓
GameObject factory
        ├── authoritative simulation modules
        └── disposable Render/ClientAnimation presentation
```

`CIVILIAN`, `NEUTRAL` and `WORLD` affiliations are valid ownerless content classes, but they do not implement diplomacy. v0.6.6 adds simulation-owned `PlayerRelationMap`; never infer ALLY/NEUTRAL/ENEMY gameplay relationships from `ContentMeta`. Known distinct authored players default to ENEMY only for backward compatibility unless an explicit map/runtime relationship overrides that state.

Walls/gates use generic `WallConnection` metadata (`connectionGroup`, role, sockets, snapDistance) so future editors can compose them without runtime knowledge of concrete wall IDs. The current release establishes data and deterministic snapping only; drag-build, corner selection and gate pathing remain later behavior layers.

Asset ingestion is intentionally one-way: the auditor may suggest visual bounds/pivots, but no tool may silently write those suggestions into authoritative balance/collision data.

## v0.7.0 mission / trigger / objective rule

Mission logic is an **optional authoritative layer over the existing world simulation**, not a replacement for it.

- `TriggerAreaSystem` owns deterministic ENTERED / INSIDE / EXITED occupancy for authored trigger geometry.
- `MissionConditions` reads authoritative simulation state; it never reads renderer/UI state.
- `MissionActions` may mutate mission-owned state directly (flags, counters, timers, objectives, outcome), but unit orders must travel through the normal `CommandBus` with `CommandSource.SCRIPT`.
- Mission scripts may change simulation-owned diplomacy only through the public PlayerRelationMap API.
- Mission definitions are typed data. Arbitrary/eval JavaScript hooks are forbidden.
- Script evaluation order is stable definition order. Commands emitted during script evaluation execute on the next fixed simulation tick, avoiding re-entrant command application.
- Mission runtime is snapshot state. Snapshot v17 stores script state, timers, objectives, outcome, and trigger occupancy.
- The persistent world is still primary. A mission references stable map/player/entity/team/area/waypoint IDs; it does not own terrain, maps, content definitions, or region lifetime.
- New condition/action vocabulary should be added only for concrete mission requirements and backed by deterministic tests.
