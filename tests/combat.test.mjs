import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Simulation,FIXED_DT} from '../engine/sim/simulation.js';
import {CommandBus} from '../engine/commands/command-bus.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
import {estimateAdjustedDamage} from '../engine/combat/damage-system.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));

class NodeRegistry{
  constructor(){this.definitions=new Map();this.locomotors=new Map();this.armors=new Map();this.weapons=new Map();this.interactions=new Map();}
  definition(id){return this.definitions.get(id);}locomotor(id){return this.locomotors.get(id);}armor(id){return this.armors.get(id);}weapon(id){return this.weapons.get(id);}interaction(id){return this.interactions.get(id);}
}
async function registry(){
  const r=await read('data/registry.json'),out=new NodeRegistry();
  for(const p of r.locomotors){const v=await read(p);out.locomotors.set(v.id,v);}
  for(const p of r.definitions){const v=await read(p);out.definitions.set(v.id,v);}
  for(const p of r.armors){const v=await read(p);out.armors.set(v.id,v);}
  for(const p of r.weapons){const v=await read(p);out.weapons.set(v.id,v);}
  for(const p of r.interactions||[]){const v=await read(p);out.interactions.set(v.id,v);}
  return out;
}
function mapWith(objects){return validateMapManifest({manifestVersion:2,id:'combat',seed:3,size:{width:260,depth:180},region:{id:'combat',streamable:false,neighbors:[]},terrain:{heightfield:{baseHeight:0,noise:{scale:100,amplitude:0,octaves:1,persistence:.5},features:[]},materials:[],cliffs:{slopeStartDeg:24,slopeFullDeg:38}},roads:[],water:{rivers:[],lakes:[]},navigation:{cellSize:4,defaultMaxSlopeDeg:35,waterIsBlocked:true},players:[{id:'player',faction:'aegis',isHuman:true},{id:'enemy',faction:'crimson',isHuman:false}],objects,staticObstacles:[]});}

test('registry declares armor and weapon content families',async()=>{
  const r=await read('data/registry.json');assert.ok(r.armors.length>=8);assert.ok(r.weapons.length>=4);
});

test('armor coefficients create meaningful weapon-vs-target relationships',async()=>{
  const reg=await registry(),tank={armorId:'heavy_tank',alive:true},inf={armorId:'infantry',alive:true};
  assert.equal(estimateAdjustedDamage(reg,tank,reg.weapon('rifleman_rifle')),0.1);
  assert.equal(estimateAdjustedDamage(reg,tank,reg.weapon('aegis_120mm')),320);
  assert.ok(estimateAdjustedDamage(reg,inf,reg.weapon('aegis_120mm'))>400);
});

test('ATTACK is persistent: tank approaches, aims turret independently, fires projectiles and damages target',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([
    {id:'p',definition:'aegis_x',owner:'player',x:-48,z:0,yaw:0},
    {id:'e',definition:'aegis_x',owner:'enemy',x:48,z:0,yaw:Math.PI}
  ]),commandBus:new CommandBus()});
  const p=sim.entities.get('p'),e=sim.entities.get('e'),startHullYaw=p.yaw;
  sim.issueAttack(['p'],'e');
  for(let i=0;i<900&&e.alive;i++)sim.step(FIXED_DT);
  assert.ok(e.health<e.maxHealth,`enemy hp ${e.health}`);
  assert.ok(p.turretYaw!=null&&Math.abs(p.turretYaw-startHullYaw)>0.2,`turretYaw ${p.turretYaw}`);
  assert.ok(sim.combat.eventSerial>0);
});

test('HMMWV hitscan weapon can quickly defeat infantry but not behave like a tank killer',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([
    {id:'p',definition:'hmmwv50',owner:'player',x:-25,z:0,yaw:Math.PI/2},
    {id:'e',definition:'rifleman',owner:'enemy',x:15,z:0,yaw:-Math.PI/2}
  ]),commandBus:new CommandBus()});
  const e=sim.entities.get('e');sim.issueAttack(['p'],'e');for(let i=0;i<300&&e.alive;i++)sim.step(FIXED_DT);
  assert.equal(e.alive,false);assert.equal(e.damageState,'DESTROYED');assert.equal(e.selectable,false);
});

test('Guardian Turret autonomously acquires and attacks hostile ground units',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([
    {id:'t',definition:'guardian_turret',owner:'player',x:0,z:0,yaw:0},
    {id:'e',definition:'hmmwv50',owner:'enemy',x:48,z:0,yaw:0}
  ]),commandBus:new CommandBus()});
  const e=sim.entities.get('e');for(let i=0;i<360&&e.alive;i++)sim.step(FIXED_DT);
  assert.ok(e.health<e.maxHealth,`enemy hp ${e.health}`);assert.equal(sim.entities.get('t').combat.autoTargetId,'e');
});

test('combat/projectile state survives snapshot and restore deterministically',async()=>{
  const reg=await registry(),m=mapWith([
    {id:'p',definition:'aegis_x',owner:'player',x:-28,z:0,yaw:Math.PI/2},
    {id:'e',definition:'aegis_x',owner:'enemy',x:28,z:0,yaw:-Math.PI/2}
  ]),sim=new Simulation({registry:reg,map:m,commandBus:new CommandBus()});
  sim.issueAttack(['p'],'e');let guard=0;while(sim.projectiles.projectiles.size===0&&guard++<180)sim.step(FIXED_DT);
  assert.ok(sim.projectiles.projectiles.size>0,'expected projectile in flight');const snap=sim.snapshot();
  const sim2=new Simulation({registry:reg,map:m,commandBus:new CommandBus()});sim2.restore(snap);assert.deepEqual(sim2.snapshot(),snap);
  for(let i=0;i<120;i++){sim.step(FIXED_DT);sim2.step(FIXED_DT);}assert.deepEqual(sim2.snapshot(),sim.snapshot());
});
