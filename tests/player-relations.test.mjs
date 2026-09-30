import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DataRegistry} from '../engine/data/registry.js';
import {Simulation,FIXED_DT} from '../engine/sim/simulation.js';
import {CommandBus} from '../engine/commands/command-bus.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
import {PlayerRelation,PlayerRelationMap} from '../engine/players/player-relations.js';
import {ProjectileSystem} from '../engine/combat/projectile-system.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

async function loadRegistry(){
  const previous=globalThis.fetch;
  globalThis.fetch=async url=>{const rel=String(url).replace(/^\.\//,'');try{return new Response(await fs.readFile(path.join(root,rel)),{status:200});}catch{return new Response('',{status:404});}};
  try{return await new DataRegistry().load('.');}finally{globalThis.fetch=previous;}
}

function mapWith({objects=[],relations=[],players=null,waypoints=[]}={}){
  return validateMapManifest({manifestVersion:2,id:'relations_test',seed:19,size:{width:280,depth:200},region:{id:'relations_test',streamable:false,neighbors:[]},terrain:{heightfield:{baseHeight:0,noise:{scale:100,amplitude:0,octaves:1,persistence:.5},features:[]},materials:[],cliffs:{slopeStartDeg:24,slopeFullDeg:38}},roads:[],water:{rivers:[],lakes:[]},navigation:{cellSize:4,defaultMaxSlopeDeg:35,waterIsBlocked:true},players:players??[
    {id:'player',faction:'aegis',isHuman:true},
    {id:'ally',faction:'aegis',isHuman:false},
    {id:'neutral',faction:'civilian',isHuman:false},
    {id:'enemy',faction:'crimson',isHuman:false}
  ],playerRelations:relations,waypoints,objects,staticObstacles:[]});
}

const authoredRelations=[
  {from:'player',to:'ally',relation:'ALLY'},
  {from:'player',to:'neutral',relation:'NEUTRAL'},
  {from:'ally',to:'player',relation:'ALLY'},
  {from:'neutral',to:'player',relation:'NEUTRAL'}
];

test('hostility consumers do not retain local different-owner fallback policy',async()=>{
  const files=[
    'engine/ai/unit-ai-update.js','engine/combat/weapon-system.js','engine/combat/projectile-system.js',
    'engine/ai/skirmish-ai-player.js','engine/ai/strategic-ai-planner.js','engine/ai/skirmish-economy-planner.js','engine/ai/economic-defense-manager.js'
  ];
  for(const rel of files){const source=await fs.readFile(path.join(root,rel),'utf8');assert.doesNotMatch(source,/relations\?\.isEnemy\s*\?/i,`${rel} contains a relation fallback branch`);}
});

test('PlayerRelationMap is directional, keeps SELF implicit, and preserves legacy enemy default',()=>{
  const rel=new PlayerRelationMap({playerIds:['a','b','c'],entries:[{from:'a',to:'b',relation:'ALLY'},{from:'b',to:'a',relation:'NEUTRAL'}]});
  assert.equal(rel.get('a','a'),PlayerRelation.SELF);
  assert.equal(rel.get('a','b'),PlayerRelation.ALLY);
  assert.equal(rel.get('b','a'),PlayerRelation.NEUTRAL);
  assert.equal(rel.get('a','c'),PlayerRelation.ENEMY);
  assert.equal(rel.get('a',null),PlayerRelation.NEUTRAL);
  const snap=rel.snapshot(),restored=new PlayerRelationMap({playerIds:['a','b','c']});restored.restore(snap);assert.deepEqual(restored.snapshot(),snap);
});

test('map playerRelations validate endpoints, authored values, duplicates, and forbid SELF overrides',()=>{
  assert.throws(()=>mapWith({relations:[{from:'player',to:'missing',relation:'ALLY'}]}),/unknown player/);
  assert.throws(()=>mapWith({relations:[{from:'player',to:'enemy',relation:'FRIEND'}]}),/invalid relation/);
  assert.throws(()=>mapWith({relations:[{from:'player',to:'player',relation:'ALLY'}]}),/cannot override SELF/);
  assert.throws(()=>mapWith({relations:[{from:'player',to:'enemy',relation:'ENEMY'},{from:'player',to:'enemy',relation:'NEUTRAL'}]}),/Duplicate player relation/);
});

test('ATTACK and GUARD_OBJECT use authoritative relationships rather than different-owner checks',async()=>{
  const registry=await loadRegistry(),sim=new Simulation({registry,map:mapWith({relations:authoredRelations,objects:[
    {id:'p',definition:'rifleman',owner:'player',x:-20,z:0,yaw:0},
    {id:'a',definition:'power_node',owner:'ally',x:0,z:-10,yaw:0},
    {id:'n',definition:'power_node',owner:'neutral',x:0,z:0,yaw:0},
    {id:'e',definition:'power_node',owner:'enemy',x:20,z:0,yaw:0}
  ]}),commandBus:new CommandBus()});

  sim.issueAttack(['p'],'a');sim.step(FIXED_DT);assert.equal(sim.lastPlayerCommandResult.ok,false);
  sim.issueAttack(['p'],'n');sim.step(FIXED_DT);assert.equal(sim.lastPlayerCommandResult.ok,false);
  sim.issueAttack(['p'],'e');sim.step(FIXED_DT);assert.equal(sim.lastPlayerCommandResult.ok,true);assert.equal(sim.entities.get('p').ai.order?.targetId,'e');
  sim.issueGuardObject(['p'],'a');sim.step(FIXED_DT);assert.equal(sim.lastPlayerCommandResult.ok,true);assert.equal(sim.entities.get('p').ai.order?.targetId,'a');
  sim.issueGuardObject(['p'],'n');sim.step(FIXED_DT);assert.equal(sim.lastPlayerCommandResult.ok,false);assert.equal(sim.lastPlayerCommandResult.reason,'INVALID_GUARD_TARGET');
});

test('UnitAI and turret auto-acquisition ignore closer allied/neutral objects and acquire an ENEMY',async()=>{
  const registry=await loadRegistry(),sim=new Simulation({registry,map:mapWith({relations:authoredRelations,objects:[
    {id:'guard',definition:'hmmwv50',owner:'player',x:-35,z:0,yaw:Math.PI/2},
    {id:'turret',definition:'guardian_turret',owner:'player',x:0,z:-35,yaw:0},
    {id:'ally_u',definition:'hmmwv50',owner:'ally',x:-20,z:0,yaw:0},
    {id:'neutral_u',definition:'hmmwv50',owner:'neutral',x:-12,z:0,yaw:0},
    {id:'enemy_u',definition:'hmmwv50',owner:'enemy',x:10,z:0,yaw:0}
  ]}),commandBus:new CommandBus()});
  sim.issueGuardPosition(['guard'],{x:-35,z:0});
  for(let i=0;i<30;i++)sim.step(FIXED_DT);
  assert.equal(sim.entities.get('guard').ai.engagementTargetId,'enemy_u');
  assert.equal(sim.entities.get('turret').combat.autoTargetId,'enemy_u');
});

test('projectile world collision applies current relationship classification to intervening objects',()=>{
  const relations=new PlayerRelationMap({playerIds:['player','neutral','enemy'],entries:[{from:'player',to:'neutral',relation:'NEUTRAL'}]});
  const ps=new ProjectileSystem(),source={id:'s',playerId:'player'},target={id:'target',playerId:'enemy',alive:true,kind:'vehicle',x:100,y:0,z:0,motionVX:0,motionVY:0,motionVZ:0,modules:{Geometry:{shape:'CYLINDER',radius:.8,height:2}}};
  const neutral={id:'neutral_blocker',playerId:'neutral',alive:true,kind:'vehicle',x:3,y:0,z:0,motionVX:0,motionVY:0,motionVZ:0,modules:{Geometry:{shape:'CYLINDER',radius:.7,height:2}}};
  const enemy={id:'enemy_blocker',playerId:'enemy',alive:true,kind:'vehicle',x:5,y:0,z:0,motionVX:0,motionVY:0,motionVZ:0,modules:{Geometry:{shape:'CYLINDER',radius:.7,height:2}}};
  const weapon={id:'relation_shell',range:120,projectile:{speed:180,radius:.1,behavior:'DUMB_PROJECTILE',leadTarget:false,designatedTargetCollision:true,targetHeightFactor:.5,worldCollision:{enabled:true,relations:['ENEMY'],kinds:['unit'],terrain:false}}};
  let impact=null;ps.spawn({source,target,weapon,start:{x:0,y:1,z:0},tick:0});
  ps.step(FIXED_DT,{entityLookup:id=>id==='target'?target:id==='neutral_blocker'?neutral:id==='enemy_blocker'?enemy:null,entitiesProvider:()=>[neutral,enemy,target],relations,onImpact:(p,t,hit,info)=>{impact={p,t,hit,info};}});
  assert.ok(impact?.hit);assert.equal(impact.t?.id,'enemy_blocker');assert.equal(impact.info.type,'WORLD_ENTITY');
});

test('Skirmish/strategic/economic threat queries exclude neutral players',async()=>{
  const registry=await loadRegistry();
  const players=[
    {id:'player',faction:'aegis',isHuman:true,startWaypoint:'p_start'},
    {id:'neutral',faction:'civilian',isHuman:false,startWaypoint:'n_start'},
    {id:'enemy',faction:'crimson',isHuman:false,startWaypoint:'e_start',ai:{profile:'crimson_skirmish_basic',homeWaypoint:'e_start',rallyWaypoint:'e_start',difficulty:'NORMAL',personality:'BALANCED'}}
  ];
  const map=mapWith({players,waypoints:[{id:'p_start',x:70,z:0},{id:'n_start',x:8,z:0},{id:'e_start',x:0,z:0}],relations:[{from:'enemy',to:'neutral',relation:'NEUTRAL'},{from:'neutral',to:'enemy',relation:'NEUTRAL'}],objects:[
    {id:'p_obj',definition:'hmmwv50',owner:'player',x:70,z:0,yaw:0},
    {id:'n_obj',definition:'hmmwv50',owner:'neutral',x:8,z:0,yaw:0},
    {id:'e_obj',definition:'command_post',owner:'enemy',x:0,z:0,yaw:0}
  ]});
  const sim=new Simulation({registry,map,commandBus:new CommandBus()}),controller=sim.skirmishAI.controllers.get('enemy');
  controller.nextEnemyAcquireTick=0;assert.equal(controller._acquireEnemy(0),'player');
  assert.deepEqual(controller.strategyPlanner._enemies().map(e=>e.id),['p_obj']);
  assert.deepEqual(controller.economicDefense._hostiles().map(e=>e.id),['p_obj']);
  assert.equal(controller.economyPlanner._locationSafe({x:8,z:0},15),true,'nearby neutral object must not make construction unsafe');
  assert.equal(controller.economyPlanner._locationSafe({x:70,z:0},15),false,'nearby hostile object must make construction unsafe');
});

test('live relationship changes immediately revoke hostile attack and turret targeting',async()=>{
  const registry=await loadRegistry(),sim=new Simulation({registry,map:mapWith({objects:[
    {id:'attacker',definition:'hmmwv50',owner:'player',x:-14,z:0,yaw:Math.PI/2},
    {id:'enemy',definition:'hmmwv50',owner:'enemy',x:8,z:0,yaw:-Math.PI/2}
  ]}),commandBus:new CommandBus()});
  sim.issueAttack(['attacker'],'enemy');sim.step(FIXED_DT);
  assert.equal(sim.lastPlayerCommandResult.ok,true);assert.equal(sim.entities.get('attacker').ai.order?.targetId,'enemy');
  sim.setPlayerRelation('player','enemy',PlayerRelation.NEUTRAL);sim.step(FIXED_DT);
  const attacker=sim.entities.get('attacker');
  assert.equal(attacker.ai.order,null,'explicit ATTACK should terminate when target is no longer hostile');
  assert.equal(attacker.ai.engagementTargetId,null);
  assert.equal(attacker.combat?.activeTargetId??null,null,'combat system must revoke the target on the same simulation step');
});

test('snapshot v17 preserves relation overrides; legacy v15 restores map-start relationships',async()=>{
  const registry=await loadRegistry(),map=mapWith({relations:authoredRelations}),a=new Simulation({registry,map,commandBus:new CommandBus()});
  a.setPlayerRelation('player','enemy',PlayerRelation.NEUTRAL);const snap=a.snapshot();assert.equal(snap.version,17);assert.equal(a.getPlayerRelation('player','enemy'),'NEUTRAL');
  const b=new Simulation({registry,map,commandBus:new CommandBus()});b.restore(snap);assert.deepEqual(b.snapshot(),snap);assert.equal(b.getPlayerRelation('player','enemy'),'NEUTRAL');
  const legacy=structuredClone(snap);legacy.version=15;delete legacy.playerRelations;
  const c=new Simulation({registry,map,commandBus:new CommandBus()});c.restore(legacy);assert.equal(c.getPlayerRelation('player','ally'),'ALLY');assert.equal(c.getPlayerRelation('player','neutral'),'NEUTRAL');assert.equal(c.getPlayerRelation('player','enemy'),'ENEMY');
});
