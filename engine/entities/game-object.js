import {createUnitAIState} from '../ai/unit-ai-update.js';

const clone=v=>structuredClone(v);
const moduleCache=new WeakMap();

function normalizeModule(entry){
  if(typeof entry==='string')return {type:entry};
  if(!entry||typeof entry!=='object'||!entry.type)throw new Error('Invalid GameObject module binding');
  return clone(entry);
}

export function moduleBindings(definition){
  if(definition&&typeof definition==='object'&&moduleCache.has(definition))return moduleCache.get(definition);
  const list=(definition?.modules||[]).map(normalizeModule);
  const byType=new Map();
  for(const m of list){
    if(byType.has(m.type))throw new Error(`Duplicate module ${m.type} on ${definition?.id||'unknown definition'}`);
    byType.set(m.type,m);
  }

  // Transitional compatibility for v0.2-era definitions. Production data uses explicit modules.
  if(definition?.maxHealth!=null&&!byType.has('Body'))byType.set('Body',{type:'Body',maxHealth:definition.maxHealth});
  if(definition?.selectable!=null&&!byType.has('Selectable'))byType.set('Selectable',{type:'Selectable',enabled:!!definition.selectable});
  if(definition?.locomotor){const m=byType.get('Locomotor');if(m&&!m.locomotor)m.locomotor=definition.locomotor;else if(!m)byType.set('Locomotor',{type:'Locomotor',locomotor:definition.locomotor});}
  if(definition?.asset&&!byType.has('Render'))byType.set('Render',{type:'Render',asset:definition.asset,scale:definition.model?.scale??1,headingOffset:definition.model?.headingOffset??0});
  if(definition?.footprint&&!byType.has('Footprint'))byType.set('Footprint',{type:'Footprint',...clone(definition.footprint)});
  if(definition?.capacity!=null&&!byType.has('Resource'))byType.set('Resource',{type:'Resource',capacity:definition.capacity,resourceType:definition.resourceType||'generic'});
  if(definition&&typeof definition==='object')moduleCache.set(definition,byType);
  return byType;
}

export function moduleConfig(definition,type){return moduleBindings(definition).get(type)||null;}
export function hasModule(definition,type){return moduleBindings(definition).has(type);}
export function footprintOf(definition){const f=moduleConfig(definition,'Footprint');return f?{width:f.width,depth:f.depth}:null;}
export function renderConfigOf(definition){return moduleConfig(definition,'Render');}

export function createGameObjectRuntime({definition,spawn,player,registry,terrain}){
  const modules=moduleBindings(definition);
  const contentMeta=modules.get('ContentMeta');
  const body=modules.get('Body');
  const selectable=modules.get('Selectable');
  const locoBinding=modules.get('Locomotor');
  const resource=modules.get('Resource');
  const armor=modules.get('ArmorSet');
  const weaponSet=modules.get('WeaponSet');
  const turretAI=modules.get('TurretAI');
  const collector=modules.get('ResourceCollector');
  const production=modules.get('Production');
  const loco=locoBinding?registry.locomotor(locoBinding.locomotor):null;
  if(locoBinding&&!loco)throw new Error(`Unknown locomotor ${locoBinding.locomotor} on ${definition.id}`);
  const ground=terrain.heightAt(spawn.x,spawn.z);
  const y=loco?.kind==='air'?ground+(loco.preferredHeight??18):ground;
  const runtimeModules=Object.fromEntries([...modules].map(([type,cfg])=>[type,clone(cfg)]));

  return {
    id:spawn.id,
    definitionId:definition.id,
    playerId:spawn.owner??null,
    teamId:spawn.teamId??null,
    factionId:player?.factionId??null,
    affiliation:spawn.affiliation??contentMeta?.affiliation??(spawn.owner?'FACTION':'WORLD'),
    contentCategories:[...(contentMeta?.categories||[])],
    kind:definition.kind,
    x:spawn.x,z:spawn.z,y,yaw:spawn.yaw||0,speed:0,angularSpeed:0,steeringAngle:0,movingBackward:false,
    locomotionState:{mode:'FORWARD',modeTime:0,cooldown:0,reverseStartX:spawn.x,reverseStartZ:spawn.z,turnSign:1},
    health:body?.maxHealth??1,maxHealth:body?.maxHealth??1,alive:true,operational:spawn.construction?false:true,construction:spawn.construction?clone(spawn.construction):null,damageState:'PRISTINE',destroyedTick:null,lastDamagedBy:null,lastDamagedTick:null,
    selectable:selectable?.enabled??false,
    locomotorId:locoBinding?.locomotor??null,
    armorId:armor?.armor??null,
    radius:loco?.radius??0,
    ai:modules.has('UnitAIUpdate')?createUnitAIState(modules.get('UnitAIUpdate')):null,
    weaponSlots:weaponSet?{slots:(weaponSet.slots||[]).map(s=>({slot:s.slot||'PRIMARY',weaponId:s.weapon,ammoInClip:null,nextFireTick:0,reloadUntilTick:0,prefireUntilTick:0,targetId:null}))}:null,
    turretYaw:turretAI?(spawn.yaw||0):null,turretAngularSpeed:0,
    combat:{manualTargetId:null,autoTargetId:null,activeTargetId:null,nextScanTick:0},
    resourceRemaining:spawn.resourceRemaining??resource?.capacity??null,initialResourceCapacity:spawn.resourceRemaining??resource?.capacity??null,
    collector:collector?{state:'IDLE',cargo:0,cargoCapacity:collector.cargoCapacity??0,targetResourceId:null,resumeResourceId:null,targetRefineryId:null,sessionId:null,exitPoint:null,harvestApproach:null,approachResourceId:null,nextApproachRetryTick:0}:null,
    production:production?{queue:[],rallyPoint:null}:null,productionExit:null,
    modules:runtimeModules
  };
}
