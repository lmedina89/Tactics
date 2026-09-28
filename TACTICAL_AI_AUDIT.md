# ForgeRTS v0.6.2 — Tactical Battlefield Intelligence Audit

## Scope

v0.6.2 extends the v0.6.1 autonomous economy with target valuation, economic-defense reactions, Team casualty/reform behavior, construction-site safety filtering, and resource accessibility validation. The implementation remains browser-native JavaScript and uses normal ForgeRTS simulation systems and `FROM_AI` commands.

## Released C&C source references checked

Primary reference repository: EA's released `CnC_Generals_Zero_Hour` source.

Relevant source/API areas reviewed:

- `GeneralsMD/Code/GameEngine/Include/GameLogic/AI.h`
  - attack-priority distance modifier: effective target priority is reduced by distance divided by the configured modifier
  - guard scan/chase tuning
  - maximum retaliate distance and nearby-friend retaliation radius
  - high-level group commands including attack, attack-move, guard, hunt and path following
- `Generals/Code/GameEngine/Include/GameLogic/AIPlayer.h` and matching AIPlayer implementation
  - `isSupplySourceSafe`
  - `isSupplySourceAttacked`
  - `isLocationSafe`
  - `guardSupplyCenter`
  - timer-bounded structure/team work
- `Generals/Code/GameEngine/Include/Common/Player.h`
  - AI-player exposure of supply-source safety/attack and supply-center guarding
- released Team/AI architecture
  - reusable Team prototype/template data separated from runtime Team instances
  - common-target/casualty bookkeeping concepts

## ForgeRTS mapping

### 1. AttackPrioritySet

ForgeRTS now loads named target-priority definitions from `data/ai/target_priorities/*.json`.

Each set contains:

- default priority
- distance modifier
- recent-attacker bonus
- insignificant-target policy
- category priority table

`TargetEvaluator` computes a deterministic score equivalent in shape to the released Generals concept:

`effective priority = category priority - distance / distanceModifier`

Target categories come from the generic `AITargetable` GameObject module rather than concrete definition IDs.

### 2. Team common target

`TeamPrototype.attackCommonTarget` is now live policy. Assault Teams whose prototype enables it issue a normal authoritative multi-unit `ATTACK` against the scored target. No unit target is written directly by strategic AI.

Target reassessment is timer-bounded through `tactical.targetReassessTicks`.

### 3. Economic-defense reaction

The C&C supply-source attacked/guard pattern maps to authoritative recent-damage state already present on ForgeRTS GameObjects.

Configured protected categories include Harvester/economy/builder objects. If one was recently damaged by a valid hostile inside the retaliation limit, the base-defense Team temporarily receives a normal `GUARD_OBJECT` order on the threatened friendly object.

The hold interval and retaliation distance are AI-profile data.

### 4. Casualty-aware Team reform/reinforcement

Assault Team reinforcement policy is TeamPrototype data:

- enabled/disabled
- retreat strength threshold
- reform timeout

If an active Team falls below the configured surviving-strength ratio, it enters explicit `REFORMING` state. Survivors move normally to the Team rally point. Missing minimum composition is seen by the existing v0.6.1 economy planner as production demand. Real factories build replacements, TeamManager recruits them, the Team re-enters RALLYING, then becomes ACTIVE again.

There is no replacement spawn shortcut.

### 5. Construction location safety

The economy planner retains normal `ConstructionSystem.eligibility()` and `PlacementValidator` authority. v0.6.2 adds a strategic safety filter on top: otherwise-legal build candidates inside the configured radius of hostile combat/defense objects are skipped.

This corresponds to the released AIPlayer concept of testing whether a location is safe without duplicating placement legality.

### 6. Harvest accessibility

The user field test exposed an authored Dense Mineral Field at `(-58, 102)` on approximately a 44-degree river-bank slope. The heavy wheeled Harvester is limited to a substantially lower traversable slope and could not reach a point within harvest radius.

The field is now authored at `(-58, 82)`, where the sampled slope is approximately 13 degrees, but v0.6.2 also fixes the generic engine issue:

- `ResourceSystem.findHarvestApproach()` searches deterministic candidate terminals inside harvest range
- candidates must be pathfinder-walkable and route-reachable
- terminal coordinates are snapped through the navigation grid before acceptance
- the safe radius reserves the locomotor's arrival tolerance so a MOVE order cannot legally finish outside actual harvest range
- an unreachable field is rejected with `RESOURCE_UNREACHABLE`
- Skirmish AI resource selection skips fields with no valid approach

Moving one map object is therefore not the engine fix; the authoring correction and generic accessibility rule ship together.

## Efficiency notes

- Strategic evaluation remains timer-bounded.
- Target scoring allocates no persistent runtime objects and stores only selected objective/timers.
- AI damage-response object lookup uses the Simulation's authoritative entity map instead of repeated nested world scans.
- Harvest approach search is run when assigning/retrying a harvest target, not every locomotion frame.
- Production/reform continues to reuse the existing bounded Team/work-order machinery.

## Direct-copy decision

A line-for-line C++ port was not selected for v0.6.2. The released source supplies the proven policy boundaries, but ForgeRTS already has authoritative JavaScript systems whose interfaces map cleanly to them. The v0.6.2 implementation recreates those behaviors through ForgeRTS data/modules/CommandBus rather than adding a second engine path.

If a later subsystem is materially better served by direct GPL-covered translation, that remains an explicit provenance/licensing decision.
