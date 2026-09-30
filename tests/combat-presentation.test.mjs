import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SUPPORTED_AUDIO_PRESETS} from '../renderer/combat-audio-system.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=async rel=>JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));

test('combat presentation covers every registered weapon with sane client-only settings',async()=>{
  const reg=await readJson('data/registry.json'),fx=await readJson('data/presentation/combat.json'),supported=new Set(SUPPORTED_AUDIO_PRESETS);
  assert.equal(fx.version,1);assert.ok(fx.defaults?.muzzle&&fx.defaults?.projectile&&fx.defaults?.impact&&fx.defaults?.audio);
  for(const rel of reg.weapons){const weapon=await readJson(rel),p=fx.weapons?.[weapon.id];assert.ok(p,`${weapon.id}: missing combat presentation profile`);const a={...fx.defaults.audio,...p.audio};for(const k of ['firePreset','impactPreset','destroyPreset'])if(a[k])assert.ok(supported.has(a[k]),`${weapon.id}: unsupported ${k} ${a[k]}`);for(const k of ['fireGain','impactGain','destroyGain','maxDistance'])if(a[k]!=null)assert.ok(a[k]>=0,`${weapon.id}: ${k} must be >= 0`);const proj={...fx.defaults.projectile,...p.projectile};assert.ok(proj.coreRadius>0&&proj.trailLength>=0&&proj.trailRadius>=0,`${weapon.id}: invalid projectile presentation`);}
});

test('combat presentation remains outside authoritative simulation source',async()=>{
  const renderer=await fs.readFile(path.join(root,'renderer/three-renderer.js'),'utf8'),fx=await fs.readFile(path.join(root,'renderer/combat-fx-system.js'),'utf8');
  assert.match(renderer,/CombatFxSystem/);assert.match(renderer,/CombatAudioSystem/);assert.match(fx,/DESTROYED/);assert.match(fx,/PROJECTILE_IMPACT/);assert.match(fx,/HITSCAN/);assert.match(fx,/PROJECTILE_FIRED/);
  const weaponSystem=await fs.readFile(path.join(root,'engine/combat/weapon-system.js'),'utf8');assert.equal(/CombatFxSystem|CombatAudioSystem|AudioContext/.test(weaponSystem),false);
});

test('audio module is import-safe outside the browser and exposes all required presets',()=>{
  for(const id of ['rifle','hmg','autocannon','cannon','artillery','impact_light','impact_medium','impact_heavy','destroy'])assert.ok(SUPPORTED_AUDIO_PRESETS.includes(id));
});
