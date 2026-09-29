# Crimson Vehicle Roster Integration — v0.6.6.7

## Integrated assets

- Breaker MBT v001 → shared `aegis_x` heavy-tank gameplay role via `assetByFaction.crimson`.
- Raider Halftrack v002 → shared `hmmwv50` light-combat gameplay role via `assetByFaction.crimson`.
- Reclaimer Harvester v001 → shared `harvester` economy role via `assetByFaction.crimson`.
- Warder IFV v001 → new data definition `warder_ifv`, using the existing combat/locomotion/production/AI module architecture.

## Safety boundary

`engine/`, `renderer/`, and `ui/` are unchanged. Gameplay truth remains data-driven. Existing Aegis assets and definitions remain the default assets for the shared roles. Crimson authored vehicles use `AUTHORED` color mode so the legacy red tint is not applied.

## Reclaimer orientation / animation

The accepted Reclaimer source was authored +X-forward while the existing authoritative Harvester role is +Z-forward with `headingOffset: 0`. The integrated copy rotates only `VehicleRoot` by -90° around Y. Its wheel/steering/collector/gathering roots are namespaced in the integrated GLB, and optional Crimson animation specs target those names. This prevents the existing Aegis animation axes from acting on Crimson parts. No economy or docking code changed.

## Warder limitation

The GLB contains a functional `RearRampRoot`, but ForgeRTS does not yet have infantry containment/transport gameplay. The Warder is integrated as a combat IFV in this release; the ramp remains future-ready presentation metadata rather than a fake transport system.

## Production visibility

`warder_ifv` is in the shared vehicle factory's authoritative buildable set so Crimson AI can produce it. The current human Aegis command set intentionally does not expose a Warder button. A future faction-specific production/tech-tree pass can formalize player-facing faction rosters without duplicating factory gameplay definitions.
