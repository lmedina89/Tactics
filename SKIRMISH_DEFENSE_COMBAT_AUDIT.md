# ForgeRTS v0.6.4 — Skirmish Defense & Combat Completion Audit

## Reference boundary

v0.6.4 was designed after re-checking the official EA Generals / Zero Hour AI and weapon architecture. The released AI interfaces explicitly expose supply-source attacked/safe state and `guardSupplyCenter(Team*, ...)`; Generals mission/script actions likewise include a guard-supply-center operation. The released weapon data also distinguishes the designated target from unrelated objects in the projectile path: collision filters apply to objects that get in the way while the designated target remains a valid collision target.

ForgeRTS keeps those behavioral boundaries but implements them through its existing browser-native TeamManager, CommandBus, authoritative damage state, fixed-step projectile solver and GameObject Geometry. No EA C++ implementation was translated line-for-line.

## Economic defense

`EconomicDefenseManager` is a timer-bounded player-level coordinator under `SkirmishAIPlayer`. It watches authoritative recent-damage state only on data-defined protected categories. A threat picture is built from hostile objects near the attacked economic asset using data-defined category weights. Response bands choose invariant TeamPrototypes; the current Crimson data provides light, mobile and heavy economic-response Teams.

The manager never creates combat units directly. It creates a normal recruiting Team work order. Existing free units can be recruited; missing minimum composition becomes ordinary ProductionSystem demand through the existing economy planner, with TeamPrototype production priority. Once ready, response units receive ordinary `FROM_AI` ATTACK or GUARD_OBJECT commands. When the threat/hold/escort window ends, the temporary Team is disbanded and members return to the free unit pool.

For a severe raid, a data-defined `borrowRoles` policy can temporarily recall an already ACTIVE Team (currently ASSAULT) as immediate cover while the dedicated response work order is still being filled. Recall happens at the Team level rather than transferring individual units: membership and lifecycle stay intact, normal strategic control is temporarily suspended, and the Team is released back to its original AI plan when dedicated defenders become ready or the danger window ends. This mirrors the useful Team-level boundary implied by Generals' `guardSupplyCenter(Team*, ...)` interface while avoiding a second combat-control path.

Repeated distinct attacks within a configurable incident window extend a data-defined escort window. This keeps protection near a repeatedly threatened Harvester/economic asset without permanently consuming the whole army.

## Projectile world collision

Physical projectiles now evaluate the earliest collision over each fixed simulation segment against:

- the designated target, using swept moving-target Geometry collision;
- configured intervening world entities, using real BOX/CYLINDER/SPHERE Geometry, moving-entity swept broadphase/narrowphase, and deterministic earliest-hit resolution;
- terrain height, using bounded deterministic segment sampling plus binary refinement.

Projectile definitions own `worldCollision` policy (`relations`, `kinds`, terrain participation and terrain sample step). The current cannon shells collide with hostile units/buildings and terrain. The designated target remains independently collision-valid, matching the useful C&C distinction between designated-target collision and filters for unrelated objects in the flight path.

All production buildings now expose authoritative BOX `Geometry` in addition to their 2D Footprint. Footprint remains navigation/placement authority; Geometry is the 3D combat/collision volume.

## Deferred combat layers

v0.6.4 intentionally does not invent unsupported mechanics for:

- penetration / overpenetration;
- ricochet;
- splash / area damage;
- ballistic gravity / artillery arcs;
- destructible terrain or deformation;
- projectile-vs-projectile interception;
- complete ally/neutral projectile relation behavior (future PlayerRelationMap will become authoritative).

Those remain separate data-driven layers.
