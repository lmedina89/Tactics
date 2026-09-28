# ForgeRTS v0.6.1 — Team / Skirmish AI Audit

## Reference mapping

The primary engineering references for this milestone are the officially released Command & Conquer: Generals / Zero Hour sources around `Team.h`, `AIPlayer.h`, and `AISkirmishPlayer.cpp`. The source separates reusable/invariant team-template information from runtime Team instances, recruits units into inactive teams around a home/rally context, explicitly transitions teams into active use, and rate-limits strategic work with logic-frame timers.

ForgeRTS reproduces that architecture in its existing browser-native simulation rather than translating the C++ line-for-line:

- `data/teams/*.json` → invariant TeamPrototype-style composition/policy data
- `engine/teams/team-manager.js` → deterministic runtime Team instances and membership/lifecycle
- `data/ai/*.json` → timer/plan/profile data
- `engine/ai/skirmish-ai-player.js` → per-player strategic controller
- `CommandBus` → common authoritative order path used by human, AI, script, replay/network-ready callers
- `UnitAIUpdate` / pathfinder / locomotor / combat → unchanged tactical execution layer

## Implemented in v0.6.0

- stable runtime Team IDs
- exact data-defined composition recruitment
- maximum instances / plan concurrency
- explicit RECRUITING, RALLYING, ACTIVE, DESTROYED and DISBANDED states
- home/rally/defense anchors from map data
- initial stance commands
- timer-bounded AI think and enemy reacquisition
- closest available opposing-player target selection for the current two-player skirmish foundation
- base-defense threat reaction
- rally-then-assault behavior
- AI orders through ordinary authoritative MOVE / GUARD / ATTACK_MOVE / SET_STANCE commands
- Team and controller snapshot/restore
- player-HUD isolation from AI command results

## v0.6.1 extension

v0.6.1 adds `SkirmishEconomyPlanner` beneath the same controller: harvesting, build-list construction, desired Harvester production, Team-composition work orders, free-unit reserves, and rebuilding of missing desired structures all use ordinary shared gameplay systems and `FROM_AI` commands. Empty RECRUITING Teams may remain alive as bounded work orders while real factories fill their composition. See `AI_ECONOMY_AUDIT.md` for the detailed source mapping.

## Deliberately deferred

The current map has no diplomacy/relationship system yet, so the two-player SkirmishAI treats every other player with surviving entities as hostile. Do not generalize this into multi-faction behavior without adding authoritative player relationships first.

Also deferred to later v0.6.x work:

- richer power/tech recovery planning beyond build-list/PowerProducer priority
- richer threat maps and target valuation
- Harvester protection / escort assignment
- damaged-team retreat/reform/reinforcement
- difficulty/personality/build-plan families
- `attackCommonTarget` tactical consumption beyond current shared Team objective
- formation/spacing routing beyond stored prototype metadata
- diplomacy/allies/neutrals
- script callbacks comparable to C&C Team on-create/on-idle/on-sighted/on-destroyed hooks

## Copy/translation decision

Directly translating the Generals C++ is not the best engineering choice for these milestones. The existing ForgeRTS CommandBus, UnitAI, Construction, Production, Resource, snapshot model, ES-module data registry, and browser constraints already provide native equivalents for the important boundaries. v0.6.x therefore copies the proven *architecture and behavior pattern*, not EA implementation text. If a later AI subsystem contains an algorithm whose direct GPL-covered translation is materially better than a native implementation, that should be an explicit provenance/licensing decision before code is introduced.

## v0.6.2 extension

v0.6.2 adds the tactical layer above the same Team/CommandBus foundation. Named `AttackPrioritySet` data and generic `AITargetable` categories provide distance-weighted objective selection; base-defense Teams can react to recent authoritative damage against economy assets; assault Teams may share a common target and enter `REFORMING` when casualties cross a TeamPrototype threshold. Missing reform composition is satisfied by the existing v0.6.1 factory work-order path rather than spawning replacements. Construction planning also gains a hostile-location safety filter, while ResourceSystem gains navigation-valid harvest approaches so unreachable fields are skipped/rejected rather than retried forever. See `TACTICAL_AI_AUDIT.md` for detailed C&C source mapping.
