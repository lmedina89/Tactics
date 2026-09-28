# ForgeRTS v0.5.3 — Client Animation Foundation

ForgeRTS is a separate browser-native RTS engine. WorldForge / Skirmish remains untouched and serves only as the older asset/reference project.

v0.5.3 builds on the validated v0.5.2 tactical-command/resource-readability slice. It does **not** add strategic enemy AI yet. This pass activates the animation-ready presentation work already authored into the production GLBs while keeping simulation state authoritative and the runtime fully data-driven.

## What changed

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

After building the base, use the same map to test group selection, Attack Move, Guard, queued orders, stances, and combat auto-acquisition.

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
- pathfinder + locomotor — route choice separated from physical movement
- Three.js renderer — disposable presentation; multi-cluster resource visuals never become simulation entities
- `ClientAnimation` — data-driven embedded-clip and mechanical-pivot presentation driven from authoritative simulation state

## C&C reference boundary

The tactical command shape follows the released Generals / Zero Hour separation between high-level AI commands such as move, attack-move, guard, appended paths, and command origin. Red Alert remains the reference for explicit interaction handshakes; RA3 schemas remain the reference for data-driven GameObject/module composition. ForgeRTS implements those concepts in original JavaScript rather than directly translating EA source in this release.

If a future subsystem is genuinely better served by a direct GPL-covered source translation, it must be an explicit decision with provenance instead of silently mixing copied code into original modules.

## Snapshot format

Snapshot format is **v9**. It includes the expanded UnitAI/order-queue/stance state and player resource-harvest accounting while still accepting v8 snapshots.

## Validation

Run:

```bash
npm test
```

The release suite covers construction, economy, production, combat, movement, interaction protocols, authority, queued orders, Attack Move, Guard, idle auto-acquisition, resource-field visual configuration, client-animation GLB binding validation, map identity, snapshot determinism, and the original mobile construction vertical slice. Current result: **66/66 tests passing**.

## Run

Serve the folder with any static HTTP server or deploy it directly to GitHub Pages. `index.html` is at the ZIP root.
