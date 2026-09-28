import {moduleConfig} from '../entities/game-object.js';

export const CONTENT_CONTRACT_VERSION=1;

export const CONTENT_AFFILIATIONS=Object.freeze(['FACTION','CIVILIAN','NEUTRAL','WORLD']);
export const CONTENT_CATEGORIES=Object.freeze([
  'MILITARY','CIVILIAN','NEUTRAL','WORLD',
  'BUILDING','UNIT','INFANTRY','VEHICLE','AIRCRAFT','RESOURCE','PROP','DECORATION',
  'COMMAND','PRODUCTION','ECONOMY','POWER','DEFENSE','SUPPORT','INDUSTRIAL',
  'RESIDENTIAL','COMMERCIAL','WALL','GATE','ROAD','FOLIAGE','RUIN','LANDMARK'
]);
export const WALL_ROLES=Object.freeze(['SEGMENT','GATE','CORNER','ENDCAP']);

const allowedKinds=new Set(['building','vehicle','infantry','aircraft','resource','prop']);

function requirePositive(v,label,source){if(!(Number.isFinite(v)&&v>0))throw new Error(`${source}: ${label} must be > 0`);}
function requireString(v,label,source){if(typeof v!=='string'||!v.trim())throw new Error(`${source}: ${label} must be a nonempty string`);}

export function contentMetaOf(def){return moduleConfig(def,'ContentMeta');}

export function validateContentTemplate(value,source='content-template'){
  if(!value?.id)throw new Error(`${source}: content template missing id`);
  if((value.contractVersion??0)!==CONTENT_CONTRACT_VERSION)throw new Error(`${source}: unsupported contractVersion ${value.contractVersion}`);
  if(value.kind&&!allowedKinds.has(value.kind))throw new Error(`${source}: invalid kind ${value.kind}`);
  for(const key of ['requiredModules','recommendedModules','categories'])if(value[key]!=null&&!Array.isArray(value[key]))throw new Error(`${source}: ${key} must be an array`);
  for(const c of value.categories??[])if(!CONTENT_CATEGORIES.includes(c))throw new Error(`${source}: unknown content category ${c}`);
  if(value.affiliation&&!CONTENT_AFFILIATIONS.includes(value.affiliation))throw new Error(`${source}: invalid affiliation ${value.affiliation}`);
  return true;
}

export function validateContentPack(value,source='content-pack'){
  if(!value?.id)throw new Error(`${source}: content pack missing id`);
  if((value.formatVersion??0)!==1)throw new Error(`${source}: unsupported formatVersion ${value.formatVersion}`);
  if(value.contractVersion!=null&&value.contractVersion!==CONTENT_CONTRACT_VERSION)throw new Error(`${source}: unsupported contractVersion ${value.contractVersion}`);
  for(const key of ['assetCatalogs','factions','locomotors','definitions','interactions','armors','weapons','commandSets','targetPrioritySets','teamPrototypes','aiProfiles']){
    if(value[key]!=null&&!Array.isArray(value[key]))throw new Error(`${source}: ${key} must be an array`);
  }
  return true;
}

export function validateDefinitionContent(def,source='definition'){
  if(!def?.id)throw new Error(`${source}: definition missing id`);
  if(!allowedKinds.has(def.kind))throw new Error(`${source}: unsupported GameObject kind ${def.kind}`);
  const meta=contentMetaOf(def);
  if(!meta)throw new Error(`${source}: missing ContentMeta module`);
  if((meta.contractVersion??CONTENT_CONTRACT_VERSION)!==CONTENT_CONTRACT_VERSION)throw new Error(`${source}: ContentMeta contractVersion must be ${CONTENT_CONTRACT_VERSION}`);
  if(!CONTENT_AFFILIATIONS.includes(meta.affiliation))throw new Error(`${source}: invalid ContentMeta affiliation ${meta.affiliation}`);
  if(!Array.isArray(meta.categories)||!meta.categories.length)throw new Error(`${source}: ContentMeta.categories must not be empty`);
  for(const c of meta.categories)if(!CONTENT_CATEGORIES.includes(c))throw new Error(`${source}: unknown ContentMeta category ${c}`);
  if(meta.editorGroup!=null)requireString(meta.editorGroup,'ContentMeta.editorGroup',source);
  if(meta.tags!=null){if(!Array.isArray(meta.tags))throw new Error(`${source}: ContentMeta.tags must be an array`);for(const tag of meta.tags)requireString(tag,'ContentMeta tag',source);}

  const footprint=moduleConfig(def,'Footprint'),geometry=moduleConfig(def,'Geometry'),loco=moduleConfig(def,'Locomotor');
  const categories=new Set(meta.categories);
  if(def.kind==='building'&&!footprint)throw new Error(`${source}: building content requires Footprint`);
  if(['building','vehicle','infantry','aircraft'].includes(def.kind)&&!geometry)throw new Error(`${source}: ${def.kind} content requires Geometry`);
  if(['vehicle','infantry','aircraft'].includes(def.kind)&&!loco)throw new Error(`${source}: mobile ${def.kind} content requires Locomotor`);
  if(categories.has('WALL')||categories.has('GATE')){
    const wall=moduleConfig(def,'WallConnection');if(!wall)throw new Error(`${source}: WALL/GATE content requires WallConnection`);
    if(!WALL_ROLES.includes(wall.role))throw new Error(`${source}: invalid WallConnection role ${wall.role}`);
    requireString(wall.connectionGroup,'WallConnection.connectionGroup',source);
    requirePositive(wall.snapDistance??1,'WallConnection.snapDistance',source);
    if(!Array.isArray(wall.sockets)||wall.sockets.length<1)throw new Error(`${source}: WallConnection.sockets must not be empty`);
    const socketIds=new Set();
    for(const socket of wall.sockets){requireString(socket.id,'WallConnection socket id',source);if(socketIds.has(socket.id))throw new Error(`${source}: duplicate WallConnection socket ${socket.id}`);socketIds.add(socket.id);if(!Number.isFinite(socket.x)||!Number.isFinite(socket.z))throw new Error(`${source}: WallConnection socket ${socket.id} requires numeric x/z`);if(socket.facing!=null&&!Number.isFinite(socket.facing))throw new Error(`${source}: WallConnection socket ${socket.id} facing must be numeric`);}
  }
  if(categories.has('GATE')&&moduleConfig(def,'WallConnection')?.role!=='GATE')throw new Error(`${source}: GATE category requires WallConnection.role GATE`);
  if(categories.has('CIVILIAN')&&meta.affiliation!=='CIVILIAN')throw new Error(`${source}: CIVILIAN category requires CIVILIAN affiliation`);
  if(categories.has('NEUTRAL')&&meta.affiliation!=='NEUTRAL')throw new Error(`${source}: NEUTRAL category requires NEUTRAL affiliation`);
  if(categories.has('WORLD')&&meta.affiliation!=='WORLD')throw new Error(`${source}: WORLD category requires WORLD affiliation`);
  return true;
}
