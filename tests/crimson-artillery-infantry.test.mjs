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
function mod(def,type){return def.modules.find(m=>m.type===type);}

test('accepted Crimson artillery and infantry assets are registered with authored materials',async()=>{
  const cat=await readJson('data/asset-catalog.json');assert.equal(cat.version,'0.6.6.8');
  for(const id of ['crimson_anvil_spg','crimson_praetorian_exosuit','crimson_line_trooper']){assert.ok(cat.assets[id]);await fs.access(path.join(root,cat.assets[id].path));}
  const rifle=await readJson('data/units/rifleman.json'),r=mod(rifle,'Render');
  assert.equal(r.asset,'aegis_rifleman');assert.equal(r.assetByFaction.crimson,'crimson_line_trooper');assert.equal(r.factionColorModeByFaction.crimson,'AUTHORED');
  const p=await readJson('data/units/praetorian_exosuit.json'),a=await readJson('data/units/anvil_spg.json');
  assert.equal(mod(p,'Render').factionColorMode,'AUTHORED');assert.equal(mod(a,'Render').factionColorMode,'AUTHORED');
});

test('Crimson infantry and Anvil GLBs expose their runtime articulation roots and sockets',async()=>{
  const cat=await readJson('data/asset-catalog.json');
  const expected={
    crimson_line_trooper:['RiflemanRoot','HeadRoot','ShoulderRoot_L','ElbowRoot_L','HipRoot_L','KneeRoot_L','AnkleRoot_L','WeaponRoot','MuzzleSocket'],
    crimson_praetorian_exosuit:['RiflemanRoot','HeadRoot','ShoulderRoot_L','ElbowRoot_L','HipRoot_L','KneeRoot_L','AnkleRoot_L','WeaponRoot','MuzzleSocket'],
    crimson_anvil_spg:['VehicleRoot','TurretRoot','GunPitchRoot','BarrelRecoilRoot','MuzzleSocket','StabilizerFLSwingRoot','StabilizerFRSwingRoot','StabilizerRLSwingRoot','StabilizerRRSwingRoot']
  };
  for(const [id,names] of Object.entries(expected)){const g=glbJSON(await fs.readFile(path.join(root,cat.assets[id].path))),set=new Set((g.nodes||[]).map(n=>n.name));for(const name of names)assert.ok(set.has(name),`${id} missing ${name}`);}
});

test('Line Trooper integrated copy is rotated to the shared Rifleman forward convention',async()=>{
  const cat=await readJson('data/asset-catalog.json'),g=glbJSON(await fs.readFile(path.join(root,cat.assets.crimson_line_trooper.path)));
  const rootNode=(g.nodes||[]).find(n=>n.name==='RiflemanRoot');assert.ok(rootNode?.rotation);const q=rootNode.rotation;
  assert.ok(Math.abs(q[1]+Math.SQRT1_2)<1e-5);assert.ok(Math.abs(q[3]-Math.SQRT1_2)<1e-5);
});

test('Praetorian and Anvil are data-defined producible units without new Aegis UI buttons',async()=>{
  const registry=await readJson('data/registry.json');
  assert.ok(registry.definitions.includes('data/units/praetorian_exosuit.json'));assert.ok(registry.definitions.includes('data/units/anvil_spg.json'));
  assert.ok(registry.weapons.includes('data/weapons/praetorian_heavy_rifle.json'));assert.ok(registry.weapons.includes('data/weapons/anvil_155mm.json'));
  const barr=await readJson('data/buildings/barracks.json'),fac=await readJson('data/buildings/vehicle_factory.json');
  assert.ok(mod(barr,'Production').buildable.includes('praetorian_exosuit'));assert.ok(mod(fac,'Production').buildable.includes('anvil_spg'));
  const bc=await readJson('data/commandsets/aegis_barracks.json'),fc=await readJson('data/commandsets/aegis_vehicle_factory.json');
  assert.ok(!bc.commands.some(c=>c.definition==='praetorian_exosuit'));assert.ok(!fc.commands.some(c=>c.definition==='anvil_spg'));
});

test('new Crimson roles have distinct gameplay stats and AI integration',async()=>{
  const rifle=await readJson('data/units/rifleman.json'),p=await readJson('data/units/praetorian_exosuit.json'),a=await readJson('data/units/anvil_spg.json');
  assert.ok(mod(p,'Body').maxHealth>mod(rifle,'Body').maxHealth);assert.equal(mod(p,'ArmorSet').armor,'heavy_infantry');
  const w=await readJson('data/weapons/anvil_155mm.json'),tank=await readJson('data/weapons/aegis_120mm.json');assert.ok(w.range>tank.range);assert.ok(w.minimumRange>=15);
  const mobile=await readJson('data/teams/crimson_assault_mobile.json'),armor=await readJson('data/teams/crimson_assault_armor.json');
  assert.ok(mobile.composition.some(c=>c.definition==='praetorian_exosuit'));assert.ok(armor.composition.some(c=>c.definition==='anvil_spg'));
});

test('enemy production authoritatively queues Praetorian and Anvil through existing systems',async()=>{
  const old=globalThis.fetch;globalThis.fetch=fileFetch;let registry;try{registry=await new DataRegistry().load('.');}finally{globalThis.fetch=old;}
  const map=validateMapManifest(await readJson('maps/construction_validation.json'));const sim=new Simulation({registry,map,commandBus:new CommandBus()});
  assert.equal(sim.production.canQueue('e_barracks','praetorian_exosuit').ok,true);
  assert.equal(sim.production.canQueue('e_factory','anvil_spg').ok,true);
  assert.ok(sim.entities.get('e_rifle'));assert.ok(sim.entities.get('e_praetorian'));assert.ok(sim.entities.get('e_anvil'));
});
