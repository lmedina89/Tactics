# NOTICE

ForgeRTS v0.5.2 is an original browser-native implementation created for this project.

Command & Conquer: Generals / Zero Hour, Red Alert, Red Alert 3, and related names belong to their respective owners. Released C&C source and schemas are used as engineering and behavioral references unless a future ForgeRTS file is explicitly marked as a GPL-derived translation with provenance.

The construction architecture introduced in v0.5.0 and validated in v0.5.1 was designed after reviewing the released C&C separation between player build eligibility, pending client build-placement interaction, builder/construction task state, and data-defined GameObject command/placement metadata. Generals / Zero Hour `Player`, `InGameUI`, and builder/AI interfaces plus the Red Alert 3 `GameObject` schema were architectural references for centralized prerequisites/affordability, build-place mode, explicit construction state, `CommandSet`, build time/refund, and placement behavior.

v0.5.2 additionally uses the released Generals / Zero Hour high-level AI command vocabulary and command-origin separation as references for Attack Move, Guard, appended/queued paths, and player/script/AI command sources. ForgeRTS implements these concepts as original JavaScript (`CommandBus`, `Simulation`, `UnitAIUpdate`, `InputController`) rather than directly translating EA gameplay source code.

The v0.5.2 mineral-field presentation uses only the project's existing WorldForge/ForgeRTS GLBs. The new multi-cluster field, emissive emphasis, depletion cues, and ground glow are ForgeRTS renderer behavior driven by project JSON data; no EA resource art was added.

No EA art, audio, map artwork, or trademarks are included as ForgeRTS game assets. The included GLB models and terrain assets are the project's existing WorldForge/ForgeRTS assets.
