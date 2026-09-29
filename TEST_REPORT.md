# ForgeRTS v0.6.6.7 Test Report

## Automated regression suite

- 139 / 139 tests passed
- 0 failed
- Snapshot schema remains v16
- Existing economy, production, combat, movement, relationships, strategic AI, tactical AI, construction, fortification and content-foundation tests all pass
- Added regression coverage for Crimson vehicle routing, authored no-tint mode, vehicle GLB node contracts, Reclaimer orientation/animation isolation, Warder registration, and Warder production through the existing factory system

## Content validation

- 0 errors
- 0 warnings
- 24 registered definitions
- 31 active catalog assets
- 3 maps

## Static validation

- 90 / 90 JSON files parsed
- 65 / 65 JS/MJS files pass `node --check`
- 42 runtime/tool modules audited for static import cycles
- 0 circular imports

## Asset preservation

- 42 / 42 files tracked in `ASSET_HASHES.sha256`
- All 38 assets from v0.6.6.6 remain byte-for-byte unchanged
- Breaker MBT v001, Raider Halftrack v002, and Warder IFV v001 match their accepted production-source GLBs byte-for-byte
- The integrated Reclaimer Harvester differs intentionally from its accepted source only in GLB node metadata/transforms: `VehicleRoot` is rotated -90° around Y to match the existing Harvester forward-axis contract, and articulated animation roots are namespaced to prevent Aegis/Crimson animation-axis conflicts. Geometry/material buffers are preserved.

## Runtime-change boundary

`engine/`, `renderer/`, and `ui/` are byte-for-byte unchanged from v0.6.6.6. This integration uses the existing data-driven faction asset routing, authored-color mode, ClientAnimation, GameObject modules, combat, locomotion, production, economy/docking, Team AI and map systems.

## Vehicle integration behavior

- Breaker MBT uses the existing `aegis_x` heavy-tank gameplay role for Crimson and gains optional authored barrel recoil.
- Raider Halftrack uses the existing `hmmwv50` light-combat gameplay role for Crimson and gains optional authored barrel recoil.
- Reclaimer uses the existing authoritative `harvester` economy role, including harvesting, cargo, return, docking and unloading state machines.
- Warder IFV is a new data definition (`warder_ifv`) using existing runtime systems plus a data-defined 30mm autocannon. Crimson AI can produce it through the existing War Factory role, and one starts on the active validation map for immediate visual inspection.
- Warder `RearRampRoot` remains presentation-ready only; infantry containment/transport gameplay is not implemented or claimed in this patch.
