import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DataRegistry} from '../engine/data/registry.js';
import {Simulation,FIXED_DT} from '../engine/sim/simulation.js';
import {CommandBus} from '../engine/commands/command-bus.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
import {TargetEvaluator} from '../engine/ai/target-evaluator.js';
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


test('C&C-style AttackPrioritySet data uses distance-weighted target valuation',async()=>{
  const registry=await loadBrowserRegistry(),evaluator=new TargetEvaluator({registry}),set=registry.targetPrioritySet('crimson_assault_targets');
  assert.equal(set.distanceModifier,55);assert.equal(set.priorities.COMMAND,30);assert.equal(set.priorities.COMBAT,12);
  const tank={id:'near_tank',definitionId:'aegis_x',playerId:'player',alive:true,x:100,z:0,kind:'vehicle',weaponSlots:{slots:[{}]}};
  const power={id:'far_power',definitionId:'power_node',playerId:'player',alive:true,x:700,z:0,kind:'building'};
  const choice=evaluator.choose([power,tank],{from:{x:0,z:0},prioritySetId:set.id});
  assert.equal(choice.target.id,'near_tank','distance weighting should let a much nearer combat threat outrank a distant higher-value structure');
});

test('assault Teams use their data-defined common target and normal ATTACK command',async()=>{
  const sim=await makeSim();run(sim,850);
  const team=[...sim.teams.teams.values()].find(t=>t.planId==='first_assault'&&t.state===TeamState.ACTIVE);assert.ok(team,'assault Team never activated');
  assert.equal(team.objective?.type,'ATTACK_PLAYER');assert.ok(team.objective?.targetId);
  for(const id of team.memberIds){const e=sim.entities.get(id);assert.equal(e.ai.order?.type,'ATTACK');assert.equal(e.ai.order?.targetId,team.objective.targetId);}
});

test('recent attacks on economy assets redirect the base-defense Team to protect them',async()=>{
  const sim=await makeSim();run(sim,100);
  const harvester=sim.entities.get('e_harvester'),attacker=sim.entities.get('p_hmmwv'),guard=sim.entities.get('e_rifle');
  attacker.x=harvester.x-20;attacker.z=harvester.z;attacker.health=100000;attacker.maxHealth=100000;
  harvester.lastDamagedBy=attacker.id;harvester.lastDamagedTick=sim.tick;
  run(sim,20);
  const team=[...sim.teams.teams.values()].find(t=>t.planId==='base_guard');assert.ok(team);
  assert.equal(team.objective?.type,'PROTECT_ECONOMY');assert.equal(team.objective?.targetId,harvester.id);assert.equal(team.objective?.threatId,attacker.id);
  assert.equal(guard.ai.order?.type,'GUARD_OBJECT');assert.equal(guard.ai.order?.targetId,harvester.id);
});

test('damaged assault Team retreats, becomes a production work order, reforms, and reactivates',async()=>{
  const sim=await makeSim();run(sim,850);
  let team=[...sim.teams.teams.values()].find(t=>t.planId==='first_assault'&&t.state===TeamState.ACTIVE);assert.ok(team);
  const oldHmmwv=team.memberIds.map(id=>sim.entities.get(id)).find(e=>e?.definitionId==='hmmwv50');assert.ok(oldHmmwv);oldHmmwv.alive=false;
  run(sim,30);team=sim.teams.team(team.id);assert.equal(team.state,TeamState.REFORMING);assert.equal(team.objective?.type,'REFORM');
  const factory=[...sim.entities.values()].find(e=>e.alive&&e.playerId==='enemy'&&e.definitionId==='vehicle_factory');assert.ok(factory.production.queue.some(q=>q.definitionId==='hmmwv50'),'missing Team member did not become a factory work order');
  run(sim,520);team=sim.teams.team(team.id);assert.equal(team.state,TeamState.ACTIVE);const replacement=team.memberIds.map(id=>sim.entities.get(id)).find(e=>e?.definitionId==='hmmwv50');assert.ok(replacement);assert.notEqual(replacement.id,oldHmmwv.id);
});

test('harvest approach validation rejects the old ledge field and every authored v0.6.2 field is reachable',async()=>{
  const sim=await makeSim(),playerHarvester=sim.entities.get('p_harvester'),enemyHarvester=sim.entities.get('e_harvester'),resource=sim.entities.get('dense_w');
  for(const r of [...sim.entities.values()].filter(e=>e.kind==='resource')){
    assert.ok(sim.resources.findHarvestApproach(playerHarvester,r),`player Harvester cannot reach ${r.id}`);
    assert.ok(sim.resources.findHarvestApproach(enemyHarvester,r),`enemy Harvester cannot reach ${r.id}`);
  }
  const safe={x:resource.x,z:resource.z};resource.x=-58;resource.z=102;
  assert.equal(sim.resources.findHarvestApproach(playerHarvester,resource),null,'old steep ledge unexpectedly exposes a legal harvest approach');
  sim.issueHarvest([playerHarvester.id],resource.id);sim.step(FIXED_DT);assert.equal(sim.lastPlayerCommandResult?.reason,'RESOURCE_UNREACHABLE');
  resource.x=safe.x;resource.z=safe.z;
});

test('AI construction placement safety rejects positions inside an enemy combat threat radius',async()=>{
  const sim=await makeSim(),controller=sim.skirmishAI.controllers.get('enemy'),planner=controller.economyPlanner,tank=sim.entities.get('p_tank');assert.ok(planner);
  tank.x=220;tank.z=-20;
  assert.equal(planner._locationSafe({x:225,z:-20}),false);
  assert.equal(planner._locationSafe({x:225,z:120}),true);
});

test('economic defense manager forms a threat-sized response Team and intercepts a Harvester attacker',async()=>{
  const sim=await makeSim();run(sim,100);
  const harvester=sim.entities.get('e_harvester'),attacker=sim.entities.get('p_tank');
  attacker.x=harvester.x-24;attacker.z=harvester.z;attacker.health=100000;attacker.maxHealth=100000;
  harvester.lastDamagedBy=attacker.id;harvester.lastDamagedTick=sim.tick;
  run(sim,20);
  const controller=sim.skirmishAI.controllers.get('enemy'),response=controller.economicDefense,team=sim.teams.team(response.activeTeamId);
  assert.ok(team,'economic defense Team was not created');
  assert.equal(team.prototypeId,'crimson_economic_defense_heavy','heavy armor raid should select heavy response data');
  assert.equal(team.objective?.type,'ECONOMIC_INTERCEPT');assert.equal(team.objective?.protectedTargetId,harvester.id);assert.equal(team.objective?.targetId,attacker.id);
  const members=sim.teams.members(team);assert.ok(members.some(e=>e.definitionId==='aegis_x'));assert.ok(members.some(e=>e.definitionId==='hmmwv50'));
  for(const e of members){assert.equal(e.ai.order?.type,'ATTACK');assert.equal(e.ai.order?.targetId,attacker.id);}
  attacker.alive=false;run(sim,320);
  assert.equal(controller.economicDefense.activeTeamId,null,'temporary economic response should release after threat/hold window');
});

test('missing emergency defenders become normal high-priority factory demand instead of spawned reinforcements',async()=>{
  const sim=await makeSim();run(sim,100);
  sim.entities.get('e_tank').alive=false;sim.entities.get('e_hmmwv').alive=false;
  const harvester=sim.entities.get('e_harvester'),attacker=sim.entities.get('p_tank');attacker.x=harvester.x-22;attacker.z=harvester.z;
  harvester.lastDamagedBy=attacker.id;harvester.lastDamagedTick=sim.tick;
  run(sim,45);
  const controller=sim.skirmishAI.controllers.get('enemy'),team=sim.teams.team(controller.economicDefense.activeTeamId);assert.ok(team);assert.equal(team.state,TeamState.RECRUITING);
  const factory=sim.entities.get('e_factory'),queued=(factory.production?.queue||[]).map(q=>q.definitionId);
  assert.ok(queued.includes('aegis_x')||queued.includes('hmmwv50'),`expected emergency factory work order, got ${queued.join(',')}`);
  assert.equal([...sim.entities.values()].filter(e=>e.alive&&e.playerId==='enemy'&&['aegis_x','hmmwv50'].includes(e.definitionId)).length,0,'defenders must not be spawned directly');
});

test('economic-defense incident/escort state survives v14 snapshot restore deterministically',async()=>{
  const a=await makeSim();run(a,100);
  const harvester=a.entities.get('e_harvester'),attacker=a.entities.get('p_hmmwv');attacker.x=harvester.x-18;attacker.z=harvester.z;
  harvester.lastDamagedBy=attacker.id;harvester.lastDamagedTick=a.tick;run(a,20);
  // A second distinct damage event enables the data-defined persistent escort window.
  harvester.lastDamagedTick=a.tick;run(a,20);
  const state=a.skirmishAI.controllers.get('enemy').economicDefense;assert.ok(state.escortUntilTick>a.tick);
  const snap=a.snapshot(),b=await makeSim();b.restore(snap);assert.deepEqual(b.snapshot(),snap);
  for(let i=0;i<120;i++){a.step(FIXED_DT);b.step(FIXED_DT);}assert.deepEqual(b.snapshot(),a.snapshot());
});

test('severe Harvester raid can temporarily recall an assault Team and release it back to normal duty',async()=>{
  const sim=await makeSim();run(sim,850);
  const assault=[...sim.teams.teams.values()].find(t=>t.planId==='first_assault'&&t.state===TeamState.ACTIVE);assert.ok(assault,'active assault Team required');
  const harvester=sim.entities.get('e_harvester'),attacker=sim.entities.get('p_tank');assert.ok(harvester&&attacker);
  const assaultMembers=sim.teams.members(assault);assert.ok(assaultMembers.some(e=>e.definitionId==='aegis_x'));assert.ok(assaultMembers.some(e=>e.definitionId==='hmmwv50'));
  // Remove free armored responders so a severe raid must temporarily recall the existing assault Team.
  for(const e of sim.entities.values())if(e.alive&&e.playerId==='enemy'&&['aegis_x','hmmwv50'].includes(e.definitionId)&&!assault.memberIds.includes(e.id))e.alive=false;
  for(const e of assaultMembers){e.x=harvester.x+8;e.z=harvester.z+8;}
  attacker.x=harvester.x-18;attacker.z=harvester.z;attacker.health=100000;attacker.maxHealth=100000;
  harvester.lastDamagedBy=attacker.id;harvester.lastDamagedTick=sim.tick;
  run(sim,20);
  const controller=sim.skirmishAI.controllers.get('enemy'),response=sim.teams.team(controller.economicDefense.activeTeamId);assert.ok(response);
  assert.equal(response.prototypeId,'crimson_economic_defense_heavy');
  assert.ok(controller.economicDefense.borrowedTeamIds.includes(assault.id),'severe raid did not temporarily recall the assault Team');
  const borrowedSnapshot=sim.snapshot(),restored=await makeSim();restored.restore(borrowedSnapshot);assert.deepEqual(restored.snapshot(),borrowedSnapshot,'temporary Team recall must survive snapshot/restore exactly');
  assert.equal(sim.teams.team(assault.id).state,TeamState.ACTIVE,'temporary recall must preserve the assault Team lifecycle');
  for(const e of assaultMembers){assert.equal(e.teamId,assault.id);assert.equal(e.ai.order?.type,'ATTACK');assert.equal(e.ai.order?.targetId,attacker.id);}
  attacker.alive=false;run(sim,340);
  assert.equal(controller.economicDefense.activeTeamId,null,'temporary economic response should release after the raid is safe');
  assert.equal(controller.economicDefense.borrowedTeamIds.length,0,'recalled assault Team was not released');
  run(sim,45);
  const resumed=sim.teams.team(assault.id);assert.ok(resumed);assert.equal(resumed.state,TeamState.ACTIVE);
  assert.equal(resumed.objective?.type,'ATTACK_PLAYER','released assault Team did not return to its normal strategic assignment');
});
