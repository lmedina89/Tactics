# ForgeRTS v0.6.6 Test Report

**Release:** ForgeRTS v0.6.6 — Player Relations + Hostility Authority  
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
- `sha256sum -c ASSET_HASHES.sha256`: **all 21 tracked assets OK**.
- Production/reference GLB files are unchanged by v0.6.6.

## Release boundary

v0.6.6 is intentionally a narrow simulation-authority patch. It does not add diplomacy UI, treaties, team-level relation overrides, mission scripting, player-knowledge/fog systems, ownership transfer, or faction switching. Those remain later layers.
