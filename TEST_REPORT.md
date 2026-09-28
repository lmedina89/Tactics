# ForgeRTS v0.6.1 Test Report

## Release target

**ForgeRTS v0.6.1 — Autonomous AI Economy + Construction + Production**

This release builds on the v0.6.0 Team/Skirmish-AI foundation. The computer player now uses the existing authoritative harvesting, construction, placement, economy, production, Team and CommandBus systems to operate a basic RTS economy rather than relying only on authored starting forces.

## Automated suite

Command: `npm test`

Result: **85/85 tests passing**.

New v0.6.1 coverage verifies:

- AI economy policy is data-defined: desired gatherers, build list, reserves, timing and production priorities
- AI autonomously harvests finite minerals and returns cargo through the normal Refinery/docking path
- the AI reaches its desired second Harvester through a real production queue
- planned Power Node / Guardian Turret expansion uses ordinary legal construction sites
- a missing build-list Refinery is reconstructed through the authoritative placement/construction path
- empty RECRUITING Teams remain bounded work orders while factories produce missing minimum composition
- Team work-order production can create Rifleman, Aegis-X and HMMWV requirements without direct spawning
- v11 snapshot/restore preserves economy-planner timers and remains deterministic after continuation
- the AI economy planner does not call direct construction/production/resource/economy mutation paths; actions are emitted through CommandBus

All prior Team/Skirmish-AI, construction, economy, production, combat, pathfinding, dynamic collision/local avoidance, steering/reverse/three-point-turn, interaction, command authority, queued orders, Attack Move, Guard, stance/acquisition, resource visualization, client animation, map identity, snapshot determinism, and mobile vertical-slice regression tests remain passing.

## Static validation

- **47** JavaScript / MJS files pass `node --check`.
- **50** JSON files parse successfully.
- `ASSET_HASHES.sha256` passes for all **21** listed production GLBs and terrain textures.
- Production GLBs and terrain assets were not modified.
- Snapshot schema is **v11**; restore accepts v8, v9, v10, or v11.

## Long-run engineering sanity pass

A 300-tick warmup followed by a measured **3,000-tick** construction-map simulation completed at about **0.136 ms/tick** in this container. This is an engineering sanity measurement, **not an iPhone benchmark**.

At tick 3,300 the AI remained bounded and coherent:

- **2** retained Team records
- **2** Harvesters
- **2** Power Nodes
- **2** Guardian Turrets
- **1** Refinery
- **1** Barracks
- **1** Vehicle Factory
- **2** Riflemen
- **1** Aegis-X
- **2** HMMWV-50s
- **2,450** minerals credited through actual harvesting

The result is useful as a leak/spam sanity check: the AI did not accumulate unbounded Teams, duplicate construction sites, or uncontrolled producer queues during the run.

## Browser smoke-test limitation

The page imports Three.js from jsDelivr and the execution environment cannot resolve external DNS, so a rendered headless-browser pass is not claimed here. Simulation/source/static tests are complete; normal iPhone/GitHub Pages visual/feel validation is still required.

## Manual iPhone focus

1. Confirm the Crimson Harvester mines a visible mineral field and returns cargo normally.
2. Confirm a second Harvester is produced through the real Vehicle Factory queue.
3. Confirm the AI visibly constructs its desired second Power Node and second Guardian Turret rather than spawning them instantly.
4. Destroy a desired AI structure if practical and verify it is rebuilt when prerequisites, funds and placement allow.
5. Kill assault-team members and verify missing Team composition becomes ordinary factory production demand.
6. Keep issuing player commands while AI economy/build/production work occurs; player HUD command feedback must remain isolated from background AI results.
7. Stress vehicle traffic around the expanding AI base to recheck v0.5.4 local avoidance under construction/production traffic.
8. If using snapshots, save during harvesting/construction/production and confirm the AI continues deterministically after restore.
