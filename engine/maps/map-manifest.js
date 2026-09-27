const clone = (v) => structuredClone(v);

export function validateMapManifest(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Map manifest must be an object');
  if ((raw.manifestVersion ?? 0) < 2) throw new Error('ForgeRTS v0.2 requires map manifestVersion >= 2');
  if (!raw.id) throw new Error('Map manifest missing id');
  if (!raw.size?.width || !raw.size?.depth) throw new Error('Map manifest missing size');
  if (!raw.terrain?.heightfield) throw new Error('Map manifest missing terrain.heightfield');

  const map = clone(raw);
  map.region ??= { id: map.id, streamable: false, neighbors: [] };
  map.region.strategic ??= {};
  map.region.strategic.owner ??= null;
  map.region.strategic.threat ??= 0;
  map.region.strategic.resourceValue ??= 0;
  map.region.strategic.aiActivity ??= 0;
  map.region.strategic.discoveredBy ??= [];
  map.players ??= [];
  map.objects ??= [];
  map.roads ??= [];
  map.water ??= { rivers: [], lakes: [] };
  map.water.rivers ??= [];
  map.water.lakes ??= [];
  map.waypoints ??= [];
  map.triggerAreas ??= [];
  map.resourceFields ??= [];
  map.aiAnchors ??= [];
  map.staticObstacles ??= [];
  map.navigation ??= { cellSize: 4, defaultMaxSlopeDeg: 32, waterIsBlocked: true };
  map.environment ??= {};
  map.terrain.materials ??= [];
  map.terrain.cliffs ??= { slopeStartDeg: 24, slopeFullDeg: 38 };
  map.terrain.splat ??= {};

  const playerIds = new Set();
  for (const p of map.players) {
    if (!p.id || !p.faction) throw new Error('Each map player needs id and faction');
    if (playerIds.has(p.id)) throw new Error(`Duplicate player id ${p.id}`);
    playerIds.add(p.id);
  }
  const objectIds = new Set();
  for (const o of map.objects) {
    if (!o.id || !o.definition) throw new Error('Each map object needs id and definition');
    if (objectIds.has(o.id)) throw new Error(`Duplicate object id ${o.id}`);
    objectIds.add(o.id);
    if (o.owner && !playerIds.has(o.owner)) throw new Error(`Object ${o.id} has unknown owner ${o.owner}`);
  }
  return map;
}
