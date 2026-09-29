# Crimson Production Building Integration — v0.6.6.5

## Scope
ForgeRTS now routes five accepted Crimson Directorate production/base structures through the existing authoritative gameplay roles. No duplicate Crimson simulation definitions were added.

| Gameplay role | Aegis visual | Crimson visual | Crimson color mode |
| --- | --- | --- | --- |
| `barracks` | `aegis_field_barracks` | `crimson_garrison_block` | `AUTHORED` |
| `vehicle_factory` | `aegis_vehicle_factory` | `crimson_war_factory` | `AUTHORED` |
| `power_node` | `aegis_field_power_node` | `crimson_thermal_plant` | `AUTHORED` |
| `refinery` | `aegis_field_refinery` | `crimson_ore_works` | `AUTHORED` |
| `guardian_turret` | `aegis_guardian_turret` | `crimson_bastion_gun` | `AUTHORED` |

## Architecture
`Render.assetByFaction` selects the faction-specific GLB from the owning player's faction. `Render.factionColorModeByFaction.crimson = AUTHORED` tells the renderer to preserve the model's embedded Crimson PBR palette instead of applying the legacy global red tint. Unreplaced Crimson placeholder structures may still use the legacy tint until they receive canonical authored art.

Crimson AI continues using the shared role IDs: `power_node`, `refinery`, `barracks`, `vehicle_factory`, and `guardian_turret`. Health, armor, costs, prerequisites, gameplay footprints, power, economy, production, docking, targeting and AI logic remain authoritative and shared with Aegis unless their normal gameplay data says otherwise.

## Bastion articulation
Bastion Gun v002 preserves its accepted visual geometry and adds/uses the hierarchy:

- `TurretRoot` — simulation-driven turret yaw.
- `GunPitchRoot` — retained pitch hierarchy for future/compatible presentation.
- `BarrelRecoilRoot` — presentation-only local translation on weapon fire.
- `MuzzleSocket`, `MuzzleFlashFXSocket`, and `ProjectileSpawnSocket` remain under the recoil root so visual muzzle attachments stay aligned.

ForgeRTS adds a generic `TRIGGER_TRANSLATE` client-animation driver. The Bastion binding uses `WEAPON_FIRE`, `distance = -0.30`, `kickSeconds = 0.055`, and `returnSeconds = 0.16`. This presentation transform never feeds back into GameLogic. The binding is optional on the shared gameplay definition so the Aegis Guardian, which has no `BarrelRecoilRoot`, remains unchanged. Validation requires an optional routed animation node to exist in at least one routed faction asset.

## Enemy availability
The Crimson skirmish AI build list already requests all five shared roles. The construction-validation map's `enemy` player is faction `crimson` and has all five roles preplaced, so all five authored Crimson variants are visible immediately while the same AI can rebuild/expand them through existing construction systems.

## Assets
- `assets/buildings/crimson_garrison_block_v003.glb`
- `assets/buildings/crimson_war_factory_v001.glb`
- `assets/buildings/crimson_thermal_plant_v001.glb`
- `assets/buildings/crimson_ore_works_v001.glb`
- `assets/buildings/crimson_bastion_gun_v002.glb`
