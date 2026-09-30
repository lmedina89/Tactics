# ForgeRTS v0.6.6.10 Test Report

## Automated regression suite

- **153 / 153 tests passed**
- **0 failed**
- Added production-queue regressions covering:
  - five HMMWVs queued while slot 1 is already actively building
  - FIFO preservation across all five slots
  - sixth-slot rejection with `QUEUE_FULL` and no credit charge
  - `CANCEL LAST` refund after a full queue
  - snapshot/restore of a five-slot production queue
  - UI projection of actual + not-yet-simulated `PRODUCE` commands
  - pending-command queue-capacity and credit reservation before the next 30 Hz tick
  - a static regression preventing per-tick production progress from re-entering the command-panel DOM rebuild signature
- All v0.6.6.9 rollout/deadlock recovery tests remain green.
- Existing construction, economy, harvesting, combat/projectiles, locomotion, collision/local avoidance, player relations, command control, strategic/tactical AI, Team AI, Crimson/Aegis content, animation and content-foundation tests all remain green.

## Content validation

- **0 errors**
- **0 warnings**
- 26 registered definitions
- 34 active catalog assets
- 3 maps

## Static validation

- **97 / 97 JSON files parsed**
- **68 / 68 JS/MJS files pass `node --check`**
- release metadata is consistent across package.json, HUD/startup text and asset catalog

## Asset preservation

- **45 / 45 files in `ASSET_HASHES.sha256` verified**
- `/assets` is byte-for-byte unchanged from v0.6.6.9
- map JSON is byte-for-byte unchanged from v0.6.6.9
- the authoritative `/engine` directory is byte-for-byte unchanged from v0.6.6.9
- `engine/production/production-system.js` SHA-256 remains `050386ca36a240543f89ed3d6738c25ee81fd8ae38710b1a21c0442b6f2761fe`

## Root cause

The authoritative queue already supported `queueLimit: 5`. The failure was in the browser command UI: the context-panel rebuild signature included the active production entry's `progressTicks`. While a unit was building, that value changed at the fixed 30 Hz simulation cadence, causing `context.replaceChildren()` to repeatedly destroy and recreate the production buttons. On iPhone Safari a button could therefore disappear between touch-down and click dispatch, making later queue taps appear blocked even though ProductionSystem itself allowed them.

## v0.6.6.10 behavior

- Production buttons stay mounted while the same producer remains selected.
- Dynamic queue state, build percentage, affordability and button lock state update in place rather than reconstructing the control DOM.
- The command dock shows five explicit slots. Slot 1 reports `BUILDING n%`, `WAITING EXIT`, or `EXIT BLOCKED`; later authoritative entries report `QUEUED`; player commands waiting for the next fixed simulation tick report `ORDER SENT`.
- Pending `PRODUCE` commands count toward projected UI capacity immediately, so rapid taps cannot make the UI advertise more than five slots.
- Pending production costs are deducted from projected UI affordability until the authoritative command is processed. Actual credits are still withdrawn only by ProductionSystem when the command is accepted.
- The sixth authoritative order is rejected with `QUEUE_FULL` and cannot charge credits.
- `CANCEL LAST` remains present and is enabled whenever an actual or pending production order exists.
- v0.6.6.9 exit reservation, alternate exit planning and rollout watchdog behavior are unchanged.

## Runtime-change boundary

No authoritative simulation subsystem changed in v0.6.6.10. The entire `/engine` directory is unchanged from v0.6.6.9. Changes are limited to the browser production UI/projection helper, command-dock styling, release metadata/docs and regression tests.

## Recommended field test

1. Select the Vehicle Factory and queue one HMMWV. While its percentage is visibly advancing, tap additional HMMWV/Aegis-X/Harvester buttons until all five slots are occupied.
2. Confirm every tap appears immediately as either `ORDER SENT` or `QUEUED` and that the command buttons remain tappable while slot 1 advances.
3. Try a sixth order and confirm the UI shows `QUEUE FULL`; no credits should be lost.
4. Use `CANCEL LAST` and confirm slot 5 disappears/refunds, then immediately queue another unit into the reopened slot.
5. Repeat with the Barracks.
6. Re-test v0.6.6.9 exit congestion: a full queue must continue once the factory exit clears and must never deadlock.
