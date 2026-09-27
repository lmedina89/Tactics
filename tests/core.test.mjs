import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CommandBus} from '../engine/commands/command-bus.js';
import {Simulation,FIXED_DT} from '../engine/sim/simulation.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
import {TerrainSampler} from '../engine/maps/terrain-sampler.js';
import {GridPathfinder} from '../engine/pathfinding/grid-pathfinder.js';
import {encodeWorldState,decodeWorldState} from '../engine/world/save-state.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));

class TestRegistry{
  constructor(defs,locos){this.defs=defs;this.locos=locos;}
  definition(id){return this.defs[id];}locomotor(id){return this.locos[id];}
}
const defs={u:{id:'u',kind:'vehicle',locomotor:'w',selectable:true,maxHealth:100,modules:['UnitAIUpdate','Locomotor']},b:{id:'b',kind:'building',selectable:false,maxHealth:1000,footprint:{width:20,depth:20}}};
const locos={w:{id:'w',kind:'wheels',maxSpeed:10,acceleration:8,braking:10,turnRate:3,radius:1,pathfindRadius:1.2,arrivalRadius:.6,maxSlopeDeg:35,canMoveBackward:true,turnInPlace:false,speedTurnPenalty:.8}};
function baseMap(){return validateMapManifest({manifestVersion:2,id:'test',seed:7,size:{width:220,depth:180},region:{id:'test',streamable:false,neighbors:[]},terrain:{heightfield:{baseHeight:0,noise:{scale:100,amplitude:0,octaves:1,persistence:.5},features:[]},materials:[],cliffs:{slopeStartDeg:24,slopeFullDeg:38}},roads:[],water:{rivers:[],lakes:[]},navigation:{cellSize:4,defaultMaxSlopeDeg:35,waterIsBlocked:true},players:[{id:'player',faction:'aegis',isHuman:true}],objects:[{id:'u1',definition:'u',owner:'player',x:-40,z:0,yaw:0}],staticObstacles:[]});}

test('persistent MOVE order advances deterministically through UnitAI + locomotor',()=>{
  const make=()=>{const bus=new CommandBus(),sim=new Simulation({registry:new TestRegistry(defs,locos),map:baseMap(),commandBus:bus});sim.issueMove(['u1'],{x:50,z:0});for(let i=0;i<360;i++)sim.step(FIXED_DT);return sim.snapshot();};
  const a=make(),b=make();assert.deepEqual(a,b);const e=a.entities.find(x=>x.id==='u1');assert.ok(e.x>44);assert.equal(e.ai.state,'IDLE');
});

test('STOP clears persistent UnitAI order',()=>{
  const bus=new CommandBus(),sim=new Simulation({registry:new TestRegistry(defs,locos),map:baseMap(),commandBus:bus});sim.issueMove(['u1'],{x:50,z:0});for(let i=0;i<30;i++)sim.step(FIXED_DT);sim.issueStop(['u1']);sim.step(FIXED_DT);const e=sim.entities.get('u1');assert.equal(e.ai.order,null);assert.equal(e.ai.state,'IDLE');assert.equal(e.speed,0);
});

test('building footprints become static navigation obstacles with clearance',()=>{
  const m=baseMap();m.objects.push({id:'b1',definition:'b',owner:'player',x:0,z:0,yaw:0});const sim=new Simulation({registry:new TestRegistry(defs,locos),map:m,commandBus:new CommandBus()});
  const profile={clearance:1.2,maxSlopeDeg:35};const route=sim.pathfinder.findPath(-40,0,40,0,profile);assert.ok(route.length>=3);assert.ok(route.some(p=>Math.abs(p.z)>10));
});

test('snapshot/restore preserves deterministic world state and pending AI intent',()=>{
  const bus=new CommandBus(),sim=new Simulation({registry:new TestRegistry(defs,locos),map:baseMap(),commandBus:bus});sim.issueMove(['u1'],{x:60,z:25});for(let i=0;i<45;i++)sim.step(FIXED_DT);const encoded=encodeWorldState(sim);
  const sim2=new Simulation({registry:new TestRegistry(defs,locos),map:baseMap(),commandBus:new CommandBus()});decodeWorldState(sim2,encoded);assert.deepEqual(sim2.snapshot(),sim.snapshot());
});


test('snapshot v6 preserves active wheeled turn-around maneuver state',()=>{
  const bus=new CommandBus(),sim=new Simulation({registry:new TestRegistry(defs,locos),map:baseMap(),commandBus:bus});
  const e=sim.entities.get('u1');e.yaw=0;e.x=0;e.z=0;
  sim.issueMove(['u1'],{x:0,z:-55});for(let i=0;i<18;i++)sim.step(FIXED_DT);
  assert.ok(e.locomotionState?.mode==='THREE_POINT_REVERSE'||e.locomotionState?.mode==='THREE_POINT_FORWARD',`mode ${e.locomotionState?.mode}`);
  const encoded=encodeWorldState(sim),sim2=new Simulation({registry:new TestRegistry(defs,locos),map:baseMap(),commandBus:new CommandBus()});decodeWorldState(sim2,encoded);
  assert.deepEqual(sim2.snapshot(),sim.snapshot());
  assert.deepEqual(sim2.entities.get('u1').locomotionState,e.locomotionState);
});

test('MapManifest v2 carries persistent-world authoring fields',async()=>{
  const m=validateMapManifest(await read('maps/training_ground.json'));assert.equal(m.manifestVersion,2);assert.equal(m.region.streamable,true);assert.ok(m.roads.length>=3);assert.ok(m.water.rivers.length>=1);assert.ok(m.waypoints.length>=5);assert.ok(m.triggerAreas.length>=1);assert.ok(m.resourceFields.length===2);assert.ok(m.aiAnchors.length>=2);assert.equal(m.region.strategic.resourceValue,4250);assert.ok(m.region.strategic.discoveredBy.includes('player'));
});

test('terrain sampler returns normalized splat weights and deterministic heights',async()=>{
  const m=validateMapManifest(await read('maps/training_ground.json')),a=new TerrainSampler(m),b=new TerrainSampler(m);for(const [x,z] of [[0,0],[-120,50],[90,-70]]){assert.equal(a.heightAt(x,z),b.heightAt(x,z));const w=a.materialWeights(x,z),sum=w.grass+w.dirt+w.rock;assert.ok(Math.abs(sum-1)<1e-6);assert.ok(a.slopeDeg(x,z)>=0);}
});

test('water cells are non-walkable for ground profiles',async()=>{
  const m=validateMapManifest(await read('maps/training_ground.json')),t=new TerrainSampler(m),p=new GridPathfinder(m,t,4);const river=m.water.rivers[0],mid=river.points[Math.floor(river.points.length/2)],cell=p._cellOf(mid.x,mid.z);assert.equal(p.isWalkableCell(cell.x,cell.z,{clearance:0,maxSlopeDeg:40,allowWater:false}),false);
});

test('data registry manifest includes all current content families',async()=>{
  const r=await read('data/registry.json');assert.ok(r.factions.length>=2);assert.ok(r.locomotors.length>=4);assert.ok(r.definitions.some(p=>p.includes('harvester')));assert.ok(r.definitions.some(p=>p.includes('talon')));assert.ok(r.definitions.some(p=>p.includes('mineral_dense')));
});

test('asset catalog paths and new terrain textures exist',async()=>{
  const c=await read('data/asset-catalog.json');for(const a of Object.values(c.assets))await fs.access(path.join(root,a.path));for(const p of ['assets/terrain/temperate_grass.png','assets/terrain/temperate_dirt.png','assets/terrain/temperate_rock.png','assets/terrain/road_asphalt.png','assets/terrain/road_shoulders.png'])await fs.access(path.join(root,p));assert.ok(Object.keys(c.assets).length>=16);
});
