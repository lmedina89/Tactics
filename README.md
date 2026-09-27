# ForgeRTS v0.5.0 — Base Construction + Tech Tree + Command Sets

ForgeRTS is a clean, separate browser-native RTS engine. It does **not** modify the existing WorldForge / Skirmish project.

v0.5.0 adds the missing base-construction layer on top of v0.4.0 economy/production and the existing combat/locomotor systems:

`select Command Post → choose build command → placement ghost → authoritative validation → construction site → completion → existing building modules activate`

The implementation remains original ForgeRTS JavaScript. The architecture follows the released C&C family at the system-boundary level: build eligibility belongs to player/faction state, build commands are data, placement preview is client-side only, construction creates a real simulation object, and completed structures activate existing production/power/docking/combat modules rather than spawning a second bespoke behavior path.

## Player-facing changes

- Select the **Tactical Command Post** to open the first data-driven base build menu.
- Initial build commands:
  - Field Power Node — **$500 / 5 s**
  - Field Refinery — **$1200 / 9 s**
  - Field Barracks — **$700 / 7 s**
  - Vehicle Factory — **$1500 / 11 s**
  - Guardian Turret — **$600 / 6 s**
- Selecting a build command enters placement mode with a translucent world-space ghost.
- Valid placement is shown green; invalid placement is shown red.
- `ROTATE 90°` and `CANCEL BUILD` are available while placing.
- Placement is validated against:
  - builder radius
  - map bounds
  - water
  - slope / height variation
  - static blocked terrain
  - existing building footprints
  - resource-field blockers
  - tech prerequisites
  - build limits
  - available credits
- Confirmed placement deducts credits and creates a real, selectable **construction site**.
- Construction sites immediately reserve their building footprint for pathfinding.
- Under-construction structures do **not** provide power, production, refinery docking, or weapon fire.
- Structure health grows with build progress while preserving damage taken during construction.
- A destroyed construction site never activates.
- Construction can be cancelled for the configured partial refund.
- When construction completes, the same existing modules from earlier milestones turn on automatically:
  - Power Node contributes power
  - Refinery accepts Harvester docking
  - Barracks exposes Rifleman production
  - Vehicle Factory exposes HMMWV / Harvester / Aegis-X production
  - Guardian Turret becomes an autonomous combat structure

## CommandSet foundation

Object UI commands are now defined in data instead of being hard-wired into the HUD.

Current CommandSets include:

- **Command Post:** build Power Node / Refinery / Barracks / Vehicle Factory / Guardian Turret
- **Barracks:** produce Rifleman / cancel queued production
- **Vehicle Factory:** produce HMMWV-50 / Harvester / Aegis-X / cancel queued production
- **Harvester:** return cargo

The UI asks the selected object for its `CommandSet`, then renders the applicable commands. This gives later upgrades, abilities, repair, sell, stances, special powers, and faction-specific command layouts a generic home.

## Tech tree foundation

Construction requirements are data-driven through each structure's `Construction` module.

Current initial prerequisite chain:

- Power Node: Command Post builder only
- Refinery: requires Power Node
- Barracks: requires Power Node
- Vehicle Factory: requires Power Node + Refinery
- Guardian Turret: requires Barracks

The engine does not branch on concrete building names. Prerequisites, cost, build time, build limit, refund fraction, terrain rules, and future construction sockets are all data.

## Construction architecture

v0.5.0 adds three focused systems:

`TechTreeSystem`
- checks builder permission, operational prerequisites, build limits, and affordability

`PlacementValidator`
- validates world-space footprint placement independently from the UI ghost

`ConstructionSystem`
- reserves credits and footprint
- owns construction progress/state
- supports cancellation/refund
- supports static construction-yard style builders now and contains the socket/state foundation for future mobile builders
- activates the finished object's existing modules instead of reimplementing them

Dynamic structure footprints are now registered in the pathfinder at runtime, so newly built and cancelled structures affect navigation immediately without rebuilding the entire navigation map.

## Existing systems preserved

v0.5.0 keeps the earlier validated chains intact:

**Economy / production**

`crystal field → Harvester cargo → Refinery docking/unload → faction credits → production queue → rollout → battlefield`

**Combat**

`ATTACK → UnitAI approach → hull/turret aim → weapon runtime → projectile/hitscan → armor → Body health/destruction`

**Locomotion**

- tracked pivot behavior
- wheeled steering arcs
- bounded tactical reverse
- three-point turnaround for long behind-orders

## Snapshot format

Snapshot format is now **v8**.

It preserves:

- credits / power
- resource depletion
- Harvester cargo and docking state
- production queues and rollout sessions
- dynamically produced units
- construction sites, progress, builder source, refund data, operational state
- combat / projectile state
- locomotor maneuver state
- persistent region state

## Intentionally deferred

- dedicated mobile dozer/construction vehicle art and production
- multi-builder assisted construction
- repair / rearm / service commands
- structure selling
- advanced projected buildability / base-expansion radii
- upgrades / sciences / veterancy
- strategic enemy base-construction decisions
- full team/skirmish AI
- missions / trigger scripting

The v0.5.0 architecture is designed so those systems can use the same CommandBus, CommandSet, tech-tree, placement, and construction state rather than adding parallel special-case code.

## Validation focus

1. Select the Command Post and build a Power Node in a clear area.
2. Try placing on top of another structure, outside the build radius, on steep/water terrain, and near a mineral field; invalid placement should stay red and should not spend credits.
3. Rotate a building before placement.
4. Select the construction site and cancel it; confirm the partial refund and that the removed footprint no longer blocks movement.
5. Complete a Barracks or Vehicle Factory and immediately use its production CommandSet.
6. Damage/destroy a construction site during a combat test and verify it does not magically complete.
7. Re-test Harvester economy, unit production, combat, and vehicle movement for regressions.

## Run

Serve the folder from any static HTTP server or deploy directly to GitHub Pages. `index.html` is at the project root.
