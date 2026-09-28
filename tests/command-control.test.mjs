import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Simulation,FIXED_DT} from '../engine/sim/simulation.js';
import {CommandBus,CommandSource} from '../engine/commands/command-bus.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
class NodeRegistry{
  constructor(){this.definitions=new Map();this.locomotors=new Map();this.armors=new Map();this.weapons=new Map();this.interactions=new Map();this.commandSets=new Map();}
  definition(id){return this.definitions.get(id);}locomotor(id){return this.locomotors.get(id);}armor(id){return this.armors.get(id);}weapon(id){return this.weapons.get(id);}interaction(id){return this.interactions.get(id);}commandSet(id){return this.commandSets.get(id);}
}
async function registry(){const r=await read('data/registry.json'),out=new NodeRegistry();for(const p of r.locomotors){const v=await read(p);out.locomotors.set(v.id,v);}for(const p of r.definitions){const v=await read(p);out.definitions.set(v.id,v);}for(const p of r.armors){const v=await read(p);out.armors.set(v.id,v);}for(const p of r.weapons){const v=await read(p);out.weapons.set(v.id,v);}for(const p of r.interactions||[]){const v=await read(p);out.interactions.set(v.id,v);}for(const p of r.commandSets||[]){const v=await read(p);out.commandSets.set(v.id,v);}return out;}
function mapWith(objects){return validateMapManifest({manifestVersion:2,id:'control_test',seed:11,size:{width:360,depth:220},region:{id:'control_test',streamable:false,neighbors:[]},terrain:{heightfield:{baseHeight:0,noise:{scale:100,amplitude:0,octaves:1,persistence:.5},features:[]},materials:[],cliffs:{slopeStartDeg:24,slopeFullDeg:38}},roads:[],water:{rivers:[],lakes:[]},navigation:{cellSize:4,defaultMaxSlopeDeg:35,waterIsBlocked:true},players:[{id:'player',faction:'aegis',isHuman:true},{id:'enemy',faction:'crimson',isHuman:false}],objects,staticObstacles:[]});}

test('simulation authority rejects player commands aimed at enemy-owned units',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([{id:'e',definition:'hmmwv50',owner:'enemy',x:0,z:0,yaw:0}]),commandBus:new CommandBus()});
  sim.issueMove(['e'],{x:60,z:0});sim.step(FIXED_DT);
  assert.equal(sim.lastCommandResult.ok,false);assert.equal(sim.lastCommandResult.reason,'NOT_AUTHORIZED');assert.equal(sim.entities.get('e').ai.order,null);
  sim.issueMove(['e'],{x:60,z:0},{issuerPlayerId:'enemy',commandSource:CommandSource.AI});sim.step(FIXED_DT);
  assert.equal(sim.lastCommandResult.ok,true);assert.equal(sim.entities.get('e').ai.order.type,'MOVE');
});

test('queued orders preserve a serializable waypoint-like order chain',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([{id:'p',definition:'hmmwv50',owner:'player',x:-80,z:0,yaw:Math.PI/2}]),commandBus:new CommandBus()});
  sim.issueMove(['p'],{x:-20,z:0});sim.issueMove(['p'],{x:65,z:20},{append:true});sim.step(FIXED_DT);
  const p=sim.entities.get('p');assert.equal(p.ai.order.type,'MOVE');assert.equal(p.ai.orderQueue.length,1);
  for(let i=0;i<1100;i++)sim.step(FIXED_DT);
  assert.equal(p.ai.order,null);assert.equal(p.ai.orderQueue.length,0);assert.ok(Math.hypot(p.x-65,p.z-20)<8,`${p.x},${p.z}`);
});

test('ATTACK_MOVE acquires a target, destroys it, then resumes toward the terminal destination',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([
    {id:'p',definition:'hmmwv50',owner:'player',x:-90,z:0,yaw:Math.PI/2},
    {id:'e',definition:'rifleman',owner:'enemy',x:-10,z:5,yaw:-Math.PI/2}
  ]),commandBus:new CommandBus()});
  sim.issueAttackMove(['p'],{x:100,z:0});
  for(let i=0;i<1500;i++)sim.step(FIXED_DT);
  const p=sim.entities.get('p'),e=sim.entities.get('e');assert.equal(e.alive,false);assert.ok(p.x>82,`player x ${p.x}`);assert.equal(p.ai.order,null);
});

test('GUARD_POSITION remains a persistent order and engages hostiles in its data-defined guard radius',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([
    {id:'p',definition:'hmmwv50',owner:'player',x:-25,z:0,yaw:Math.PI/2},
    {id:'e',definition:'rifleman',owner:'enemy',x:30,z:0,yaw:-Math.PI/2}
  ]),commandBus:new CommandBus()});
  sim.issueGuardPosition(['p'],{x:-25,z:0});for(let i=0;i<500&&sim.entities.get('e').alive;i++)sim.step(FIXED_DT);
  const p=sim.entities.get('p'),e=sim.entities.get('e');assert.equal(e.alive,false);assert.equal(p.ai.order.type,'GUARD_POSITION');assert.ok(['GUARDING','ATTACKING','MOVING'].includes(p.ai.state));
});

test('combat unit CommandSet and UnitAIUpdate data expose tactical controls and auto-acquire policy',async()=>{
  const reg=await registry(),h=reg.definition('hmmwv50'),set=reg.commandSet('aegis_combat_unit'),ai=h.modules.find(m=>m.type==='UnitAIUpdate');
  assert.ok(set.commands.some(c=>c.type==='ATTACK_MOVE'));assert.ok(set.commands.some(c=>c.type==='GUARD'));assert.ok(set.commands.some(c=>c.type==='TOGGLE_QUEUE'));assert.equal(ai.autoAcquireEnemiesWhenIdle,true);assert.equal(ai.defaultStance,'GUARD');
});

test('resource fields are renderer-data-driven multi-cluster glowing visuals and validation map has a unique id',async()=>{
  const rich=await read('data/resources/mineral_rich.json'),dense=await read('data/resources/mineral_dense.json'),map=await read('maps/construction_validation.json');
  for(const d of [rich,dense]){const v=d.modules.find(m=>m.type==='ResourceFieldVisual');assert.ok(v);assert.ok(v.clusterCount>=5);assert.ok(v.fieldRadius>0);assert.ok(v.emissiveIntensity>1);assert.ok(v.groundGlowOpacity>0);}
  assert.equal(map.id,'construction_validation');assert.notEqual(map.id,(await read('maps/training_ground.json')).id);
});

test('idle GUARD stance auto-acquires hostiles through data-defined UnitAIUpdate policy',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([
    {id:'p',definition:'hmmwv50',owner:'player',x:-20,z:0,yaw:Math.PI/2},
    {id:'e',definition:'rifleman',owner:'enemy',x:25,z:0,yaw:-Math.PI/2}
  ]),commandBus:new CommandBus()});
  for(let i=0;i<500&&sim.entities.get('e').alive;i++)sim.step(FIXED_DT);
  const p=sim.entities.get('p'),e=sim.entities.get('e');
  assert.equal(e.alive,false);assert.equal(p.ai.order,null);assert.equal(p.ai.stance,'GUARD');
});

test('v8 snapshots without the v0.5.2 order queue normalize safely before appended orders',async()=>{
  const reg=await registry(),base=mapWith([{id:'p',definition:'hmmwv50',owner:'player',x:-50,z:0,yaw:Math.PI/2}]),sim=new Simulation({registry:reg,map:base,commandBus:new CommandBus()});
  sim.issueMove(['p'],{x:0,z:0});sim.step(FIXED_DT);const snap=sim.snapshot();snap.version=8;delete snap.entities.find(e=>e.id==='p').ai.orderQueue;delete snap.entities.find(e=>e.id==='p').ai.stance;
  const restored=new Simulation({registry:reg,map:base,commandBus:new CommandBus()});restored.restore(snap);restored.issueMove(['p'],{x:45,z:0},{append:true});restored.step(FIXED_DT);
  const p=restored.entities.get('p');assert.equal(p.ai.stance,'GUARD');assert.equal(p.ai.order.type,'MOVE');assert.equal(p.ai.orderQueue.length,1);
});
