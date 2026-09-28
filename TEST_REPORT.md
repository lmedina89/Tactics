# ForgeRTS v0.6.0 Test Report

## Release target

**ForgeRTS v0.6.0 — Teams + Skirmish AI Foundation**

This release builds on v0.5.4 and adds the first strategic computer-player layer without bypassing the existing tactical simulation. Team prototypes are data, runtime teams are deterministic simulation state, and AIPlayer decisions issue ordinary authoritative commands. AI economy/base building remains intentionally deferred to the next v0.6.x layer.

## Automated suite

Command: `npm test`

Result: **79/79 tests passing**.

New v0.6.0 coverage verifies:

- TeamPrototype and SkirmishAI profile data load through the production DataRegistry
- exact data-defined recruitment creates a Rifleman base-defense Team and Aegis-X + HMMWV assault Team without recruiting the Harvester
- strategic AI emits authoritative `FROM_AI` commands through the existing CommandBus
- AI command results do not replace player-facing command results
- a base-defense Team reacts to hostile incursions through ordinary `ATTACK_MOVE` behavior
- v10 snapshot/restore preserves Team membership and SkirmishAI timers/target state
- two identical simulations produce identical AI behavior/state
- runtime Team/AI source remains generic rather than branching on concrete production unit names
- terminal Team history remains bounded under long-running failed reinforcement retries

All prior construction, economy, production, combat, pathfinding, dynamic collision/local avoidance, steering/reverse/three-point-turn, interaction, command authority, queued orders, Attack Move, Guard, stance/acquisition, resource visualization, client animation, map identity, snapshot determinism, and mobile vertical-slice regression tests remain passing.

## Static validation

- **45** JavaScript / MJS files pass `node --check`.
- **50** JSON files parse successfully.
- `ASSET_HASHES.sha256` passes for all **21** listed production GLBs and terrain textures.
- Production GLBs and terrain assets were not modified.
- A 3,000-tick post-warmup construction-map simulation sanity pass completed at about **0.084 ms/tick** in this container with terminal Team history bounded to three records. This is an engineering sanity measurement, **not an iPhone benchmark**.
- Snapshot schema is **v10**; restore accepts v8, v9, or v10.

## Browser smoke-test limitation

The page imports Three.js from jsDelivr and the execution environment cannot resolve external DNS, so a rendered headless-browser pass is not claimed here. Simulation/source/static tests are complete; normal iPhone/GitHub Pages visual/feel validation is still required.

## Manual iPhone focus

1. Confirm the enemy Rifleman becomes the base-defense Team and guards/reacts around the authored defense anchor.
2. After the configured delay, confirm the enemy Aegis-X + HMMWV rally and then attack through ordinary Attack Move behavior.
3. Confirm the enemy Harvester remains outside combat Teams.
4. Continue using player commands while AI orders occur; verify player status feedback is not replaced by background AI command results.
5. Stress mixed vehicle traffic during the assault to ensure v0.5.4 local avoidance remains stable under group movement.
6. Recheck player construction, harvesting, production, tactical orders, combat, and client animation while the AI is active.
7. If testing snapshots, save during rally/attack and restore to verify team membership/objectives continue deterministically.
