# ForgeRTS v0.5.4 Test Report

## Release target

**ForgeRTS v0.5.4 — Dynamic Collision + Local Avoidance Foundation**

This release builds on v0.5.3 and replaces the old friendly-circle post-movement shove with data-driven physical geometry, predictive local avoidance, and deterministic hard-overlap resolution. Strategic enemy AI remains deferred until this movement foundation is field-tested.

## Automated suite

Command: `npm test`

Result: **72/72 tests passing**.

New v0.5.4 movement/collision coverage verifies:

- mobile unit definitions expose C&C-style physical `Geometry` separately from locomotor behavior
- long vehicles use appropriately elongated BOX footprints instead of width-sized collision circles
- two head-on HMMWV-50s can approach/cross traffic without hard interpenetration while still making progress
- enemy and friendly ground vehicles remain physically solid despite different ownership
- a following tank yields/stays behind a stopped long tank rather than entering its hull
- repeated three-vehicle crossing produces deterministic simulation snapshots
- collision correction beside a static obstacle never pushes crowded vehicles into blocked navigation
- generic collision/avoidance runtime does not gain concrete object-ID branches

All prior construction, economy, production, combat, pathfinding, steering/reverse/three-point-turn, interaction, command authority, queued orders, Attack Move, Guard, stance/acquisition, resource visualization, client animation, map identity, snapshot determinism, and mobile vertical-slice regression tests remain passing.

## Static validation

- **42** JavaScript / MJS files pass `node --check`.
- **47** JSON files parse successfully.
- `ASSET_HASHES.sha256` passes for every listed production GLB and terrain texture.
- Production GLBs were not modified.
- Snapshot schema remains **v9**; restore accepts v8 or v9.

## Browser smoke-test limitation

The page imports Three.js from jsDelivr and the execution environment cannot resolve external DNS, so a real rendered headless-browser pass is not claimed here. Simulation/source/static tests are complete; normal iPhone/GitHub Pages visual validation is still required.

## Manual iPhone focus

1. Send two HMMWV-50s toward one another head-on and confirm they slow/steer/yield instead of merging.
2. Cross an Aegis-X and HMMWV path at roughly 90 degrees and watch for solid hull separation without sideways teleporting.
3. Drive a small convoy into a stopped Aegis-X/Harvester and confirm followers queue/yield rather than entering the stopped vehicle.
4. Group-select several mixed ground units and issue a common MOVE / ATTACK MOVE through a crossing path.
5. Repeat traffic near buildings, mineral fields, slopes and water edges; confirm collision correction does not push units through invalid navigation.
6. Confirm tracked pivoting and wheeled steering/reverse/three-point turns still look natural under avoidance.
7. Confirm harvesting/docking, factory rollout, combat, Guard/Attack Move/queued orders and construction still behave as in v0.5.3.
8. Confirm all v0.5.3 client animations still render normally.

If this field test is clean, the normal roadmap resumes at v0.6.x Teams + Skirmish AI.
