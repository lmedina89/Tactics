# ForgeRTS v0.6.0 — Team / Skirmish AI Audit

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

## Deliberately deferred

The current map has no diplomacy/relationship system yet, so the v0.6.0 two-player SkirmishAI treats every other player with surviving entities as hostile. Do not generalize this into multi-faction behavior without adding authoritative player relationships first.

Also deferred to later v0.6.x work:

- autonomous AI harvesting/economy
- construction and legal placement planning
- production queues and reinforcement
- rebuilding destroyed infrastructure
- power/tech recovery planning
- richer threat maps and target valuation
- Harvester protection / escort assignment
- damaged-team retreat/reform/reinforcement
- difficulty/personality/build-plan families
- `attackCommonTarget` tactical consumption beyond current shared Team objective
- formation/spacing routing beyond stored prototype metadata
- diplomacy/allies/neutrals
- script callbacks comparable to C&C Team on-create/on-idle/on-sighted/on-destroyed hooks

## Copy/translation decision

Directly translating the Generals C++ is not the best engineering choice for this milestone. The existing ForgeRTS CommandBus, UnitAI, snapshot model, ES-module data registry, and browser constraints already provide native equivalents for the important boundaries. v0.6.0 therefore copies the proven *architecture and behavior pattern*, not EA implementation text. If a later AI subsystem contains an algorithm whose direct GPL-covered translation is materially better than a native implementation, that should be an explicit provenance/licensing decision before code is introduced.
