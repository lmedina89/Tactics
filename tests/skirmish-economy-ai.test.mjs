import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DataRegistry} from '../engine/data/registry.js';
import {Simulation,FIXED_DT} from '../engine/sim/simulation.js';
import {CommandBus} from '../engine/commands/command-bus.js';
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
async function makeSim({mapMutator=null,profileMutator=null}={}){
  const registry=await loadBrowserRegistry();
  if(profileMutator)profileMutator(registry.aiProfile('crimson_skirmish_basic'));
  const raw=await read('maps/construction_validation.json');if(mapMutator)mapMutator(raw);
  const map=validateMapManifest(raw);return new Simulation({registry,map,commandBus:new CommandBus()});
}
function run(sim,ticks){for(let i=0;i<ticks;i++)sim.step(FIXED_DT);}
function owned(sim,definition){return [...sim.entities.values()].filter(e=>e.alive&&e.playerId==='enemy'&&e.definitionId===definition);}

test('Skirmish economy policy is fully data-defined: gatherers, build list and reserves',async()=>{
  const registry=await loadBrowserRegistry(),profile=registry.aiProfile('crimson_skirmish_basic'),economy=profile.economy;
  assert.equal(economy.harvester.definition,'harvester');assert.equal(economy.harvester.desiredCount,2);
  assert.deepEqual(economy.buildList.map(x=>x.definition),['power_node','refinery','barracks','vehicle_factory','guardian_turret']);
  assert.equal(economy.buildList.find(x=>x.definition==='power_node').desiredCount,2);
  assert.equal(economy.buildList.find(x=>x.definition==='guardian_turret').desiredCount,2);
  assert.deepEqual(economy.unitReserves,[{definition:'rifleman',desiredFree:1,priority:250}]);
});

test('AI autonomously harvests, expands structures and produces economy/reserve units through normal systems',async()=>{
  const sim=await makeSim();run(sim,520);
  const player=sim.players.get('enemy');
  assert.ok((player.resourcesHarvested.mineral||0)>0,'enemy Harvester never mined minerals');
  assert.ok(owned(sim,'harvester').length>=2,'AI did not build its desired second Harvester');
  assert.ok(owned(sim,'power_node').length>=2,'AI did not expand its power base');
  assert.ok(owned(sim,'guardian_turret').length>=2,'AI did not build the planned second defense');
  assert.ok(owned(sim,'rifleman').length>=2,'AI did not maintain the configured free Rifleman reserve');
});

test('missing build-list structures are reconstructed with authoritative placement/construction commands',async()=>{
  const sim=await makeSim({mapMutator:map=>{map.objects=map.objects.filter(o=>o.id!=='e_refinery');}});run(sim,620);
  const refs=owned(sim,'refinery');assert.ok(refs.length>=1,'AI failed to replace missing Refinery');
  assert.ok(refs.some(e=>e.id!=='e_refinery'&&e.operational!==false),'replacement Refinery never completed');
});

test('empty recruiting Teams persist as work orders while factories produce their missing composition',async()=>{
  const sim=await makeSim({
    mapMutator:map=>{map.objects=map.objects.filter(o=>!['e_rifle','e_tank','e_hmmwv','p_tank','p_hmmwv'].includes(o.id));},
    profileMutator:profile=>{profile.initialDelayTicks=0;for(const p of profile.teamPlans)p.startDelayTicks=0;profile.economy.buildList=[];profile.economy.harvester.desiredCount=1;profile.economy.unitReserves=[];}
  });
  run(sim,20);
  const early=[...sim.teams.teams.values()].filter(t=>t.playerId==='enemy');assert.ok(early.length>=2);
  assert.ok(early.some(t=>t.state===TeamState.RECRUITING&&t.memberIds.length===0),'empty recruiting team was destroyed before production could satisfy it');
  run(sim,720);
  const guard=[...sim.teams.teams.values()].find(t=>t.planId==='base_guard'&&!['DESTROYED','DISBANDED'].includes(t.state));
  const assault=[...sim.teams.teams.values()].find(t=>t.planId==='first_assault'&&!['DESTROYED','DISBANDED'].includes(t.state));
  assert.ok(guard&&guard.memberIds.some(id=>sim.entities.get(id)?.definitionId==='rifleman'),'Barracks did not satisfy guard Team demand');
  assert.ok(assault,'assault work order disappeared');
  const assaultDefs=assault.memberIds.map(id=>sim.entities.get(id)?.definitionId).filter(Boolean);
  assert.ok(assaultDefs.includes('aegis_x'),'Vehicle Factory did not produce tank for assault Team');
  assert.ok(assaultDefs.includes('hmmwv50'),'Vehicle Factory did not produce HMMWV for assault Team');
});

test('v12 snapshot preserves economy-planner timers and continues deterministically',async()=>{
  const a=await makeSim();run(a,480);const snap=a.snapshot();assert.equal(snap.version,12);
  const state=snap.skirmishAI.controllers[0].economyPlanner;assert.ok(state);assert.ok(state.nextHarvestTick>0&&state.nextConstructionTick>0&&state.nextProductionTick>0);
  const b=await makeSim();b.restore(snap);assert.deepEqual(b.snapshot(),snap);run(a,240);run(b,240);assert.deepEqual(b.snapshot(),a.snapshot());
});

test('AI economy planner only queries gameplay systems and acts through CommandBus',async()=>{
  const source=await fs.readFile(path.join(root,'engine/ai/skirmish-economy-planner.js'),'utf8');
  for(const forbidden of ['construction.begin(','production.queue(','resources.issueHarvest(','economy.withdraw(','economy.deposit('])assert.equal(source.includes(forbidden),false,`direct mutation path found: ${forbidden}`);
  assert.ok(source.includes('CommandSource.AI'));assert.ok(source.includes('CommandType.BUILD_STRUCTURE'));assert.ok(source.includes('CommandType.PRODUCE'));assert.ok(source.includes('CommandType.HARVEST'));
});
