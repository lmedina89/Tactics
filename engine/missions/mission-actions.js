import {CommandSource,CommandType} from '../commands/command-bus.js';

export class MissionActions{
  constructor({simulation,missionSystem,objectives}){this.sim=simulation;this.mission=missionSystem;this.objectives=objectives;}
  _destination(action){if(action.destination)return structuredClone(action.destination);if(action.waypointId){const w=(this.sim.map.waypoints||[]).find(x=>x.id===action.waypointId);return w?{x:w.x,z:w.z}:null;}return null;}
  execute(action,tick){
    if(action.type==='SET_FLAG'){this.mission.setFlag(action.flag,action.value??true);return true;}
    if(action.type==='SET_COUNTER'){this.mission.setCounter(action.counter,action.value??0);return true;}
    if(action.type==='ADD_COUNTER'){this.mission.setCounter(action.counter,this.mission.counter(action.counter)+(action.value??1));return true;}
    if(action.type==='START_TIMER'){this.mission.startTimer(action.timerId,{tick,durationTicks:action.durationTicks,durationSeconds:action.durationSeconds});return true;}
    if(action.type==='ENABLE_SCRIPT')return this.mission.setScriptEnabled(action.scriptId,true,tick);
    if(action.type==='DISABLE_SCRIPT')return this.mission.setScriptEnabled(action.scriptId,false,tick);
    if(action.type==='ACTIVATE_OBJECTIVE')return this.objectives.activate(action.objectiveId,tick);
    if(action.type==='COMPLETE_OBJECTIVE')return this.objectives.complete(action.objectiveId,tick);
    if(action.type==='FAIL_OBJECTIVE')return this.objectives.fail(action.objectiveId,tick);
    if(action.type==='ISSUE_MOVE'){const d=this._destination(action);if(!d)return false;this.sim.commandBus.issue({type:CommandType.MOVE,entityIds:action.entityIds||[],destination:d,issuerPlayerId:action.issuerPlayerId??null,commandSource:CommandSource.SCRIPT,append:!!action.append});return true;}
    if(action.type==='ISSUE_ATTACK_MOVE'){const d=this._destination(action);if(!d)return false;this.sim.commandBus.issue({type:CommandType.ATTACK_MOVE,entityIds:action.entityIds||[],destination:d,issuerPlayerId:action.issuerPlayerId??null,commandSource:CommandSource.SCRIPT,append:!!action.append});return true;}
    if(action.type==='SET_RELATION'){this.sim.setPlayerRelation(action.fromPlayerId,action.toPlayerId,action.relation);return true;}
    if(action.type==='VICTORY'){this.mission.setOutcome('VICTORY',tick,{playerId:action.playerId??null,reason:action.reason??null});return true;}
    if(action.type==='DEFEAT'){this.mission.setOutcome('DEFEAT',tick,{playerId:action.playerId??null,reason:action.reason??null});return true;}
    return false;
  }
}
