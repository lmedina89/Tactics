import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DataRegistry} from '../engine/data/registry.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
import {CommandBus} from '../engine/commands/command-bus.js';
import {Simulation} from '../engine/sim/simulation.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=async rel=>JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));
async function fileFetch(input){const rel=String(input).replace(/^\.\//,'');try{return new Response(await fs.readFile(path.join(root,rel)),{status:200});}catch{return new Response('',{status:404});}}
function glbJSON(buffer){let off=12,g=null;while(off<buffer.length){const len=buffer.readUInt32LE(off),type=buffer.readUInt32LE(off+4);off+=8;if(type===0x4e4f534a)g=JSON.parse(buffer.subarray(off,off+len).toString('utf8').replace(/\0+$/,'').trim());off+=len;}return g;}

test('accepted Crimson vehicle assets are registered and shared roles preserve Aegis defaults',async()=>{
  const cat=await readJson('data/asset-catalog.json'),pkg=await readJson('package.json');assert.equal(cat.version,pkg.version);
  for(const id of ['crimson_breaker_mbt','crimson_raider_halftrack','crimson_warder_ifv','crimson_reclaimer_harvester']){assert.ok(cat.assets[id]);await fs.access(path.join(root,cat.assets[id].path));}
  const tank=await readJson('data/units/aegis_x.json'),light=await readJson('data/units/hmmwv50.json'),harv=await readJson('data/units/harvester.json');
  const tr=tank.modules.find(m=>m.type==='Render'),lr=light.modules.find(m=>m.type==='Render'),hr=harv.modules.find(m=>m.type==='Render');
  assert.equal(tr.asset,'aegis_x_mbt');assert.equal(tr.assetByFaction.crimson,'crimson_breaker_mbt');assert.equal(tr.factionColorModeByFaction.crimson,'AUTHORED');
  assert.equal(lr.asset,'aegis_hmmwv50');assert.equal(lr.assetByFaction.crimson,'crimson_raider_halftrack');assert.equal(lr.factionColorModeByFaction.crimson,'AUTHORED');
  assert.equal(hr.asset,'aegis_field_harvester');assert.equal(hr.assetByFaction.crimson,'crimson_reclaimer_harvester');assert.equal(hr.factionColorModeByFaction.crimson,'AUTHORED');
});

test('Crimson vehicle GLBs expose the runtime roots used by their bindings',async()=>{
  const cat=await readJson('data/asset-catalog.json');
  const expected={
    crimson_breaker_mbt:['TurretRoot','GunPitchRoot','BarrelRecoilRoot','MuzzleSocket'],
    crimson_raider_halftrack:['TurretRoot','GunPitchRoot','BarrelRecoilRoot','MuzzleSocket'],
    crimson_warder_ifv:['TurretRoot','GunPitchRoot','BarrelRecoilRoot','MuzzleSocket','SteeringRoot_FL','SteeringRoot_FR','WheelSpinRoot_ML','RearRampRoot'],
    crimson_reclaimer_harvester:['VehicleRoot','CrimsonFrontLeftSteerRoot','CrimsonFrontLeftWheelSpinRoot','CrimsonCollectorDrumRoot','CrimsonLeftGatheringArmRoot','CargoHopperRoot','RefineryDockAlignSocket']
  };
  for(const [id,names] of Object.entries(expected)){const g=glbJSON(await fs.readFile(path.join(root,cat.assets[id].path))),set=new Set((g.nodes||[]).map(n=>n.name));for(const name of names)assert.ok(set.has(name),`${id} missing ${name}`);}
});

test('Reclaimer integrated copy is oriented to the shared Harvester forward contract and has non-conflicting animation nodes',async()=>{
  const cat=await readJson('data/asset-catalog.json'),g=glbJSON(await fs.readFile(path.join(root,cat.assets.crimson_reclaimer_harvester.path)));
  const vr=(g.nodes||[]).find(n=>n.name==='VehicleRoot');assert.ok(vr?.rotation);const q=vr.rotation;assert.ok(Math.abs(Math.abs(q[1])-Math.SQRT1_2)<1e-5);assert.ok(Math.abs(Math.abs(q[3])-Math.SQRT1_2)<1e-5);
  const names=new Set((g.nodes||[]).map(n=>n.name));assert.ok(!names.has('FrontLeftWheelSpinRoot'));assert.ok(names.has('CrimsonFrontLeftWheelSpinRoot'));assert.ok(!names.has('CollectorDrumRoot'));assert.ok(names.has('CrimsonCollectorDrumRoot'));
  const harv=await readJson('data/units/harvester.json'),anim=harv.modules.find(m=>m.type==='ClientAnimation').procedural;
  assert.ok(anim.some(p=>p.id==='crimson_wheels'&&p.axis==='z'&&p.optional));assert.ok(anim.some(p=>p.id==='crimson_front_steer'&&p.axis==='y'&&p.optional));assert.ok(anim.some(p=>p.id==='crimson_collector_drum'&&p.axis==='z'&&p.optional));
});

test('Warder is a registered combat definition that Crimson AI can produce without exposing a new Aegis UI button',async()=>{
  const registryJson=await readJson('data/registry.json');assert.ok(registryJson.definitions.includes('data/units/warder_ifv.json'));assert.ok(registryJson.weapons.includes('data/weapons/warder_30mm.json'));
  const factory=await readJson('data/buildings/vehicle_factory.json'),prod=factory.modules.find(m=>m.type==='Production');assert.ok(prod.buildable.includes('warder_ifv'));
  const commands=await readJson('data/commandsets/aegis_vehicle_factory.json');assert.ok(!commands.commands.some(c=>c.definition==='warder_ifv'));
  const mobile=await readJson('data/teams/crimson_assault_mobile.json'),armor=await readJson('data/teams/crimson_assault_armor.json');assert.ok(mobile.composition.some(c=>c.definition==='warder_ifv'));assert.ok(armor.composition.some(c=>c.definition==='warder_ifv'));
  const map=await readJson('maps/construction_validation.json');assert.ok(map.objects.some(o=>o.id==='e_warder'&&o.definition==='warder_ifv'&&o.owner==='enemy'));
});

test('enemy factory can authoritatively queue Warder through the existing production system',async()=>{
  const old=globalThis.fetch;globalThis.fetch=fileFetch;let registry;try{registry=await new DataRegistry().load('.');}finally{globalThis.fetch=old;}
  const map=validateMapManifest(await readJson('maps/construction_validation.json'));const sim=new Simulation({registry,map,commandBus:new CommandBus()});const result=sim.production.canQueue('e_factory','warder_ifv');assert.equal(result.ok,true,result.reason);
});
