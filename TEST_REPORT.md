# ForgeRTS v0.6.6.8 Test Report

## Automated regression suite

- 145 / 145 tests passed
- 0 failed
- Existing construction, economy, production, combat/projectile, locomotion, collision, player-relations, command-control, strategic AI, tactical AI, Team AI, fortification, animation and content-foundation regressions all pass
- Added regression coverage for Crimson Anvil/Praetorian/Line Trooper asset registration, authored-material routing, GLB node contracts, Line Trooper forward-axis correction, production access, Aegis UI isolation, gameplay differentiation, Crimson Team integration and authoritative enemy production

## Content validation

- 0 errors
- 0 warnings
- 26 registered definitions
- 34 active catalog assets
- 3 maps

## Static validation

- 97 / 97 JSON files parsed
- 66 / 66 JS/MJS files pass `node --check`
- 42 runtime/tool modules audited for static import cycles when the root `main.js` entry is included
- 0 circular imports

## Asset preservation

- 45 / 45 asset files tracked in `ASSET_HASHES.sha256`
- All 42 files tracked by v0.6.6.7 remain byte-for-byte unchanged
- Crimson Anvil SPG v002 matches its accepted production-source GLB byte-for-byte
- Crimson Praetorian Exosuit v002 matches its accepted production-source GLB byte-for-byte
- Crimson Line Trooper v001 preserves its source binary geometry/material payload byte-for-byte; the integrated GLB changes only the `RiflemanRoot` orientation metadata (-90 degrees around Y) so the authored +X forward axis matches the existing shared Rifleman +Z forward contract

## Runtime-change boundary

`engine/`, `renderer/`, and `ui/` are byte-for-byte unchanged from v0.6.6.7. This patch uses the existing data-driven Definition, Render, faction asset routing, authored-color mode, Weapon, Armor, Locomotor, Production, Team AI, projectile and map systems.

## Crimson integration behavior

- Existing Crimson-owned `rifleman` gameplay objects now render the accepted Line Trooper v001 asset while Aegis retains the existing Aegis Rifleman asset.
- Praetorian Exosuit is a new elite infantry definition with 360 health, powered-infantry armor, a slower heavy-infantry locomotor and a dedicated heavy rifle. It is producible by the existing Barracks role for AI and is part of the Crimson mobile-assault composition.
- Anvil SPG is a new long-range artillery definition with a dedicated 155mm projectile weapon, a minimum engagement range, slower tracked-artillery locomotion and authored barrel recoil. It is producible by the existing Vehicle Factory/War Factory role for AI and is part of the Crimson armored-assault composition.
- One Praetorian and one Anvil start on the construction-validation enemy base for immediate visual/gameplay inspection; the existing enemy Rifleman validates Line Trooper faction routing.
- Crimson-only Praetorian/Anvil produce commands were deliberately not added to the shared Aegis command sets, so the current Aegis player UI does not expose them.

## Deliberate safety limits

- Anvil stabilizer roots/sockets remain intact and side-mounted in the accepted GLB, but v0.6.6.8 does not invent an unsourced authoritative deploy-state mechanic. They remain stowed during runtime for now.
- Line Trooper and Praetorian do not yet contain baked walk/fire clips. Missing clips are safely ignored by the existing presentation layer; gameplay movement and combat remain authoritative.
