import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {DataRegistry} from '../engine/data/registry.js';
import {validateContentPack,validateContentTemplate,validateDefinitionContent,contentMetaOf} from '../engine/content/content-contract.js';
import {validateMapContent} from '../engine/content/content-validator.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
import {Simulation} from '../engine/sim/simulation.js';
import {CommandBus} from '../engine/commands/command-bus.js';
import {moduleConfig} from '../engine/entities/game-object.js';
import {findBestWallSnap} from '../engine/content/wall-connection.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async rel=>JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));
async function withFileFetch(fn){
  const old=globalThis.fetch;
  globalThis.fetch=async input=>{const rel=String(input).replace(/^\.\//,'');try{const data=await fs.readFile(path.join(root,rel));return new Response(data,{status:200,headers:{'content-type':'application/json'}});}catch{return new Response('',{status:404});}};
  try{return await fn();}finally{globalThis.fetch=old;}
}
async function productionRegistry(){return withFileFetch(()=>new DataRegistry().load('.'));}

test('v0.6.5 content contract and authoring templates validate as stable data',async()=>{
  const contract=await read('data/content-contract.json');assert.equal(contract.version,1);assert.equal(contract.worldForgeExport.runtimeDependency,false);
  const manifest=await read('data/registry.json');assert.ok(manifest.contentTemplates.length>=8);assert.ok(manifest.contentPacks.length>=1);
  for(const rel of manifest.contentTemplates)assert.equal(validateContentTemplate(await read(rel),rel),true);
  for(const rel of manifest.contentPacks)assert.equal(validateContentPack(await read(rel),rel),true);
});

test('every registered production definition carries explicit ContentMeta and validates independently of GLB visuals',async()=>{
  const manifest=await read('data/registry.json');
  for(const rel of manifest.definitions){const def=await read(rel);assert.equal(validateDefinitionContent(def,rel),true);const meta=contentMetaOf(def);assert.ok(meta.categories.length);if(def.kind==='building'){assert.ok(moduleConfig(def,'Footprint'));assert.ok(moduleConfig(def,'Geometry'));}}
});

test('DataRegistry batch-loads content-pack definitions without engine or root definition-list edits',async()=>{
  const manifest=await read('data/registry.json');assert.equal(manifest.definitions.some(x=>x.includes('civilian_structure_shell')),false);
  const registry=await productionRegistry();assert.equal(registry.contentContract.version,1);assert.equal(registry.contentPacks.has('foundation_validation'),true);assert.equal(registry.contentTemplates.has('civilian_building'),true);assert.ok(registry.definition('civilian_structure_shell'));assert.ok(registry.definition('neutral_wall_segment'));assert.ok(registry.definition('neutral_gate_segment'));assert.ok(registry.definitionsForCategory('WALL').some(d=>d.id==='neutral_wall_segment'));assert.ok(registry.definitionsForAffiliation('CIVILIAN').some(d=>d.id==='civilian_structure_shell'));
});

test('wall and gate content uses generic connection-group/socket metadata',async()=>{
  const registry=await productionRegistry();const wall=moduleConfig(registry.definition('neutral_wall_segment'),'WallConnection'),gate=moduleConfig(registry.definition('neutral_gate_segment'),'WallConnection');
  assert.equal(wall.role,'SEGMENT');assert.equal(gate.role,'GATE');assert.equal(wall.connectionGroup,gate.connectionGroup);assert.equal(wall.sockets.length,2);assert.equal(gate.sockets.length,2);
});



test('wall socket metadata can deterministically snap a future segment/gate without concrete wall IDs',async()=>{
  const registry=await productionRegistry(),wall=registry.definition('neutral_wall_segment'),gate=registry.definition('neutral_gate_segment');
  const snap=findBestWallSnap({movingDef:wall,movingPose:{x:0,z:8.8,yaw:0},targetDef:gate,targetPose:{x:0,z:0,yaw:0},maxDistance:3});assert.ok(snap);assert.equal(snap.targetSocketId,'B');assert.equal(snap.movingSocketId,'A');assert.ok(Math.abs(snap.pose.x)<1e-9);assert.ok(Math.abs(snap.pose.z-10)<1e-9);
});
test('headless content-validation map loads ownerless CIVILIAN/NEUTRAL objects as authoritative GameObjects',async()=>{
  const registry=await productionRegistry(),map=validateMapManifest(await read('maps/content_validation.json')),report=validateMapContent(map,registry,{strict:true});assert.equal(report.ok,true);assert.equal(report.errors.length,0);
  const sim=new Simulation({registry,map,commandBus:new CommandBus()});assert.equal(sim.entities.get('civ_house_a').affiliation,'CIVILIAN');assert.ok(sim.entities.get('civ_house_a').contentCategories.includes('RESIDENTIAL'));assert.equal(sim.entities.get('gate_a').affiliation,'NEUTRAL');assert.ok(sim.entities.get('gate_a').contentCategories.includes('GATE'));assert.equal(sim.players.size,0);
});

test('asset ingestion audit inventories every current GLB and never converts visual bounds into hidden gameplay state',async()=>{
  execFileSync(process.execPath,['tools/audit-assets.mjs'],{cwd:root,stdio:'pipe'});const report=await read('reports/asset-audit.json'),catalog=await read('data/asset-catalog.json');assert.equal(report.assetCount,Object.keys(catalog.assets).length);
  const rifle=report.assets.find(a=>a.id==='aegis_rifleman');assert.deepEqual(rifle.animations,['CombatWalk','AimFire']);assert.ok(rifle.bounds.size.every(v=>v>0));assert.match(rifle.suggestedGeometry.note,/Visual-bounds suggestion only/);
});
