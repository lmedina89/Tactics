# Production Rollout Recovery — v0.6.6.9

## Bug

A producer could become permanently unusable after a completed unit left the build queue but failed to finish its rollout path. The old `ProductionSystem` treated every active rollout, including a unit already travelling from the clear point to its rally point, as ownership of the factory exit. If that rally movement became blocked, the next completed queue entry remained at `WAITING_EXIT` forever.

A second failure mode existed when a unit never completed the short `CLEARING` stage. There was no bounded recovery or terminal cleanup path, so the exit reservation could also persist indefinitely.

## Fix boundary

This patch changes only the generic production rollout path and its player-facing status. Costs, build times, tech prerequisites, faction definitions, AI production policy, unit locomotors, combat, terrain, maps, and content assets are unchanged.

## Recovery model

- Exit reservation applies only while a rollout is in `CLEARING`.
- Once `CLEAR_BUILDING` is reached, the producer can release the next completed unit even while the earlier unit continues toward its rally point.
- Spawn selection first preserves the authored forward exit, then deterministically tries lateral/farther alternatives if that point is occupied or cannot produce a valid clear path.
- `CLEARING` tracks progress and performs a bounded number of deterministic alternate-clear retries.
- A rollout that still cannot clear within the bounded timeout is terminated with `EXIT_RECOVERY_TIMEOUT`, releases factory ownership, and leaves the already-produced unit idle/controllable.
- A unit that clears the factory but cannot reach its rally point is eventually released with `RALLY_RECOVERY_TIMEOUT`; rally travel can no longer brick production.
- Queue entries at 100% remain at `WAITING_EXIT` without continuing to accumulate fake build progress.
- HUD status distinguishes `WAITING EXIT` from `EXIT BLOCKED`.

## Determinism / save compatibility

Rollout timing, recovery attempt count, progress tracking, and alternate points are simulation-owned and included in the existing production-system snapshot payload. Snapshot schema remains v16 because the added fields are backward-compatible and older rollout snapshots are normalized with deterministic defaults on step.

Regression coverage includes normal rollout completion, rally-stage blockage while a following unit completes, a deliberately stalled CLEARING rollout followed by another vehicle, and snapshot/restore while a queue entry is waiting for the blocked exit.
