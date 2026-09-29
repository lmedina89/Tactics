#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {DataRegistry} from '../engine/data/registry.js';
import {validateMapManifest} from '../engine/maps/map-manifest.js';
import {validateMapContent} from '../engine/content/content-validator.js';
import {moduleConfig} from '../engine/entities/game-object.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJSON=async rel=>JSON.parse(await fs.readFile(path.join(root,rel),'utf8'));
async function fileFetch(input){const rel=String(input).replace(/^\.\//,'');try{const data=await fs.readFile(path.join(root,rel));return new Response(data,{status:200,headers:{'content-type':'application/json'}});}catch{return new Response('',{status:404});}}
const issue=(severity,code,message,details={})=>({severity,code,message,...details});

async function main(){
  execFileSync(process.execPath,['tools/audit-assets.mjs'],{cwd:root,stdio:'ignore'});
  const old=globalThis.fetch;globalThis.fetch=fileFetch;let registry;try{registry=await new DataRegistry().load('.');}finally{globalThis.fetch=old;}
  const assetAudit=await readJSON('reports/asset-audit.json'),assetById=new Map(assetAudit.assets.map(a=>[a.id,a])),issues=[];

  for(const def of registry.definitions.values()){
    const meta=moduleConfig(def,'ContentMeta'),render=moduleConfig(def,'Render'),anim=moduleConfig(def,'ClientAnimation'),fp=moduleConfig(def,'Footprint'),prod=moduleConfig(def,'Production'),targetable=moduleConfig(def,'AITargetable');
    if(render?.asset){
      const asset=registry.asset(render.asset),audit=assetById.get(render.asset);
      if(!asset)issues.push(issue('ERROR','UNKNOWN_ASSET',`${def.id} references missing asset ${render.asset}`,{definitionId:def.id}));
      else{
        try{await fs.access(path.join(root,asset.path));}catch{issues.push(issue('ERROR','MISSING_ASSET_FILE',`${def.id} asset file does not exist: ${asset.path}`,{definitionId:def.id,assetId:render.asset}));}
        if(!audit)issues.push(issue('ERROR','UNAUDITED_ASSET',`${def.id} asset ${render.asset} is missing from GLB audit`,{definitionId:def.id,assetId:render.asset}));
      }
    }
    for(const [factionId,assetId] of Object.entries(render?.assetByFaction||{})){
      const asset=registry.asset(assetId),audit=assetById.get(assetId);
      if(!asset)issues.push(issue('ERROR','UNKNOWN_FACTION_ASSET',`${def.id} faction ${factionId} references missing asset ${assetId}`,{definitionId:def.id,factionId,assetId}));
      else{
        try{await fs.access(path.join(root,asset.path));}catch{issues.push(issue('ERROR','MISSING_FACTION_ASSET_FILE',`${def.id} faction ${factionId} asset file does not exist: ${asset.path}`,{definitionId:def.id,factionId,assetId}));}
        if(!audit)issues.push(issue('ERROR','UNAUDITED_FACTION_ASSET',`${def.id} faction ${factionId} asset ${assetId} is missing from GLB audit`,{definitionId:def.id,factionId,assetId}));
      }
    }
    if(anim&&render?.asset){
      const audit=assetById.get(render.asset);
      if(audit){
        const nodes=new Set(audit.nodes),clips=new Set(audit.animations);
        for(const c of anim.clips||[])if(!clips.has(c.clip))issues.push(issue('ERROR','MISSING_ANIMATION_CLIP',`${def.id} requests clip ${c.clip} not present in ${render.asset}`,{definitionId:def.id,assetId:render.asset}));
        for(const p of anim.procedural||[]){
          for(const n of p.nodes||[])if(!p.optional&&!nodes.has(n))issues.push(issue('ERROR','MISSING_ANIMATION_NODE',`${def.id} requests node ${n} not present in ${render.asset}`,{definitionId:def.id,assetId:render.asset}));
          for(const prefix of p.nodePrefixes||[])if(!p.optional&&!audit.nodes.some(n=>n.startsWith(prefix)))issues.push(issue('ERROR','MISSING_ANIMATION_PREFIX',`${def.id} prefix ${prefix} matches no nodes in ${render.asset}`,{definitionId:def.id,assetId:render.asset}));
        }
      }
      const routed=[render.asset,...Object.values(render.assetByFaction||{})].map(id=>assetById.get(id)).filter(Boolean);
      for(const p of anim.procedural||[]){
        if(!p.optional)continue;
        for(const n of p.nodes||[])if(!routed.some(a=>a.nodes.includes(n)))issues.push(issue('ERROR','UNBOUND_OPTIONAL_ANIMATION_NODE',`${def.id} optional animation node ${n} is absent from all routed assets`,{definitionId:def.id,node:n}));
        for(const prefix of p.nodePrefixes||[])if(!routed.some(a=>a.nodes.some(n=>n.startsWith(prefix))))issues.push(issue('ERROR','UNBOUND_OPTIONAL_ANIMATION_PREFIX',`${def.id} optional animation prefix ${prefix} matches no routed asset`,{definitionId:def.id,prefix}));
      }
    }
    if(prod&&fp){const half=Math.max(fp.width,fp.depth)/2;if((prod.exitDistance??0)<=half)issues.push(issue('ERROR','FACTORY_EXIT_INSIDE_FOOTPRINT',`${def.id} exitDistance ${prod.exitDistance??0} does not clear footprint half extent ${half}`,{definitionId:def.id}));if((prod.rallyDistance??0)<=(prod.exitDistance??0))issues.push(issue('ERROR','FACTORY_RALLY_BEFORE_EXIT',`${def.id} rallyDistance must exceed exitDistance`,{definitionId:def.id}));}
    if(meta?.affiliation==='FACTION'&&['vehicle','infantry','aircraft','building'].includes(def.kind)&&meta.validationOnly!==true&&!targetable)issues.push(issue('WARNING','NO_AI_CATEGORIES',`${def.id} has FACTION content but no AITargetable categories`,{definitionId:def.id}));
    if(render?.asset){const a=assetById.get(render.asset);if(a?.bounds?.size?.some(v=>v<=0||v>250))issues.push(issue('WARNING','SUSPICIOUS_VISUAL_BOUNDS',`${def.id}/${render.asset} has suspicious visual bounds`,{definitionId:def.id,assetId:render.asset,bounds:a.bounds.size}));}
  }

  const mapFiles=(await fs.readdir(path.join(root,'maps'))).filter(x=>x.endsWith('.json')).sort();
  for(const name of mapFiles){const rel=`maps/${name}`;let map;try{map=validateMapManifest(await readJSON(rel));}catch(e){issues.push(issue('ERROR','INVALID_MAP_MANIFEST',`${rel}: ${e.message}`,{map:rel}));continue;}const report=validateMapContent(map,registry);for(const e of report.errors)issues.push(issue('ERROR',e.code,`${rel}: ${e.message}`,{map:rel,...e}));for(const w of report.warnings)issues.push(issue('WARNING',w.code,`${rel}: ${w.message}`,{map:rel,...w}));const hw=map.size.width/2,hd=map.size.depth/2;for(const o of map.objects||[])if(Math.abs(o.x)>hw||Math.abs(o.z)>hd)issues.push(issue('ERROR','OBJECT_OUT_OF_BOUNDS',`${rel}: ${o.id} lies outside map bounds`,{map:rel,objectId:o.id}));}

  const errors=issues.filter(x=>x.severity==='ERROR'),warnings=issues.filter(x=>x.severity==='WARNING'),report={formatVersion:1,contractVersion:registry.contentContract?.version??null,definitions:registry.definitions.size,assets:registry.assets.size,contentPacks:registry.contentPacks.size,contentTemplates:registry.contentTemplates.size,maps:mapFiles.length,errorCount:errors.length,warningCount:warnings.length,issues};await fs.writeFile(path.join(root,'reports/content-validation.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Content validation: ${errors.length} errors, ${warnings.length} warnings · ${registry.definitions.size} definitions · ${registry.assets.size} assets · ${mapFiles.length} maps`);for(const x of issues)console.log(`${x.severity}: ${x.code}: ${x.message}`);if(errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
