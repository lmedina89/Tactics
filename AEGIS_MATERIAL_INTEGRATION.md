# Aegis Material Integration — v0.6.6.3

## Scope

This patch changes only the production visual assets selected by `data/asset-catalog.json` for two additional approved Aegis buildings. Authoritative gameplay data remains unchanged.

## Newly integrated assets

- `aegis_field_power_node_v2.glb` — accepted Field Power Node material pass.
- `aegis_guardian_turret_v032.glb` — accepted Guardian Turret v007 visual pass with the original production articulation/root/socket hierarchy restored.

## Previously integrated assets retained

- `aegis_vehicle_factory_v022.glb`
- `aegis_field_barracks_v024.glb`
- `aegis_tactical_command_post_v22.glb`
- `aegis_field_refinery_v3.glb`

## Preservation checks

Power Node v2 preserves all 38 source graph nodes, 16 geometry groups, node transforms, geometry bindings, bounds, cooling/system roots, service/power/build sockets, damage-FX sockets, and construction anchors.

Guardian Turret v032 uses the accepted v007 material/geometry result while preserving the original source graph hierarchy and non-geometry runtime nodes: `GuardianTurretRoot`, `TurretRoot`, `GunPitchRoot`, `MuzzleSocket`, `SensorSocket`, `WF_CONSTRUCTION`, `WF_DAMAGE_CENTER`, and `WF_RALLY`. Its 98 source geometry bindings remain attached to the original hierarchy so runtime turret/gun articulation remains authoritative.

The prior v1 Power Node and v031 Guardian Turret remain present for rollback/reference.

## Runtime boundary

Textures remain embedded in the GLBs. WorldForge and external material-pack working files remain authoring sources only and are not ForgeRTS runtime dependencies.
