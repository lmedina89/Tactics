# ForgeRTS v0.6.5 — Content Pipeline Audit

## Purpose

v0.6.5 creates the content/runtime boundary needed before a large building/unit/town asset expansion. The success criterion is that adding a new compatible asset normally requires asset + data work, not edits to simulation code.

## C&C/reference mapping

### Red Alert 3 GameObject schemas

The official RA3 schemas are the main reference for the mature data-driven shape: a GameObject definition combines identity/side/category information with separate Body, AI, Behaviors, Draw, ClientUpdates/ClientBehaviors, Geometry, Vision, locomotor/armor sets and other modules. ForgeRTS keeps the same separation principle in its own JSON/module vocabulary.

ForgeRTS's new `ContentMeta` is deliberately authoring/catalog metadata. It does not replace behavior modules. `Geometry`, `Footprint`, `Body`, `ArmorSet`, `Render`, `ClientAnimation`, `Production`, `Locomotor`, etc. continue to own their separate responsibilities.

### Generals / Zero Hour Object

The official Generals/ZH runtime `Object` is the reference for keeping physical geometry/control/module state on the authoritative object rather than deriving it from a renderer mesh. ForgeRTS therefore treats GLB dimensions as inspection hints only and keeps gameplay Geometry/Footprint explicit in definition data.

### EA FinalSun / FinalAlert2 editor source

The released map-editor source is a reference for future authoring/editor UX. v0.6.5 does not embed an editor into the game. Instead it establishes stable IDs, editor groups/categories, content packs, wall sockets and map placement data so a future WorldBuilder-style browser tool can target the runtime without changing runtime formats.

### OpenRA / modern RTS cross-check

OpenRA and other modern data-driven RTS projects reinforce the value of keeping civilian/world actors, traits/behaviors and map content in data rather than concrete runtime classes. ForgeRTS uses this as a cross-check while preserving its own module model and C&C/SAGE-oriented behavior.

## Implemented v0.6.5 boundary

- Versioned `data/content-contract.json`.
- Explicit `ContentMeta` on all registered production definitions.
- Affiliation classes: FACTION, CIVILIAN, NEUTRAL, WORLD.
- Stable content-category registry for military/civilian/world/building/unit/wall/gate/etc. authoring and queries.
- Eight authoring templates for common content families.
- Batch `contentPacks` that can add definitions and asset catalogs without engine-source edits.
- Generic wall/gate `WallConnection` group/socket metadata and deterministic snap helper.
- Civilian/neutral validation prototype objects proving ownerless non-faction GameObjects can exist in the authoritative simulation.
- Runtime `GameObject.affiliation` and `contentCategories` derived from definitions and serialized in snapshot v15.
- Static/headless map content validation.
- GLB ingestion auditor and machine-readable asset report.
- Content validator covering assets, clips/nodes, definitions, maps and selected placement/production hazards.
- Dedicated `content_validation` map as a headless proving ground.
- Stable WorldForge export contract documented in `WORLD_FORGE_EXPORT_SPEC.md`.

## Deliberately not implemented yet

- CIVILIAN/NEUTRAL does **not** yet mean complete diplomacy. Authoritative `ALLY/NEUTRAL/ENEMY` PlayerRelationMap is planned for v0.7.0.
- Wall sockets exist, but drag-to-build walls, corner auto-selection and gate open/close pathing are later systems.
- Validation prototype buildings/walls/gates intentionally have no production GLBs; real assets can now be authored against the contract.
- The GLB auditor does not auto-balance definitions. It never silently chooses HP, armor, weapon values, locomotor, faction or authoritative collision.
- WorldForge export generation is not part of ForgeRTS runtime. WorldForge will be updated separately after the contract is field-proven.

## Licensing/provenance boundary

No EA/OpenRA runtime source was copied line-for-line into this content layer. Public source/schema projects were used to choose architecture and responsibility boundaries. If a future importer/editor component benefits from direct GPL-family translation, provenance and licensing must be called out explicitly before integrating it.
