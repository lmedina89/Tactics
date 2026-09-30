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

test('v12 snapshot restores dynamically produced entities, queues, cargo, faction economy and interaction state',async()=>{
  const s=await sim();s.issueProduce('p_factory','hmmwv50');s.issueHarvest(['p_harvester'],'rich_w');for(let i=0;i<240;i++)s.step(FIXED_DT);
  const snap=s.snapshot(),s2=await sim();s2.restore(snap);assert.deepEqual(s2.snapshot(),snap);
  for(let i=0;i<180;i++){s.step(FIXED_DT);s2.step(FIXED_DT);}assert.deepEqual(s2.snapshot(),s.snapshot());
});

test('factory exit reservation ends at CLEAR_BUILDING even if the produced unit never reaches its rally point',async()=>{
  const s=await sim(),factory=s.entities.get('p_factory'),initial=new Set(s.entities.keys());
  s.issueProduce(factory.id,'hmmwv50');s.issueProduce(factory.id,'hmmwv50');
  let firstRollout=null;
  for(let i=0;i<500;i++){
    s.step(FIXED_DT);
    firstRollout=[...s.production.rollouts.values()].find(r=>r.producerId===factory.id&&r.stage==='RALLYING');
    if(firstRollout)break;
  }
  assert.ok(firstRollout,'first vehicle never reached RALLYING');
  const first=s.entities.get(firstRollout.unitId);first.locomotorId=null;first.ai.route=null;first.ai.goal=null;first.ai.nextRepathTick=s.tick+10000;first.speed=0;
  let secondSpawnedWhileFirstStillRallying=false;
  for(let i=0;i<240;i++){
    s.step(FIXED_DT);
    const created=[...s.entities.values()].filter(e=>!initial.has(e.id)&&e.definitionId==='hmmwv50'&&e.playerId==='player');
    if(created.length>=2&&factory.production.queue.length===0&&s.production.rollouts.has(first.id)){secondSpawnedWhileFirstStillRallying=true;break;}
  }
  assert.equal(secondSpawnedWhileFirstStillRallying,true,'rallying unit still monopolized the factory exit');
});

test('stalled CLEARING rollout is deterministically recovered and cannot brick later production',async()=>{
  const s=await sim(),factory=s.entities.get('p_factory'),initial=new Set(s.entities.keys());
  s.registry.definition('vehicle_factory').modules.find(m=>m.type==='Production').rolloutClearStallTicks=10000;
  s.issueProduce(factory.id,'hmmwv50');s.issueProduce(factory.id,'aegis_x');
  let stuckRollout=null;
  for(let i=0;i<500;i++){
    s.step(FIXED_DT);
    stuckRollout=[...s.production.rollouts.values()].find(r=>r.producerId===factory.id&&r.stage==='CLEARING');
    if(stuckRollout)break;
  }
  assert.ok(stuckRollout,'first rollout never entered CLEARING');
  const stuck=s.entities.get(stuckRollout.unitId);stuck.locomotorId=null;stuck.ai.route=null;stuck.ai.goal=null;stuck.ai.nextRepathTick=s.tick+10000;stuck.speed=0;
  let sawWaiting=false;
  for(let i=0;i<900&&factory.production.queue.length;i++){
    s.step(FIXED_DT);
    if(factory.production.queue[0]?.state==='WAITING_EXIT')sawWaiting=true;
  }
  const created=[...s.entities.values()].filter(e=>!initial.has(e.id)&&e.playerId==='player');
  assert.equal(sawWaiting,true,'second build never exercised WAITING_EXIT');
  assert.equal(factory.production.queue.length,0,'factory queue remained deadlocked');
  assert.ok(created.some(e=>e.definitionId==='aegis_x'),'later queued vehicle never spawned');
  assert.equal(s.production.rollouts.has(stuck.id),false,'stalled rollout watchdog did not release stale reservation');
  assert.equal(stuck.productionExit,null,'stalled produced unit remained owned by the factory rollout');
  const timedOut=[...s.interactions.sessions.values()].find(x=>x.requesterId===stuck.id&&x.state==='EXIT_RECOVERY_TIMEOUT');
  assert.ok(timedOut?.complete,'stalled rollout did not leave an auditable terminal interaction state');
});

test('WAITING_EXIT and stalled-rollout recovery remain deterministic through v16 snapshot restore',async()=>{
  const s=await sim(),factory=s.entities.get('p_factory');s.registry.definition('vehicle_factory').modules.find(m=>m.type==='Production').rolloutClearStallTicks=10000;s.issueProduce(factory.id,'hmmwv50');s.issueProduce(factory.id,'aegis_x');
  let stuckRollout=null;
  for(let i=0;i<500;i++){
    s.step(FIXED_DT);
    stuckRollout=[...s.production.rollouts.values()].find(r=>r.producerId===factory.id&&r.stage==='CLEARING');
    if(stuckRollout)break;
  }
  assert.ok(stuckRollout);
  const stuck=s.entities.get(stuckRollout.unitId);stuck.locomotorId=null;stuck.ai.route=null;stuck.ai.goal=null;stuck.ai.nextRepathTick=s.tick+10000;stuck.speed=0;
  for(let i=0;i<400&&factory.production.queue[0]?.state!=='WAITING_EXIT';i++)s.step(FIXED_DT);
  assert.equal(factory.production.queue[0]?.state,'WAITING_EXIT');assert.equal(factory.production.queue[0]?.waitReason,'EXIT_RESERVED');
  const snap=s.snapshot(),s2=await sim();s2.restore(snap);assert.deepEqual(s2.snapshot(),snap);s2.entities.get(stuck.id).locomotorId=null;
  for(let i=0;i<500;i++){s.step(FIXED_DT);s2.step(FIXED_DT);}assert.deepEqual(s2.snapshot(),s.snapshot());
  assert.equal(s.entities.get('p_factory').production.queue.length,0);
});

test('rollout timeout releases factory bookkeeping without erasing a later player command',async()=>{
  const s=await sim(),factory=s.entities.get('p_factory');s.issueProduce(factory.id,'hmmwv50');
  let rollout=null;
  for(let i=0;i<500;i++){s.step(FIXED_DT);rollout=[...s.production.rollouts.values()].find(r=>r.producerId===factory.id&&r.stage==='RALLYING');if(rollout)break;}
  assert.ok(rollout);
  const unit=s.entities.get(rollout.unitId);unit.ai.order={type:'MOVE',serial:777,requested:{x:unit.x+40,z:unit.z}};unit.ai.route=null;unit.ai.goal=null;unit.speed=0;
  rollout.lastProgressTick=s.tick-301;rollout.lastDistance=distForTest(unit,rollout.rallyPoint);
  s.production.step(s.tick);
  assert.equal(s.production.rollouts.has(unit.id),false);assert.equal(unit.productionExit,null);assert.equal(unit.ai.order?.serial,777);
});

function distForTest(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}

test('Vehicle Factory accepts five queued units while slot one is actively building and rejects only slot six',async()=>{
  const s=await sim(),factory=s.entities.get('p_factory'),start=s.players.get('player').credits;
  s.issueProduce(factory.id,'hmmwv50');s.step(FIXED_DT);
  assert.equal(factory.production.queue.length,1);assert.equal(factory.production.queue[0].state,'BUILDING');
  for(let i=0;i<4;i++)s.issueProduce(factory.id,'hmmwv50');
  s.step(FIXED_DT);
  assert.equal(factory.production.queue.length,5);assert.deepEqual(factory.production.queue.map(x=>x.definitionId),Array(5).fill('hmmwv50'));
  assert.equal(s.players.get('player').credits,start-2250);
  const snap=s.snapshot(),s2=await sim();s2.restore(snap);assert.deepEqual(s2.snapshot(),snap);
  s.issueProduce(factory.id,'hmmwv50');s.step(FIXED_DT);
  assert.equal(factory.production.queue.length,5);assert.equal(s.lastPlayerCommandResult?.reason,'QUEUE_FULL');
  assert.equal(s.players.get('player').credits,start-2250,'rejected sixth slot charged credits');
  s.issueCancelProduction(factory.id);s.step(FIXED_DT);
  assert.equal(factory.production.queue.length,4);assert.equal(s.players.get('player').credits,start-1800,'cancel-last did not refund the final queued vehicle');
});

test('every Training Ground mineral field has a deterministic reachable harvester approach',async()=>{
  const s=await sim(),harvesters=[s.entities.get('p_harvester'),s.entities.get('e_harvester')],fields=['rich_w','dense_w','rich_e','dense_e'];
  for(const h of harvesters)for(const id of fields){const resource=s.entities.get(id),approach=s.resources.findHarvestApproach(h,resource);assert.ok(approach,`${h.id} cannot reach ${id}`);}
  assert.equal(s.entities.get('dense_w').z,98,'west dense field regressed onto its unreachable shelf');
});
