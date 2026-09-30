const CONDITION_TYPES=new Set(['TRUE','FALSE','FLAG_EQUALS','COUNTER_COMPARE','TIMER_EXPIRED','ENTITY_EXISTS','ENTITY_DESTROYED','TEAM_DESTROYED','ENTITY_ENTERED_AREA','PLAYER_ENTERED_AREA','TEAM_ENTERED_AREA','PLAYER_HAS_CREDITS','PLAYER_HAS_POWER','OBJECTIVE_STATE']);
const ACTION_TYPES=new Set(['SET_FLAG','SET_COUNTER','ADD_COUNTER','START_TIMER','ENABLE_SCRIPT','DISABLE_SCRIPT','ACTIVATE_OBJECTIVE','COMPLETE_OBJECTIVE','FAIL_OBJECTIVE','ISSUE_MOVE','ISSUE_ATTACK_MOVE','SET_RELATION','VICTORY','DEFEAT']);
const OBJECTIVE_STATES=new Set(['INACTIVE','ACTIVE','COMPLETED','FAILED']);
const RELATIONS=new Set(['ALLY','NEUTRAL','ENEMY']);
const clone=v=>structuredClone(v);

function walkCondition(node,fn){if(!node||typeof node!=='object')throw new Error('Mission condition must be an object');if(Array.isArray(node.all)){for(const c of node.all)walkCondition(c,fn);return;}if(Array.isArray(node.any)){for(const c of node.any)walkCondition(c,fn);return;}if(node.not){walkCondition(node.not,fn);return;}fn(node);}

export function validateMissionDefinition(raw,{map=null}={}){
  if(!raw||typeof raw!=='object')throw new Error('Mission definition must be an object');
  if((raw.missionVersion??0)!==1)throw new Error(`Unsupported missionVersion ${raw.missionVersion??0}`);
  if(!raw.id)throw new Error('Mission definition missing id');
  if(map&&raw.mapId&&raw.mapId!==map.id)throw new Error(`Mission ${raw.id} expects map ${raw.mapId}, got ${map.id}`);
  const mission=clone(raw);mission.name??=mission.id;mission.objectives??=[];mission.scripts??=[];mission.initialFlags??={};mission.initialCounters??={};mission.initialTimers??=[];
  const areaIds=new Set(map?.triggerAreas?.map(a=>a.id)||[]),playerIds=new Set(map?.players?.map(p=>p.id)||[]),waypointIds=new Set(map?.waypoints?.map(w=>w.id)||[]),entityIds=new Set([...(map?.objects||[]),...(map?.resourceFields||[])].map(e=>e.id));
  const objectiveIds=new Set();for(const o of mission.objectives){if(!o.id)throw new Error('Each mission objective needs id');if(objectiveIds.has(o.id))throw new Error(`Duplicate objective id ${o.id}`);objectiveIds.add(o.id);const st=o.initialState??'INACTIVE';if(!OBJECTIVE_STATES.has(st))throw new Error(`Objective ${o.id} has invalid initialState ${st}`);if(o.marker){if(o.marker.type!=='TRIGGER_AREA'&&o.marker.type!=='ENTITY'&&o.marker.type!=='WAYPOINT')throw new Error(`Objective ${o.id} has unsupported marker ${o.marker.type}`);if(o.marker.type==='TRIGGER_AREA'&&map&&!areaIds.has(o.marker.areaId))throw new Error(`Objective ${o.id} marker references unknown trigger area ${o.marker.areaId}`);if(o.marker.type==='ENTITY'&&map&&!entityIds.has(o.marker.entityId))throw new Error(`Objective ${o.id} marker references unknown entity ${o.marker.entityId}`);if(o.marker.type==='WAYPOINT'&&map&&!waypointIds.has(o.marker.waypointId))throw new Error(`Objective ${o.id} marker references unknown waypoint ${o.marker.waypointId}`);}}
  const scriptIds=new Set();for(const s of mission.scripts){if(!s.id)throw new Error('Each mission script needs id');if(scriptIds.has(s.id))throw new Error(`Duplicate script id ${s.id}`);scriptIds.add(s.id);if(!s.condition)throw new Error(`Script ${s.id} missing condition`);}
  for(const s of mission.scripts){
    walkCondition(s.condition,c=>{if(!CONDITION_TYPES.has(c.type))throw new Error(`Script ${s.id} has unsupported condition ${c.type}`);if(c.objectiveId&&!objectiveIds.has(c.objectiveId))throw new Error(`Script ${s.id} references unknown objective ${c.objectiveId}`);if(c.areaId&&map&&!areaIds.has(c.areaId))throw new Error(`Script ${s.id} references unknown trigger area ${c.areaId}`);if(c.playerId&&map&&!playerIds.has(c.playerId))throw new Error(`Script ${s.id} references unknown player ${c.playerId}`);if(c.state&&!OBJECTIVE_STATES.has(c.state))throw new Error(`Script ${s.id} has invalid objective state ${c.state}`);});
    for(const a of s.actions||[]){if(!ACTION_TYPES.has(a.type))throw new Error(`Script ${s.id} has unsupported action ${a.type}`);if(a.objectiveId&&!objectiveIds.has(a.objectiveId))throw new Error(`Script ${s.id} references unknown objective ${a.objectiveId}`);if((a.type==='ENABLE_SCRIPT'||a.type==='DISABLE_SCRIPT')&&!scriptIds.has(a.scriptId))throw new Error(`Script ${s.id} references unknown script ${a.scriptId}`);if(a.playerId&&map&&!playerIds.has(a.playerId))throw new Error(`Script ${s.id} references unknown player ${a.playerId}`);if(a.fromPlayerId&&map&&!playerIds.has(a.fromPlayerId))throw new Error(`Script ${s.id} references unknown player ${a.fromPlayerId}`);if(a.toPlayerId&&map&&!playerIds.has(a.toPlayerId))throw new Error(`Script ${s.id} references unknown player ${a.toPlayerId}`);if(a.relation&&!RELATIONS.has(a.relation))throw new Error(`Script ${s.id} has invalid relation ${a.relation}`);if(a.waypointId&&map&&!waypointIds.has(a.waypointId))throw new Error(`Script ${s.id} references unknown waypoint ${a.waypointId}`);}
  }
  return mission;
}

export const MissionConditionTypes=Object.freeze([...CONDITION_TYPES]);
export const MissionActionTypes=Object.freeze([...ACTION_TYPES]);
