# v0.7.1 Mission Guidance Hotfix

The v0.7.0 mission runtime remains unchanged in behavior. v0.7.1 adds optional objective marker metadata and browser rendering for active `TRIGGER_AREA` markers so mission destinations are visible without exposing debug geometry. Snapshot format remains v17.

# ForgeRTS v0.7.0 — Mission / Trigger / Objective Foundation Audit

## Reference boundary

This implementation uses the released EA Command & Conquer: Generals / Zero Hour source as an architecture/behavior reference, not as a line-for-line port.

Relevant released-source patterns:

- `GameLogic.cpp` creates three separate scripting subsystems: `ScriptActions`, `ScriptConditions`, and `ScriptEngine`.
- `Scripts.h` models a script as enabled/disabled state, one-shot behavior, evaluation delay, conditions, actions, optional false-actions, and snapshot-aware runtime state.
- `ScriptConditions.h` keeps condition evaluation behind a dedicated evaluator and includes named-object/team/trigger-area style queries.
- `ScriptActions.h` keeps script effects behind a dedicated action executor.
- `Object.h` carries trigger-area entry/exit housekeeping as authoritative game state.

ForgeRTS keeps the same useful separation but expresses it as original data-driven JavaScript around existing ForgeRTS systems.

## v0.7.0 runtime layout

- `engine/missions/trigger-area-system.js`
  - authoritative membership for map-authored trigger areas
  - `ENTERED`, `INSIDE`, `EXITED` transitions
  - circle, rotated rectangle, polygon geometry
  - deterministic sorted snapshot state
- `engine/missions/mission-validator.js`
  - validates mission/objective/script ids and supported typed condition/action vocabulary
  - cross-checks authored players, trigger areas, waypoints, objective ids, and relations
- `engine/missions/objective-manager.js`
  - `INACTIVE`, `ACTIVE`, `COMPLETED`, `FAILED`
- `engine/missions/mission-conditions.js`
  - nested `all` / `any` / `not`
  - flags, counters, timers, entities, Teams, trigger areas, economy/power, objective state
- `engine/missions/mission-actions.js`
  - flags/counters/timers
  - script enable/disable
  - objective transitions
  - MOVE / ATTACK_MOVE through `CommandBus` with `CommandSource.SCRIPT`
  - directional player relation changes
  - victory / defeat
- `engine/missions/mission-system.js`
  - deterministic script ordering
  - one-shot and recurring scripts
  - evaluation cadence
  - mission outcome
  - snapshot/restore

## Simulation ordering

Mission evaluation occurs after movement/combat for the current simulation tick:

1. drain authoritative commands
2. construction/economy/resources/production/Teams/AI
3. movement/local avoidance
4. combat/projectiles
5. update trigger-area occupancy
6. evaluate mission scripts
7. prune interactions
8. advance tick

Commands emitted by a mission action enter the normal `CommandBus` and execute on the next fixed simulation tick. This avoids re-entrant world mutation during script evaluation.

## Snapshot contract

v0.7.0 advances ForgeRTS world snapshots to **v17** and stores:

- trigger-area current occupancy
- mission id/version
- flags
- counters
- timers
- per-script enabled/fired/evaluation state
- objective states/ticks
- mission outcome

The runtime still accepts v8-v16 snapshots. For legacy snapshots there is no fabricated mission history; trigger occupancy is primed from restored entities so the next tick does not create false ENTERED transitions.

A v17 mission snapshot must be restored into the same mission definition id. Content identity is treated like the rest of ForgeRTS data: runtime state is saved, mission source data remains an external versioned asset.

## Initial authoring vocabulary

Conditions:

`TRUE`, `FALSE`, `FLAG_EQUALS`, `COUNTER_COMPARE`, `TIMER_EXPIRED`, `ENTITY_EXISTS`, `ENTITY_DESTROYED`, `TEAM_DESTROYED`, `ENTITY_ENTERED_AREA`, `PLAYER_ENTERED_AREA`, `TEAM_ENTERED_AREA`, `PLAYER_HAS_CREDITS`, `PLAYER_HAS_POWER`, `OBJECTIVE_STATE`.

Area conditions may query `ENTERED`, `INSIDE`, or `EXITED` transitions.

Actions:

`SET_FLAG`, `SET_COUNTER`, `ADD_COUNTER`, `START_TIMER`, `ENABLE_SCRIPT`, `DISABLE_SCRIPT`, `ACTIVATE_OBJECTIVE`, `COMPLETE_OBJECTIVE`, `FAIL_OBJECTIVE`, `ISSUE_MOVE`, `ISSUE_ATTACK_MOVE`, `SET_RELATION`, `VICTORY`, `DEFEAT`.

This is intentionally small. New actions/conditions should be added only when real missions require them rather than recreating Generals' full accumulated scripting vocabulary at once.

## Validation mission

`missions/first_contact_validation.json` uses the unchanged Training Ground:

1. `reach_center` begins ACTIVE.
2. A player unit entering `center_zone` completes it and activates `destroy_enemy_tank`.
3. Destroying `e_tank` completes the second objective and sets VICTORY.

The browser exposes this as an opt-in `MISSION` button / `?mission=first_contact`, leaving the normal construction Field Test available.

## Deliberate non-goals for v0.7.0

- no arbitrary eval/JavaScript mission hooks
- no reinforcement spawning yet
- no camera/cinematic actions
- no fog/shroud/radar work
- no bridge/path-layer work
- no veterancy/upgrades/sciences
- no WorldForge runtime dependency
- no persistent-world ownership redesign
- no mission-driven direct mutation of locomotor/combat internals

These remain later layers after the mission core is proven in play.
