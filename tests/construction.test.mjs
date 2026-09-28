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
  constructor(){this.definitions=new Map();this.locomotors=new Map();this.armors=new Map();this.weapons=new Map();this.interactions=new Map();this.commandSets=new Map();}
  definition(id){return this.definitions.get(id);}locomotor(id){return this.locomotors.get(id);}armor(id){return this.armors.get(id);}weapon(id){return this.weapons.get(id);}interaction(id){return this.interactions.get(id);}commandSet(id){return this.commandSets.get(id);}
}
async function registry(){
  const r=await read('data/registry.json'),out=new NodeRegistry();
  for(const p of r.locomotors){const v=await read(p);out.locomotors.set(v.id,v);}
  for(const p of r.definitions){const v=await read(p);out.definitions.set(v.id,v);}
  for(const p of r.armors){const v=await read(p);out.armors.set(v.id,v);}
  for(const p of r.weapons){const v=await read(p);out.weapons.set(v.id,v);}
  for(const p of r.interactions||[]){const v=await read(p);out.interactions.set(v.id,v);}
  for(const p of r.commandSets||[]){const v=await read(p);out.commandSets.set(v.id,v);}
  return out;
}
async function sim(){return new Simulation({registry:await registry(),map:validateMapManifest(await read('maps/training_ground.json')),commandBus:new CommandBus()});}

const VALID_POWER={x:-300,z:-150,yaw:0};

test('CommandSet data exposes HQ construction and existing production through generic commands',async()=>{
  const r=await registry(),hq=r.commandSet('aegis_command_post'),b=r.commandSet('aegis_barracks'),f=r.commandSet('aegis_vehicle_factory');
  assert.ok(hq.commands.some(c=>c.type==='BUILD_STRUCTURE'&&c.definition==='power_node'));
  assert.ok(hq.commands.some(c=>c.type==='BUILD_STRUCTURE'&&c.definition==='vehicle_factory'));
  assert.ok(b.commands.some(c=>c.type==='PRODUCE'&&c.definition==='rifleman'));
  assert.ok(f.commands.some(c=>c.type==='PRODUCE'&&c.definition==='aegis_x'));
});

test('placement validation is authoritative for radius, occupied footprints and valid terrain',async()=>{
  const s=await sim();
  assert.equal(s.previewBuild('p_hq','power_node',VALID_POWER).ok,true);
  const overlap=s.previewBuild('p_hq','power_node',{x:-238,z:-20,yaw:0});assert.equal(overlap.ok,false);assert.equal(overlap.reason,'OBJECT_OVERLAP');
  const far=s.previewBuild('p_hq','power_node',{x:0,z:-20,yaw:0});assert.equal(far.ok,false);assert.equal(far.reason,'OUT_OF_BUILD_RADIUS');
});

test('construction reserves credits, creates a non-operational site, then activates completed modules',async()=>{
  const s=await sim(),p=s.players.get('player'),startCredits=p.credits; s.economy.recalculatePower();const startPower=p.powerProduced;
  s.issueBuildStructure('p_hq','power_node',VALID_POWER);s.step(FIXED_DT);
  const site=[...s.entities.values()].find(e=>e.id.startsWith('player_power_node_site_'));assert.ok(site);assert.equal(site.operational,false);assert.equal(site.construction.state,'CONSTRUCTING');assert.equal(p.credits,startCredits-500);assert.equal(p.powerProduced,startPower);
  for(let i=0;i<180&&!site.operational;i++)s.step(FIXED_DT);
  assert.equal(site.operational,true);assert.equal(site.construction.state,'COMPLETE');assert.equal(p.powerProduced,startPower+80);assert.ok(site.health>site.maxHealth*.9);
});

test('production and power modules remain inactive while a structure is under construction',async()=>{
  const s=await sim(),p=s.players.get('player');
  const place={x:-286,z:-132,yaw:0};const preview=s.previewBuild('p_hq','barracks',place);assert.equal(preview.ok,true,preview.reason);
  s.issueBuildStructure('p_hq','barracks',place);s.step(FIXED_DT);
  const site=[...s.entities.values()].find(e=>e.id.startsWith('player_barracks_site_'));assert.ok(site);assert.equal(site.operational,false);
  const credits=p.credits,result=s.production.queue(site.id,'rifleman',s.tick);assert.equal(result.ok,false);assert.equal(p.credits,credits);
});

test('canceling construction removes the footprint and refunds the configured fraction',async()=>{
  const s=await sim(),p=s.players.get('player'),start=p.credits;
  s.issueBuildStructure('p_hq','power_node',VALID_POWER);s.step(FIXED_DT);const site=[...s.entities.values()].find(e=>e.id.startsWith('player_power_node_site_'));assert.ok(site);assert.ok(s.pathfinder.dynamicObstacleCells.has(site.id));
  s.issueCancelConstruction(site.id);s.step(FIXED_DT);assert.equal(s.entities.has(site.id),false);assert.equal(s.pathfinder.dynamicObstacleCells.has(site.id),false);assert.equal(p.credits,start-500+375);
});

test('prerequisites are data-driven and can lock construction when the prerequisite is lost',async()=>{
  const s=await sim();s.entities.get('p_power').alive=false;
  const check=s.construction.eligibility('p_hq','barracks');assert.equal(check.ok,false);assert.equal(check.reason,'MISSING_PREREQUISITE');assert.deepEqual(check.missing,['power_node']);
});


test('damage taken during construction is preserved instead of being healed away on completion',async()=>{
  const s=await sim();s.issueBuildStructure('p_hq','power_node',VALID_POWER);for(let i=0;i<70;i++)s.step(FIXED_DT);
  const site=[...s.entities.values()].find(e=>e.id.startsWith('player_power_node_site_'));assert.ok(site&&!site.operational);site.health=Math.max(1,site.health-180);
  for(let i=0;i<160&&!site.operational;i++)s.step(FIXED_DT);assert.equal(site.operational,true);assert.ok(site.health<site.maxHealth-100,`health ${site.health}/${site.maxHealth}`);
});

test('a destroyed construction site never activates its completed building modules',async()=>{
  const s=await sim();s.issueBuildStructure('p_hq','power_node',VALID_POWER);s.step(FIXED_DT);const site=[...s.entities.values()].find(e=>e.id.startsWith('player_power_node_site_'));assert.ok(site);
  site.alive=false;site.health=0;for(let i=0;i<240;i++)s.step(FIXED_DT);assert.equal(site.operational,false);assert.notEqual(site.construction.state,'COMPLETE');
});

test('v10 snapshot restores active construction and continues deterministically',async()=>{
  const s=await sim();s.issueBuildStructure('p_hq','power_node',VALID_POWER);for(let i=0;i<55;i++)s.step(FIXED_DT);const snap=s.snapshot();assert.equal(snap.version,10);
  const s2=await sim();s2.restore(snap);assert.deepEqual(s2.snapshot(),snap);
  for(let i=0;i<120;i++){s.step(FIXED_DT);s2.step(FIXED_DT);}assert.deepEqual(s2.snapshot(),s.snapshot());
});
