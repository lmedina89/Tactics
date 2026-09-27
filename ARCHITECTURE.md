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
