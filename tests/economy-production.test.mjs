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
async function sim(){return new Simulation({registry:await registry(),map:validateMapManifest(await read('maps/training_ground.json')),commandBus:new CommandBus()});}

test('FactionState starts with credits and data-driven power budget',async()=>{
  const s=await sim(),p=s.players.get('player');s.economy.recalculatePower();assert.equal(p.credits,3000);assert.equal(p.powerProduced,100);assert.equal(p.powerUsed,63);assert.equal(p.lowPower,false);
  s.entities.get('p_power').alive=false;s.economy.recalculatePower();assert.equal(p.powerProduced,20);assert.equal(p.lowPower,true);assert.equal(s.economy.productionRateFactor('player'),0.5);
});

test('Harvester mines a finite field, docks through interaction protocol, unloads credits, and depletes resource',async()=>{
  const s=await sim(),h=s.entities.get('p_harvester'),r=s.entities.get('rich_w'),start=s.players.get('player').credits;
  s.issueHarvest([h.id],r.id);
  for(let i=0;i<3600&&r.resourceRemaining>0.001;i++)s.step(FIXED_DT);
  for(let i=0;i<1400&&(h.collector.cargo>0.001||h.collector.state!=='IDLE');i++)s.step(FIXED_DT);
  assert.equal(Math.round(r.resourceRemaining),0);assert.equal(Math.round(h.collector.cargo),0);assert.equal(h.collector.state,'IDLE');assert.equal(Math.round(s.players.get('player').credits-start),1250);assert.equal(Math.round(s.players.get('player').resourcesHarvested.mineral),1250);
  const completed=[...s.interactions.sessions.values()].filter(x=>x.protocolId==='resource_docking'&&x.requesterId===h.id&&x.complete);assert.ok(completed.length>=1);
});

test('Vehicle Factory charges at queue time, builds data-defined HMMWV, and completes rollout protocol',async()=>{
  const s=await sim(),factory=s.entities.get('p_factory'),start=s.players.get('player').credits,initial=new Set(s.entities.keys());
  s.issueProduce(factory.id,'hmmwv50');s.step(FIXED_DT);assert.equal(s.players.get('player').credits,start-450);assert.equal(factory.production.queue.length,1);
  for(let i=0;i<900&&factory.production.queue.length;i++)s.step(FIXED_DT);
  for(let i=0;i<900&&s.production.rollouts.size;i++)s.step(FIXED_DT);
  const created=[...s.entities.values()].filter(e=>!initial.has(e.id)&&e.definitionId==='hmmwv50'&&e.playerId==='player');assert.equal(created.length,1);assert.equal(factory.production.queue.length,0);assert.equal(s.production.rollouts.size,0);
  const completed=[...s.interactions.sessions.values()].filter(x=>x.protocolId==='factory_rollout'&&x.requesterId===created[0].id&&x.complete);assert.equal(completed.length,1);
});

test('Barracks production uses same generic queue/rollout system and cancellation refunds credits',async()=>{
  const s=await sim(),b=s.entities.get('p_barracks'),start=s.players.get('player').credits;
  s.issueProduce(b.id,'rifleman');s.step(FIXED_DT);assert.equal(s.players.get('player').credits,start-150);assert.equal(b.production.queue.length,1);
  s.issueCancelProduction(b.id);s.step(FIXED_DT);assert.equal(s.players.get('player').credits,start);assert.equal(b.production.queue.length,0);
  s.issueProduce(b.id,'rifleman');s.step(FIXED_DT);for(let i=0;i<600&&b.production.queue.length;i++)s.step(FIXED_DT);for(let i=0;i<600&&s.production.rollouts.size;i++)s.step(FIXED_DT);
  assert.ok([...s.entities.values()].some(e=>e.definitionId==='rifleman'&&e.playerId==='player'&&e.id!=='p_rifle'));
});

test('v11 snapshot restores dynamically produced entities, queues, cargo, faction economy and interaction state',async()=>{
  const s=await sim();s.issueProduce('p_factory','hmmwv50');s.issueHarvest(['p_harvester'],'rich_w');for(let i=0;i<240;i++)s.step(FIXED_DT);
  const snap=s.snapshot(),s2=await sim();s2.restore(snap);assert.deepEqual(s2.snapshot(),snap);
  for(let i=0;i<180;i++){s.step(FIXED_DT);s2.step(FIXED_DT);}assert.deepEqual(s2.snapshot(),s.snapshot());
});
