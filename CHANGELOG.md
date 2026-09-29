## v0.6.6.5 — Crimson Core Building Set Integration

## v0.6.6.8 — Crimson Artillery + Infantry

- Integrated accepted Crimson Anvil SPG v002, Praetorian Exosuit v002, and Line Trooper v001 assets.
- Crimson-owned shared `rifleman` units now render the authored Line Trooper while Aegis keeps the existing Rifleman asset.
- Added data-defined Anvil artillery and Praetorian elite infantry definitions, weapons, armor/locomotor support, production access for Crimson AI, and Team composition hooks.
- Added immediate validation-map spawns for the Anvil and Praetorian; the existing enemy rifleman validates Line Trooper routing.
- Preserved the engine/render/UI safety boundary; stabilizer deployment and baked infantry motion clips remain intentionally deferred rather than adding unsourced runtime behavior.


## v0.6.6.6 — Crimson Command Citadel + Fortification Integration

This release integrates the newly accepted Crimson command/fortification art without changing ForgeRTS engine, renderer, UI-engine, economy, production, combat, locomotion, player-relations, or AI runtime code.

- Crimson-owned `command_post` now routes to `crimson_command_citadel_v001.glb` through the existing faction-specific Render path.
- The Crimson Citadel uses `AUTHORED` faction color mode, so the legacy global Crimson red tint is not applied.
- Added the full Crimson wall kit as registered authoritative building content: 8 m straight, 4 m straight, fortified corner, and universal junction/end post.
- Added the Crimson Armored Gate as registered authoritative gate content with the same `crimson_perimeter` WallConnection group and matching 1.8 m wall-system thickness.
- Added an intentionally non-enclosing rear/east Crimson fortification section to the construction-validation map so every wall module and the gate are visible in the live game without trapping the Skirmish AI behind a closed gate.
- Wall/gate content is **not** added as four/five separate player build buttons. The planned normal UX remains one Wall tool plus Gate; drag/autoconnection and authoritative gate open/close pathing are separate gameplay work.
- The gate remains a real closed pathing obstacle in this release; it is placed on the rear defensive section rather than across the AI's active exit/resource/combat routes.
- The existing Aegis Command Post visual and radar presentation are preserved. A Crimson-only data-driven `RadarYawRoot` spin binding drives the Citadel radar.
- Existing Crimson Garrison, War Factory, Thermal Plant, Ore Works, and Bastion Gun routes remain unchanged.
- All six new GLBs are copied byte-for-byte from their accepted production assets.
- Engine, renderer and UI-engine directories are byte-for-byte unchanged from v0.6.6.5.

Validation target: 134/134 automated tests, 0 content errors/warnings, all JSON parsed, all JS/MJS syntax checked, and exact packaged ZIP re-verification.

- Integrated Crimson Thermal Plant v001 as the Crimson visual variant of `power_node`.
- Integrated Crimson Ore Works v001 as the Crimson visual variant of `refinery`.
- Integrated Crimson Bastion Gun v002 as the Crimson visual variant of `guardian_turret`.
- Preserved the prior Garrison Block v003 / War Factory v001 mappings, giving the enemy five canonical Crimson building visuals.
- Marked all three new faction routes `AUTHORED`, preventing the legacy global Crimson red tint from altering their embedded PBR materials.
- Kept shared gameplay IDs and AI build-list roles unchanged; faction ownership alone selects the visual.
- Added generic optional faction-routed animation-node validation.
- Added generic `TRIGGER_TRANSLATE` client animation support and bound Bastion `BarrelRecoilRoot` to `WEAPON_FIRE` for a 0.30 m presentation-only recoil cycle.
- Expanded Crimson visual regression tests to cover all five core role mappings, enemy-map ownership, authored tint policy, and Bastion articulation/recoil hierarchy.

## v0.6.6.4 — Crimson Garrison + War Factory Integration

- Integrated the accepted Crimson Garrison Block v003 and Crimson War Factory v001 as faction-specific visual variants of the existing `barracks` and `vehicle_factory` gameplay roles.
- Added generic `Render.assetByFaction` routing so ownership/faction can select authored faction art without duplicating simulation definitions.
- Added `Render.factionColorModeByFaction` and marked the two canonical Crimson buildings `AUTHORED`, preventing the legacy Crimson red tint from altering their embedded PBR colors.
- Existing Crimson placeholder buildings keep the legacy tint until their canonical authored replacements are available.
- Crimson AI build-list IDs remain `barracks` / `vehicle_factory`; production, tech prerequisites, costs, power, footprints and AI logic are unchanged.
- Canonicalized faction display name to **Crimson Directorate**.
- Added focused faction-visual regression tests. Full automated suite passes **128/128**.

## v0.6.6.3 — Aegis Power Node + Guardian Turret Material Integration

- Integrated the accepted Aegis Field Power Node material pass as `aegis_field_power_node_v2.glb`.
- Integrated the accepted Guardian Turret v007 appearance as `aegis_guardian_turret_v032.glb`.
- Preserved the Power Node authored root/socket hierarchy and all node transforms.
- Restored the Guardian Turret production articulation/root/socket hierarchy (`GuardianTurretRoot`, `TurretRoot`, `GunPitchRoot`, `MuzzleSocket`, `SensorSocket`, and WorldForge markers) around the accepted visual geometry.
- Kept prior Power Node v1 and Guardian Turret v031 GLBs for rollback/reference.
- No authoritative gameplay, power, combat, AI, economy, navigation, relationship, or simulation behavior changed.

## v0.6.6.2 — Aegis Command Post + Refinery Material Integration

- Integrated the accepted Aegis Tactical Command Post material pass as `aegis_tactical_command_post_v22.glb`.
- Integrated the accepted Aegis Field Refinery material pass as `aegis_field_refinery_v3.glb`.
- Updated the active asset catalog to select the new production GLBs while retaining v21/v2 rollback copies.
- Preserved Command Post root/socket hierarchy, radar/service-bay roots, node transforms, geometry names, bounds, face counts, and original double-sided semantics.
- Preserved Refinery harvester docking/unload/queue/rally sockets, processing/storage roots, FX sockets, construction anchors, node transforms, geometry names, bounds, face counts, and double-sided semantics.
- No gameplay, balance, simulation, AI, pathfinding, economy, diplomacy, or production behavior changed.

## v0.6.6.1 — Aegis Material Integration

- Integrated approved textured Aegis Vehicle Factory v022 and Field Barracks v024 GLBs.
- Updated the asset catalog to use the new visual assets while retaining previous GLBs for rollback/reference.
- Preserved production geometry names, visual bounds, WorldForge marker nodes/root metadata, and original double-sided rendering behavior.
- No gameplay/simulation data changes.

# ForgeRTS Changelog

## v0.6.6.7 — Crimson Vehicle Roster Integration

- Added accepted Crimson Breaker MBT v001, Raider Halftrack v002, Warder IFV v001 and Reclaimer Harvester v001 to the active asset catalog.
- Added faction-authored vehicle routing for the shared MBT, light-combat and Harvester gameplay roles.
- Reclaimer keeps the existing authoritative Harvester economy/docking logic; its integrated GLB is root-oriented to the shared Harvester forward axis and its articulated animation nodes are namespaced so Aegis/Crimson presentation drivers cannot conflict.
- Added `warder_ifv` plus `warder_30mm` using existing GameObject, combat, locomotion, production and AI modules; no new runtime subsystem was introduced.
- Crimson AI mobile/armor response teams can field the Warder; one starts in the active validation map for immediate visual verification.
- Added optional Crimson-only recoil/vehicle animation bindings without changing Aegis asset behavior.
- No `engine/`, `renderer/`, or `ui/` changes.

## v0.6.6 — Player Relations + Hostility Authority

- Added simulation-owned, deterministic `PlayerRelationMap` with implicit `SELF` and directional `ALLY` / `NEUTRAL` / `ENEMY` overrides.
- Added validated map `playerRelations[]` data with strict player-endpoint, relation-value, duplicate-pair and SELF-override rejection.
- Preserved the v0.6.5 two-player baseline by treating distinct known authored players as ENEMY when no explicit relation exists; unknown/ownerless endpoints resolve as NEUTRAL.
- Replaced different-owner hostility assumptions in ATTACK authorization, UnitAI target acquisition/chase, TurretAI, projectile world collision, SkirmishAI enemy/base-defense logic, StrategicAI threat evaluation, economic defense and AI construction-safety checks.
- `GUARD_OBJECT` now accepts allied-owned targets through the same relation authority while ownership of ordinary player commands remains unchanged.
- Added simulation relationship query/mutation APIs for future mission scripting. Runtime ENEMY→NEUTRAL changes revoke hostile attack/acquisition on the next fixed simulation step; already-fired projectiles remain physical simulation objects.
- Snapshot schema advanced to **v16** and persists relation overrides; v8-v15 restore remains supported, with pre-v16 saves deriving map-start relationships.
- Added `PLAYER_RELATIONS_AUDIT.md` and relation regression coverage. Full automated suite now passes **125/125** tests.
- No production GLBs, terrain assets, movement rules, economy rules, production rules or renderer-owned gameplay authority were changed.

## v0.6.5 — Content Expansion + World Composition Foundation

- Added versioned ForgeRTS content contract v1 and explicit `ContentMeta` classification to all registered production definitions.
- Added FACTION/CIVILIAN/NEUTRAL/WORLD content affiliations and stable category indexing without pretending that content affiliation is already full diplomacy.
- Added eight authoring templates plus batch content-pack loading so future content families can be registered without engine-source edits.
- Added generic wall/gate `WallConnection` groups, sockets, roles and deterministic snap helper.
- Added ownerless civilian/neutral runtime validation prototypes and dedicated `content_validation` map.
- Added GLB asset-ingestion audit tooling and machine-readable reports for bounds, clips, materials/meshes and pivot hints; visual bounds remain non-authoritative suggestions.
- Added content/map validation tooling for asset/definition/map references, required Geometry/Footprint, animation bindings, factory exits and other authoring hazards.
- Added `WORLD_FORGE_EXPORT_SPEC.md` and `CONTENT_PIPELINE_AUDIT.md` to lock the WorldForge→ForgeRTS data boundary before mass asset production.
- Runtime GameObjects now carry definition-derived content affiliation/categories. Snapshot format advances to **v15** with v8-v14 restore support retained.
- Existing v0.6.4 combat, AI, economy, collision and animation behavior remains unchanged by the content layer.


## v0.6.4 — Skirmish Defense + Combat Completion

- Added timer-bounded, data-driven `EconomicDefenseManager` modeled on the Generals supply-source attacked/safe + guard-supply-center responsibility boundary.
- Added light/mobile/heavy economic-response TeamPrototypes selected by generic threat-category weights.
- Missing emergency defenders become ordinary high-priority factory work orders; no reinforcement spawn shortcut exists.
- Repeated economic raids can extend a bounded Harvester/economy escort window; temporary response Teams release units after the area is safe.
- Severe economic threats can temporarily recall a nearby data-allowed ACTIVE Team (currently ASSAULT) as immediate cover while the dedicated response Team recruits/produces. The borrowed Team keeps its membership/lifecycle intact and is released back to normal strategic duty as soon as dedicated defenders are ready or the threat clears.
- Added full fixed-step projectile world collision against the earliest eligible intervening hostile unit/building and terrain while preserving separate designated-target collision.
- Added data-driven projectile `worldCollision` policy and deterministic terrain segment intersection.
- Added authoritative BOX `Geometry` to all production buildings so projectile collision is 3D rather than a legacy tiny fallback volume.
- Snapshot schema advanced to v14; v8–v13 restore remains accepted.
- Added regression coverage for threat-sized economic response, factory reinforcement demand, whole-Team emergency recall/return-to-duty, escort/snapshot determinism, moving and static intervening-object collision, terrain collision and building Geometry.

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