import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CommandBus } from '../engine/commands/command-bus.js';
import { Simulation, FIXED_DT } from '../engine/sim/simulation.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));

class TestRegistry {
  constructor(defs,locos){this.defs=defs;this.locos=locos;}
  definition(id){return this.defs[id];}
  locomotor(id){return this.locos[id];}
}

const defs={
  u:{id:'u',kind:'vehicle',locomotor:'w',selectable:true,maxHealth:100},
  b:{id:'b',kind:'building',selectable:false,maxHealth:1000}
};
const locos={w:{id:'w',maxSpeed:10,acceleration:8,braking:10,turnRate:3,radius:1,arrivalRadius:.6}};
const map={size:{width:200,depth:200},staticObstacles:[],objects:[{id:'u1',definition:'u',faction:'player',x:-20,z:0,yaw:0}]};

test('persistent MOVE order advances entity deterministically',()=>{
  const make=()=>{const bus=new CommandBus();const sim=new Simulation({registry:new TestRegistry(defs,locos),map:structuredClone(map),commandBus:bus});sim.issueMove(['u1'],{x:30,z:0});for(let i=0;i<300;i++)sim.step(FIXED_DT);return sim.snapshot();};
  const a=make(),b=make();assert.deepEqual(a,b);assert.ok(a.entities[0].x>25);
});

test('STOP clears persistent movement',()=>{
  const bus=new CommandBus();const sim=new Simulation({registry:new TestRegistry(defs,locos),map:structuredClone(map),commandBus:bus});sim.issueMove(['u1'],{x:50,z:0});for(let i=0;i<30;i++)sim.step(FIXED_DT);sim.issueStop(['u1']);sim.step(FIXED_DT);const e=sim.entities.get('u1');assert.equal(e.move,null);assert.equal(e.speed,0);
});

test('map manifest carries two factions and stable object ids',async()=>{
  const m=await read('maps/training_ground.json');assert.equal(m.players.length,2);assert.equal(new Set(m.objects.map(o=>o.id)).size,m.objects.length);
});

test('asset catalog paths all exist',async()=>{
  const c=await read('data/asset-catalog.json');for(const a of Object.values(c.assets))await fs.access(path.join(root,a.path));assert.ok(Object.keys(c.assets).length>=16);
});


test('building footprints become static navigation obstacles',()=>{
  const localDefs={...defs,b:{id:'b',kind:'building',selectable:false,maxHealth:1000,footprint:{width:20,depth:20}}};
  const m={size:{width:200,depth:200},staticObstacles:[],objects:[
    {id:'u1',definition:'u',faction:'player',x:-40,z:0,yaw:0},
    {id:'b1',definition:'b',faction:'player',x:0,z:0,yaw:0}
  ]};
  const bus=new CommandBus();
  const sim=new Simulation({registry:new TestRegistry(localDefs,locos),map:m,commandBus:bus});
  const path=sim.pathfinder.findPath(-40,0,40,0);
  assert.ok(path.length>=3);
  assert.ok(path.some(p=>Math.abs(p.z)>8));
});
