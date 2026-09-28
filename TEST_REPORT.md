# ForgeRTS v0.6.6.1 Test Report

**Release:** ForgeRTS v0.6.6.1 — Aegis Material Integration  
**Content contract:** v1  
**Snapshot schema:** v16 (restore accepts v8-v16)

## Automated regression suite

- **125 / 125 tests pass** after the final recovery rerun.
- All pre-existing construction, economy, production, harvesting, movement/collision, Team/AI, combat/projectile, animation, content-pipeline and mobile-input regressions remain green after updating snapshot-version expectations from v15 to v16.
- New relationship coverage verifies:
  - directional SELF / ALLY / NEUTRAL / ENEMY semantics
  - legacy default hostility for distinct known authored players
  - neutral handling for unknown/ownerless endpoints
  - strict map relation validation
  - ATTACK and allied GUARD_OBJECT authorization
  - UnitAI and TurretAI target acquisition
  - projectile world-collision relationship filtering
  - SkirmishAI, StrategicAI, economic-defense and construction-safety hostility queries
  - live ENEMY→NEUTRAL revocation of active attack/acquisition
  - v16 relation snapshot/restore plus v15 compatibility behavior

## Content and asset gates

- `npm run validate:content`: **0 errors, 0 warnings**.
- Validated inventory: **18 definitions · 16 assets · 3 maps**.
- `sha256sum -c ASSET_HASHES.sha256`: **all 23 tracked assets OK**.
- Asset audit resolves the production `aegis_field_barracks` and `aegis_vehicle_factory` IDs to the new v024/v022 textured GLBs.
- The previous v023/v021 production GLBs remain present and hash-verified for rollback/reference.
- Integrated textured GLBs preserve original bounds, geometry names, WorldForge marker-node names/transforms, root identity/metadata, and double-sided rendering semantics.

## v0.6.6.1 visual integration verification

- Barracks source/prototype: **265 / 265 geometry objects**, matching names and bounds.
- Vehicle Factory source/prototype: **116 / 116 geometry objects**, matching names and bounds.
- All original named GLB nodes are present in each integrated asset, including `WF_*` authoring/runtime markers.
- No building gameplay definition, footprint, Geometry module, health, production, command, AI, or relationship data changed.

## Release boundary

v0.6.6 is intentionally a narrow simulation-authority patch; v0.6.6.1 adds only the approved Aegis visual-asset integration on top of it. It does not add diplomacy UI, treaties, team-level relation overrides, mission scripting, player-knowledge/fog systems, ownership transfer, or faction switching. Those remain later layers.
