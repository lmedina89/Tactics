# Production Queue Reliability + Mobile UI — v0.6.6.10

## Observed bug

The authoritative ProductionSystem already allowed five queued units, but the mobile command panel rebuilt its DOM whenever the selected producer's `progressTicks` changed. At 30 Hz this could replace a production button between touch-down and the browser's click dispatch, making subsequent queue taps fail while slot 1 was actively building.

## Fix boundary

The v0.6.6.9 ProductionSystem is intentionally unchanged. v0.6.6.10 changes only the presentation/input projection around production:

- production command buttons remain mounted while build progress advances
- a five-slot queue strip is updated in place
- pending `PRODUCE` commands already sitting in CommandBus are shown immediately as `ORDER SENT`
- pending orders reserve projected queue capacity and projected credits in the UI until the next fixed simulation tick
- authoritative acceptance, cost withdrawal, queue ordering and sixth-slot rejection still happen only inside ProductionSystem through normal commands

## Five-slot contract

Both the Vehicle Factory and Barracks retain `queueLimit: 5`. Slot 1 is the active build; slots 2–5 wait in FIFO order. A sixth production order is rejected with `QUEUE_FULL`. Costs remain charged at authoritative queue acceptance, and `CANCEL LAST` refunds the final queued entry using the existing ProductionSystem behavior.

## Mobile rule

Dynamic build progress must never be part of the command-panel DOM rebuild signature. Queue/progress labels and button state are updated in place so touch gestures cannot be invalidated by a fixed-tick UI refresh.
