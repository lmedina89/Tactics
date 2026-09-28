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
30. **CommandSets are data.** The selected object exposes generic commands through data-defined CommandSets; UI renders those commands but does not own their gameplay effects.
31. **Placement preview is never authoritative.** The client ghost may predict validity, but `BUILD_STRUCTURE` is accepted only after simulation-side tech and placement validation.
32. **Construction sites are real GameObjects.** Placement creates a selectable, damageable, footprint-reserving simulation object before completion rather than a renderer-only placeholder.
33. **Operational state gates modules.** Power, production, docking, autonomous weapons, and other finished-building systems remain inactive while `operational === false`.
34. **Structure occupancy is dynamic navigation state.** Built/cancelled structures register/remove runtime pathfinding obstacles without rebuilding the authored map or baking construction into static terrain data.
35. **Prerequisites and build limits are centralized.** Tech-tree eligibility is resolved from player-owned operational objects and data-defined requirements rather than individual buttons or concrete building names.
36. **Construction sockets belong to structure data.** Even when the current Command Post uses construction-yard style placement, structure definitions carry reusable approach sockets for future mobile builders, repair, and service workflows.
37. **Command authority is simulation-owned.** Commands carry issuer/source metadata and simulation validates ownership; UI selection restrictions are convenience, never security/authority.
38. **Orders are reusable state-machine vocabulary.** MOVE, ATTACK, ATTACK_MOVE, GUARD and later tactical orders belong to UnitAI and may be issued by player, AI or scripts through the same CommandBus.
39. **Queued orders are deterministic state.** Appended commands become a serializable UnitAI order queue rather than client-only waypoints.
40. **Stance and acquisition policy are data.** Idle auto-acquisition, guard radius, attack-move scan/chase limits, return radius and default stance live in `UnitAIUpdate` definition data.
41. **Selection is client state; group orders are simulation commands.** Box/additive selection never mutates entities. Issuing an order serializes selected IDs through the common command path.
42. **Resource-field multiplicity is visual only.** A mineral deposit remains one Resource GameObject; `ResourceFieldVisual` may render deterministic GLB clones/glow/depletion cues without creating extra economy/pathfinding entities.
43. **Interaction history is bounded.** Completed protocol sessions may be pruned after a deterministic retention window; active sessions may never be discarded by cleanup.
44. **Capacity is provider data.** Dock/service concurrency is governed by module capacity, not an implicit one-session global lock.
45. **Camera focus is client state.** Pan/zoom/center manipulate a maintained view target and must never feed back into simulation truth.


## v0.5.1 validation-layer rule

A feature is not considered ready for the next major subsystem merely because its isolated engine tests pass. Core RTS loops must also be exposed through a small playable validation scenario with enough UI feedback for a human tester to prove the chain end-to-end on the target mobile browser. The validation scenario is separate from the dense prebuilt regression map so regression fixtures do not accidentally satisfy tech prerequisites for the player.

The validation UI remains a client layer: objectives, command-dock labels, placement banners, and initial camera/selection do not mutate simulation truth except through the existing CommandBus and authoritative construction/production/resource systems.


## v0.5.2 tactical-command / resource-visual rule

The player command layer must use the same serializable vocabulary intended for future AI, scripts, replay and networking. `InputController` resolves selection and context only; it does not contain combat/pathing implementations. `UnitAIUpdate` owns persistent Attack Move / Guard / stance behavior, and all tunable acquisition/leash/return values are definition data.

Resource readability follows the opposite ownership boundary: multi-cluster mineral fields, emissive emphasis, ground glow and depletion presentation are renderer-only projections of one authoritative resource entity. Visual multiplicity must not multiply resource capacity, blockers, interaction endpoints or snapshot entities.


## v0.5.3 client-animation rule

Client animation is a **presentation-only consumer of authoritative simulation state**. GameLogic never reads wheel, rotor, fan, skeletal, door, or other render transforms back from Three.js. Object definitions opt into a generic `ClientAnimation` module; the renderer may then bind authored GLB clips through `AnimationMixer` or drive named mechanical pivots procedurally from simulation state. This mirrors the C&C family separation between gameplay modules and client/draw behavior while remaining an original browser-native implementation.

Rules:

- Never branch in the animation runtime on a concrete unit/building definition ID.
- Embedded clip names and procedural node/prefix bindings live in data.
- Movement-driven animation consumes authoritative speed/steering state; weapon animation consumes combat events; state-driven machinery consumes authoritative module state.
- Continuous presentation machinery (fans/radar/rotors) is client-time animation and is not serialized because it has no gameplay consequence.
- Only create `AnimationMixer` instances for objects that actually declare embedded clips.
- If an authored pivot lacks a trustworthy gameplay semantic or axis, leave it dormant until the corresponding state exists rather than inventing fake motion.
- Procedural animation must remain disposable with the rendered view and must not enlarge simulation snapshots.
