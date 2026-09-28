# ForgeRTS v0.6.2 — Tactical Battlefield Intelligence

ForgeRTS is a separate browser-native RTS engine. WorldForge / Skirmish remains untouched and serves only as the older asset/reference project.

v0.6.2 builds on the autonomous v0.6.1 economy and adds the first C&C-style battlefield-intelligence layer: distance-weighted attack priorities, recent economic-asset defense, common Team targets, casualty-aware retreat/reform/reinforcement, construction-site safety checks, and authoritative harvest-accessibility validation. The AI still acts through the same CommandBus and shared gameplay systems as the player.

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
- Snapshot format advanced to **v11** in v0.6.1; v0.6.2 advances the current schema to **v12** for tactical Team state while retaining v8-v11 restore compatibility.
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
- v0.6.2 now adds richer threat response, Harvester/economy protection and retreat/reform/reinforcement. Personality/difficulty, diplomacy, expansion strategy and full formation routing remain later v0.6.x layers.

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

Snapshot format is **v12**. It preserves the v11 autonomous economy state and adds tactical Team target/reform/defense-hold state. Restore accepts v8, v9, v10, v11, and v12 snapshots.

## Validation

Run:

```bash
npm test
```

The release suite covers construction, economy, production, combat, movement, oriented dynamic collision, predictive local avoidance, interaction protocols, authority, queued orders, Attack Move, Guard, idle auto-acquisition, TeamPrototype/AI-profile loading, exact team recruitment, authoritative `FROM_AI` command flow, base-defense reactions, deterministic Team/AI snapshot restore, resource-field visual configuration, client-animation GLB binding validation, map identity, and the original mobile construction vertical slice. Current result: **91/91 tests passing**.

## Run

Serve the folder with any static HTTP server or deploy it directly to GitHub Pages. `index.html` is at the ZIP root.

### v0.6.2 field-test focus

1. Confirm all four mineral fields can now be harvested; the west Dense field should no longer strand a Harvester on the river ledge.
2. Let Crimson run normally and verify its economy/construction/production behavior from v0.6.1 still works.
3. Watch the assault Aegis-X + HMMWV focus the same scored target rather than wandering onto unrelated targets immediately.
4. Damage the enemy Harvester/economy area and confirm the base-defense Team redirects to protect the threatened asset, then eventually returns to normal defense.
5. Destroy one assault-Team vehicle and verify the survivor retreats/reforms while the Vehicle Factory produces the missing minimum member; the same Team should re-rally and reactivate.
6. Pressure the AI base and verify new construction does not choose an otherwise-legal placement directly inside the configured hostile safety radius.
7. Save/restore during a reform/defense response if using the snapshot harness; tactical state should continue deterministically.
