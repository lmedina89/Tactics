# ForgeRTS v0.6.6.5 — Crimson Core Building Set


## v0.6.6.5 — Crimson Thermal Plant + Ore Works + Bastion Gun Integration

This patch completes the five currently authored Crimson Directorate gameplay-role replacements while preserving the shared authoritative ForgeRTS definitions. The three newly accepted visuals are selected by faction ownership rather than by duplicated Crimson-only gameplay IDs.

- Crimson-owned `power_node` renders `assets/buildings/crimson_thermal_plant_v001.glb`.
- Crimson-owned `refinery` renders `assets/buildings/crimson_ore_works_v001.glb`.
- Crimson-owned `guardian_turret` renders `assets/buildings/crimson_bastion_gun_v002.glb`.
- The previously integrated Crimson `barracks` and `vehicle_factory` continue using Garrison Block v003 and War Factory v001.
- All five authored Crimson replacements use `factionColorModeByFaction.crimson = "AUTHORED"`; the old renderer-level red tint is not applied to these models.
- Aegis continues using the existing Aegis visuals for the same gameplay definitions.
- Crimson AI still requests the normal `power_node`, `refinery`, `barracks`, `vehicle_factory`, and `guardian_turret` role IDs, so economy, production, prerequisites, balance, placement, targeting and save-state behavior remain shared.
- The construction-validation enemy is already faction `crimson` and contains all five roles, so the authored variants appear immediately in the field-test scenario; the AI also rebuilds/builds the same roles through its existing build list.
- Bastion Gun v002 keeps the accepted geometry unchanged and uses its existing `TurretRoot` for yaw plus the new `BarrelRecoilRoot` hierarchy for presentation-only weapon recoil.
- Recoil is driven by the generic client-animation system on `WEAPON_FIRE` and does not feed transforms back into authoritative simulation state.

## v0.6.6.4 — Crimson Garrison + War Factory Integration

This visual/content patch adds the first two canonical Crimson Directorate production structures without duplicating authoritative gameplay definitions. `barracks` and `vehicle_factory` remain the shared gameplay roles; their `Render` modules now resolve faction-specific assets for Crimson owners.

- Crimson-owned `barracks` renders `assets/buildings/crimson_garrison_block_v003.glb`.
- Crimson-owned `vehicle_factory` renders `assets/buildings/crimson_war_factory_v001.glb`.
- Aegis-owned instances continue to render the existing Aegis Barracks and Vehicle Factory assets.
- Both Crimson authored assets use `factionColorModeByFaction.crimson = "AUTHORED"`, so the legacy renderer-level red tint is **not** applied to their embedded PBR palette.
- Other Crimson placeholder buildings retain the legacy tint until their canonical authored replacements exist.
- Crimson AI continues using the standard `barracks` / `vehicle_factory` gameplay definitions, so production, prerequisites, AI queries, tech logic and balance remain unchanged.
- Existing preplaced enemy buildings automatically receive the Crimson models from their owner faction; maps do not need faction-specific definition IDs.
- The Crimson faction display name is canonicalized to **Crimson Directorate**.

## v0.6.6.3 — Aegis Power Node + Guardian Turret Material Integration

This narrow visual-content patch is built directly on the validated v0.6.6.2 release. It integrates the accepted Field Power Node and Guardian Turret material passes without changing authoritative gameplay definitions, power output, turret weapon behavior, footprints, health, AI, pathfinding, player relationships, economy, production, or simulation behavior.

- `aegis_field_power_node` now resolves to `assets/buildings/aegis_field_power_node_v2.glb`.
- `aegis_guardian_turret` now resolves to `assets/buildings/aegis_guardian_turret_v032.glb`.
- The prior Power Node v1 and Guardian Turret v031 files remain in `assets/buildings/` as rollback/reference assets.
- Power Node v2 preserves all authored root/socket nodes and transforms, including generator/transformer/fuel/cooling roots, cooling fan roots, power/service/repair/build sockets, damage-FX sockets, and construction anchors.
- Guardian Turret v032 preserves the original `GuardianTurretRoot`, `TurretRoot`, `GunPitchRoot`, `MuzzleSocket`, `SensorSocket`, WorldForge markers, transforms, and runtime articulation hierarchy while using the accepted v007 material/geometry appearance.
- Material textures are embedded in the GLBs; ForgeRTS has no runtime dependency on the external Aegis material-pack working directory.


## v0.6.6.2 — Aegis Command Post + Refinery Material Integration

This narrow visual-content patch is built directly on the validated v0.6.6.1 Aegis Material Integration release. It adds the approved Tactical Command Post and Field Refinery material passes without changing authoritative gameplay definitions, footprints, production, health, AI, pathfinding, player relationships, economy, docking logic, or simulation behavior.

- `aegis_tactical_command_post` now resolves to `assets/buildings/aegis_tactical_command_post_v22.glb`.
- `aegis_field_refinery` now resolves to `assets/buildings/aegis_field_refinery_v3.glb`.
- The prior Command Post v21 and Refinery v2 files remain in `assets/buildings/` as rollback/reference assets.
- The Command Post v22 production GLB restores and preserves every original root/socket node while embedding the accepted material appearance.
- The Refinery v3 production GLB preserves all harvester docking sockets, FX sockets, construction anchors, articulated roots, node transforms, geometry names, bounds, and authored hierarchy.
- Material textures are embedded in the GLBs; ForgeRTS still has no runtime dependency on WorldForge or the external Aegis material-pack working directory.

## v0.6.6.1 — Aegis Material Integration

This narrow visual-content patch is built directly on the validated v0.6.6 Player Relations + Hostility Authority release. It integrates the approved Aegis Vehicle Factory and Field Barracks material passes without changing gameplay definitions, footprints, production, health, AI, pathfinding, relationships, or simulation behavior.

- `aegis_vehicle_factory` now resolves to `assets/buildings/aegis_vehicle_factory_v022.glb`.
- `aegis_field_barracks` now resolves to `assets/buildings/aegis_field_barracks_v024.glb`.
- The prior production GLBs remain in `assets/buildings/` as rollback/reference assets.
- The new GLBs keep the original geometry names, bounds, WorldForge marker nodes, root metadata, and double-sided rendering semantics while embedding the shared Aegis military PBR material family.
- Material textures are embedded in each GLB; ForgeRTS has no runtime dependency on WorldForge or on an external material-pack directory.


## v0.6.6 — Player Relations + Hostility Authority

v0.6.6 inserts an authoritative player-relationship layer before mission scripting. Runtime hostility is no longer inferred from "different owner" checks. `SELF`, `ALLY`, `NEUTRAL`, and `ENEMY` are directional simulation relationships, independent from v0.6.5 `ContentMeta.affiliation`. Existing authored players remain enemies by default unless a map or runtime relationship overrides that behavior, preserving the validated Aegis-vs-Crimson baseline. Snapshot format is **v16** with restore support retained for v8-v15.

### Relationship authority

- Added deterministic `PlayerRelationMap` state with implicit `SELF` and authored directional `ALLY` / `NEUTRAL` / `ENEMY` relationships.
- Added validated map-level `playerRelations[]` entries. Invalid endpoints, duplicate directional pairs, invalid values and attempts to author `SELF` are rejected at load time.
- Added simulation-owned relationship queries/mutation (`getPlayerRelation`, `isHostile`, `isAllied`, `setPlayerRelation`, `removePlayerRelation`) so future mission scripts have one authoritative entry point.
- ATTACK authorization, UnitAI acquisition/chase, turret acquisition, projectile world-collision relation filters, SkirmishAI enemy selection/base defense, StrategicAI threat queries, economic defense and AI construction-safety checks now consult the relationship map.
- `GUARD_OBJECT` may protect objects owned by an allied player while ordinary selection/command ownership remains unchanged.
- Runtime relationship changes take effect immediately: an ENEMY→NEUTRAL change revokes active hostile acquisition/explicit attack intent on the next fixed simulation step. In-flight projectiles remain physical objects rather than disappearing.
- Unknown/ownerless endpoints are neutral by relationship policy. `CIVILIAN`, `NEUTRAL`, and `WORLD` content affiliations still do not imply diplomacy.

### Compatibility and scope

- Existing maps do not need relationship entries: two known distinct authored players continue to default to `ENEMY`, preserving pre-v0.6.6 gameplay.
- v16 snapshots persist relationship overrides. Restoring v8-v15 derives relationships from current map-start relationship data.
- This release does **not** add diplomacy UI, treaties, team-level relationship overrides, mission scripting, fog/shroud/player knowledge, or faction switching. Those remain separate layers.
- See `PLAYER_RELATIONS_AUDIT.md` for the source comparison, pre-change call-site audit, implementation boundary and deferred work.

## v0.6.5 — Content Expansion + World Composition Foundation

v0.6.5 establishes the stable content/runtime contract needed before ForgeRTS expands into a large library of buildings, walls, units, towns, civilian objects and props. Existing v0.6.4 combat/skirmish behavior remains intact; this release makes content ingestion, classification, batch registration, validation and future WorldForge export substantially more data-driven. Snapshot format is **v15** with restore support retained for v8-v14.

### Content pipeline

- Added versioned `data/content-contract.json` and explicit `ContentMeta` on every registered production definition.
- Added FACTION / CIVILIAN / NEUTRAL / WORLD affiliations plus stable content categories. These are content classifications; v0.6.6 adds separate authoritative player relationships without changing that distinction.
- Added eight authoring templates covering civilian/military buildings, vehicles, infantry, aircraft, walls, gates and props. Templates validate structure but do not become runtime inheritance.
- Added batch `contentPacks` so future asset families can register definitions/catalogs without adding engine-source branches or bloating the root definition list.
- Added generic `WallConnection` groups/sockets and deterministic snap math for future wall/gate authoring. Advanced drag-build/gate pathing remains deferred.
- Added ownerless civilian/neutral validation prototypes and `maps/content_validation.json` to prove those objects exist as authoritative GameObjects before final art is available.
- Runtime GameObjects now expose definition-derived `affiliation` and `contentCategories`; snapshot v15 serializes them while old snapshots derive them during restore.

### Asset ingestion and validation

- Added `npm run audit:assets`, which inspects every registered GLB for transformed visual bounds, clips, mesh/material names and likely mechanical/animation pivots.
- Added `npm run validate:content`, which validates content packs, definitions, assets, animation bindings, maps, placement references and selected production/content hazards.
- Current content validation result: **0 errors / 0 warnings** across **18 definitions, 16 GLB assets, 8 templates, 1 content pack and 3 maps**.
- GLB measurements are deliberately advisory. Gameplay `Geometry`, `Footprint`, armor, health, locomotion and balance remain explicit definition data.
- Added `ASSET_INGESTION_AUDIT.md`, `CONTENT_PIPELINE_AUDIT.md`, and `WORLD_FORGE_EXPORT_SPEC.md`.

### WorldForge boundary

WorldForge remains an authoring/generation tool, not a ForgeRTS runtime dependency. The intended pipeline is:

```text
WorldForge author/generate/inspect
        ↓
GLB + asset catalog + definitions + content pack + placements
        ↓
ForgeRTS DataRegistry / validator
        ↓
authoritative GameObjects + renderer
```

Towns should be exported as individual authoritative buildings/walls/gates/props whenever gameplay may later target, protect, destroy, capture or count them. See `WORLD_FORGE_EXPORT_SPEC.md` for the contract new assets should target.

## v0.6.4 — Skirmish Defense + Combat Completion

v0.6.4 closes the remaining known skirmish-defense and ordinary cannon-collision gaps before the v0.7 mission/trigger phase. A new data-driven EconomicDefenseManager creates temporary threat-sized response Teams when Harvesters/economic assets are attacked, requests missing defenders through normal factory production, can temporarily recall an intact nearby assault Team for severe raids, maintains bounded escort duty after repeated attacks, and returns recalled forces to their normal strategy when the danger clears or dedicated defenders arrive. Physical cannon shells now collide with the earliest eligible intervening hostile unit/building or terrain using authoritative GameObject Geometry; the designated-target collision path remains separate. Snapshot format is v14 with v8–v13 restore compatibility retained.

See `SKIRMISH_DEFENSE_COMBAT_AUDIT.md` for the source comparison, data model and deferred combat layers.

ForgeRTS is a separate browser-native RTS engine. WorldForge remains a separate authoring/reference project; v0.6.5 established the shared export contract without creating a runtime dependency.

v0.6.3 keeps the v0.6.2 tactical layer and closes a foundational combat gap before adding strategic intelligence. Physical shells now use launch prediction, fixed-step swept collision, real GameObject Geometry, and separate unguided/guided projectile policies. Above the existing Team/Tactical/Economy layers, a timer-bounded StrategicAIPlanner can adapt Team composition to observed enemy categories, wealth, difficulty, personality, and resource depletion while still acting through the same authoritative CommandBus and shared gameplay systems as the player.

## What changed

### Tactical battlefield intelligence

- Added named, data-driven `AttackPrioritySet` definitions modeled on the Generals/Zero Hour idea of target priority reduced by distance. Assault and defense Teams can use different target values without concrete unit/building branches.
- Added generic `AITargetable` category data (`COMMAND`, `PRODUCTION`, `ECONOMY`, `POWER`, `DEFENSE`, `HARVESTER`, `COMBAT`, `VEHICLE`, `INFANTRY`, `AIRCRAFT`, `STRUCTURE`) so targeting policy is content data rather than definition-ID logic.
- Assault Teams with `attackCommonTarget` now issue an authoritative shared `ATTACK` against the scored objective and periodically reassess it.
- Base-defense Teams react to recent damage against Harvesters/economy/builders and guard the threatened friendly object for a bounded hold window before returning to normal defense.
- Assault Teams can enter `REFORMING` when their surviving strength falls below the TeamPrototype threshold. Survivors retreat to rally, missing minimum composition becomes normal factory demand, and the Team re-rallies/reactivates after replacements arrive.
- AI construction placement now rejects otherwise-legal candidate sites inside a data-defined hostile combat/defense safety radius.
- Resource harvesting now resolves a navigation-valid harvest approach point that includes locomotor arrival tolerance. Unreachable resources are rejected authoritatively and skipped by AI resource selection. The inaccessible west Dense Mineral Field was moved from the steep ledge to a reachable authored position.
- Snapshot format advances to **v12**; restore accepts v8/v9/v10/v11/v12.
- See `TACTICAL_AI_AUDIT.md` for the Generals/Zero Hour source mapping and implementation boundary.

### Autonomous AI economy / construction / production

- Added data-driven AI economy policy: timer cadence, desired Harvester count, structure build list, unit reserves, placement anchors/yaw rules, and Team production priorities live in `data/ai/*.json`.
- Added generic `SkirmishEconomyPlanner`; it does not spawn units/structures or mutate credits/resources directly. Every AI action is issued through the same authoritative `CommandBus` used by the player and is validated by the existing gameplay system.
- AI Harvesters now mine finite mineral fields, return cargo through the normal Refinery docking protocol, and distribute across compatible resources using deterministic distance/congestion scoring.
- AI construction uses the existing tech/prerequisite/affordability checks and `PlacementValidator`. Active construction sites count toward desired structure totals, preventing duplicate build spam.
- AI production derives demand from desired Harvesters, missing RECRUITING-Team composition, and data-defined free-unit reserves, then uses compatible operational factories and their real queues.
- RECRUITING Teams may intentionally remain empty while factories fill their composition; RALLYING Teams can return to recruiting when casualties drop them below minimum strength.
- The Crimson validation profile now expands toward two Power Nodes/two Guardian Turrets, produces a second Harvester and reserve Rifleman, rebuilds missing desired structures, and can manufacture replacement Team members after losses.
- Snapshot format is now **v13**, preserving projectile-policy and strategic-planner state while retaining restore compatibility with v8-v12.
- See `AI_ECONOMY_AUDIT.md` for the C&C source mapping and implementation boundary.

### Teams + Skirmish AI foundation

- Added data-driven `TeamPrototype` definitions with role, composition minima/maxima, recruitment radius/timeouts, rally policy, stance, instance limits, formation metadata, and common-target policy scaffolding.
- Added deterministic runtime `TeamManager` state with stable team IDs and explicit `RECRUITING → RALLYING → ACTIVE` lifecycle plus destroyed/disbanded states.
- Added one `SkirmishAIPlayer` controller per map-configured nonhuman player. Strategic AI runs on data-defined think/acquisition timers instead of executing expensive strategic scans every simulation tick.
- AI recruits only eligible unassigned mobile units that match TeamPrototype composition; the validation Crimson base guard recruits a Rifleman while the assault team recruits one Aegis-X plus one HMMWV-50. The Harvester is not stolen into a combat team.
- Base-defense teams guard a data-defined anchor and react to nearby hostile incursions. Assault teams rally, activate, choose an enemy objective, and issue normal `ATTACK_MOVE` commands.
- AI commands carry `FROM_AI`, the AI player ID, and pass through the same authoritative `CommandBus`/Simulation ownership checks as player commands.
- Player HUD command-result feedback is isolated from background AI command results.
- Team membership and AI strategic timers are deterministic snapshot state. Snapshot format advances to v10 while retaining v8/v9 restore compatibility.
- v0.6.2 added richer threat response, Harvester/economy protection and retreat/reform/reinforcement. v0.6.3 adds difficulty/wealth/personality policy, adaptive Team variants and resource-driven expansion. Diplomacy, full formation routing, upgrades/sciences/veterancy, fog/radar and broader faction strategy remain later layers.

### Dynamic collision + local avoidance

- Mobile GameObjects may now declare a simulation-side `Geometry` module independent of their `Locomotor` and render asset.
- Long vehicles use oriented BOX footprints; infantry uses a CYLINDER/circle footprint. This fixes the old assumption that a tank or Harvester could be represented by a small width-sized circle.
- `LocalAvoidanceSystem` uses a deterministic spatial hash broadphase rather than testing every mover against every other mover.
- Before locomotion, nearby movers receive predictive, data-driven speed/yaw constraints from relative motion, collision mass, personal space, look-ahead, braking, and steering limits.
- After locomotion, oriented-box/circle minimum-translation collision resolution acts as a safety net. Candidate separation remains subject to pathfinder legality; if neither side can be separated legally, the system can restore the previous legal position instead of pushing a unit through blocked terrain.
- Ground units are physically solid regardless of ownership, so enemy and friendly vehicles cannot intentionally phase through one another.
- Collision tuning belongs to locomotor/geometry data, not concrete unit-name branches.
- Air dynamic collision is intentionally deferred until ForgeRTS has a real altitude/layer policy; helicopters are not forced into a fake 2D ground-style collision model.
- Existing tracked pivoting, wheeled steering/reverse/three-point turns, combat orders, harvesting, production, and client animation remain intact.

The split follows the C&C engineering lesson we want to preserve: **object geometry describes physical extent; locomotor data describes how the object moves and yields**. ForgeRTS implements that architecture in original JavaScript rather than directly translating EA collision code.


### Resource fields

The simulation still treats each mineral deposit as **one authoritative resource GameObject**. Rendering is now data-driven through `ResourceFieldVisual`:

- one logical deposit renders several deterministic copies of the existing mineral-cluster GLB
- cluster count, field radius, scale range, crystal-material matching, emissive strength, glow color, and ground glow are resource-definition data
- rich and dense fields use different visual footprints without changing harvesting logic
- outer visual clusters disappear progressively as the authoritative `resourceRemaining` value drops
- tapping a mineral field for HARVEST produces a short target-confirmation ring
- the production GLBs themselves are unchanged

This keeps pathfinding/save/economy complexity at one resource object while making fields readable on a phone.

### C&C-style tactical command layer

Combat units now expose their tactical controls through the data-defined `aegis_combat_unit` CommandSet:

- multi-unit selection
- drag/box selection
- additive selection
- `ATTACK MOVE`
- `GUARD`
- queued/appended orders for waypoint-like command chains
- data-defined combat stance foundation (`GUARD`, `AGGRESSIVE`, `HOLD POSITION`)
- idle hostile auto-acquisition for combat units according to `UnitAIUpdate` data

Attack Move and Guard are persistent UnitAI orders rather than UI shortcuts. Attack Move may acquire/engage a hostile and then resume its terminal destination. Guard may hold a world position or friendly object and return to the protected area after engagement.

### Command authority / robustness

- Commands now carry issuing-player and source metadata (`FROM_PLAYER`, `FROM_SCRIPT`, `FROM_AI`, `FROM_SYSTEM`).
- Simulation authority rejects player commands against objects the issuer does not own.
- The client consumes authoritative `lastCommandResult` instead of assuming an enqueued command succeeded.
- Friendly separation revalidates candidate positions through navigation so crowd resolution cannot knowingly push a unit into blocked terrain/structures.
- Completed interaction history is bounded while active sessions are retained.
- Dock providers honor their data-defined capacity instead of treating any one active session as globally full.
- Production holds a completed queue entry at `WAITING_EXIT` while that producer already has an active rollout.
- `construction_validation` now has its own stable map ID.
- Camera pan/zoom uses a maintained camera focus instead of zooming toward world origin.
- Player resource-harvest totals are explicit simulation state, so validation/objectives do not depend on any resource being depleted by somebody else.

### Client animation integration

- Added a generic `ClientAnimation` definition module and renderer-side animation system.
- Rifleman plays the authored `CombatWalk` GLB clip from real movement speed and `AimFire` from authoritative weapon-fire events.
- Vehicles use authored pivots for wheel spin/steering or running gear; Harvester collection machinery is state-driven while harvesting.
- Talon rotors and building fans/radar mechanisms use data-defined procedural presentation animation.
- Animation never changes pathfinding, collision, combat, saves, or authoritative transforms.
- See `ANIMATION_AUDIT.md` for the complete 16-GLB inventory and intentionally dormant pivots.

## Current playable chain

The v0.5.1 construction/economy validation remains intact:

`Command Post → Power Node → Refinery → harvest minerals → Barracks → Rifleman → Vehicle Factory → produced vehicle → Guardian Turret`

After building the base, use the same map to test group selection, Attack Move, Guard, queued orders, stances, and combat auto-acquisition. The Crimson computer player now forms a small base-defense team first and, after its data-defined delay, rallies the authored tank + HMMWV into an assault team and attacks through the normal tactical command system.

## Mobile controls

- **Tap friendly unit:** select it.
- **ADD:** toggles additive-selection mode for the next selections.
- **BOX:** arm box selection, then drag across friendly units.
- **Tap terrain with selected mobile units:** MOVE.
- **Tap hostile with selected combat units:** ATTACK.
- **ATTACK MOVE:** arm the command, then tap terrain.
- **GUARD:** arm Guard; tap terrain to guard a position or a friendly object to guard that object.
- **QUEUE:** toggle command appending so subsequent movement/tactical orders form a serialized order chain.
- **STANCE:** cycle the selected combat units' stance.
- **STOP:** clears current and queued orders.
- **CENTER:** centers the current selection without changing simulation state.
- **CLEAR:** clears selection/client modes.

Build/production/Harvester contextual controls remain data-driven through their existing CommandSets.

## Architecture preserved

- `CommandBus` — serializable commands with issuer/source metadata
- `TeamManager` — deterministic runtime teams instantiated from invariant TeamPrototype data
- `SkirmishAISystem` / `SkirmishAIPlayer` — timer-driven strategic coordination that issues ordinary commands
- `UnitAIUpdate` — persistent MOVE / ATTACK / ATTACK_MOVE / GUARD state and queued orders
- `CommandSet` — data-defined contextual actions
- `TechTreeSystem` — build permission, prerequisites, limits, affordability
- `PlacementValidator` — authoritative placement legality
- `ConstructionSystem` — real construction-site GameObjects
- `FactionEconomySystem` — credits / power
- `ResourceSystem` — finite minerals + Harvester docking loop
- `InteractionManager` — explicit bounded object-to-object protocols
- `ProductionSystem` — generic queues / rollout
- `CombatSystem` — weapons / armor / projectiles / turret behavior
- pathfinder + local avoidance + locomotor — route choice, dynamic traffic constraints, and physical movement remain separate
- Three.js renderer — disposable presentation; multi-cluster resource visuals never become simulation entities
- `ClientAnimation` — data-driven embedded-clip and mechanical-pivot presentation driven from authoritative simulation state

## C&C reference boundary

The tactical command shape follows the released Generals / Zero Hour separation between high-level commands and command origin. The v0.6.x AI layer follows the released TeamPrototype/runtime-Team/AIPlayer pattern, build-list/work-order economy pattern, distance-weighted attack-priority model, supply-source attacked/safe response, and location-safety checks. Red Alert remains the reference for explicit interaction handshakes; RA3 schemas remain the reference for data-driven GameObject/module composition. ForgeRTS implements these concepts in original browser-native JavaScript rather than directly translating EA source in this release.

If a future subsystem is genuinely better served by a direct GPL-covered source translation, it must be an explicit decision with provenance instead of silently mixing copied code into original modules.

## Snapshot format

Snapshot format is **v13**. It preserves v12 tactical Team state and adds strategic-planner state plus the current projectile policy fields. Restore accepts v8, v9, v10, v11, v12, and v13 snapshots.

## Validation

Run:

```bash
npm test
```

The release suite covers construction, economy, production, combat, movement, oriented dynamic collision, predictive local avoidance, interaction protocols, authority, queued orders, Attack Move, Guard, idle auto-acquisition, TeamPrototype/AI-profile loading, exact team recruitment, authoritative `FROM_AI` command flow, base-defense reactions, deterministic Team/AI snapshot restore, resource-field visual configuration, client-animation GLB binding validation, map identity, and the original mobile construction vertical slice. Current result: **109/109 tests passing**.

## Run

Serve the folder with any static HTTP server or deploy it directly to GitHub Pages. `index.html` is at the ZIP root.

### v0.6.3 field-test focus

1. Put an Aegis-X against a HMMWV moving laterally at range and confirm cannon rounds visibly connect while the target is still moving; shells should lead at launch rather than curve like missiles.
2. Watch Aegis-X and Guardian projectile impacts around vehicle hull edges; hit behavior now uses authored simulation Geometry instead of the old center-radius approximation.
3. Let Crimson play normally and confirm v0.6.1/v0.6.2 harvesting, construction, production, common-target assault, economic defense, retreat/reform and mineral accessibility all remain intact.
4. On the default BALANCED personality, watch the first assault composition change when the player side becomes strongly heavy-armor- or infantry-weighted.
5. Use the map AI data to try `AGGRESSIVE`, `DEFENSIVE`, or `ECONOMIST`; only planning cadence/posture should change—not damage, credits, movement, or other simulation rules.
6. In a long economy test, deplete the AI's local mineral field and verify expansion logic can choose a remote resource and raise the desired Refinery count instead of treating an empty/no-baseline area as depletion.
7. Save/restore while projectiles are in flight and while strategic policy is active; v13 state should continue deterministically.

### v0.6.4 field-test focus

1. Attack an enemy Harvester with a Rifleman/HMMWV and then with an Aegis-X; confirm the response scales from a light/mobile to a heavy economic-defense Team rather than only the single base guard reacting.
2. Destroy or withhold available defenders and confirm the emergency response becomes real Barracks/Vehicle Factory demand rather than spawned reinforcements.
3. With the dedicated heavy response unavailable, hit the Harvester with a serious armored threat and confirm an existing nearby assault Team can be temporarily recalled intact, then returns to its normal assault assignment after the threat clears or dedicated defenders arrive.
4. Raid the same economic asset repeatedly and confirm a bounded escort remains with it, then releases after the configured safe interval.
5. Fire a cannon through an intervening hostile vehicle/building and confirm the nearer object physically takes the shell instead of the designated target behind it.
6. Fire across a ridge/terrain obstruction and confirm the shell terminates on terrain rather than passing through the hill.
7. Re-check moving-target cannon hits, harvesting, construction, production, assault reform and strategic personality behavior for regressions.
8. Save/restore during an active economic response and while projectiles are in flight; v14 state should continue deterministically.
