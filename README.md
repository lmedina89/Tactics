# ForgeRTS v0.3.1 — Reverse / Turnaround + Combat Approach Stability

ForgeRTS is a clean, separate browser-native RTS engine. It does **not** modify the existing WorldForge / Skirmish project.

v0.3.1 corrects the first major vehicle-maneuver edge case found during v0.3.0 combat testing: a MOVE order directly behind a wheeled vehicle could cause it to reverse for the entire route because the locomotor only saw the next nearby path waypoint. The new implementation evaluates both the immediate path waypoint and the persistent terminal destination, so reverse is a local maneuver rather than a second long-distance travel mode.

The implementation remains original ForgeRTS JavaScript. The behavior is informed by the separation seen in released C&C locomotor/drive systems: tracked and wheeled movement are distinct, reverse is stateful, and wheeled turn-around behavior is allowed to use a short reversing maneuver before recommitting to forward travel.

## Player-facing changes

- **Short destination behind a vehicle:** the vehicle may simply back into it.
- **Long destination behind a wheeled vehicle:** HMMWV / Harvester perform a bounded reverse-and-turn maneuver, then commit to forward travel instead of reversing across the map.
- **Long destination behind a tracked vehicle:** Aegis-X prefers its pivot-turn behavior and forward travel; reverse is reserved for short tactical movement.
- Wheeled turn-around state is visible in the debug HUD as `THREE POINT REVERSE` / `THREE POINT FORWARD` while testing.
- ATTACK approach now uses range hysteresis so a unit already engaging near maximum range does not repeatedly bounce between moving and firing when the target shifts slightly.

## Data-driven locomotor additions

Wheeled locomotor data now supports:

- `reverseEntryAngle`
- `reverseExitAngle`
- `maxReverseDistance`
- `preferForwardDistance`
- `allowThreePointTurn`
- `threePointReverseDistance`
- `threePointReverseSpeedFactor`
- `threePointReverseSteerFactor`
- `threePointSwitchAngle`
- `threePointExitAngle`
- `threePointReverseMaxTime`
- `reverseReentryCooldown`

Tracked locomotors also use a bounded `maxReverseDistance`, keeping reverse available for nearby tactical corrections without allowing a tank to back down an entire long route just because the path starts behind its hull.

## Simulation behavior

The movement chain remains:

`MOVE / ATTACK intent → UnitAI route → locomotor maneuver state → steering/pivot → simulation position/facing → renderer`

For wheels, a long behind-order can now transition through:

`FORWARD → THREE_POINT_REVERSE → THREE_POINT_FORWARD → FORWARD`

The turn-around is deterministic simulation state. UnitAI temporarily suppresses false stuck/repath detection while a deliberate three-point maneuver is in progress, so the route is not discarded merely because the vehicle briefly moves away from its final destination to create turning room.

Snapshot format is now **v6** and includes locomotor maneuver state in addition to the v0.3.0 combat state.

## Combat preserved from v0.3.0

- persistent ATTACK orders
- data-defined WeaponSet / ArmorSet
- independent turret yaw for Aegis-X, HMMWV, and Guardian Turret
- Rifleman body aim
- hitscan and deterministic projectile delivery
- armor-adjusted damage, health/damage states, destruction, wreck persistence
- autonomous Guardian Turret acquisition

## Validation focus

1. Send the HMMWV to a point only a few meters directly behind it: short reverse is expected.
2. Send it to a point far behind it: it should back only briefly, turn, then travel forward.
3. Repeat with the Harvester; its heavier wheel profile should maneuver more slowly.
4. Send Aegis-X far behind itself: it should pivot and drive forward rather than reverse the whole route.
5. Attack around weapon-range boundaries and confirm units do not visibly oscillate between MOVE and FIRE.

## Run

Serve the folder from any static HTTP server or deploy directly to GitHub Pages. `index.html` is at the project root.
