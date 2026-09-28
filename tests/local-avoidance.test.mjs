import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Simulation,FIXED_DT} from '../engine/sim/simulation.js';
import {CommandBus,CommandSource} from '../engine/commands/command-bus.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
import {collisionShape,overlapMTV} from '../engine/locomotion/local-avoidance-system.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
class NodeRegistry{
  constructor(){this.definitions=new Map();this.locomotors=new Map();this.armors=new Map();this.weapons=new Map();this.interactions=new Map();this.commandSets=new Map();}
  definition(id){return this.definitions.get(id);}locomotor(id){return this.locomotors.get(id);}armor(id){return this.armors.get(id);}weapon(id){return this.weapons.get(id);}interaction(id){return this.interactions.get(id);}commandSet(id){return this.commandSets.get(id);}
}
async function registry(){const r=await read('data/registry.json'),out=new NodeRegistry();for(const p of r.locomotors){const v=await read(p);out.locomotors.set(v.id,v);}for(const p of r.definitions){const v=await read(p);out.definitions.set(v.id,v);}for(const p of r.armors){const v=await read(p);out.armors.set(v.id,v);}for(const p of r.weapons){const v=await read(p);out.weapons.set(v.id,v);}for(const p of r.interactions||[]){const v=await read(p);out.interactions.set(v.id,v);}for(const p of r.commandSets||[]){const v=await read(p);out.commandSets.set(v.id,v);}return out;}
function mapWith(objects,staticObstacles=[]){return validateMapManifest({manifestVersion:2,id:'avoidance_test',seed:13,size:{width:420,depth:260},region:{id:'avoidance_test',streamable:false,neighbors:[]},terrain:{heightfield:{baseHeight:0,noise:{scale:100,amplitude:0,octaves:1,persistence:.5},features:[]},materials:[],cliffs:{slopeStartDeg:24,slopeFullDeg:38}},roads:[],water:{rivers:[],lakes:[]},navigation:{cellSize:4,defaultMaxSlopeDeg:35,waterIsBlocked:true},players:[{id:'player',faction:'aegis',isHuman:true},{id:'enemy',faction:'crimson',isHuman:false}],objects,staticObstacles});}
function assertNoHardOverlap(sim,aId,bId,label='units'){const a=sim.entities.get(aId),b=sim.entities.get(bId),mtv=overlapMTV(a,collisionShape(a),b,collisionShape(b));assert.ok(!mtv||mtv.depth<=0.001,`${label} overlap by ${mtv?.depth}`);}

test('mobile unit definitions expose C&C-style data-driven Geometry separate from Locomotor behavior',async()=>{
  const tank=await read('data/units/aegis_x.json'),hmmwv=await read('data/units/hmmwv50.json'),harvester=await read('data/units/harvester.json');
  for(const d of [tank,hmmwv,harvester]){const g=d.modules.find(m=>m.type==='Geometry');assert.equal(g.shape,'BOX');assert.ok(g.majorRadius>g.minorRadius);assert.ok(g.height>0);}
  assert.ok(tank.modules.find(m=>m.type==='Geometry').majorRadius>=3.9);assert.ok(harvester.modules.find(m=>m.type==='Geometry').majorRadius>=4.3);
});

test('head-on wheeled vehicles avoid and never interpenetrate while trying to swap positions',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([
    {id:'a',definition:'hmmwv50',owner:'player',x:-35,z:0,yaw:Math.PI/2},
    {id:'b',definition:'hmmwv50',owner:'player',x:35,z:0,yaw:-Math.PI/2}
  ]),commandBus:new CommandBus()});
  sim.issueMove(['a'],{x:35,z:0});sim.issueMove(['b'],{x:-35,z:0});
  let minCenter=Infinity;
  for(let i=0;i<600;i++){sim.step(FIXED_DT);const a=sim.entities.get('a'),b=sim.entities.get('b');minCenter=Math.min(minCenter,Math.hypot(a.x-b.x,a.z-b.z));assertNoHardOverlap(sim,'a','b','head-on HMMWVs');}
  assert.ok(minCenter<12,'test should force a genuine close pass');
  assert.ok(sim.entities.get('a').x>5||sim.entities.get('b').x<-5,'at least one vehicle should make meaningful progress through the encounter');
});

test('enemy and friendly ground vehicles are both solid; ownership never permits clipping',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([
    {id:'tank',definition:'aegis_x',owner:'player',x:-45,z:0,yaw:Math.PI/2},
    {id:'enemyCar',definition:'hmmwv50',owner:'enemy',x:30,z:0,yaw:-Math.PI/2}
  ]),commandBus:new CommandBus()});
  sim.issueMove(['tank'],{x:45,z:0});sim.issueMove(['enemyCar'],{x:-45,z:0},{issuerPlayerId:'enemy',commandSource:CommandSource.AI});
  for(let i=0;i<650;i++){sim.step(FIXED_DT);assertNoHardOverlap(sim,'tank','enemyCar','opposing vehicles');}
});

test('a following vehicle yields instead of driving inside a stopped long vehicle',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([
    {id:'lead',definition:'aegis_x',owner:'player',x:0,z:20,yaw:0},
    {id:'trail',definition:'aegis_x',owner:'player',x:0,z:-35,yaw:0}
  ]),commandBus:new CommandBus()});
  sim.issueMove(['trail'],{x:0,z:80});
  for(let i=0;i<500;i++){sim.step(FIXED_DT);assertNoHardOverlap(sim,'lead','trail','convoy vehicles');}
  const lead=sim.entities.get('lead'),trail=sim.entities.get('trail');assert.ok(trail.z<lead.z,'trailing vehicle should not tunnel through stopped leader');
});

test('local avoidance remains deterministic at the simulation snapshot level',async()=>{
  const reg=await registry(),objects=[
    {id:'a',definition:'hmmwv50',owner:'player',x:-38,z:-8,yaw:Math.PI/2},
    {id:'b',definition:'hmmwv50',owner:'player',x:38,z:8,yaw:-Math.PI/2},
    {id:'c',definition:'aegis_x',owner:'player',x:0,z:-45,yaw:0}
  ];
  const run=()=>{const sim=new Simulation({registry:reg,map:mapWith(objects),commandBus:new CommandBus()});sim.issueMove(['a'],{x:55,z:12});sim.issueMove(['b'],{x:-55,z:-12});sim.issueMove(['c'],{x:0,z:60});for(let i=0;i<420;i++)sim.step(FIXED_DT);return sim.snapshot();};
  assert.deepEqual(run(),run());
});

test('collision correction never pushes crowded vehicles into static blocked navigation',async()=>{
  const reg=await registry(),sim=new Simulation({registry:reg,map:mapWith([
    {id:'lead',definition:'hmmwv50',owner:'player',x:-24,z:12,yaw:0},
    {id:'trail',definition:'hmmwv50',owner:'player',x:-24,z:-30,yaw:0}
  ],[{id:'wall',x:0,z:0,width:20,depth:90}]),commandBus:new CommandBus()});
  sim.issueMove(['trail'],{x:-24,z:55});
  const cfg=reg.locomotor('wheeled_light'),profile={clearance:cfg.pathfindRadius,maxSlopeDeg:cfg.maxSlopeDeg,allowWater:false};
  for(let i=0;i<420;i++){
    sim.step(FIXED_DT);
    for(const id of ['lead','trail']){const e=sim.entities.get(id);assert.equal(sim.pathfinder.isWalkableWorld(e.x,e.z,profile),true,`${id} pushed into blocked navigation at tick ${i}`);}
    assertNoHardOverlap(sim,'lead','trail','wall-side traffic');
  }
});
