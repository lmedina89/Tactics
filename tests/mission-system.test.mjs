import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CommandBus} from '../engine/commands/command-bus.js';
import {Simulation,FIXED_DT} from '../engine/sim/simulation.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
import {validateMissionDefinition} from '../engine/missions/mission-validator.js';
import {TriggerAreaSystem,pointInsideTriggerArea} from '../engine/missions/trigger-area-system.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
class NodeRegistry{constructor(){this.definitions=new Map();this.locomotors=new Map();this.teamPrototypes=new Map();this.aiProfiles=new Map();}definition(id){return this.definitions.get(id);}locomotor(id){return this.locomotors.get(id);}teamPrototype(id){return this.teamPrototypes.get(id);}aiProfile(id){return this.aiProfiles.get(id);}}
async function registry(){const r=await read('data/registry.json'),out=new NodeRegistry();for(const p of r.locomotors||[]){const v=await read(p);out.locomotors.set(v.id,v);}for(const p of r.definitions||[]){const v=await read(p);out.definitions.set(v.id,v);}for(const p of r.teamPrototypes||[]){const v=await read(p);out.teamPrototypes.set(v.id,v);}for(const p of r.aiProfiles||[]){const v=await read(p);out.aiProfiles.set(v.id,v);}return out;}
async function makeSim(missionOverride=null){const reg=await registry(),map=validateMapManifest(await read('maps/training_ground.json')),mission=missionOverride??await read('missions/first_contact_validation.json');return new Simulation({registry:reg,map,commandBus:new CommandBus(),mission});}

test('mission definition validates against map-authored players, areas, waypoints and objectives',async()=>{
  const map=validateMapManifest(await read('maps/training_ground.json')),mission=validateMissionDefinition(await read('missions/first_contact_validation.json'),{map});assert.equal(mission.id,'first_contact_validation');assert.equal(mission.scripts.length,2);assert.equal(mission.objectives.length,2);
  assert.throws(()=>validateMissionDefinition({...mission,scripts:[{id:'bad',condition:{type:'PLAYER_ENTERED_AREA',playerId:'player',areaId:'missing'},actions:[]}]},{map}),/unknown trigger area/);
});

test('trigger-area runtime supports circle, rotated rectangle and polygon membership deterministically',()=>{
  assert.equal(pointInsideTriggerArea({shape:'circle',x:0,z:0,radius:5},3,4),true);
  assert.equal(pointInsideTriggerArea({shape:'rect',x:0,z:0,width:10,depth:4,yaw:Math.PI/2},0,4),true);
  assert.equal(pointInsideTriggerArea({shape:'polygon',points:[{x:0,z:0},{x:10,z:0},{x:0,z:10}]},2,2),true);
  const entities=new Map([['u',{id:'u',alive:true,x:20,z:0}]]),sys=new TriggerAreaSystem({areas:[{id:'a',shape:'circle',x:0,z:0,radius:5}],entitiesProvider:()=>entities.values()});sys.prime();assert.deepEqual(sys.ids('a','ENTERED'),[]);entities.get('u').x=0;sys.step();assert.deepEqual(sys.ids('a','ENTERED'),['u']);sys.step();assert.deepEqual(sys.ids('a','ENTERED'),[]);assert.deepEqual(sys.ids('a','INSIDE'),['u']);entities.get('u').x=20;sys.step();assert.deepEqual(sys.ids('a','EXITED'),['u']);
});

test('entering authored center trigger completes first objective and activates second',async()=>{
  const sim=await makeSim(),tank=sim.entities.get('p_tank');assert.equal(sim.missions.objectives.state('reach_center'),'ACTIVE');assert.equal(sim.missions.objectives.state('destroy_enemy_tank'),'INACTIVE');tank.x=0;tank.z=4;sim.step(FIXED_DT);assert.equal(sim.missions.objectives.state('reach_center'),'COMPLETED');assert.equal(sim.missions.objectives.state('destroy_enemy_tank'),'ACTIVE');assert.equal(sim.missions.scripts.get('reach_center').firedCount,1);
});

test('validation mission reaches deterministic victory after objective target is destroyed',async()=>{
  const sim=await makeSim(),tank=sim.entities.get('p_tank');tank.x=0;tank.z=4;sim.step(FIXED_DT);sim.entities.get('e_tank').alive=false;sim.step(FIXED_DT);assert.equal(sim.missions.objectives.state('destroy_enemy_tank'),'COMPLETED');assert.equal(sim.missions.outcome.state,'VICTORY');assert.equal(sim.missions.outcome.reason,'VALIDATION_COMPLETE');
});

test('script movement actions travel through CommandBus with FROM_SCRIPT authority',async()=>{
  const mission={missionVersion:1,id:'script_order',mapId:'training_ground',objectives:[],scripts:[{id:'order',condition:{type:'TRUE'},actions:[{type:'ISSUE_MOVE',entityIds:['e_hmmwv'],waypointId:'Center_Field'}]}]};
  const sim=await makeSim(mission);sim.step(FIXED_DT);assert.equal(sim.commandBus.queue.length,1);assert.equal(sim.commandBus.queue[0].commandSource,'FROM_SCRIPT');assert.equal(sim.commandBus.queue[0].issuerPlayerId,null);sim.step(FIXED_DT);assert.equal(sim.lastCommandResult.ok,true);assert.equal(sim.entities.get('e_hmmwv').ai.order.type,'MOVE');
});

test('flags counters timers script enable state and relation actions are typed mission state',async()=>{
  const mission={missionVersion:1,id:'state_test',mapId:'training_ground',initialFlags:{armed:false},initialCounters:{waves:0},objectives:[],scripts:[
    {id:'setup',condition:{type:'TRUE'},actions:[{type:'SET_FLAG',flag:'armed',value:true},{type:'ADD_COUNTER',counter:'waves',value:2},{type:'START_TIMER',timerId:'go',durationTicks:2},{type:'SET_RELATION',fromPlayerId:'player',toPlayerId:'enemy',relation:'NEUTRAL'}]},
    {id:'timer',condition:{type:'TIMER_EXPIRED',timerId:'go'},actions:[{type:'SET_COUNTER',counter:'waves',value:3}]}
  ]};
  const sim=await makeSim(mission);sim.step(FIXED_DT);assert.equal(sim.missions.flag('armed'),true);assert.equal(sim.missions.counter('waves'),2);assert.equal(sim.getPlayerRelation('player','enemy'),'NEUTRAL');sim.step(FIXED_DT);sim.step(FIXED_DT);assert.equal(sim.missions.counter('waves'),3);
});

test('snapshot v17 preserves trigger occupancy and complete mission runtime exactly',async()=>{
  const a=await makeSim(),tank=a.entities.get('p_tank');tank.x=0;tank.z=4;a.step(FIXED_DT);for(let i=0;i<12;i++)a.step(FIXED_DT);const snap=a.snapshot();assert.equal(snap.version,17);assert.equal(snap.missionSystem.missionId,'first_contact_validation');assert.ok(snap.triggerAreas.areas.find(x=>x.id==='center_zone').current.includes('p_tank'));
  const b=await makeSim();b.restore(snap);assert.deepEqual(b.snapshot(),snap);for(let i=0;i<60;i++){a.step(FIXED_DT);b.step(FIXED_DT);}assert.deepEqual(b.snapshot(),a.snapshot());
});

test('legacy v16 snapshot restores into non-mission simulation without false trigger transitions',async()=>{
  const reg=await registry(),map=validateMapManifest(await read('maps/training_ground.json')),a=new Simulation({registry:reg,map,commandBus:new CommandBus()});for(let i=0;i<5;i++)a.step(FIXED_DT);const legacy=structuredClone(a.snapshot());legacy.version=16;delete legacy.triggerAreas;delete legacy.missionSystem;const b=new Simulation({registry:reg,map,commandBus:new CommandBus()});b.restore(legacy);assert.equal(b.snapshot().version,17);b.step(FIXED_DT);assert.deepEqual(b.triggerAreas.ids('center_zone','ENTERED'),[]);
});

test('map manifest rejects duplicate and malformed trigger areas before mission runtime',async()=>{
  const raw=await read('maps/training_ground.json');raw.triggerAreas=[{id:'a',shape:'circle',x:0,z:0,radius:5},{id:'a',shape:'circle',x:10,z:0,radius:5}];assert.throws(()=>validateMapManifest(raw),/Duplicate trigger area/);
  const bad=await read('maps/training_ground.json');bad.triggerAreas=[{id:'bad',shape:'polygon',points:[{x:0,z:0},{x:1,z:1}]}];assert.throws(()=>validateMapManifest(bad),/invalid polygon geometry/);
});

test('browser keeps normal field test while exposing an opt-in mission validation mode',async()=>{
  const main=await fs.readFile(path.join(root,'main.js'),'utf8'),html=await fs.readFile(path.join(root,'index.html'),'utf8');
  assert.match(main,/missionMode=params\.get\('mission'\)==='first_contact'/);assert.match(main,/missions\/first_contact_validation\.json/);assert.match(main,/maps\/construction_validation\.json/);assert.match(main,/maps\/training_ground\.json/);assert.match(html,/id="mission-test"/);
});

test('active objective may reference a validated authored trigger-area world marker',async()=>{
  const map=validateMapManifest(await read('maps/training_ground.json')),mission=validateMissionDefinition(await read('missions/first_contact_validation.json'),{map}),reach=mission.objectives.find(o=>o.id==='reach_center');
  assert.deepEqual(reach.marker,{type:'TRIGGER_AREA',areaId:'center_zone'});
  assert.throws(()=>validateMissionDefinition({...mission,objectives:mission.objectives.map(o=>o.id==='reach_center'?{...o,marker:{type:'TRIGGER_AREA',areaId:'missing'}}:o)},{map}),/marker references unknown trigger area/);
});

test('browser mission mode renders the active trigger-area objective marker instead of relying on hidden map coordinates',async()=>{
  const main=await fs.readFile(path.join(root,'main.js'),'utf8'),renderer=await fs.readFile(path.join(root,'renderer/three-renderer.js'),'utf8');
  assert.match(main,/syncMissionObjectiveMarker/);assert.match(main,/GOLD CENTER-ZONE RING\/BEACON/);assert.match(renderer,/setMissionAreaMarker\(area\)/);assert.match(renderer,/0xffd65c/);
});
