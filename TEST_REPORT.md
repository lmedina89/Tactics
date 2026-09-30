# ForgeRTS v0.7.2 Test Report

## Release focus

Combat Presentation Foundation built directly on the verified v0.7.1 Mission Guidance + Training Ground Reachability baseline.

## Automated validation

- Node test suite: **169/169 passed**
- Content validation: **0 errors / 0 warnings**
- Registered content: **26 definitions / 34 assets / 3 maps**
- Asset audit: **34 assets audited**
- JS/MJS syntax validation: **78/78 passed**
- JSON parse validation: **99/99 passed**
- Tracked asset hashes: **45/45 verified**

## v0.7.2 regression coverage

1. Every registered weapon has a client combat-presentation profile.
2. Every configured audio preset resolves to a supported procedural Web Audio preset.
3. Projectile presentation parameters are sane and independent from authoritative projectile collision data.
4. Renderer presentation handles `HITSCAN`, `PROJECTILE_FIRED`, `PROJECTILE_IMPACT`, and `DESTROYED` events.
5. Authoritative combat source does not import or depend on client FX/audio systems.
6. Audio module imports safely in the headless Node environment.

## Preservation checks against v0.7.1

- `/engine`: **byte-for-byte unchanged**.
- `/assets`: **byte-for-byte unchanged**.
- `/maps`: **byte-for-byte unchanged**.
- `/missions`: **byte-for-byte unchanged**.
- `data/weapons/`: **byte-for-byte unchanged**.
- Snapshot version remains **17**.
- Production queue reliability, rollout recovery, mission trigger/objective semantics, Training Ground resource reachability, AI, economy, construction, pathfinding and combat balance are unchanged.

## Client additions

- `renderer/combat-fx-system.js` — event-driven muzzle/tracer/projectile/impact/destruction presentation.
- `renderer/combat-audio-system.js` — procedural Web Audio, distance attenuation, stereo panning and concurrency control.
- `data/presentation/combat.json` — per-weapon client presentation profiles.
- `renderer/three-renderer.js` delegates combat-event presentation and projectile visuals to the new client systems.
- `main.js` loads client presentation data and unlocks Web Audio from user interaction for mobile-browser policy compliance.

## Browser limitation of automated environment

Headless Chromium is present in the build container, but the app imports Three.js from the public CDN and the headless smoke attempt could not complete reliably in this environment. Therefore final WebGL/audio quality is **not claimed from headless automation**. iPhone Safari remains the required presentation validation target.

## Mobile validation target

Test normal Field Test and Mission mode. Compare Rifleman, HMMWV .50 cal, Warder 30 mm, Guardian cannon, Aegis-X 120 mm and Anvil 155 mm firing at ordinary RTS camera distance. Validate:

- weapon fire is visually readable without obscuring units;
- cannon/artillery impacts are substantially stronger than small-arms impacts;
- physical projectile collision behavior is unchanged;
- audio begins after the first user interaction and remains stable on iPhone Safari;
- large firefights do not cause obvious audio stacking or FX performance collapse.
