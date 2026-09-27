import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {moduleConfig,footprintOf,renderConfigOf,createGameObjectRuntime} from '../engine/entities/game-object.js';
import {InteractionManager} from '../engine/interactions/interaction-protocol.js';
import {TerrainSampler} from '../engine/maps/terrain-sampler.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));

class Registry{
  constructor({defs={},locos={},protocols={}}={}){this.defs=defs;this.locos=locos;this.protocols=protocols;}
  definition(id){return this.defs[id];}
  locomotor(id){return this.locos[id];}
  interaction(id){return this.protocols[id];}
}

test('production definitions use explicit GameObject modules rather than top-level gameplay fields',async()=>{
  const files=(await read('data/registry.json')).definitions;
  for(const rel of files){
    const def=await read(rel);assert.ok(Array.isArray(def.modules)&&def.modules.length>0,`${rel} lacks modules`);
    assert.equal('maxHealth' in def,false,`${rel} still has top-level maxHealth`);
    assert.equal('asset' in def,false,`${rel} still has top-level asset`);
    assert.equal('locomotor' in def,false,`${rel} still has top-level locomotor`);
    for(const m of def.modules)assert.equal(typeof m,'object',`${rel} has legacy string module`);
  }
});

test('GameObject factory composes runtime state from modules',async()=>{
  const def=await read('data/units/aegis_x.json'),loco=await read('data/locomotors/tracked.json'),map=validateMapManifest(await read('maps/training_ground.json'));
  const registry=new Registry({defs:{aegis_x:def},locos:{[loco.id]:loco}}),terrain=new TerrainSampler(map);
  const e=createGameObjectRuntime({definition:def,spawn:{id:'tank',definition:'aegis_x',owner:'p',x:0,z:0,yaw:0},player:{factionId:'aegis'},registry,terrain});
  assert.equal(e.maxHealth,1800);assert.equal(e.selectable,true);assert.equal(e.locomotorId,'tracked_heavy');assert.ok(e.modules.UnitAIUpdate);assert.equal(renderConfigOf(def).asset,'aegis_x_mbt');
});

test('building footprint and rendering are module data',async()=>{
  const def=await read('data/buildings/vehicle_factory.json');assert.deepEqual(footprintOf(def),{width:28,depth:24});assert.equal(renderConfigOf(def).asset,'aegis_vehicle_factory');assert.equal(moduleConfig(def,'Production').rolloutProtocol,'factory_rollout');
});

test('resource docking protocol enforces explicit Red-Alert-style handshake sequence',async()=>{
  const harvester=await read('data/units/harvester.json'),refinery=await read('data/buildings/refinery.json'),protocol=await read('data/interactions/resource_docking.json');
  const entities=new Map([['h',{id:'h',definitionId:'harvester'}],['r',{id:'r',definitionId:'refinery'}]]);
  const registry=new Registry({defs:{harvester,refinery},protocols:{resource_docking:protocol}}),mgr=new InteractionManager({registry,entityLookup:id=>entities.get(id)});
  const s=mgr.request('resource_docking','h','r');
  for(const event of ['GRANT','APPROACH','ARRIVE','BEGIN_UNLOAD','UNLOAD_COMPLETE','EXIT','CLEAR'])mgr.advance(s.id,event);
  assert.equal(s.state,'COMPLETE');assert.equal(s.complete,true);assert.equal(s.history.length,8);
});

test('factory rollout protocol is data-driven and role checked',async()=>{
  const unit=await read('data/units/hmmwv50.json'),factory=await read('data/buildings/vehicle_factory.json'),protocol=await read('data/interactions/factory_rollout.json');
  const entities=new Map([['u',{id:'u',definitionId:'hmmwv50'}],['f',{id:'f',definitionId:'vehicle_factory'}]]);
  const registry=new Registry({defs:{hmmwv50:unit,vehicle_factory:factory},protocols:{factory_rollout:protocol}}),mgr=new InteractionManager({registry,entityLookup:id=>entities.get(id)});
  const s=mgr.request('factory_rollout','u','f');for(const event of ['GRANT_EXIT','BEGIN_EXIT','CLEAR_BUILDING','RALLY','ARRIVE'])mgr.advance(s.id,event);assert.equal(s.complete,true);
});

test('interaction sessions are serializable and restorable',async()=>{
  const harvester=await read('data/units/harvester.json'),refinery=await read('data/buildings/refinery.json'),protocol=await read('data/interactions/resource_docking.json');
  const entities=new Map([['h',{id:'h',definitionId:'harvester'}],['r',{id:'r',definitionId:'refinery'}]]),registry=new Registry({defs:{harvester,refinery},protocols:{resource_docking:protocol}});
  const a=new InteractionManager({registry,entityLookup:id=>entities.get(id)}),s=a.request('resource_docking','h','r');a.advance(s.id,'GRANT');a.advance(s.id,'APPROACH');
  const state=a.snapshot(),b=new InteractionManager({registry,entityLookup:id=>entities.get(id)});b.restore(state);assert.deepEqual(b.snapshot(),state);
});
