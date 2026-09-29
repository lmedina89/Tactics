import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

async function readJson(rel){return JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));}
async function glbJson(rel){
  const b=await fs.readFile(path.join(root,rel));assert.equal(b.toString('ascii',0,4),'glTF',`${rel} is not GLB`);let off=12;
  while(off<b.length){const len=b.readUInt32LE(off),type=b.readUInt32LE(off+4);off+=8;if(type===0x4e4f534a)return JSON.parse(b.subarray(off,off+len).toString('utf8').replace(/\0+$/,''));off+=len;}
  throw new Error(`${rel} missing GLB JSON chunk`);
}

const drivers=new Set(['WHEEL_SPIN','STEERING','CONTINUOUS_SPIN','STATE_SPIN','OSCILLATE','GROUP_SPIN','TRIGGER_TRANSLATE']);
const axes=new Set(['x','y','z']);

test('all data-driven client animation bindings resolve to real GLB clips/nodes',async()=>{
  const catalog=await readJson('data/asset-catalog.json');
  const dirs=['data/units','data/buildings'];
  for(const dir of dirs){
    const files=(await fs.readdir(path.join(root,dir))).filter(f=>f.endsWith('.json'));
    for(const file of files){
      const def=await readJson(`${dir}/${file}`),mods=def.modules||[],render=mods.find(m=>m.type==='Render'),anim=mods.find(m=>m.type==='ClientAnimation');if(!anim)continue;
      assert.ok(render?.asset,`${def.id}: ClientAnimation requires Render asset`);const asset=catalog.assets[render.asset];assert.ok(asset,`${def.id}: missing asset ${render.asset}`);
      const g=await glbJson(asset.path),nodes=new Set((g.nodes||[]).map(n=>n.name).filter(Boolean)),clips=new Set((g.animations||[]).map(a=>a.name).filter(Boolean));
      const routedNodeSets=[nodes];for(const assetId of Object.values(render.assetByFaction||{})){const routed=catalog.assets[assetId];assert.ok(routed,`${def.id}: missing faction-routed asset ${assetId}`);const rg=await glbJson(routed.path);routedNodeSets.push(new Set((rg.nodes||[]).map(n=>n.name).filter(Boolean)));}
      for(const c of anim.clips||[])assert.ok(clips.has(c.clip),`${def.id}: missing clip ${c.clip}`);
      for(const p of anim.procedural||[]){
        assert.ok(drivers.has(p.driver),`${def.id}: unsupported client animation driver ${p.driver}`);assert.ok(axes.has(p.axis||'y'),`${def.id}: invalid axis ${p.axis}`);
        for(const n of p.nodes||[]){if(p.optional)assert.ok(routedNodeSets.some(set=>set.has(n)),`${def.id}: optional animation node ${n} missing from all routed assets`);else assert.ok(nodes.has(n),`${def.id}: missing animation node ${n}`);}
        if(p.pivotNode)assert.ok(nodes.has(p.pivotNode),`${def.id}: missing pivot node ${p.pivotNode}`);
        if(p.parentNode)assert.ok(nodes.has(p.parentNode),`${def.id}: missing parent node ${p.parentNode}`);
        for(const prefix of p.nodePrefixes||[])assert.ok([...nodes].some(n=>n.startsWith(prefix)),`${def.id}: no nodes match prefix ${prefix}`);
      }
    }
  }
});

test('rifleman exposes both authored embedded clips',async()=>{
  const g=await glbJson('assets/infantry/aegis_rifleman_v03.glb'),clips=new Set((g.animations||[]).map(a=>a.name));assert.ok(clips.has('CombatWalk'));assert.ok(clips.has('AimFire'));
});

test('client animation runtime stays generic and does not branch on concrete ForgeRTS object names',async()=>{
  const s=await fs.readFile(path.join(root,'renderer/client-animation-system.js'),'utf8');assert.equal(/aegis_x|hmmwv50|rifleman|harvester|power_node|barracks|refinery/i.test(s),false);
});

test('production/reference GLB audit accounts for every embedded animation clip',async()=>{
  const catalog=await readJson('data/asset-catalog.json');
  const found={};
  for(const [assetId,asset] of Object.entries(catalog.assets)){
    const g=await glbJson(asset.path),names=(g.animations||[]).map(a=>a.name||'').filter(Boolean);
    if(names.length)found[assetId]=names;
  }
  assert.deepEqual(found,{
    aegis_rifleman:['CombatWalk','AimFire'],
    legacy_btr82:['Btr anima']
  });
});
