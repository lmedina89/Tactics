# ForgeRTS v0.6.4 Test Report

## Release

**ForgeRTS v0.6.4 — Skirmish Defense + Combat Completion**

This release was built from the validated v0.6.3 tree. Economic/supply defense and ordinary projectile world obstruction were treated as the final known skirmish/combat foundation gaps before the v0.7 mission/trigger phase.

## Automated validation

- **109 / 109 automated tests pass** (`npm test`).
- **54 / 54 JS/MJS files** pass `node --check`.
- **57 / 57 JSON files** parse successfully.
- **21 / 21 production asset hashes** match `ASSET_HASHES.sha256`.
- Production GLBs and terrain textures are unchanged.
- Release-version consistency remains tested across `package.json`, HUD/title/startup label and `asset-catalog.json`.

## New economic-defense coverage

- Recent authoritative damage to a protected Harvester/economy/builder asset creates a data-driven threat picture.
- Light / medium / heavy response TeamPrototype selection follows generic threat-category weights rather than concrete attacker IDs.
- Existing free defenders can be recruited into the temporary response Team.
- Missing defenders become ordinary high-priority Barracks / Vehicle Factory production demand; no emergency unit-spawn shortcut exists.
- Severe raids can temporarily recall a nearby ACTIVE Team selected by data-defined role/threat/distance policy while the dedicated response Team is produced.
- Whole-Team recall preserves membership/lifecycle; the recalled Team is released back to its normal strategic assignment when dedicated defenders are ready or the threat window clears.
- Repeated incidents can extend a bounded escort window.
- Active economic-defense state, including temporary Team recall, survives v14 snapshot/restore deterministically.

## New projectile/world-collision coverage

- Physical cannon shells choose the earliest collision among the designated target, eligible intervening world entities and terrain.
- Intervening units/buildings use authoritative BOX/CYLINDER/SPHERE Geometry.
- Moving intervening objects use a swept broadphase plus moving-target narrowphase so crossing the shell path within one fixed tick is not missed.
- Terrain collision uses deterministic bounded segment sampling plus binary refinement.
- All production buildings with placement footprints expose authoritative BOX Geometry for combat collision.
- Existing v0.6.3 moving-target launch lead and non-homing DUMB_PROJECTILE behavior remain covered.

## Snapshot compatibility

Current snapshot schema: **v14**.

Restore accepts **v8, v9, v10, v11, v12, v13 and v14**.

## Long-run engineering sanity

A construction-validation simulation was warmed for 300 fixed ticks, a Harvester attack incident was injected, and then 3,000 additional ticks were measured in the container:

- measured average: **~0.561 ms / simulation tick**
- final tick: **3300**
- Team registry: **2 records**
- economic-defense manager finished bounded/inactive with no borrowed Team retained
- alive entities: **22**
- enemy harvested minerals: **2214**

This is an engineering sanity measurement, **not an iPhone performance benchmark**. The measured simulation cost remains far below the 33.3 ms budget of the fixed 30 Hz simulation tick in this container.

## Browser / device validation

The container cannot perform the final real Three.js visual smoke test because the project imports Three.js from jsDelivr and external DNS is unavailable in this environment. The release therefore still requires real iPhone / GitHub Pages validation for emergency defense behavior, Team recall/return-to-duty, shell obstruction impacts and terrain-hit visuals.
