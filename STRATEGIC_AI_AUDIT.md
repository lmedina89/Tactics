# ForgeRTS v0.6.3 — Strategic AI Audit

## Layering

`StrategicAIPlanner` is policy above the existing v0.6.0 Team system, v0.6.1 economy planner and v0.6.2 tactical intelligence. It never mutates GameObjects/economy directly and never bypasses CommandBus. Its output is consumed by the same Team recruitment, factory production, construction legality, harvesting and tactical command paths already used by the AI.

## C&C source lessons applied

The released Generals / Zero Hour `AIPlayer` exposes persistent difficulty, timed team/structure construction, Team work orders, factory lookup, build-by-supplies, supply safety/guarding and related player-level decisions. ForgeRTS v0.6.3 keeps strategic policy at this player-controller layer instead of pushing it down into individual UnitAI. The exact C++ implementation was not translated because ForgeRTS already has deterministic Team/Economy/CommandBus services that map cleanly to those responsibilities.

## Adaptive force composition

Team plans may contain multiple invariant `TeamPrototype` variants. Selection is deterministic and data-driven from:

- base priority
- generic enemy `AITargetable` category counts
- counter weights
- POOR / NORMAL / WEALTHY gates and bias
- selected personality bias

Current Crimson variants are the baseline mixed assault, armored assault and mobile assault. Aegis-X and HMMWV expose HEAVY_ARMOR/LIGHT_ARMOR categories so the strategy layer never branches on concrete object IDs.

## Difficulty, wealth and personalities

The map selects EASY/NORMAL/HARD and a personality. The profile provides BALANCED, AGGRESSIVE, DEFENSIVE and ECONOMIST presets. These change planning cadence, gatherer demand and defensive/tactical policy scales only; they do not give hidden damage, health, movement, free credits or production bypasses. Wealth state is derived from actual current credits and can slow or accelerate planning.

## Expansion

Expansion is resource-driven and bounded. The planner first requires a real resource baseline near an operational Refinery. Only after remaining local resources fall below the configured fraction may it select a remote resource field and raise the desired Refinery count. The existing economy planner still has to find a real Builder, satisfy tech/funds, pass PlacementValidator and issue `FROM_AI` construction.

## Snapshot/determinism

Difficulty, personality selection, assessment timer and current strategic policy are snapshot state in v13. Independent identical simulations and snapshot/restore remain deterministic under the automated suite.

## Deliberately deferred

Diplomacy/alliances, full formation routing, faction-specific strategic doctrine, upgrades/sciences/veterancy decisions, fog/radar-limited knowledge, superweapon strategy, naval/air doctrine and richer multi-base logistics remain future layers.
