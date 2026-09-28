# Changelog

## v0.6.3 — Projectile Correctness + Strategic Intelligence

- Rebuilt projectile flight around a data-driven behavior policy instead of the old frozen-target endpoint check. Projectile definitions now support explicit `DUMB_PROJECTILE` and `GUIDED_PROJECTILE` behaviors, launch lead, bounded guidance turn rate, designated-target collision, projectile radius/padding, target-height policy, and bounded lifetime.
- Added shared simulation `collision-geometry.js` helpers so projectile impact tests use the same authored BOX/CYLINDER/SPHERE geometry family as dynamic unit collision rather than a legacy center-radius approximation.
- Projectile collision is swept across each fixed simulation step and accounts for designated-target movement during that step, closing the moving-vehicle miss bug without inflating hit radii.
- Unguided cannon shells receive an intercept lead at launch but do not magically home afterward. Guided projectiles use a separate bounded-turn policy. Aegis-X and Guardian cannon shell speeds were retuned for the ForgeRTS world scale.
- Added projectile-definition validation in `DataRegistry` and deterministic snapshot normalization for the new projectile fields. Snapshot schema advances to **v13** while restore continues to accept v8-v12.
- Added `StrategicAIPlanner`, keeping strategic assessment timer-bounded above the existing Team/Tactical/Economy layers.
- Team plans can now choose among data-defined prototype variants using enemy `AITargetable` categories, wealth gates, personality bias, and counter weights. Added armored and mobile Crimson assault variants.
- Added data-defined strategic wealth states, EASY/NORMAL/HARD cadence/gatherer tuning, and map-selectable BALANCED/AGGRESSIVE/DEFENSIVE/ECONOMIST personality presets. These alter planning policy only; they do not change combat/economy simulation rules.
- Added resource-driven expansion policy: after a real local-resource baseline falls below a configured remaining fraction, the AI may raise the desired Refinery count and anchor the new Refinery near a deterministic remote resource field.
- Added HEAVY_ARMOR/LIGHT_ARMOR target categories to combat vehicle data for generic counter-composition logic.
- Added release-version consistency regression coverage so package/HUD/startup/asset-catalog versions cannot silently diverge again.
- Added moving-target projectile, real-Geometry sweep, unguided/guided behavior, strategic adaptation, difficulty/wealth, expansion, personality, and v13 restore regression coverage. Full automated suite now passes **101/101** tests.
- Added `COMBAT_PROJECTILE_AUDIT.md` and `STRATEGIC_AI_AUDIT.md`. No production GLBs or terrain assets were modified.

## v0.6.2 — Tactical Battlefield Intelligence

- Added data-driven `AttackPrioritySet` content plus generic `AITargetable` categories. Target score uses priority minus distance/distance-modifier, matching the released Generals/Zero Hour attack-priority concept without hard-coded object IDs.
- Assault Team `attackCommonTarget` is now active: Teams issue normal authoritative `ATTACK` commands against their scored shared objective and reassess targets on a data-defined cadence.
- Added recent economic-asset threat response. Damage against configured Harvester/economy/builder categories can redirect the base-defense Team to `GUARD_OBJECT` the threatened asset for a bounded hold window.
- Added `REFORMING` Team lifecycle. Assault Teams below a data-defined surviving-strength threshold retreat to rally; missing minimum members become ordinary v0.6.1 factory work orders; replacements rejoin, re-rally and reactivate the same Team.
- Added AI construction location-safety filtering using a data-defined hostile combat/defense radius, on top of the existing authoritative placement validator.
- Added generic navigation-valid harvest approach resolution. Resource orders account for pathfinder cell snapping and locomotor arrival tolerance; unreachable fields are rejected with `RESOURCE_UNREACHABLE` and AI Harvesters skip them.
- Moved the validation map west Dense Mineral Field from `(-58, 102)` on the steep river ledge to `(-58, 82)` on reachable terrain.
- Snapshot format advanced to **v12**; restore accepts v8/v9/v10/v11/v12.
- Added six tactical/resource regression tests. Full automated suite now passes **91/91** tests.
- Added `TACTICAL_AI_AUDIT.md`. No production GLBs or terrain assets were modified.

## v0.6.1 — Autonomous AI Economy + Construction + Production

- Corrected stale v0.6.0 client/version labels in the HUD/title/startup status and asset-catalog metadata; gameplay code was already v0.6.1.

- Added generic `SkirmishEconomyPlanner` as the economy/base-building layer beneath `SkirmishAIPlayer`; policy is defined by AI-profile JSON rather than concrete unit/building branches.
- Added autonomous Harvester control through ordinary authoritative `HARVEST` / `RETURN_CARGO` commands. Idle collectors only seek resources once an owned operational Refinery exists, and resource choice considers distance plus current collector congestion.
- Added data-driven AI `buildList` goals with desired counts, priority, placement anchor/yaw policy, spacing/search parameters, and a configurable active-construction-site limit. Existing construction sites count toward desired structure totals so the planner cannot spam duplicate pending builds.
- AI structure decisions call the same `ConstructionSystem.eligibility()` and `PlacementValidator` path used by the player, then issue ordinary `CONSTRUCT` commands through `CommandBus`. No AI-only structure spawning path was added.
- Added generic low-power recovery bias for definitions containing `PowerProducer`, without naming a concrete power structure in runtime AI code.
- Added production-demand planning for desired Harvesters, missing `RECRUITING` Team composition, and data-defined free-unit reserves. Producer selection uses normal `ProductionSystem.canQueue()` legality and queue/load state before issuing `PRODUCE`.
- Empty `RECRUITING` Teams now remain valid work orders while factories satisfy their minimum composition; RALLYING teams that fall below minimum return to RECRUITING. Existing recruit timeouts still bound stalled work orders.
- Updated `crimson_skirmish_basic` with economy timers, two-Harvester target, structure build list, reserve Rifleman policy, and per-Team production priority. On the validation map the AI can mine, add a second Harvester, expand power/defense, replace missing desired structures, and produce missing Team composition after casualties.
- Snapshot format advanced to **v11**, including economy-planner timers; restore accepts v8/v9/v10/v11 and refreshes restored controller references to the authoritative player state.
- Added DataRegistry validation for AI economy intervals, Harvester definition/capabilities, build-list definitions/placement policies, free-unit reserves, and Team production priorities.
- Added six v0.6.1 economy/production tests covering data policy, autonomous harvesting/expansion, refinery reconstruction, empty-Team production work orders, deterministic v11 restore, and a source guard forbidding direct gameplay mutation from the planner.
- Full automated suite now passes **85/85** tests.
- No production GLBs or terrain assets were modified.

## v0.6.0 — Teams + Skirmish AI Foundation

- Added data-driven `TeamPrototype` content for Crimson base-defense and assault roles, including composition minima/maxima, recruitment/rally policy, stance, formation metadata, common-target policy scaffolding, and instance limits.
- Added deterministic runtime `TeamManager` with stable Team IDs, explicit RECRUITING/RALLYING/ACTIVE/DESTROYED/DISBANDED lifecycle, authoritative member IDs, exact-definition recruitment, rally checks, disbanding, and snapshot/restore.
- Added map/profile-configured `SkirmishAIPlayer` controllers for nonhuman players. AI strategic work runs on data-defined think and enemy-acquisition timers rather than every simulation tick.
- Added basic enemy acquisition, base-defense threat response, assault-team rally/activation, and target selection.
- AI issues ordinary `FROM_AI` MOVE / GUARD / ATTACK_MOVE / SET_STANCE commands through the same CommandBus and simulation ownership checks used by the human player. No AI-only movement/combat mutation path was introduced.
- The construction-validation enemy now uses `crimson_skirmish_basic`: one Rifleman becomes the base guard and the existing Aegis-X + HMMWV form the first assault team after a data-defined delay; the Harvester is not recruited into combat teams.
- Added AI command-result isolation so background computer commands do not overwrite player-facing command feedback.
- Snapshot format advanced to **v10** with Team membership/lifecycle and SkirmishAI target/timer state; v8/v9 restore remains accepted.
- Updated map-manifest validation for AI profile waypoint/anchor references and DataRegistry validation for TeamPrototype/AI-profile references.
- Added deterministic regression coverage for exact team recruitment, AI command provenance, base-defense reaction, v10 Team/AI restore, and identical-simulation AI determinism.
- Added deterministic cleanup for terminal Team records so reinforcement retries cannot grow Team history indefinitely.
- Full automated suite now passes **79/79** tests.
- No production GLBs or terrain assets were modified.
- Autonomous AI economy, harvesting/building/production, reinforcement/rebuild logic, diplomacy, difficulty/personality, and full formation routing remain the next v0.6.x layers.

## v0.5.4 — Dynamic Collision + Local Avoidance Foundation

- Replaced the old friendly-only post-movement circle shove with a deterministic `LocalAvoidanceSystem` that operates before and after locomotion.
- Added a data-driven simulation `Geometry` module separate from locomotor behavior and render meshes. Aegis-X, HMMWV-50, Field Harvester and Talon define oriented BOX footprints; Rifleman defines a CYLINDER footprint.
- Corrected the core vehicle-footprint mismatch: long vehicles are no longer approximated only by their narrow width-sized movement radius.
- Added deterministic spatial-hash broadphase for nearby mover pairs instead of an all-movers O(n²) separation pass.
- Added predictive local yielding from relative motion with locomotor-defined personal space, avoidance buffer/look-ahead, braking, maximum avoidance heading offset, collision mass, padding and impact-speed retention.
- Extended locomotors to consume generic transient `speedScale` / `headingOffset` constraints while retaining their own tracked, wheeled, infantry and air steering rules.
- Added hard OBB/circle overlap resolution after movement as a safety net. Separation attempts are revalidated against navigation; when neither side can move legally, previous legal positions are available for rollback rather than pushing through blocked terrain.
- Ground collision is ownership-independent: friendly and enemy ground movers remain physically solid to one another.
- Left rotary-air dynamic collision disabled until an altitude/layer-aware policy exists instead of imposing inaccurate 2D collision on aircraft.
- Added registry validation for geometry and locomotor collision/avoidance data.
- Added regression tests for long-vehicle geometry, head-on HMMWV traffic, enemy/friendly solidity, convoy yielding behind a stopped tank, and deterministic three-vehicle crossing, and wall-side collision correction that never pushes units into blocked navigation.
- Snapshot schema remains **v9**; no transient avoidance state is serialized.
- Production GLBs remain byte-for-byte unchanged.
- Full suite: **72/72 tests passing**.

## v0.5.3 — Client Animation Foundation

- Added generic data-driven `ClientAnimation` presentation modules, following the C&C GameLogic/client-draw separation: simulation state remains authoritative while the renderer drives embedded GLB clips and authored mechanical pivots.
- Audited all 16 current production/reference GLBs. Only Rifleman (`CombatWalk`, `AimFire`) and the reference-only legacy BTR (`Btr anima`) contain embedded glTF animation clips; the other ForgeRTS assets expose named mechanical pivots intended for runtime animation.
- Added embedded GLB clip playback through per-view `THREE.AnimationMixer` instances only for definitions that declare clips; Rifleman now uses `CombatWalk` while moving and one-shot `AimFire` on weapon-fire events, with movement-speed-scaled playback and fades.
- Added generic procedural animation drivers for `WHEEL_SPIN`, `STEERING`, `CONTINUOUS_SPIN`, `STATE_SPIN`, `OSCILLATE`, and generated-pivot `GROUP_SPIN`, all configured in object definition data rather than concrete unit/building branches.
- Activated authored mechanical motion for Aegis-X running gear, HMMWV wheels/steering, Harvester wheels/steering/harvest drum/gathering arms, Talon rotors, Power Node/Grid Bastion cooling fans, Refinery dust fan, Command Nexus radar, Tactical Command Post radar, Barracks roof fans, and Vehicle Factory roof fans. Existing simulation-driven turret yaw remains authoritative for armed vehicles/Guardian Turret.
- Stateful pivots that do not yet have an authoritative semantic driver (service/production doors, conveyors/feeders, gun pitch/recoil, hopper/intake mechanisms, sensor heads, etc.) remain deliberately dormant instead of receiving fake cosmetic motion.
- Animation runtime precompiles clip-driver/state paths and only creates `AnimationMixer` instances for definitions that actually bind embedded clips; procedural clients stay lightweight for mobile.
- Added regression coverage validating every configured clip/node/prefix/pivot against the production GLBs, exhaustively inventories all embedded clips, and forbids concrete ForgeRTS object-name branching in the generic animation runtime.
- Production GLBs remain byte-for-byte unchanged.
- Full suite: **66/66 tests passing**.

## v0.5.2 — Tactical Commands + Resource Readability

- Added data-driven `ResourceFieldVisual` presentation: each logical mineral deposit can render deterministic multi-cluster copies of the existing GLB with definition-controlled radius, scale variation, crystal-material matching, emissive strength, glow color, and ground glow.
- Resource-field depletion now progressively removes/fades visual clusters while the authoritative simulation remains one finite Resource GameObject; production GLBs are unchanged.
- Added brief HARVEST target feedback for resource-field taps.
- Added data-driven combat CommandSet with `ATTACK_MOVE`, `GUARD`, queued-order toggle, and stance cycling.
- Added multi-unit selection, drag/box selection, additive selection, and group order issuing in the client layer.
- Expanded `UnitAIUpdate` with persistent `ATTACK_MOVE`, `GUARD_POSITION`, `GUARD_OBJECT`, serializable appended order queues, GUARD/AGGRESSIVE/HOLD_POSITION stance state, and data-defined idle auto-acquisition/scan/leash/return policy.
- Added command-source/issuer metadata (`FROM_PLAYER`, `FROM_SCRIPT`, `FROM_AI`, `FROM_SYSTEM`) and authoritative simulation ownership checks; the UI now consumes command results instead of assuming acceptance.
- Friendly-unit separation now revalidates candidate positions against pathfinding walkability.
- Interaction cleanup now bounds completed-session history while retaining active sessions; docking provider capacity is respected.
- Production rollout adds same-producer exit reservation through a `WAITING_EXIT` state instead of spawning another unit into an occupied rollout.
- Player resource-harvest totals are explicit simulation state, preventing field-test progress from depending on future enemy depletion.
- Fixed duplicate validation-map ID and made camera zoom operate around maintained camera focus rather than world origin.
- Snapshot format advanced to **v9** for tactical AI/order state and harvest accounting, with v8 restore compatibility.
- Added regression coverage for authority rejection, queued orders, Attack Move resume, Guard engagement, idle stance auto-acquisition, v8 AI-state normalization, resource-visual definitions/map identity, interaction-history pruning, and player harvest accounting.
- Full suite: **62/62 tests passing**.

## v0.5.1 — Construction Validation + Mobile Command UI

- Added a dedicated `construction_validation.json` playable scenario while preserving the full `training_ground.json` regression map.
- Player now begins with only Command Post, Aegis-X, HMMWV-50, Harvester, and $8,500; all player tech structures must be constructed through the real v0.5.0 systems.
- Added an 8-step FIELD TEST objective sequence covering power, refinery, harvesting, Barracks, infantry production, Vehicle Factory, vehicle production, and Guardian Turret.
- Command Post is auto-selected and camera-centered at startup so the construction flow is immediately discoverable on mobile.
- Reworked contextual controls into an explicit mobile command dock with BUILD / PRODUCTION / HARVESTER / CONSTRUCTION headings and concise interaction hints.
- Locked build commands remain visible and report missing prerequisites / funds / limits.
- Added a dedicated placement banner with live VALID / invalid-reason feedback while the world-space building ghost moves.
- Placement preview changes now notify the UI continuously instead of only when entering/leaving placement mode.
- Added `InputController.selectById()` for deterministic initial UI selection without synthesizing touch input.
- Snapshot format remains v8; no new simulation-state schema was required.
- Added dedicated vertical-slice regression coverage, including an end-to-end Power → Refinery → harvest → Barracks → Rifleman sequence.
- Full suite: **53/53 tests passing**.
- Production GLBs and terrain textures remain unchanged.

## v0.5.0 — Base Construction + Tech Tree + Command Sets

- Added data-driven `CommandSet` registry and selected-object command rendering for construction, production, cargo return, and queue cancellation.
- Added serializable `BUILD_STRUCTURE` and `CANCEL_CONSTRUCTION` CommandBus commands.
- Added `TechTreeSystem` for builder permission, operational prerequisites, build limits, and affordability.
- Added `PlacementValidator` with authoritative builder-radius, map-bounds, water, slope, height-variation, blocked-terrain, building-footprint, and resource-blocker checks.
- Added translucent valid/invalid placement ghost, 90° rotation, and build-placement cancellation on mobile/desktop input.
- Added `ConstructionSystem` with real selectable/damageable construction-site GameObjects, deterministic progress, partial refund, completion state, and operational module activation.
- Added data-defined construction costs/times/prerequisites/build limits/refund fractions and construction sockets for Power Node, Refinery, Barracks, Vehicle Factory, and Guardian Turret.
- Added a generic `Builder` module to the Tactical Command Post using construction-yard style placement; mobile-builder socket approach logic is scaffolded for a future dedicated builder unit.
- Under-construction Power/Production/Docking/Weapon systems are gated until completion.
- Construction health grows with progress while preserving combat damage; destroyed sites never activate.
- Pathfinder building occupancy is now dynamic: runtime structures register footprint obstacles and cancelled sites remove them without rebuilding authored map data.
- Added resource placement blockers so mineral fields reject structure overlap without becoming movement obstacles.
- Snapshot format advanced to **v8**, preserving construction/operational state and the new construction-system serial state in addition to prior economy/combat/locomotion data.
- Added construction regression coverage for CommandSets, valid/invalid placement, credit reservation, module gating, cancellation/refunds, prerequisites, damage preservation, destroyed sites, and v8 deterministic restore.
- Full automated suite now passes **49/49** tests.
- All production GLBs remain byte-for-byte unchanged.

## v0.4.0 — Faction Economy + Production + Docking

- Added deterministic `FactionEconomySystem` with credits, data-driven power production/consumption, low-power state, deposits, withdrawals, and production-rate effects.
- Added serializable `HARVEST`, `RETURN_CARGO`, `PRODUCE`, and `CANCEL_PRODUCTION` commands to the shared CommandBus.
- Added `ResourceSystem` with finite resource depletion, Harvester cargo, explicit resource-target orders, automatic return-to-refinery behavior, and resume-after-unload behavior.
- Wired the existing `resource_docking` interaction protocol into real runtime docking: request, grant, approach, dock, unload, release, exit, complete.
- Added generic `ProductionSystem` for Barracks and Vehicle Factory queues, queue-time credit costs, cancellation refunds, build progress, low-power slowdown, deterministic dynamic entity creation, and rollout/rally behavior.
- Wired vehicle and infantry rollout protocols into production runtime rather than spawning units directly into normal movement.
- Added data-driven `ProductionCost`, `Production`, `PowerProducer`, `PowerConsumer`, `ResourceCollector`, `DockingProvider`, and `Resource` module usage.
- Added player Power Node, Refinery, Barracks, Harvester, and Rich/Dense mineral fields to the training map; mirrored economy structures for the enemy faction as passive test content.
- Added context-sensitive mobile/desktop production controls and Harvester `RETURN CARGO` control.
- Resource GLBs now scale down visually as their simulation capacity depletes.
- Snapshot format advanced to **v7**, preserving faction economy, collector state, resource depletion, production queues, active rollouts, dynamically produced entities, interactions, combat, and locomotion state.
- Added economy/production regression tests for harvesting/docking/unloading, finite depletion, vehicle production, infantry production, cancellation refunds, rollout protocols, power state, and v7 snapshot restore.
- Preserved v0.3.1 locomotion/turn-around behavior and v0.3.0 combat architecture.
- All production GLBs remain byte-for-byte unchanged.

## v0.3.1 — Reverse / Turnaround + Combat Approach Stability

- Reworked reverse selection to consider the persistent terminal destination, not only the next short path waypoint.
- Added bounded short-reverse behavior for nearby behind-the-hull destinations.
- Added deterministic wheeled turn-around states: `THREE_POINT_REVERSE` and `THREE_POINT_FORWARD`.
- Added data-driven maximum reverse distance, forward-preference distance, reverse entry/exit angles, three-point reverse distance/speed/steer limits, timeout, and reverse re-entry cooldown.
- Tracked vehicles now reserve reverse for short tactical destinations and pivot toward long behind-orders.
- UnitAI stuck/repath detection now recognizes deliberate three-point maneuvers and does not discard their route while they temporarily move away from the terminal destination.
- Added ATTACK range hysteresis so already-engaged units hold firing position across small target-distance changes instead of oscillating between approach and firing.
- Added locomotor maneuver state to deterministic entity state and snapshot format v6.
- Added debug HUD visibility for non-forward maneuver modes.
- Expanded locomotor tests for short reverse, long-route turn-around, tracked long-route forward preference, and bounded reverse travel.
- Preserved all v0.3.0 combat architecture and all production GLBs unchanged.

## v0.3.0 — Combat Core

- Added serializable `ATTACK` CommandBus command and persistent UnitAI attack intent.
- Added target approach routing that moves units to a valid firing position instead of treating ATTACK as MOVE-to-target.
- Added generic `WeaponSet` runtime with slot, prefire, cadence, clip, and reload state.
- Added four initial data-defined weapons: Rifleman rifle, HMMWV .50 cal, Aegis-X 120mm cannon, Guardian twin cannon.
- Added data-driven ArmorSet definitions and damage-type multipliers.
- Added hitscan and deterministic projectile delivery paths.
- Added independent `TurretAI` world-facing state for Aegis-X, HMMWV, and Guardian Turret; Rifleman uses body aiming.
- Added autonomous Guardian Turret hostile acquisition.
- Added Body damage states and destruction behavior; destroyed units are non-selectable and retain darkened wreck visuals.
- Added projectile and tracer rendering without giving rendering ownership of gameplay damage.
- Added hostile tap resolution and red ATTACK feedback ring on mobile/desktop input.
- Snapshot format advanced to v5 and includes combat, weapon, turret, damage, and projectile state.
- DataRegistry now validates references from GameObject definitions to assets, locomotors, interactions, weapons, and armors.
- Added combat regression tests covering armor relationships, ATTACK persistence, tank projectile combat, HMMWV hitscan, autonomous Guardian Turret fire, destruction, and snapshot determinism.
- Preserved all v0.2.2 locomotion/facing, GameObject modules, interaction protocols, map/terrain, and persistent-world foundations.
- All production GLBs remain byte-for-byte unchanged.

## v0.2.2 — Locomotor Facing + Vehicle Steering

- Corrected Aegis-X and HMMWV Render heading offsets to match their authored `+X` forward axes; corrected Harvester to its authored `+Z` forward axis.
- Split locomotion behavior into explicit tread, wheel, leg, and air paths.
- Added tracked pivot-turn behavior with separate moving/pivot turn rates and backward movement state.
- Added wheel steering based on steering angle, wheelbase, curvature, speed reduction on hard turns, and correct reverse steering.
- Added `wheeled_heavy` locomotor profile for the Field Harvester.
- Runtime/snapshot state now persists angular speed, steering angle, and reverse state. Snapshot format advanced to v4.
- Added locomotor-facing tests for track pivoting, wheeled arcs, reverse behavior, and asset heading calibration.
- Preserved all v0.2.1 module, interaction, input, strategic-region, terrain, navigation, and persistent-order foundations.
- All production GLBs remain byte-for-byte unchanged.

## v0.2.1 — GameObject Modules + Interaction Core

- Migrated all production object definitions to explicit composable GameObject modules.
- Added `engine/entities/game-object.js` for generic module parsing, validation, runtime creation, rendering/footprint lookup, and transitional v0.2 compatibility.
- Added serializable `InteractionManager` with role-checked, data-defined state transitions.
- Added `resource_docking` and `factory_rollout` interaction protocols.
- Added `GestureResolver` so TAP / LONG_PRESS / PAN / PINCH are classified before gameplay commands are emitted.
- Added persistent region strategic state: owner, threat, resource value, AI activity, discovered-by factions/players.
- Snapshot format advanced to v3 and includes runtime module state, interaction sessions, and region state.
- Renderer now obtains model asset/scale/heading from the Render module rather than unit-specific top-level fields.
- Navigation obtains structure footprints through the Footprint module.
- Expanded the C&C parity matrix to combine Red Alert, Generals/Zero Hour, and RA3-style data lessons.
- Preserved all v0.2.0 terrain/map foundations and all existing production GLBs unchanged.

## v0.2.0 — Core Parity + World Foundation

- Added Generals parity matrix and stricter architecture contract.
- Added UnitAIUpdate state layer with persistent MOVE intent, destination correction, blocked state and throttled repathing.
- Pathfinder now evaluates explicit obstacles, per-locomotor clearance, terrain slope and water separately from rendering.
- Locomotors now operate only on UnitAI goals and are data-driven for legs, wheels, treads and rotary air.
- Added versioned snapshot/restore state.
- Replaced hard-coded registry file lists with `data/registry.json`.
- Upgraded training map to MapManifest v2 with future-region metadata, terrain materials, roads, river, passability, waypoints, trigger areas, resources, AI anchors and environment.
- Added real heightfield rendering with grass/dirt/rock splat textures and slope-driven cliff weighting.
- Added terrain-conforming road surfaces/shoulders and continuous river rendering/carving.
- Added definitions for the existing Harvester, Talon, resource GLBs and additional WorldForge structures.
- Preserved all existing production GLBs unchanged.
