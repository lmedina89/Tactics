# NOTICE

ForgeRTS v0.6.0 is an original browser-native implementation created for this project.

Command & Conquer: Generals / Zero Hour, Red Alert, Red Alert 3, and related names belong to their respective owners. Released C&C source and schemas are used as engineering and behavioral references unless a future ForgeRTS file is explicitly marked as a GPL-derived translation with provenance.

The construction architecture introduced in v0.5.0 and validated in v0.5.1 was designed after reviewing the released C&C separation between player build eligibility, pending client build-placement interaction, builder/construction task state, and data-defined GameObject command/placement metadata. Generals / Zero Hour `Player`, `InGameUI`, and builder/AI interfaces plus the Red Alert 3 `GameObject` schema were architectural references for centralized prerequisites/affordability, build-place mode, explicit construction state, `CommandSet`, build time/refund, and placement behavior.

v0.5.2 additionally uses the released Generals / Zero Hour high-level AI command vocabulary and command-origin separation as references for Attack Move, Guard, appended/queued paths, and player/script/AI command sources. ForgeRTS implements these concepts as original JavaScript (`CommandBus`, `Simulation`, `UnitAIUpdate`, `InputController`) rather than directly translating EA gameplay source code.

The v0.5.2 mineral-field presentation uses only the project's existing WorldForge/ForgeRTS GLBs. The new multi-cluster field, emissive emphasis, depletion cues, and ground glow are ForgeRTS renderer behavior driven by project JSON data; no EA resource art was added.

For v0.5.3, the C&C family GameLogic-versus-client/draw separation is used as the architectural reference for presentation animation. ForgeRTS implements its own Three.js `ClientAnimation` system and JSON bindings; no EA animation implementation code was copied. Existing WorldForge/ForgeRTS GLBs are reused unchanged.

For v0.5.4, the released Generals / Zero Hour separation between object geometry/collision/partition responsibilities and locomotor behavior is used as an architectural reference. ForgeRTS implements its own data-driven `Geometry` footprints, deterministic spatial-hash local avoidance, predictive yielding, and OBB/circle overlap resolution in JavaScript; no EA collision/locomotor implementation code was copied in this release.


For v0.6.0, the released Generals / Zero Hour `Team.h`, `AIPlayer.h`, and `AISkirmishPlayer.cpp` are architectural and behavioral references for invariant TeamPrototype-style data, runtime Team instances, recruitment/rally activation, timer-bounded strategic thinking, and AIPlayer coordination. ForgeRTS implements its own JSON TeamPrototype/AI profiles, JavaScript `TeamManager`, and `SkirmishAIPlayer`; no EA Team/AI implementation code was copied line-for-line in this release.

No EA art, audio, map artwork, or trademarks are included as ForgeRTS game assets. The included GLB models and terrain assets are the project's existing WorldForge/ForgeRTS assets.
