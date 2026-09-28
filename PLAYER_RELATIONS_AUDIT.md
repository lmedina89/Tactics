# ForgeRTS v0.6.6 — Player Relations / Hostility Authority Audit

## Purpose

This audit was completed before and during the v0.6.6 implementation. Its job is to prevent mission scripting, civilians, neutral objectives, AI targeting and projectile behavior from continuing to infer hostility from `playerId !== otherPlayerId`. The v0.6.5 package was treated as the protected baseline.

## Reference-first findings

### Generals / Zero Hour — primary reference

EA's released Generals/Zero Hour source defines a snapshot-owned `PlayerRelationMap` and a separate `TeamRelationMap`. The `Player` API explicitly describes relationship lookup as **this → that** and notes that changing this player's relation toward another player does not automatically change the reverse relation. The mission-script API contains `PLAYER_RELATES_PLAYER` plus team/player relation override actions. This establishes three important boundaries for ForgeRTS: relationships are gameplay state, they can be directional, and mission scripts should mutate that state rather than invent their own targeting rules.

Primary references:
- https://github.com/electronicarts/CnC_Generals_Zero_Hour/blob/main/GeneralsMD/Code/GameEngine/Include/Common/Player.h
- https://github.com/electronicarts/CnC_Generals_Zero_Hour/blob/main/Generals/Code/GameEngine/Include/GameLogic/Scripts.h
- https://github.com/electronicarts/CnC_Generals_Zero_Hour/blob/main/Generals/Code/GameEngine/Include/GameLogic/ScriptActions.h

### Classic Red Alert — behavioral cross-check

The released Red Alert source repeatedly asks the owning House whether another object is allied rather than treating every different owner as hostile. The same relation query affects docking/service behavior and whether obstructing/destroyable objects are treated as friendly or attackable. ForgeRTS should therefore centralize relationship meaning and let consuming systems query it.

Reference:
- https://github.com/electronicarts/CnC_Red_Alert/blob/main/CODE/BUILDING.CPP
- https://github.com/electronicarts/CnC_Remastered_Collection/blob/master/REDALERT/DRIVE.CPP

### OpenRA — independent implementation cross-check

OpenRA's long-running trait/data architecture exposes player stance filtering to gameplay systems (for example targeting/damage/visibility rules distinguish ally, neutral and enemy). This independently supports keeping relationship classification outside individual weapons or AI routines. ForgeRTS does not copy OpenRA's implementation; the comparison is architectural only.

Reference repository:
- https://github.com/OpenRA/OpenRA

### Active Generals community source

TheSuperHackers `GeneralsGameCode` is an active community continuation of EA's released Generals/Zero Hour source. It remains useful as a living compatibility/refactoring cross-check, but EA's released source is the authority for the original relationship architecture.

Reference:
- https://github.com/TheSuperHackers/GeneralsGameCode

## v0.6.5 pre-change call-site audit

The protected v0.6.5 baseline contained different-owner hostility assumptions in these gameplay areas:

- explicit ATTACK authorization
- UnitAI hostile acquisition and persistence
- autonomous turret acquisition
- projectile world-collision eligibility
- SkirmishAI enemy-player selection and base-defense threat scans
- StrategicAI enemy-category/threat analysis
- Skirmish economy construction-safety threat checks
- economic-defense retaliation / threat scans
- client hostile picking for issuing attack orders

The patch routes those decisions through one simulation-owned relationship authority. Ownership checks for controlling units remain ownership checks; physical collision remains ownership-independent.

## ForgeRTS v0.6.6 decision

`PlayerRelationMap` implements:

- implicit `SELF` for identical player IDs
- authored/runtime `ALLY`, `NEUTRAL`, `ENEMY` relations
- directional storage
- map-level `playerRelations[]` validation
- deterministic sorted snapshot state
- simulation query/mutation methods
- v16 snapshot persistence
- pre-v16 restore from map-start relationship data

Backward compatibility is deliberate: two distinct **known authored players** remain `ENEMY` when no explicit override exists, which preserves all v0.6.5 Aegis-vs-Crimson behavior. Unknown or ownerless endpoints are `NEUTRAL`. This fallback must not be confused with `ContentMeta.affiliation`; a `CIVILIAN`, `NEUTRAL` or `WORLD` content label never creates a diplomatic relation. A separately owned civilian player therefore needs explicit map/runtime relationships.

## Guardrails preserved

- Relationship state is simulation truth, not renderer/UI truth.
- AI and player-issued attacks use the same relationship authority.
- Mission scripting is not implemented here; future mission actions will call the simulation relation API.
- Team-level overrides are intentionally deferred rather than guessed.
- In-flight physical projectiles are not deleted when diplomacy changes; future friendly-fire/damage policy can be layered separately if required.
- No concrete Aegis/Crimson unit names were added to relationship runtime logic.
- No C&C or OpenRA implementation was copied line-for-line; ForgeRTS code is an original JavaScript implementation informed by the documented architecture.

## Acceptance gate

The release is acceptable only if the old gameplay suite remains green and relation-specific tests prove map validation, directionality, attack/guard legality, AI/turret targeting, projectile collision filtering, live relation changes and snapshot compatibility. See `TEST_REPORT.md`.
