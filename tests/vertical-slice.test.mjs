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
  constructor(){this.definitions=new Map();this.locomotors=new Map();this.armors=new Map();this.weapons=new Map();this.interactions=new Map();this.commandSets=new Map();this.factions=new Map();}
  definition(id){return this.definitions.get(id);}locomotor(id){return this.locomotors.get(id);}armor(id){return this.armors.get(id);}weapon(id){return this.weapons.get(id);}interaction(id){return this.interactions.get(id);}commandSet(id){return this.commandSets.get(id);}faction(id){return this.factions.get(id);}
}
async function registry(){
  const manifest=await read('data/registry.json'),out=new NodeRegistry();
  for(const [key,map] of [['definitions','definitions'],['locomotors','locomotors'],['armors','armors'],['weapons','weapons'],['interactions','interactions'],['commandSets','commandSets'],['factions','factions']]){
    for(const p of manifest[key]||[]){const v=await read(p);out[map].set(v.id,v);}
  }
  return out;
}
async function validationSim(){return new Simulation({registry:await registry(),map:validateMapManifest(await read('maps/construction_validation.json')),commandBus:new CommandBus()});}

test('v0.5.1 field-test map starts as a genuine build-from-foundation scenario',async()=>{
  const s=await validationSim(),player=[...s.entities.values()].filter(e=>e.playerId==='player');
  assert.equal(s.players.get('player').credits,8500);
  assert.deepEqual(player.map(e=>e.id).sort(),['p_harvester','p_hmmwv','p_hq','p_tank']);
  for(const id of ['power_node','refinery','barracks','vehicle_factory','guardian_turret'])assert.equal(player.some(e=>e.definitionId===id),false,id);
  assert.equal(s.construction.eligibility('p_hq','power_node').ok,true);
  assert.equal(s.construction.eligibility('p_hq','refinery').reason,'MISSING_PREREQUISITE');
  assert.equal(s.construction.eligibility('p_hq','vehicle_factory').reason,'MISSING_PREREQUISITE');
  assert.equal(s.construction.eligibility('p_hq','guardian_turret').reason,'MISSING_PREREQUISITE');
});

test('field-test construction visibly advances the tech tree instead of relying on prebuilt structures',async()=>{
  const s=await validationSim(),point={x:-250,z:-120,yaw:0};
  const preview=s.previewBuild('p_hq','power_node',point);assert.equal(preview.ok,true,preview.reason);
  s.issueBuildStructure('p_hq','power_node',point);s.step(FIXED_DT);
  const site=[...s.entities.values()].find(e=>e.playerId==='player'&&e.definitionId==='power_node'&&e.operational===false);assert.ok(site);
  assert.equal(s.construction.eligibility('p_hq','refinery').reason,'MISSING_PREREQUISITE');
  for(let i=0;i<190&&!site.operational;i++)s.step(FIXED_DT);
  assert.equal(site.operational,true);
  assert.equal(s.construction.eligibility('p_hq','refinery').ok,true);
  assert.equal(s.construction.eligibility('p_hq','barracks').ok,true);
  assert.equal(s.construction.eligibility('p_hq','vehicle_factory').reason,'MISSING_PREREQUISITE');
});

test('mobile validation UI loads the dedicated scenario and exposes explicit build/placement guidance',async()=>{
  const main=await fs.readFile(path.join(root,'main.js'),'utf8'),html=await fs.readFile(path.join(root,'index.html'),'utf8');
  assert.match(main,/maps\/construction_validation\.json/);
  assert.match(main,/FIELD TEST 1\/8/);
  assert.match(main,/VALID · TAP TERRAIN TO CONFIRM/);
  assert.match(html,/id="command-dock"/);
  assert.match(html,/id="placement-banner"/);
});

test('field-test can build power/refinery/barracks, begin harvesting, and train infantry end-to-end',async()=>{
  const s=await validationSim();
  const findSpot=definitionId=>{
    const hq=s.entities.get('p_hq');
    for(let radius=90;radius<=140;radius+=10)for(let i=0;i<24;i++){
      const a=i*Math.PI/12,p={x:hq.x+Math.cos(a)*radius,z:hq.z+Math.sin(a)*radius,yaw:0};
      if(s.previewBuild('p_hq',definitionId,p).ok)return p;
    }
    return null;
  };
  const build=definitionId=>{
    const point=findSpot(definitionId);assert.ok(point,`no valid ${definitionId} placement`);
    s.issueBuildStructure('p_hq',definitionId,point);s.step(FIXED_DT);
    const site=[...s.entities.values()].find(e=>e.playerId==='player'&&e.definitionId===definitionId&&e.operational===false);assert.ok(site);
    for(let i=0;i<500&&!site.operational;i++)s.step(FIXED_DT);
    assert.equal(site.operational,true,definitionId);return site;
  };
  build('power_node');build('refinery');
  const harvester=s.entities.get('p_harvester'),resource=s.entities.get('rich_w');s.issueHarvest([harvester.id],resource.id);
  for(let i=0;i<2000&&(harvester.collector?.cargo??0)<=0;i++)s.step(FIXED_DT);
  assert.ok(harvester.collector.cargo>0);assert.ok(resource.resourceRemaining<resource.initialResourceCapacity);
  const barracks=build('barracks');s.issueProduce(barracks.id,'rifleman');
  for(let i=0;i<320&&![...s.entities.values()].some(e=>e.playerId==='player'&&e.definitionId==='rifleman');i++)s.step(FIXED_DT);
  assert.ok([...s.entities.values()].some(e=>e.playerId==='player'&&e.definitionId==='rifleman'));
});
