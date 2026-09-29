# ForgeRTS v0.6.6.4 Test Report

**Release:** ForgeRTS v0.6.6.4 — Crimson Garrison + War Factory Integration  
**Scope:** first canonical Crimson Directorate production-building visuals plus generic faction-specific render routing.

## Automated regression

- Node test suite: **128 / 128 passed**
- Content validation: **0 errors / 0 warnings**
- Registered content: **18 definitions / 18 active assets / 3 maps**
- Tracked shipped asset files: **29 / 29 hashed**
- JSON parse check: **78 / 78 files parsed**
- JavaScript / MJS syntax check: **63 / 63 files passed `node --check`**
- Runtime/tool import graph: **42 modules / 0 circular imports**

## Crimson production-building integration

### Garrison Block v003

- Registered as asset `crimson_garrison_block`.
- Crimson-owned `barracks` resolves to this GLB through `Render.assetByFaction`.
- Uses `factionColorModeByFaction.crimson = AUTHORED`, so the renderer does not apply the legacy red tint.
- Production GLB: **13 geometry groups / 10520 triangles / 34 graph nodes**.
- Double-sided material behavior: **PASS**.

### War Factory v001

- Registered as asset `crimson_war_factory`.
- Crimson-owned `vehicle_factory` resolves to this GLB through `Render.assetByFaction`.
- Uses `factionColorModeByFaction.crimson = AUTHORED`, preserving the exact authored Crimson palette.
- Production GLB: **13 geometry groups / 18496 triangles / 34 graph nodes**.
- Double-sided material behavior: **PASS**.

## Gameplay/AI preservation

- `barracks` and `vehicle_factory` remain the authoritative gameplay definition IDs.
- Crimson AI still requests those same role definitions; faction ownership selects the Crimson art in the renderer.
- Health, armor, costs, prerequisites, production queues, power usage, gameplay footprints, construction logic, tactical AI and economy logic were not forked for this visual integration.
- Existing unreplaced Crimson structures continue using the legacy red tint until their canon models are authored.
