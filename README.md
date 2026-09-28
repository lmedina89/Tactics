# ForgeRTS v0.6.0 — Teams + Skirmish AI Foundation

ForgeRTS is a separate browser-native RTS engine. WorldForge / Skirmish remains untouched and serves only as the older asset/reference project.

v0.6.0 builds on the validated v0.5.x player-side foundation and starts the first real computer-player layer. The release adds invariant TeamPrototype data, runtime Team instances, and a timer-driven SkirmishAI controller that recruits existing units into base-defense and assault teams and issues ordinary authoritative commands through the same CommandBus used by the human player. No AI-only movement or combat path is introduced.

## What changed

### Teams + Skirmish AI foundation

- Added data-driven `TeamPrototype` definitions with role, composition minima/maxima, recruitment radius/timeouts, rally policy, stance, instance limits, formation metadata, and common-target policy scaffolding.
- Added deterministic runtime `TeamManager` state with stable team IDs and explicit `RECRUITING → RALLYING → ACTIVE` lifecycle plus destroyed/disbanded states.
- Added one `SkirmishAIPlayer` controller per map-configured nonhuman player. Strategic AI runs on data-defined think/acquisition timers instead of executing expensive strategic scans every simulation tick.
- AI recruits only eligible unassigned mobile units that match TeamPrototype composition; the validation Crimson base guard recruits a Rifleman while the assault team recruits one Aegis-X plus one HMMWV-50. The Harvester is not stolen into a combat team.
- Base-defense teams guard a data-defined anchor and react to nearby hostile incursions. Assault teams rally, activate, choose an enemy objective, and issue normal `ATTACK_MOVE` commands.
- AI commands carry `FROM_AI`, the AI player ID, and pass through the same authoritative `CommandBus`/Simulation ownership checks as player commands.
- Player HUD command-result feedback is isolated from background AI command results.
- Team membership and AI strategic timers are deterministic snapshot state. Snapshot format advances to v10 while retaining v8/v9 restore compatibility.
- v0.6.0 deliberately recruits the enemy forces already authored on the validation map. AI harvesting, construction, production, rebuilding, reinforcement, diplomacy, difficulty/personality, and full formation routing remain the next v0.6.x layers rather than hidden shortcuts in this foundation.

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

The tactical command shape follows the released Generals / Zero Hour separation between high-level AI commands such as move, attack-move, guard, appended paths, and command origin. v0.6.0 additionally follows the released `TeamTemplateInfo` / `TeamPrototype` / runtime `Team` and `AISkirmishPlayer` pattern: invariant team composition data is separate from team instances, AI recruits existing units into inactive teams, teams rally/activate explicitly, and strategic work is timer-bounded. Red Alert remains the reference for explicit interaction handshakes; RA3 schemas remain the reference for data-driven GameObject/module composition. ForgeRTS implements these concepts in original JavaScript rather than directly translating EA source in this release.

If a future subsystem is genuinely better served by a direct GPL-covered source translation, it must be an explicit decision with provenance instead of silently mixing copied code into original modules.

## Snapshot format

Snapshot format is **v10**. It adds runtime Team membership/state and SkirmishAI controller timers/target state while preserving the v9 tactical state. Restore accepts v8, v9, and v10 snapshots.

## Validation

Run:

```bash
npm test
```

The release suite covers construction, economy, production, combat, movement, oriented dynamic collision, predictive local avoidance, interaction protocols, authority, queued orders, Attack Move, Guard, idle auto-acquisition, TeamPrototype/AI-profile loading, exact team recruitment, authoritative `FROM_AI` command flow, base-defense reactions, deterministic Team/AI snapshot restore, resource-field visual configuration, client-animation GLB binding validation, map identity, and the original mobile construction vertical slice. Current result: **79/79 tests passing**.

## Run

Serve the folder with any static HTTP server or deploy it directly to GitHub Pages. `index.html` is at the ZIP root.

### v0.6.0 field-test focus

1. Confirm the enemy Rifleman forms the base-defense Team and remains around the enemy defense anchor until reacting to a threat.
2. After the configured delay, confirm the enemy Aegis-X + HMMWV-50 rally and then attack through ordinary Attack Move behavior.
3. Confirm the enemy Harvester is not recruited into either combat Team.
4. Keep issuing player commands while the AI acts and confirm player HUD command feedback is not replaced by background AI results.
5. Save/restore during team rally or combat if using the snapshot harness and confirm membership/objective behavior remains deterministic.
6. Recheck v0.5.4 vehicle collision/local avoidance under the new group traffic load.
