# ForgeRTS v0.6.6.5 Test Report

**Release:** ForgeRTS v0.6.6.5 — Crimson Core Building Set Integration  
**Scope:** integrate the accepted Crimson Thermal Plant, Ore Works and Bastion Gun alongside the already-integrated Garrison Block and War Factory, without forking shared gameplay definitions.

## Automated regression

- Node test suite: **129 / 129 passed**
- Content validation: **0 errors / 0 warnings**
- Registered content: **18 definitions / 21 active catalog assets / 3 maps**
- Tracked shipped asset files: **32 / 32 SHA-256 verified**
- JSON parse check: **79 / 79 files parsed**
- JavaScript / MJS syntax check: **63 / 63 files passed `node --check`**
- Runtime/tool import graph: **42 modules / 0 circular imports**

## Crimson faction routing

- `barracks` → Crimson Garrison Block v003
- `vehicle_factory` → Crimson War Factory v001
- `power_node` → Crimson Thermal Plant v001
- `refinery` → Crimson Ore Works v001
- `guardian_turret` → Crimson Bastion Gun v002

All five routes use `factionColorModeByFaction.crimson = AUTHORED`, so the legacy renderer red tint does **not** alter these authored PBR materials. Aegis continues to use the existing Aegis assets for the same gameplay definitions.

## Enemy / AI availability

The Crimson skirmish AI still requests the shared role IDs `power_node`, `refinery`, `barracks`, `vehicle_factory`, and `guardian_turret`. The construction-validation enemy is faction `crimson` and already has all five roles preplaced, so the new visuals appear on the enemy immediately and are also used for later AI construction/reconstruction.

## Bastion articulation

- `TurretRoot` remains the normal simulation-driven yaw hierarchy.
- `GunPitchRoot` remains intact.
- `BarrelRecoilRoot` is bound to the generic client-only `TRIGGER_TRANSLATE` driver.
- Weapon fire drives a **0.30 m** backward recoil, ~**0.055 s** kick and ~**0.16 s** return.
- Recoil is presentation-only and never feeds a transform back into GameLogic.
- Aegis Guardian remains visually/behaviorally unchanged because the recoil binding is optional for assets without `BarrelRecoilRoot`.

## Accepted-asset preservation

- **barracks / crimson_garrison_block**: 10520 triangles, 13 geometry groups, 33 graph nodes, 19.85 × 14.00 m visual footprint, double-sided materials: **PASS**.
- **vehicle_factory / crimson_war_factory**: 18496 triangles, 13 geometry groups, 33 graph nodes, 32.70 × 24.00 m visual footprint, double-sided materials: **PASS**.
- **power_node / crimson_thermal_plant**: 15012 triangles, 15 geometry groups, 39 graph nodes, 22.80 × 18.60 m visual footprint, double-sided materials: **PASS**.
- **refinery / crimson_ore_works**: 11588 triangles, 13 geometry groups, 48 graph nodes, 33.30 × 29.00 m visual footprint, double-sided materials: **PASS**.
- **guardian_turret / crimson_bastion_gun**: 6408 triangles, 29 geometry groups, 48 graph nodes, 9.69 × 9.20 m visual footprint, double-sided materials: **PASS**.

No health, armor, costs, prerequisites, power values, gameplay footprints, docking rules, weapon stats, targeting logic, AI economy policy, relationships, pathfinding, or snapshot format were changed by this integration.
