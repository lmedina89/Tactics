# ForgeRTS v0.6.2 Test Report

## Release target

**ForgeRTS v0.6.2 — Tactical Battlefield Intelligence**

This release builds on the v0.6.1 autonomous AI economy. It adds C&C-style distance-weighted target priority, economic-defense response, common Team targeting, casualty-driven reform/reinforcement, construction safety filtering, and generic harvest-accessibility validation.

## Automated suite

Command: `npm test`

Result: **91/91 tests passing**.

New v0.6.2 coverage verifies:

- named AttackPrioritySet data loads and distance weighting can make a nearby combat threat outrank a distant higher-value structure
- assault Teams consume `attackCommonTarget` and use ordinary authoritative `ATTACK` orders against their shared objective
- recent damage to an AI Harvester/economy asset redirects the base-defense Team through normal `GUARD_OBJECT`
- an understrength assault Team enters `REFORMING`, retreats, generates ordinary factory work-order demand, recruits a replacement, re-rallies and reactivates
- all authored validation-map mineral fields expose a valid harvest approach for both player and enemy Harvesters
- the old steep west Dense Mineral position has no legal harvesting terminal and is authoritatively rejected as `RESOURCE_UNREACHABLE`
- AI construction safety rejects otherwise-legal locations within the configured hostile combat-threat radius

All prior construction, autonomous economy, production, Team/Skirmish-AI, combat, pathfinding, collision/local avoidance, locomotion, interaction, command authority, tactical command, resource rendering, animation and mobile vertical-slice regressions remain passing.

## Static validation

- **49** JavaScript / MJS files pass `node --check`.
- **52** JSON files parse successfully.
- `ASSET_HASHES.sha256` passes for all **21** listed production GLBs and terrain textures.
- Production GLBs and terrain textures were not modified.
- Snapshot schema is **v12**; restore accepts v8, v9, v10, v11 and v12.

## Long-run engineering sanity pass

A 300-tick warmup followed by a measured **3,000-tick** construction-map simulation completed at about **0.153 ms/tick** in this container. This is an engineering sanity measurement, not an iPhone benchmark.

At tick 3,300 the strategic layer remained bounded:

- **2** retained Team records
- Team registry states: **1 ACTIVE**, **1 RECRUITING**
- AI still owned the planned core base: Command Post, Vehicle Factory, two Guardian Turrets, two Power Nodes, Refinery and Barracks
- AI had **2 Harvesters**, **2 Riflemen** and **1 Aegis-X** alive at the sample point
- **2,282** minerals had been credited through real harvesting
- west/east mineral accessibility remained functional; the east Rich field had been depleted through normal harvesting

Combat losses can naturally change exact force counts in a long simulation, so this sanity pass is used for bounded-state/performance checking rather than a fixed army-composition assertion.

## Resource authoring check

- old west Dense position `(-58, 102)`: sampled slope about **44.1°** — intentionally confirmed unreachable for the heavy wheeled Harvester
- new west Dense position `(-58, 82)`: sampled slope about **13.0°** — reachable

The engine regression test additionally verifies accessibility, so future authoring errors are not dependent on visual inspection alone.

## Browser smoke-test limitation

The page imports Three.js from jsDelivr and this execution environment cannot resolve external DNS, so a rendered headless-browser pass is not claimed. Simulation/source/static tests are complete; normal iPhone/GitHub Pages visual/feel validation remains required.

## Manual iPhone focus

1. Harvest each field, especially the relocated west Dense field near the river.
2. Observe the assault tank + HMMWV and confirm they focus a common strategic target.
3. Attack the enemy Harvester/economy and watch the base guard redirect to protect it.
4. Destroy one assault-Team member and watch the survivor retreat while the real factory builds a replacement; the Team should later return to combat.
5. Pressure the enemy base while it needs a structure and confirm it does not deliberately place a new building inside the configured hostile safety radius.
6. Recheck vehicle traffic/collision while retreating/reinforcing Teams cross the expanding base.
