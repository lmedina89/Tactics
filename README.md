# ForgeRTS v0.4.0 — Faction Economy + Production + Docking

ForgeRTS is a clean, separate browser-native RTS engine. It does **not** modify the existing WorldForge / Skirmish project.

v0.4.0 adds the first complete C&C-style economy loop on top of the v0.3.1 combat and locomotor foundation:

`crystal field → harvest cargo → refinery docking/unload → credits → production queue → controlled rollout → battlefield`

The implementation remains original ForgeRTS JavaScript. The architecture follows the system boundaries established in the released C&C references: player/faction economy is simulation state, harvesting and docking are explicit object interactions, production is a generic module-driven queue, and factory/barracks rollout is an explicit protocol rather than a spawn-and-collision workaround.

## Player-facing changes

- The HUD now shows **credits and power** for the human faction.
- The training map starts with a **Power Node, Refinery, Barracks, Field Harvester, Rich field, and Dense field** in addition to the existing combat objects.
- Select the **Harvester**, then tap a crystal field to issue `HARVEST`.
- The Harvester mines finite resource capacity, fills its cargo, returns to the nearest owned Refinery, requests docking, unloads into credits, exits, and resumes the previous field when resources remain.
- Select the **Vehicle Factory** to queue HMMWV-50, Field Harvester, or Aegis-X.
- Select the **Barracks** to queue Riflemen.
- Production deducts credits when queued; cancelling the last queued item refunds its cost.
- Completed units use an explicit rollout protocol, clear the producer footprint, then move to a rally point before returning to normal command behavior.
- Crystal deposits visibly shrink with depletion and disappear when exhausted.
- Low power is represented in faction state and currently reduces production speed to 50%.

## Economy / production data

Initial data-driven values include:

- Rifleman: **$150 / 3 s**
- HMMWV-50: **$450 / 5 s**
- Field Harvester: **$800 / 7 s**
- Aegis-X: **$1100 / 9 s**
- Field Harvester cargo: **1200 units**
- Harvest rate: **120 units/s**
- Refinery unload rate: **300 units/s**
- Rich mineral field: **1250 units**
- Dense mineral field: **3000 units**

These values live in data modules rather than concrete unit-specific engine branches.

## Simulation architecture

The economy chain is intentionally split into reusable systems:

`CommandBus → ResourceSystem / ProductionSystem → InteractionManager → FactionEconomySystem → GameObject module state`

The existing v0.3.1 combat chain remains intact:

`ATTACK intent → UnitAI route/engage state → body/turret aim → WeaponRuntime → projectile/hitscan → ArmorSet → Body health/destruction`

Snapshot format is now **v7** and preserves credits, power state, resource depletion, Harvester cargo/docking state, production queues, active rollout sessions, dynamically produced entities, combat state, and locomotor maneuver state.

## Intentionally deferred

- full construction/dozer/base-placement gameplay
- strategic enemy production AI
- automated enemy harvesting decisions
- tech-tree prerequisites and upgrades
- multiple simultaneous docking bays
- repair/rearm/service interactions
- selling structures
- advanced rally-point editing

Those can now build on the generic economy/interaction/production foundation rather than bespoke behavior.

## Validation focus

1. Select the player Harvester and tap either crystal field. Verify cargo fills, the Harvester returns to the Refinery, credits rise, then the Harvester exits and resumes harvesting.
2. Select the Vehicle Factory and queue several different vehicles. Verify costs, progress, rollout, and selectable produced units.
3. Select the Barracks and queue Riflemen.
4. Cancel a queued production item and verify credits are refunded.
5. Continue testing v0.3.1 combat/movement to ensure economy integration did not regress those systems.

## Run

Serve the folder from any static HTTP server or deploy directly to GitHub Pages. `index.html` is at the project root.
