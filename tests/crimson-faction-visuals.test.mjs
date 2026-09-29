import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=async rel=>JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));

test('Crimson infantry and vehicle production use faction-specific canonical assets without duplicating gameplay roles',async()=>{
  const barracks=await readJson('data/buildings/barracks.json');
  const factory=await readJson('data/buildings/vehicle_factory.json');
  const br=barracks.modules.find(m=>m.type==='Render');
  const fr=factory.modules.find(m=>m.type==='Render');
  assert.equal(br.asset,'aegis_field_barracks');
  assert.equal(br.assetByFaction.crimson,'crimson_garrison_block');
  assert.equal(br.factionColorModeByFaction.crimson,'AUTHORED');
  assert.equal(fr.asset,'aegis_vehicle_factory');
  assert.equal(fr.assetByFaction.crimson,'crimson_war_factory');
  assert.equal(fr.factionColorModeByFaction.crimson,'AUTHORED');
});

test('Crimson AI keeps authoritative production-role definition IDs',async()=>{
  const ai=await readJson('data/ai/crimson_skirmish_basic.json');
  assert.deepEqual(ai.economy.buildList.map(x=>x.definition),['power_node','refinery','barracks','vehicle_factory','guardian_turret']);
});

test('renderer supports data-driven faction asset routing and authored color mode',async()=>{
  const src=await fs.readFile(path.join(root,'renderer/three-renderer.js'),'utf8');
  assert.match(src,/render\.assetByFaction\?\.\[faction\?\.id\]\|\|render\.asset/);
  assert.match(src,/factionColorModeByFaction\?\.\[faction\?\.id\]/);
  assert.match(src,/factionColorMode!==['"]AUTHORED['"]/);
});
