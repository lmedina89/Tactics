import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=async rel=>JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));

test('Crimson core structures use faction-specific canonical assets without duplicating gameplay roles',async()=>{
  const barracks=await readJson('data/buildings/barracks.json');
  const factory=await readJson('data/buildings/vehicle_factory.json');
  const power=await readJson('data/buildings/power_node.json');
  const refinery=await readJson('data/buildings/refinery.json');
  const turret=await readJson('data/buildings/guardian_turret.json');
  const br=barracks.modules.find(m=>m.type==='Render');
  const fr=factory.modules.find(m=>m.type==='Render');
  const pr=power.modules.find(m=>m.type==='Render');
  const rr=refinery.modules.find(m=>m.type==='Render');
  const tr=turret.modules.find(m=>m.type==='Render');
  assert.equal(br.asset,'aegis_field_barracks');
  assert.equal(br.assetByFaction.crimson,'crimson_garrison_block');
  assert.equal(br.factionColorModeByFaction.crimson,'AUTHORED');
  assert.equal(fr.asset,'aegis_vehicle_factory');
  assert.equal(fr.assetByFaction.crimson,'crimson_war_factory');
  assert.equal(fr.factionColorModeByFaction.crimson,'AUTHORED');
  assert.equal(pr.asset,'aegis_field_power_node');
  assert.equal(pr.assetByFaction.crimson,'crimson_thermal_plant');
  assert.equal(pr.factionColorModeByFaction.crimson,'AUTHORED');
  assert.equal(rr.asset,'aegis_field_refinery');
  assert.equal(rr.assetByFaction.crimson,'crimson_ore_works');
  assert.equal(rr.factionColorModeByFaction.crimson,'AUTHORED');
  assert.equal(tr.asset,'aegis_guardian_turret');
  assert.equal(tr.assetByFaction.crimson,'crimson_bastion_gun');
  assert.equal(tr.factionColorModeByFaction.crimson,'AUTHORED');
});

test('Crimson AI keeps authoritative production-role definition IDs',async()=>{
  const ai=await readJson('data/ai/crimson_skirmish_basic.json');
  assert.deepEqual(ai.economy.buildList.map(x=>x.definition),['power_node','refinery','barracks','vehicle_factory','guardian_turret']);
  const map=await readJson('maps/construction_validation.json');
  const enemy=map.players.find(p=>p.id==='enemy');assert.equal(enemy.faction,'crimson');
  const enemyDefs=new Set(map.objects.filter(o=>o.owner==='enemy').map(o=>o.definition));
  for(const id of ['power_node','refinery','barracks','vehicle_factory','guardian_turret'])assert.ok(enemyDefs.has(id),`enemy map is missing ${id}`);
});

test('renderer supports data-driven faction asset routing and authored color mode',async()=>{
  const src=await fs.readFile(path.join(root,'renderer/three-renderer.js'),'utf8');
  assert.match(src,/render\.assetByFaction\?\.\[faction\?\.id\]\|\|render\.asset/);
  assert.match(src,/factionColorModeByFaction\?\.\[faction\?\.id\]/);
  assert.match(src,/factionColorMode!==['"]AUTHORED['"]/);
});

test('Crimson Bastion recoil hierarchy is bound data-first without changing shared turret gameplay',async()=>{
  const catalog=await readJson('data/asset-catalog.json');
  const turret=await readJson('data/buildings/guardian_turret.json');
  const render=turret.modules.find(m=>m.type==='Render');
  const anim=turret.modules.find(m=>m.type==='ClientAnimation');
  assert.equal(render.turretNode,'TurretRoot');
  assert.equal(render.gunPitchNode,'GunPitchRoot');
  assert.equal(render.muzzleNode,'MuzzleSocket');
  const recoil=anim.procedural.find(p=>p.id==='barrel_recoil');
  assert.equal(recoil.driver,'TRIGGER_TRANSLATE');
  assert.equal(recoil.trigger,'WEAPON_FIRE');
  assert.deepEqual(recoil.nodes,['BarrelRecoilRoot']);
  assert.equal(recoil.distance,-0.30);
  const asset=catalog.assets.crimson_bastion_gun;
  const b=await fs.readFile(path.join(root,asset.path));let off=12,g=null;
  while(off<b.length){const len=b.readUInt32LE(off),type=b.readUInt32LE(off+4);off+=8;if(type===0x4e4f534a){g=JSON.parse(b.subarray(off,off+len).toString('utf8').replace(/\0+$/,''));break;}off+=len;}
  const nodes=new Map((g.nodes||[]).map((n,i)=>[n.name,{...n,index:i}]));
  assert.ok(nodes.has('TurretRoot'));assert.ok(nodes.has('GunPitchRoot'));assert.ok(nodes.has('BarrelRecoilRoot'));assert.ok(nodes.has('MuzzleSocket'));
  const gun=nodes.get('GunPitchRoot'),recoilNode=nodes.get('BarrelRecoilRoot'),muzzle=nodes.get('MuzzleSocket');
  assert.ok((gun.children||[]).includes(recoilNode.index));
  assert.ok((recoilNode.children||[]).includes(muzzle.index));
  const runtime=await fs.readFile(path.join(root,'renderer/client-animation-system.js'),'utf8');
  assert.match(runtime,/TRIGGER_TRANSLATE/);assert.match(runtime,/applyLocalTranslation/);
});
