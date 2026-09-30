# ForgeRTS v0.7.2 Combat Presentation Audit

## Problem found in v0.7.1

Combat was mechanically correct but visually and audibly weak at the mobile RTS camera. Hitscan feedback was a one-pixel-style line for ~90 ms, impacts were ~0.35 m spheres for ~120 ms, physical projectile meshes used their actual 0.10–0.26 m collision radii, `DESTROYED` events had no dedicated effect, and ForgeRTS had no audio system.

## Boundary

v0.7.2 changes presentation only. `engine/combat/weapon-system.js`, `projectile-system.js`, `damage-system.js`, weapon JSON balance, maps, missions, AI, economy and snapshot behavior remain authoritative and unchanged.

Existing combat events are consumed by the client:

- `HITSCAN` -> muzzle flash, optional visible tracer, impact feedback, fire/impact audio
- `PROJECTILE_FIRED` -> muzzle flash/audio; live authoritative projectile gets a larger visual core + trail
- `PROJECTILE_IMPACT` -> impact flash/dust/audio
- `DESTROYED` -> destruction flash/smoke/audio

## Data-driven profiles

`data/presentation/combat.json` defines per-weapon muzzle, tracer/projectile, impact, destruction and audio presentation for all current weapons:

- Service Rifle
- Praetorian Heavy Rifle
- .50 Cal HMG
- Warder 30 mm
- Guardian cannon
- Aegis-X 120 mm
- Anvil 155 mm

These values cannot change damage, collision, range or cadence.

## Audio

The first audio foundation uses procedural Web Audio rather than bundled third-party samples. Presets are synthesized at runtime, then played through a master bus with distance attenuation, stereo panning and group concurrency caps. AudioContext creation/resume occurs only after user interaction so iPhone Safari can permit playback.

Future releases may replace presets with licensed/original samples without changing the combat event boundary.

## Mobile/performance guardrails

- maximum simultaneous audio voices
- per-group concurrency limits
- maximum active temporary visual effects
- additive/unlit low-poly FX; no shadow-casting particles
- no FX state in simulation snapshots
- projectile visual radius independent from collision radius

## Validation

Automated tests verify that all registered weapons have presentation profiles, audio preset names are supported, renderer code handles all four combat event families, audio modules import safely outside the browser, and authoritative combat source does not depend on client FX/audio.
