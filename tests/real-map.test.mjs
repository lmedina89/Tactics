import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Simulation,FIXED_DT} from '../engine/sim/simulation.js';
import {CommandBus} from '../engine/commands/command-bus.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
class NodeRegistry{constructor(){this.definitions=new Map();this.locomotors=new Map();}definition(id){return this.definitions.get(id);}locomotor(id){return this.locomotors.get(id);}}
async function registry(){const r=await read('data/registry.json'),out=new NodeRegistry();for(const p of r.locomotors){const v=await read(p);out.locomotors.set(v.id,v);}for(const p of r.definitions){const v=await read(p);out.definitions.set(v.id,v);}return out;}

test('real training map player tank, HMMWV and rifleman all accept repeated persistent moves',async()=>{
  const reg=await registry(),map=validateMapManifest(await read('maps/training_ground.json')),sim=new Simulation({registry:reg,map,commandBus:new CommandBus()});
  const ids=['p_tank','p_hmmwv','p_rifle'];const start=Object.fromEntries(ids.map(id=>{const e=sim.entities.get(id);return[id,{x:e.x,z:e.z}];}));
  sim.issueMove(ids,{x:-70,z:-10});for(let i=0;i<360;i++)sim.step(FIXED_DT);
  sim.issueMove(ids,{x:-105,z:58});for(let i=0;i<360;i++)sim.step(FIXED_DT);
  for(const id of ids){const e=sim.entities.get(id),moved=Math.hypot(e.x-start[id].x,e.z-start[id].z);assert.ok(moved>28,`${id} moved only ${moved.toFixed(2)}m`);assert.notEqual(e.ai.state,'BLOCKED',`${id} ended blocked`);}
});
