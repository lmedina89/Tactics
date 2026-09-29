import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DataRegistry} from '../engine/data/registry.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
import {TerrainSampler} from '../engine/maps/terrain-sampler.js';
import {GridPathfinder} from '../engine/pathfinding/grid-pathfinder.js';
import {findBestWallSnap} from '../engine/content/wall-connection.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=async rel=>JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));

async function loadRegistry(){
  const old=globalThis.fetch;
  globalThis.fetch=async input=>{const rel=String(input).replace(/^\.\//,'');try{return new Response(await fs.readFile(path.join(root,rel)),{status:200,headers:{'content-type':'application/json'}});}catch{return new Response('',{status:404});}};
  try{return await new DataRegistry().load('.');}finally{globalThis.fetch=old;}
}

function glbNodeNames(buffer){
  let off=12,g=null;
  while(off+8<=buffer.length){const len=buffer.readUInt32LE(off),type=buffer.readUInt32LE(off+4);off+=8;if(type===0x4e4f534a){g=JSON.parse(buffer.subarray(off,off+len).toString('utf8').replace(/\0+$/,''));break;}off+=len;}
  assert.ok(g,'GLB JSON chunk missing');return new Set((g.nodes||[]).map(n=>n.name).filter(Boolean));
}

test('Crimson command post routes to the authored Command Citadel without global red tint',async()=>{
  const def=await readJson('data/buildings/command_post.json');
  const render=def.modules.find(m=>m.type==='Render');
  assert.equal(render.asset,'aegis_tactical_command_post');
  assert.equal(render.assetByFaction.crimson,'crimson_command_citadel');
  assert.equal(render.factionColorModeByFaction.crimson,'AUTHORED');
  const anim=def.modules.find(m=>m.type==='ClientAnimation');
  const crimsonRadar=anim.procedural.find(p=>p.id==='crimson_radar_yaw');
  assert.equal(crimsonRadar.driver,'CONTINUOUS_SPIN');
  assert.deepEqual(crimsonRadar.nodes,['RadarYawRoot']);
  assert.deepEqual(crimsonRadar.activeWhen,{path:'factionId',equals:'crimson'});
});

test('Citadel and Armored Gate preserve their authored articulation/socket roots',async()=>{
  const catalog=await readJson('data/asset-catalog.json');
  const citadelNodes=glbNodeNames(await fs.readFile(path.join(root,catalog.assets.crimson_command_citadel.path)));
  for(const n of ['CrimsonCommandCitadelRoot','RadarYawRoot','RadarDishPitchRoot','ServiceBayDoorRoot','DefenseHardpoint_Left','DefenseHardpoint_Right'])assert.ok(citadelNodes.has(n),`Citadel missing ${n}`);
  const gateNodes=glbNodeNames(await fs.readFile(path.join(root,catalog.assets.crimson_armored_gate.path)));
  for(const n of ['CrimsonArmoredGateRoot','GateLeftDoorRoot','GateRightDoorRoot','WallConnector_Left','WallConnector_Right','GatePassageCenter'])assert.ok(gateNodes.has(n),`Gate missing ${n}`);
});

test('Crimson wall kit is registered as authored faction content under one connection group',async()=>{
  const registry=await loadRegistry();
  const ids=['crimson_wall_straight_8m','crimson_wall_straight_4m','crimson_wall_corner','crimson_wall_junction','crimson_armored_gate'];
  for(const id of ids){
    const def=registry.definition(id);assert.ok(def,`missing ${id}`);
    const render=registry.module(def,'Render'),wall=registry.module(def,'WallConnection');
    assert.equal(render.factionColorMode,'AUTHORED');
    assert.equal(wall.connectionGroup,'crimson_perimeter');
  }
  assert.equal(registry.module(registry.definition('crimson_armored_gate'),'WallConnection').role,'GATE');
});

test('Crimson straight wall sockets snap deterministically end-to-end',async()=>{
  const registry=await loadRegistry();
  const long=registry.definition('crimson_wall_straight_8m'),short=registry.definition('crimson_wall_straight_4m');
  const snap=findBestWallSnap({movingDef:short,movingPose:{x:6.05,z:.1,yaw:0},targetDef:long,targetPose:{x:0,z:0,yaw:0},maxDistance:2.5});
  assert.ok(snap);
  assert.ok(Math.abs(snap.pose.x-6)<1e-6);
  assert.ok(Math.abs(snap.pose.z)<1e-6);
});

test('active map carries a non-enclosing Crimson rear fortification section and core routes remain open',async()=>{
  const map=validateMapManifest(await readJson('maps/construction_validation.json'));
  const ids=new Set(map.objects.map(o=>o.id));
  for(const id of ['e_wall_rear_long_a','e_wall_rear_short_a','e_wall_rear_gate','e_wall_rear_junction','e_wall_rear_long_b','e_wall_rear_corner','e_wall_rear_turn_short'])assert.ok(ids.has(id),`map missing ${id}`);
  const wallObjects=map.objects.filter(o=>o.id.startsWith('e_wall_rear_'));
  assert.ok(wallObjects.every(o=>o.owner==='enemy'));
  assert.ok(wallObjects.every(o=>o.x>=300),'fortification should stay on the rear/east side of the Crimson base');

  const terrain=new TerrainSampler(map),pf=new GridPathfinder(map,terrain,map.navigation?.cellSize??4);
  // Reproduce building obstacles from map definitions only for the new rear fortification section.
  const registry=await loadRegistry();
  for(const o of wallObjects){const def=registry.definition(o.definition),fp=registry.module(def,'Footprint');pf.addDynamicObstacle(o.id,{x:o.x,z:o.z,width:fp.width,depth:fp.depth,yaw:o.yaw||0});}
  assert.ok(pf.findPath(225,-18,0,4,{clearance:2,maxSlopeDeg:32}).length>0,'Crimson main route toward center must remain open');
  assert.ok(pf.findPath(166,88,92,88,{clearance:2,maxSlopeDeg:32}).length>0,'Crimson harvester route to local rich minerals must remain open');
});
