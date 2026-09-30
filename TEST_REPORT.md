# ForgeRTS v0.6.6.9 Test Report

## Automated regression suite

- **149 / 149 tests passed**
- **0 failed**
- Added production deadlock regressions covering:
  - a rollout that remains stuck in `RALLYING` while a following unit completes
  - a deliberately stalled `CLEARING` rollout followed by another vehicle
  - deterministic v16 snapshot/restore while the queue is at `WAITING_EXIT`
  - rollout-timeout cleanup without erasing a newer player command
- Existing construction, economy, harvesting, production, combat/projectiles, locomotion, collision/local avoidance, player relations, command control, strategic/tactical AI, Team AI, Crimson/Aegis content, animation and content-foundation tests all remain green.

## Content validation

- **0 errors**
- **0 warnings**
- 26 registered definitions
- 34 active catalog assets
- 3 maps

## Static validation

- **97 / 97 JSON files parsed**
- **66 / 66 JS/MJS files pass `node --check`**
- release metadata is consistent across package.json, HUD/startup text and asset catalog

## Asset preservation

- **45 / 45 files in `ASSET_HASHES.sha256` verified**
- `/assets` is byte-for-byte unchanged from v0.6.6.8
- map JSON is byte-for-byte unchanged from v0.6.6.8
- content definitions are unchanged except the asset-catalog release version field

## Runtime-change boundary

The only authoritative gameplay subsystem changed in v0.6.6.9 is `engine/production/production-system.js`. `main.js` only adds player-visible queue-state diagnostics. No combat, pathfinding algorithm, locomotor tuning, economy balance, construction, AI policy, player relations, terrain, renderer, or WorldForge behavior was changed.

## Production recovery behavior

- The factory exit is reserved only while a produced unit is physically in the `CLEARING` stage.
- A unit travelling to its rally point no longer blocks the next completed build.
- Spawn planning preserves the authored forward exit first, then deterministically tries lateral/farther alternatives if the point is occupied or lacks a clear route.
- `CLEARING` uses bounded progress tracking and deterministic retry points. If it still cannot clear, the rollout terminates with `EXIT_RECOVERY_TIMEOUT` instead of holding the factory forever.
- `RALLYING` is presentation/traffic-clearing work only. A permanently stuck rally terminates with `RALLY_RECOVERY_TIMEOUT` and cannot block production.
- A 100% complete queue entry remains at `WAITING_EXIT` without accumulating extra build progress. The HUD shows `WAITING EXIT` or `EXIT BLOCKED` so a physical exit blockage is distinguishable from active building.
- Rollout bookkeeping remains snapshot-v16 compatible; newly added fields are backward-compatible and normalize deterministically when absent in older snapshots.

## Recommended field test

1. Queue several HMMWV/Aegis-X vehicles back-to-back and confirm the next vehicle can leave once the previous one clears the factory, without waiting for it to finish travelling to the rally point.
2. Park friendly vehicles near the normal factory exit and queue another vehicle. Confirm the producer either selects a deterministic alternate exit or clearly reports `EXIT BLOCKED`; it must not silently become unusable.
3. Create congestion immediately outside the factory, then move the blockers away. Confirm the completed queue resumes automatically.
4. Save/restore while a queue entry displays `WAITING EXIT` and confirm the same recovery behavior continues deterministically.
5. Re-check normal Barracks rollout and AI factory production for regressions.
