import {TeamState} from '../teams/team-manager.js';

function compare(a,op,b){if(op==='==')return a===b;if(op==='!=')return a!==b;if(op==='>')return a>b;if(op==='>=')return a>=b;if(op==='<')return a<b;if(op==='<=')return a<=b;return false;}

export class MissionConditions{
  constructor({simulation,missionSystem,triggerAreas,objectives}){this.sim=simulation;this.mission=missionSystem;this.triggerAreas=triggerAreas;this.objectives=objectives;}
  evaluate(node){
    if(!node)return false;if(Array.isArray(node.all))return node.all.every(c=>this.evaluate(c));if(Array.isArray(node.any))return node.any.some(c=>this.evaluate(c));if(node.not)return !this.evaluate(node.not);
    const type=node.type;
    if(type==='TRUE')return true;if(type==='FALSE')return false;
    if(type==='FLAG_EQUALS')return this.mission.flag(node.flag)===(node.value??true);
    if(type==='COUNTER_COMPARE')return compare(this.mission.counter(node.counter),node.op??'>=',node.value??0);
    if(type==='TIMER_EXPIRED')return this.mission.timerExpired(node.timerId);
    if(type==='ENTITY_EXISTS'){const e=this.sim.entities.get(node.entityId);return !!e?.alive;}
    if(type==='ENTITY_DESTROYED'){const e=this.sim.entities.get(node.entityId);return !!e&&!e.alive;}
    if(type==='TEAM_DESTROYED'){const t=this.sim.teams.team(node.teamId);return !!t&&t.state===TeamState.DESTROYED;}
    if(type==='ENTITY_ENTERED_AREA')return this.triggerAreas.ids(node.areaId,node.transition??'ENTERED').includes(node.entityId);
    if(type==='PLAYER_ENTERED_AREA'){
      const transition=node.transition??'ENTERED',ids=this.triggerAreas.ids(node.areaId,transition),minimum=Math.max(1,node.minimum??1);let count=0;
      for(const id of ids){const e=this.sim.entities.get(id);if(e?.playerId===node.playerId&&e.alive)count++;}return count>=minimum;
    }
    if(type==='TEAM_ENTERED_AREA'){
      const team=this.sim.teams.team(node.teamId);if(!team)return false;const transition=node.transition??'ENTERED',inside=new Set(this.triggerAreas.ids(node.areaId,transition)),members=this.sim.teams.members(team);if(!members.length)return false;
      return (node.mode??'ANY')==='ALL'?members.every(e=>inside.has(e.id)):members.some(e=>inside.has(e.id));
    }
    if(type==='PLAYER_HAS_CREDITS')return (this.sim.players.get(node.playerId)?.credits??0)>=(node.amount??0);
    if(type==='PLAYER_HAS_POWER'){const p=this.sim.players.get(node.playerId);if(!p)return false;return (p.powerProduced-p.powerUsed)>=(node.minimumSurplus??0);}
    if(type==='OBJECTIVE_STATE')return this.objectives.state(node.objectiveId)===node.state;
    return false;
  }
}
