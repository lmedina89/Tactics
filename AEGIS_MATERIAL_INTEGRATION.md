# Aegis Material Integration — v0.6.6.1

## Scope

This patch changes only the production visual assets selected by `data/asset-catalog.json` for the Aegis Vehicle Factory and Field Barracks. Authoritative gameplay data remains unchanged.

## Integrated assets

- `aegis_vehicle_factory_v022.glb` — shared Aegis military material pass based on the approved Vehicle Factory v002 viewer test.
- `aegis_field_barracks_v024.glb` — shared Aegis military material pass based on the corrected Barracks v002 viewer test.

## Preservation checks

Both assets preserve their original geometry names and bounds. The production integration also restores the original WorldForge marker/root nodes that were not needed in the standalone baker previews, and restores the original double-sided material behavior so no building pieces disappear due to back-face culling.

The old v021 Vehicle Factory and v023 Barracks files remain present for rollback/reference.

## Runtime boundary

Textures are embedded in the GLBs. WorldForge and the external Aegis material-pack working files are authoring sources only and are not runtime dependencies.
