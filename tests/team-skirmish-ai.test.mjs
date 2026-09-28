import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DataRegistry} from '../engine/data/registry.js';
import {Simulation,FIXED_DT} from '../engine/sim/simulation.js';
import {CommandBus,CommandSource} from '../engine/commands/command-bus.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
import {TeamState} from '../engine/teams/team-manager.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async rel=>JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));

async function loadBrowserRegistry(){
  const previous=globalThis.fetch;
  globalThis.fetch=async url=>{
    const rel=String(url).replace(/^\.\//,'');
    try{return new Response(await fs.readFile(path.join(root,rel)),{status:200});}
    catch{return new Response('',{status:404});}
  };
  try{return await new DataRegistry().load('.');}
  finally{globalThis.fetch=previous;}
}
async function makeSim(){
  const registry=await loadBrowserRegistry();
  const map=validateMapManifest(await read('maps/construction_validation.json'));
  return new Simulation({registry,map,commandBus:new CommandBus()});
}
function run(sim,ticks){for(let i=0;i<ticks;i++)sim.step(FIXED_DT);}


test('TeamPrototype and SkirmishAI profile data load through the production DataRegistry',async()=>{
  const registry=await loadBrowserRegistry();
  const guard=registry.teamPrototype('crimson_base_guard'),assault=registry.teamPrototype('crimson_assault'),profile=registry.aiProfile('crimson_skirmish_basic');
  assert.equal(guard.role,'BASE_DEFENSE');
  assert.deepEqual(guard.composition,[{definition:'rifleman',min:1,max:1}]);
  assert.equal(assault.role,'ASSAULT');
  assert.deepEqual(assault.composition.map(x=>x.definition),['aegis_x','hmmwv50']);
  assert.equal(profile.teamPlans[0].prototype,'crimson_base_guard');
  assert.deepEqual(profile.teamPlans[1].variants.map(x=>x.prototype),['crimson_assault','crimson_assault_armor','crimson_assault_mobile']);
});

test('map-configured AIPlayer recruits exact data-defined teams without stealing the Harvester',async()=>{
  const sim=await makeSim();
  run(sim,110);
  const guard=[...sim.teams.teams.values()].find(t=>t.planId==='base_guard');
  assert.ok(guard);assert.equal(guard.state,TeamState.ACTIVE);assert.deepEqual(guard.memberIds,['e_rifle']);
  assert.equal(sim.entities.get('e_rifle').teamId,guard.id);
  assert.equal(sim.entities.get('e_harvester').teamId,null);

  run(sim,650);
  const assault=[...sim.teams.teams.values()].find(t=>t.planId==='first_assault');
  assert.ok(assault);assert.deepEqual([...assault.memberIds].sort(),['e_hmmwv','e_tank']);
  assert.equal(sim.entities.get('e_harvester').teamId,null);
  assert.ok([TeamState.RALLYING,TeamState.ACTIVE].includes(assault.state));
});

test('Skirmish AI issues authoritative FROM_AI commands through the same CommandBus',async()=>{
  const sim=await makeSim();run(sim,92);
  assert.equal(sim.lastCommandResult?.commandSource,CommandSource.AI);
  assert.equal(sim.lastCommandResult?.issuerPlayerId,'enemy');
  assert.equal(sim.lastCommandResult?.ok,true);
  assert.equal(sim.lastPlayerCommandResult,null);
  const rifle=sim.entities.get('e_rifle');assert.equal(rifle.ai.stance,'GUARD');assert.equal(rifle.ai.order?.type,'GUARD_POSITION');
});

test('base-defense Team reacts to a hostile incursion through normal ATTACK_MOVE orders',async()=>{
  const sim=await makeSim(),intruder=sim.entities.get('p_hmmwv');
  run(sim,95);
  intruder.x=168;intruder.z=-12;intruder.y=sim.terrain.heightAt(intruder.x,intruder.z);intruder.health=100000;intruder.maxHealth=100000;
  run(sim,20);
  const guard=[...sim.teams.teams.values()].find(t=>t.planId==='base_guard');assert.ok(guard);
  assert.equal(guard.objective?.type,'DEFEND');assert.equal(guard.objective?.targetId,'p_hmmwv');
  const rifle=sim.entities.get('e_rifle');assert.equal(rifle.ai.order?.type,'ATTACK_MOVE');
});

test('v13 snapshot preserves Team membership and SkirmishAI controller state deterministically',async()=>{
  const a=await makeSim();run(a,720);const snap=a.snapshot();assert.equal(snap.version,13);assert.ok(snap.teams.teams.length>=2);assert.equal(snap.skirmishAI.controllers.length,1);
  const b=await makeSim();b.restore(snap);assert.deepEqual(b.snapshot(),snap);
  run(a,180);run(b,180);assert.deepEqual(b.snapshot(),a.snapshot());
});

test('Skirmish AI behavior is deterministic across independent identical simulations',async()=>{
  const a=await makeSim(),b=await makeSim();run(a,760);run(b,760);
  assert.deepEqual(b.snapshot(),a.snapshot());
});

test('terminal Team history is deterministically bounded during repeated reinforcement retries',async()=>{
  const sim=await makeSim();run(sim,3200);
  const assaultRecords=[...sim.teams.teams.values()].filter(t=>t.planId==='first_assault');
  assert.ok(assaultRecords.length<=3,`terminal team history grew to ${assaultRecords.length}`);
  assert.ok(sim.teams.teams.size<=4,`team registry grew to ${sim.teams.teams.size}`);
});
