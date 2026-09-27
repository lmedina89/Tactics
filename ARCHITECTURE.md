# ForgeRTS Architecture Contract

1. **Simulation owns truth.** Renderer/UI cannot directly move, damage, spawn, or mutate game entities.
2. **Fixed timestep.** Gameplay advances at 30 Hz independently of render FPS.
3. **Commands are data.** Player input, AI, mission scripts, replays, and future networking use the same serializable command objects.
4. **Content is data.** Unit/building/faction/weapon/armor/locomotor/mission definitions live outside gameplay code.
5. **GameObjects are composed from modules.** Runtime code asks what modules an object has rather than branching on concrete unit/building names. Core module families begin with `Body`, `Selectable`, `UnitAIUpdate`, `Locomotor`, `Vision`, `Render`, `Footprint`, `Resource`, `Production`, `ResourceCollector`, and `InteractionEndpoint`.
6. **Pathfinding and locomotion are separate.** Pathfinder chooses a route; locomotor physically follows it.
7. **Object-to-object coordination is explicit.** Docking, production rollout, repair, containment, helipad/aircraft service, and similar interactions must use deterministic protocols/state machines rather than collision/pathfinding inference.
8. **Gestures are classified before gameplay commands.** Touch input resolves TAP / LONG_PRESS / PAN / PINCH before gameplay input is emitted; camera motion cannot accidentally become a command.
9. **Stable IDs.** Entities, definitions, assets, players, teams, regions, trigger areas, interactions, and mission scripts use stable string IDs.
10. **World state outlives missions.** Missions/scripts are optional layers over the simulation; region ownership/threat/resources/discovery are persistent world data.
11. **Renderer is disposable.** Three.js can be replaced without rewriting simulation logic.
12. **WorldForge remains separate.** It produces assets/maps; ForgeRTS consumes them.
13. **Reference before invention.** Before adding a major RTS subsystem, inspect the corresponding Red Alert / Generals / Red Alert 3 reference family recorded in `GENERALS_PARITY.md`.
14. **GPL provenance is explicit.** Original ForgeRTS files and any future directly ported GPL files must remain distinguishable and correctly attributed.
15. **Facing is simulation state.** Hull orientation, steering, reverse state, and later turret orientation belong to deterministic locomotion/combat state; the renderer only applies those values plus asset-local heading offsets.
16. **Combat is layered.** ATTACK intent belongs to UnitAI; aiming belongs to body/turret simulation; WeaponRuntime owns cadence/ammo/reload; ProjectileSystem owns projectile travel; DamageSystem owns armor-adjusted health changes.
17. **Armor is not HP inflation.** Damage types are transformed through data-defined ArmorSet coefficients before Body health changes.
18. **Turrets are independent simulation state.** Hull yaw remains locomotor-owned. Turret yaw/aim tolerance/turn rate are deterministic combat state and renderer nodes merely display it.
19. **Weapon slots are generic.** GameObjects may expose PRIMARY/SECONDARY/TERTIARY-style slots without concrete unit-name checks; target suitability and expected armor-adjusted damage drive later weapon selection.
20. **Destroyed objects remain world state.** Death disables gameplay participation but does not require immediate deletion; wreck rendering, salvage, rebuilding, and persistence can be layered later.
21. **Reverse is a maneuver, not a travel mode.** Locomotors may reverse for local tactical corrections, docking, or turn-around setup, but long-distance path intent must evaluate the persistent terminal destination and prefer forward travel unless data explicitly says otherwise.
22. **Wheeled turn-around is stateful.** Three-point/turn-around phases are deterministic locomotor state and may temporarily move away from the terminal destination; UnitAI must not misclassify that intentional maneuver as pathfinding failure.
23. **Attack range uses hysteresis.** UnitAI enters firing range slightly inside maximum range and holds engagement through small range-edge changes to prevent MOVE/FIRE oscillation.
24. **Faction economy is simulation state.** Credits, power produced/used, low-power state, and later tech/build permissions belong to faction/player state rather than UI or structures individually.
25. **Harvesting is an interaction workflow.** Resource collection, docking, unloading, and exit are explicit ResourceSystem + InteractionManager state, not proximity-triggered credit mutations.
26. **Production is generic and data-driven.** Production queues consume `Production`, `ProductionCost`, power, and rollout protocol data; the engine must not branch on Barracks, Factory, Rifleman, HMMWV, Harvester, or Aegis-X names.
27. **Spawn is not rollout.** A produced entity may be created before it is operationally clear of the producer; controlled rollout/clear/rally state must complete before ordinary movement owns the unit.
28. **Resource depletion is persistent world state.** Resource capacity changes belong to the simulation/snapshot and must not be inferred from visual scale or renderer state.
29. **Low power affects systems through policy.** Power shortage is faction state; individual systems query a policy such as production-rate factor rather than hard-coding power logic into each producer.

