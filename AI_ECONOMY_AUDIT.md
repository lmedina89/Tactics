# ForgeRTS v0.6.1 — Autonomous AI Economy Audit

## Source/reference mapping

The primary engineering reference for this milestone is the officially released Command & Conquer: Generals / Zero Hour AIPlayer / AISkirmishPlayer code around base-building, supply/gatherer management, factory selection, unit work orders, and timer-bounded strategic updates.

The important patterns carried into ForgeRTS are architectural rather than line-for-line translations:

- build goals live as data and the AI periodically checks which desired structures are missing
- construction is attempted only after ordinary affordability/buildability/location checks
- supply infrastructure owns a desired gatherer count rather than spawning unlimited collectors
- missing gatherers/Team composition become production work orders routed through compatible factories
- strategic economy/build checks are timer-bounded instead of rescanning the entire world every simulation tick
- strategic AI coordinates existing gameplay systems instead of directly mutating money, spawning units, or teleporting structures

ForgeRTS maps those ideas to its existing browser-native systems:

- `data/ai/*.json` → build list, gatherer target, free-unit reserves, priorities, placement policy, timing
- `engine/ai/skirmish-economy-planner.js` → deterministic strategic economy/build/production planning
- `ConstructionSystem` / `PlacementValidator` / `TechTreeSystem` → authoritative structure legality
- `ProductionSystem` → authoritative factory/queue legality
- `ResourceSystem` → authoritative harvesting/docking loop
- `CommandBus` → the only action path used by AI (`FROM_AI` + issuing player)
- `TeamManager` → recruiting Team composition becomes production demand when members are missing

## Implemented in v0.6.1

### Harvesting

- AI profiles define a desired Harvester count and harvest-check cadence.
- Idle collectors with cargo return to an operational owned Refinery.
- Idle empty collectors seek compatible live mineral fields only when the player owns an operational Refinery.
- Resource selection is deterministic and uses distance plus a congestion penalty so every Harvester does not blindly choose the same field when alternatives exist.
- Harvest/return actions are ordinary CommandBus orders; the planner never calls ResourceSystem mutation methods directly.

### Base building

- AI profiles define an ordered/priority `buildList` with desired counts.
- Existing operational structures and active construction sites both count toward the target.
- Generic builders are discovered from their `Builder` module/buildable list.
- Eligibility, prerequisites, limits, credits, build radius, terrain, occupancy, slope, resource exclusion, and other placement legality remain owned by the existing construction stack.
- Candidate placements are deterministic radial searches around a data-selected anchor (`HOME`, `DEFENSE`, `RESOURCE`, or `ENEMY`) with data-selected yaw behavior.
- The planner currently caps active AI construction sites from profile data; the validation profile uses one at a time.
- Low power increases priority for any desired definition that exposes `PowerProducer`; no concrete Power Node special case exists in the planner.

### Production / reinforcement

Production demand is composed generically from three sources:

1. desired Harvester count
2. missing minimum composition of RECRUITING Teams
3. data-defined free-unit reserves

Demand is priority sorted. A compatible operational producer is selected through `ProductionSystem.canQueue()`, favoring the least-busy valid producer, then the AI issues a normal `PRODUCE` command.

An empty RECRUITING Team is intentionally allowed to remain alive while factories satisfy its composition. A RALLYING Team that loses required members returns to RECRUITING. Existing timeout/disband policy still prevents permanently impossible work orders from accumulating forever.

## Validation-map behavior

The current `crimson_skirmish_basic` profile asks for:

- two Harvesters
- two Power Nodes
- one Refinery
- one Barracks
- one Vehicle Factory
- two Guardian Turrets
- one free reserve Rifleman
- production support for missing base-guard/assault Team composition

The authored map already supplies part of that base, so v0.6.1 demonstrates both expansion and replacement without requiring an artificial empty-AI-base scenario yet.

## Deliberately deferred

- richer threat/target valuation and strategic target classes
- Harvester escort/protection Team assignment
- damaged-Team retreat/reform logic
- production ratios beyond current Team/reserve demand
- multiple simultaneous construction crews / mobile-builder task scheduling
- expansion-base selection and remote resource-base planning
- selling structures / emergency economy recovery
- difficulty scaling and personality/build-plan families
- upgrades, sciences, veterancy, superweapons
- diplomacy/allies/neutrals
- formation routing and bridge/layer-aware Team movement

These belong in later v0.6.x layers and should continue using the same authoritative systems rather than AI-only shortcuts.

## Copy/translation decision

A direct translation of Generals' C++ was not the best fit for this milestone. ForgeRTS already has authoritative construction, production, resource, tech-tree, placement, CommandBus, Team, and snapshot systems whose boundaries correspond closely to the released C&C architecture. v0.6.1 therefore recreates the proven strategic pattern in original JavaScript and project data while keeping all gameplay mutation in the existing shared systems.
