import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DataRegistry} from '../engine/data/registry.js';
import {Simulation,FIXED_DT} from '../engine/sim/simulation.js';
import {CommandBus} from '../engine/commands/command-bus.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async rel=>JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));
async function loadBrowserRegistry(){
  const previous=globalThis.fetch;
  globalThis.fetch=async url=>{const rel=String(url).replace(/^\.\//,'');try{return new Response(await fs.readFile(path.join(root,rel)),{status:200});}catch{return new Response('',{status:404});}};
  try{return await new DataRegistry().load('.');}finally{globalThis.fetch=previous;}
}
async function makeSim(){const registry=await loadBrowserRegistry(),map=validateMapManifest(await read('maps/construction_validation.json'));return new Simulation({registry,map,commandBus:new CommandBus()});}
function assess(sim){const c=sim.skirmishAI.controllers.get('enemy');c.strategyPlanner.nextAssessmentTick=sim.tick;return c.strategyPlanner.update(sim.tick);}

test('strategic Team variant selection adapts to enemy force categories through data, not concrete runtime branches',async()=>{
  const armor=await makeSim();
  for(let i=0;i<5;i++)armor._spawnEntity({id:`extra_tank_${i}`,definition:'aegis_x',owner:'player',x:-160+i*4,z:-80,yaw:0});
  const armorState=assess(armor);
  assert.equal(armorState.planChoices.first_assault,'crimson_assault_armor');

  const mobile=await makeSim();
  // Remove the baseline heavy unit so an infantry-heavy opponent is unambiguous.
  mobile.entities.get('p_tank').alive=false;
  for(let i=0;i<7;i++)mobile._spawnEntity({id:`extra_rifle_${i}`,definition:'rifleman',owner:'player',x:-160+i*2,z:-80,yaw:0});
  const mobileState=assess(mobile);
  assert.equal(mobileState.planChoices.first_assault,'crimson_assault_mobile');
});

test('difficulty and wealth modify strategic cadence and gatherer demand without changing simulation rules',async()=>{
  const sim=await makeSim(),c=sim.skirmishAI.controllers.get('enemy');
  c.strategyPlanner.difficulty='HARD';sim.players.get('enemy').credits=6000;
  const s=assess(sim);
  assert.equal(s.wealthState,'WEALTHY');
  assert.equal(s.desiredHarvesterDelta,1);
  assert.ok(s.constructionIntervalScale<1);
  assert.ok(s.productionIntervalScale<1);
  assert.ok(s.teamIntervalScale<1);
});

test('expansion logic requires a real local-resource depletion baseline and then identifies a remote field',async()=>{
  const sim=await makeSim(),c=sim.skirmishAI.controllers.get('enemy'),ref=sim.entities.get('e_refinery');
  sim.players.get('enemy').credits=3000;
  let s=assess(sim);
  assert.deepEqual(s.buildCountOverrides,{},'no nearby resource baseline must not be treated as 0% remaining');
  assert.equal(s.expansionResourceId,null);

  const local=sim.entities.get('dense_e');
  local.x=ref.x-20;local.z=ref.z;local.initialResourceCapacity=3000;local.resourceRemaining=300;
  c.strategyPlanner.nextAssessmentTick=sim.tick;
  s=c.strategyPlanner.update(sim.tick);
  assert.equal(s.buildCountOverrides.refinery,2);
  assert.ok(s.expansionResourceId);
  assert.notEqual(s.expansionResourceId,local.id);
});

test('strategic planner state survives v15 snapshot restore deterministically',async()=>{
  const a=await makeSim();for(let i=0;i<240;i++)a.step(FIXED_DT);const snap=a.snapshot();assert.equal(snap.version,15);
  const b=await makeSim();b.restore(snap);assert.deepEqual(b.snapshot(),snap);
  for(let i=0;i<180;i++){a.step(FIXED_DT);b.step(FIXED_DT);}assert.deepEqual(b.snapshot(),a.snapshot());
});


test('map-selected AI personality changes strategic pacing without branching simulation rules',async()=>{
  const sim=await makeSim(),c=sim.skirmishAI.controllers.get('enemy');
  c.strategyPlanner.personalityId='AGGRESSIVE';
  let s=assess(sim);
  assert.equal(s.personality,'AGGRESSIVE');
  assert.ok(s.teamIntervalScale<1,'aggressive personality should form/refresh teams faster');
  assert.ok(s.defenseRadiusScale<1,'aggressive personality should devote less radius to static defense');

  c.strategyPlanner.personalityId='ECONOMIST';c.strategyPlanner.nextAssessmentTick=sim.tick;
  s=c.strategyPlanner.update(sim.tick);
  assert.equal(s.personality,'ECONOMIST');
  assert.ok(s.constructionIntervalScale<1,'economist should accelerate construction planning');
  assert.ok(s.productionIntervalScale<1,'economist should accelerate production planning');
});
