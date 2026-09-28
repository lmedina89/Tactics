# NOTICE

ForgeRTS v0.6.4 is an original browser-native implementation created for this project.

Command & Conquer: Generals / Zero Hour, Red Alert, Red Alert 3, and related names belong to their respective owners. Released C&C source and schemas are used as engineering and behavioral references unless a future ForgeRTS file is explicitly marked as a GPL-derived translation with provenance.

The construction architecture introduced in v0.5.0 and validated in v0.5.1 was designed after reviewing the released C&C separation between player build eligibility, pending client build-placement interaction, builder/construction task state, and data-defined GameObject command/placement metadata. Generals / Zero Hour `Player`, `InGameUI`, and builder/AI interfaces plus the Red Alert 3 `GameObject` schema were architectural references for centralized prerequisites/affordability, build-place mode, explicit construction state, `CommandSet`, build time/refund, and placement behavior.

v0.5.2 additionally uses the released Generals / Zero Hour high-level AI command vocabulary and command-origin separation as references for Attack Move, Guard, appended/queued paths, and player/script/AI command sources. ForgeRTS implements these concepts as original JavaScript (`CommandBus`, `Simulation`, `UnitAIUpdate`, `InputController`) rather than directly translating EA gameplay source code.

The v0.5.2 mineral-field presentation uses only the project's existing WorldForge/ForgeRTS GLBs. The new multi-cluster field, emissive emphasis, depletion cues, and ground glow are ForgeRTS renderer behavior driven by project JSON data; no EA resource art was added.

For v0.5.3, the C&C family GameLogic-versus-client/draw separation is used as the architectural reference for presentation animation. ForgeRTS implements its own Three.js `ClientAnimation` system and JSON bindings; no EA animation implementation code was copied. Existing WorldForge/ForgeRTS GLBs are reused unchanged.

For v0.5.4, the released Generals / Zero Hour separation between object geometry/collision/partition responsibilities and locomotor behavior is used as an architectural reference. ForgeRTS implements its own data-driven `Geometry` footprints, deterministic spatial-hash local avoidance, predictive yielding, and OBB/circle overlap resolution in JavaScript; no EA collision/locomotor implementation code was copied in this release.


For v0.6.0, the released Generals / Zero Hour `Team.h`, `AIPlayer.h`, and `AISkirmishPlayer.cpp` are architectural and behavioral references for invariant TeamPrototype-style data, runtime Team instances, recruitment/rally activation, timer-bounded strategic thinking, and AIPlayer coordination. ForgeRTS implements its own JSON TeamPrototype/AI profiles, JavaScript `TeamManager`, and `SkirmishAIPlayer`; no EA Team/AI implementation code was copied line-for-line in this release.

For v0.6.1, the released Generals / Zero Hour AIPlayer/AISkirmishPlayer base-building, supply/gatherer, factory-selection, and work-order logic is used as an architectural and behavioral reference. ForgeRTS implements its own data-defined economy policy and JavaScript `SkirmishEconomyPlanner`, and routes harvesting/construction/production through existing authoritative shared systems; no EA economy/base-building implementation code was copied line-for-line in this release.

For v0.6.2, the released Generals / Zero Hour AI attack-priority distance weighting, supply-source attacked/safe and supply-center guard interfaces, location-safety checks, and Team/common-target/casualty concepts are architectural and behavioral references. ForgeRTS implements its own JSON `AttackPrioritySet`/`AITargetable` data, JavaScript target evaluator, recent-damage economy-defense response, Team reform/reinforcement flow, construction safety filter, and harvest-accessibility resolver; no EA tactical-AI implementation code was copied line-for-line in this release.

No EA art, audio, map artwork, or trademarks are included as ForgeRTS game assets. The included GLB models and terrain assets are the project's existing WorldForge/ForgeRTS assets.

For v0.6.3, the released Generals / Zero Hour source remains an architectural and behavioral reference for authoritative weapon/object geometry separation and for AIPlayer difficulty, Team work orders, build/supply/factory responsibilities and timed strategic updates. ForgeRTS implements its own fixed-step JavaScript projectile solver, shared collision-geometry utilities, and strategic policy planner; no EA projectile or AI implementation was copied line-for-line in this release.


For v0.6.4, official Generals / Zero Hour public source remains a behavioral/architectural reference for AI supply-defense responsibilities and projectile collision policy. ForgeRTS uses its own JavaScript EconomicDefenseManager, Team work-order integration, swept Geometry collision and terrain solver. No EA implementation code was copied line-for-line for these systems.

For v0.6.4, ForgeRTS also uses the Generals Team-level supply-defense responsibility (`guardSupplyCenter(Team*, ...)`) as a behavioral reference for temporary whole-Team emergency recall. The implementation is original JavaScript: Team membership is preserved, ordinary AI commands are used, and dedicated response production continues through ForgeRTS's own Team/economy systems.
