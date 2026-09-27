# ForgeRTS Architecture Contract

1. **Simulation owns truth.** Renderer/UI cannot directly move, damage, spawn, or mutate game entities.
2. **Fixed timestep.** Gameplay advances at 30 Hz independently of render FPS.
3. **Commands are data.** Player input, AI, mission scripts, replays, and future networking use the same serializable command objects.
4. **Content is data.** Unit/building/faction/weapon/armor/locomotor/mission definitions live outside gameplay code.
5. **Pathfinding and locomotion are separate.** Pathfinder chooses a route; locomotor physically follows it.
6. **Stable IDs.** Entities, definitions, assets, players, teams, trigger areas, and mission scripts use stable string IDs.
7. **No unit-name branching.** Runtime code asks for modules/definitions, never `if (unit === "tank")`.
8. **Renderer is disposable.** Three.js can be replaced without rewriting simulation logic.
9. **WorldForge remains separate.** It produces assets/maps; ForgeRTS consumes them.
10. **GPL provenance is explicit.** Original ForgeRTS files and any future directly ported GPL files must remain distinguishable and correctly attributed.
