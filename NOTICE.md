# NOTICE

ForgeRTS v0.5.1 is an original browser-native implementation created for this project.

Command & Conquer: Generals / Zero Hour, Red Alert, Red Alert 3, and related names belong to their respective owners. Released C&C source and schemas are used as engineering and behavioral references unless a future ForgeRTS file is explicitly marked as a GPL-derived translation with provenance.

The v0.5.0/v0.5.1 construction architecture was designed after reviewing the released C&C separation between player build eligibility, pending client build-placement interaction, builder/construction task state, and data-defined GameObject command/placement metadata. In particular, the Generals/Zero Hour `Player`, `InGameUI`, and `DozerAIUpdate` interfaces and the Red Alert 3 `GameObject` schema were used as architectural references for centralized prerequisites/affordability, build-place mode, explicit construction state, `CommandSet`, build time/refund, and placement behavior.

ForgeRTS implements those concepts as original JavaScript systems (`TechTreeSystem`, `PlacementValidator`, `ConstructionSystem`, CommandSet data, and dynamic navigation occupancy). No EA gameplay source code was copied into these files.

No EA art, audio, map artwork, or trademarks are included as ForgeRTS game assets. The included GLB models and terrain assets are the project's existing WorldForge/ForgeRTS assets.


v0.5.1 adds only original ForgeRTS scenario/UI validation code around those existing systems; it does not add copied C&C source or assets.
