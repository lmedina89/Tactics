# Crimson Production Building Integration — v0.6.6.4

## Scope
Integrates the accepted Crimson Garrison Block v003 and Crimson War Factory v001 as the Crimson visual variants of the existing authoritative infantry/vehicle production roles.

## Architecture
ForgeRTS does not duplicate gameplay definitions just to change faction art. `barracks` and `vehicle_factory` remain authoritative gameplay definitions. Their `Render` modules use generic `assetByFaction` data to select the appropriate GLB from the owning player's faction.

- Aegis `barracks` -> `aegis_field_barracks`
- Crimson `barracks` -> `crimson_garrison_block`
- Aegis `vehicle_factory` -> `aegis_vehicle_factory`
- Crimson `vehicle_factory` -> `crimson_war_factory`

The same Render data uses `factionColorModeByFaction.crimson = AUTHORED`. The renderer therefore preserves the exact embedded Crimson PBR colors instead of applying the older global red tint. Legacy Crimson placeholder structures remain tinted until replaced with canonical authored art.

## Gameplay preservation
AI build-list IDs, construction prerequisites, health, armor, costs, production queues, power use, footprints, tech queries and map definition IDs remain unchanged. Enemy ownership alone selects the Crimson art.

## Assets
- `assets/buildings/crimson_garrison_block_v003.glb`
- `assets/buildings/crimson_war_factory_v001.glb`
