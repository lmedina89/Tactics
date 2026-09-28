const clone = (v) => structuredClone(v);

export function validateMapManifest(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Map manifest must be an object');
  if ((raw.manifestVersion ?? 0) < 2) throw new Error('ForgeRTS v0.2 requires map manifestVersion >= 2');
  if (!raw.id) throw new Error('Map manifest missing id');
  if (!raw.size?.width || !raw.size?.depth) throw new Error('Map manifest missing size');
  if (!raw.terrain?.heightfield) throw new Error('Map manifest missing terrain.heightfield');

  const map = clone(raw);
  map.contentContractVersion ??= 1;
  if(map.contentContractVersion!==1)throw new Error(`Unsupported contentContractVersion ${map.contentContractVersion}`);
  map.region ??= { id: map.id, streamable: false, neighbors: [] };
  map.region.strategic ??= {};
  map.region.strategic.owner ??= null;
  map.region.strategic.threat ??= 0;
  map.region.strategic.resourceValue ??= 0;
  map.region.strategic.aiActivity ??= 0;
  map.region.strategic.discoveredBy ??= [];
  map.players ??= [];
  map.playerRelations ??= [];
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
  const relationKeys=new Set();
  const validRelations=new Set(['ALLY','NEUTRAL','ENEMY']);
  for(const r of map.playerRelations){
    if(!r?.from||!r?.to)throw new Error('Each player relation needs from and to');
    if(!playerIds.has(r.from)||!playerIds.has(r.to))throw new Error(`Player relation ${r.from} -> ${r.to} references unknown player`);
    if(r.from===r.to)throw new Error(`Player relation ${r.from} -> ${r.to} cannot override SELF`);
    if(!validRelations.has(r.relation))throw new Error(`Player relation ${r.from} -> ${r.to} has invalid relation ${r.relation}`);
    const key=`${r.from}\u0000${r.to}`;if(relationKeys.has(key))throw new Error(`Duplicate player relation ${r.from} -> ${r.to}`);relationKeys.add(key);
  }
  const waypointIds=new Set();
  for(const w of map.waypoints){if(!w.id)throw new Error('Each waypoint needs id');if(waypointIds.has(w.id))throw new Error(`Duplicate waypoint id ${w.id}`);waypointIds.add(w.id);}
  const anchorIds=new Set();
  for(const a of map.aiAnchors){if(!a.id)throw new Error('Each AI anchor needs id');if(anchorIds.has(a.id))throw new Error(`Duplicate AI anchor id ${a.id}`);anchorIds.add(a.id);}
  for(const p of map.players){
    if(p.startWaypoint&&!waypointIds.has(p.startWaypoint))throw new Error(`Player ${p.id} has unknown startWaypoint ${p.startWaypoint}`);
    if(p.ai){
      if(!p.ai.profile)throw new Error(`Player ${p.id} AI config missing profile`);
      if(p.ai.homeWaypoint&&!waypointIds.has(p.ai.homeWaypoint))throw new Error(`Player ${p.id} AI has unknown homeWaypoint ${p.ai.homeWaypoint}`);
      if(p.ai.rallyWaypoint&&!waypointIds.has(p.ai.rallyWaypoint))throw new Error(`Player ${p.id} AI has unknown rallyWaypoint ${p.ai.rallyWaypoint}`);
      if(p.ai.defenseAnchor&&!anchorIds.has(p.ai.defenseAnchor))throw new Error(`Player ${p.id} AI has unknown defenseAnchor ${p.ai.defenseAnchor}`);
    }
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
