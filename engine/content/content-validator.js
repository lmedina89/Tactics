import {moduleConfig} from '../entities/game-object.js';
import {contentMetaOf} from './content-contract.js';

export function validateMapContent(map,registry,{strict=false}={}){
  const errors=[],warnings=[];
  const push=(bucket,code,message,details={})=>bucket.push({code,message,...details});
  const all=[...(map.objects||[]),...(map.resourceFields||[]).map(r=>({...r,owner:null}))];
  for(const obj of all){
    const def=registry.definition?.(obj.definition);
    if(!def){push(errors,'UNKNOWN_DEFINITION',`Object ${obj.id} references unknown definition ${obj.definition}`,{objectId:obj.id,definitionId:obj.definition});continue;}
    const meta=contentMetaOf(def),render=moduleConfig(def,'Render'),geom=moduleConfig(def,'Geometry'),foot=moduleConfig(def,'Footprint');
    if(!meta)push(errors,'MISSING_CONTENT_META',`${def.id} has no ContentMeta`,{objectId:obj.id,definitionId:def.id});
    if(def.kind==='building'&&!foot)push(errors,'MISSING_FOOTPRINT',`${def.id} building lacks Footprint`,{objectId:obj.id,definitionId:def.id});
    if(['building','vehicle','infantry','aircraft'].includes(def.kind)&&!geom)push(errors,'MISSING_GEOMETRY',`${def.id} lacks Geometry`,{objectId:obj.id,definitionId:def.id});
    if(render?.asset&&typeof registry.asset==='function'&&!registry.asset(render.asset))push(errors,'UNKNOWN_ASSET',`${def.id} references unknown asset ${render.asset}`,{objectId:obj.id,definitionId:def.id});
    if(!render&&meta?.renderRequired!==false)push(warnings,'NO_RENDER',`${def.id} has no Render module; it will be headless/invisible`,{objectId:obj.id,definitionId:def.id});
    if(!obj.owner&&meta?.affiliation==='FACTION')push(warnings,'UNOWNED_FACTION_CONTENT',`${obj.id} uses FACTION content without an owner`,{objectId:obj.id,definitionId:def.id});
    if(obj.owner&&['CIVILIAN','NEUTRAL','WORLD'].includes(meta?.affiliation))push(warnings,'OWNED_NONFACTION_CONTENT',`${obj.id} owns ${meta.affiliation} content; relation semantics are deferred to PlayerRelationMap`,{objectId:obj.id,definitionId:def.id});
    const wall=moduleConfig(def,'WallConnection');if(wall){for(const socket of wall.sockets||[]){const d=Math.hypot(socket.x??0,socket.z??0);if(foot&&d>Math.hypot(foot.width,foot.depth))push(warnings,'WALL_SOCKET_FAR_FROM_FOOTPRINT',`${def.id} socket ${socket.id} is unusually far from its Footprint`,{objectId:obj.id,definitionId:def.id});}}
  }
  if(strict&&errors.length)throw new Error(`Content validation failed: ${errors.map(e=>e.message).join('; ')}`);
  return {ok:errors.length===0,errors,warnings};
}
