export const TeamState=Object.freeze({RECRUITING:'RECRUITING',RALLYING:'RALLYING',ACTIVE:'ACTIVE',DESTROYED:'DESTROYED',DISBANDED:'DISBANDED'});

const clone=v=>structuredClone(v);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export class TeamManager{
  constructor({registry,entityLookup,entitiesProvider,terminalRetentionTicks=300}){
    this.registry=registry;this.entityLookup=entityLookup;this.entitiesProvider=entitiesProvider;this.terminalRetentionTicks=terminalRetentionTicks;this.serial=0;this.teams=new Map();
  }

  prototype(id){return this.registry.teamPrototype?.(id)??null;}
  team(id){return this.teams.get(id)??null;}
  members(teamOrId,{aliveOnly=true}={}){
    const team=typeof teamOrId==='string'?this.team(teamOrId):teamOrId;if(!team)return [];
    const out=[];for(const id of team.memberIds||[]){const e=this.entityLookup(id);if(!e)continue;if(aliveOnly&&!e.alive)continue;out.push(e);}return out;
  }
  instances(playerId,prototypeId,{includeInactive=true}={}){
    return [...this.teams.values()].filter(t=>t.playerId===playerId&&t.prototypeId===prototypeId&&(includeInactive||t.active)&&![TeamState.DESTROYED,TeamState.DISBANDED].includes(t.state));
  }

  createInactiveTeam(prototypeId,playerId,{tick=0,home=null,rally=null,planId=null}={}){
    const proto=this.prototype(prototypeId);if(!proto)throw new Error(`Unknown team prototype ${prototypeId}`);
    const live=this.instances(playerId,prototypeId);if(live.length>=(proto.maxInstances??1))return null;
    const id=`${playerId}_team_${prototypeId}_${++this.serial}`;
    const team={id,prototypeId,playerId,planId,role:proto.role||'ASSAULT',state:TeamState.RECRUITING,active:false,created:false,createdTick:tick,activeTick:null,memberIds:[],initialMemberCount:0,home:home?clone(home):null,rally:rally?clone(rally):null,objective:null,lastOrderSignature:null,lastOrderTick:-1,destroyedTick:null};
    this.teams.set(id,team);return team;
  }

  _eligible(entity,team,entry,center,radius){
    if(!entity?.alive||entity.operational===false||entity.playerId!==team.playerId||entity.teamId)return false;
    if(entity.definitionId!==entry.definition||!entity.locomotorId)return false;
    return !center||distance(entity,center)<=radius;
  }

  recruit(teamOrId,{center=null,radius=Infinity}={}){
    const team=typeof teamOrId==='string'?this.team(teamOrId):teamOrId;if(!team)return {recruited:0,minimumReady:false};
    const proto=this.prototype(team.prototypeId);if(!proto)return {recruited:0,minimumReady:false};
    let recruited=0;
    for(const entry of proto.composition||[]){
      let current=this.members(team).filter(e=>e.definitionId===entry.definition).length;
      let need=Math.max(0,(entry.max??entry.min??1)-current);if(!need)continue;
      const candidates=[...this.entitiesProvider()].filter(e=>this._eligible(e,team,entry,center,radius)).sort((a,b)=>{
        const da=center?distance(a,center):0,db=center?distance(b,center):0;return da-db||a.id.localeCompare(b.id);
      });
      for(const e of candidates){if(need<=0)break;e.teamId=team.id;team.memberIds.push(e.id);recruited++;need--;}
    }
    team.memberIds=[...new Set(team.memberIds)];
    const minimumReady=this.minimumSatisfied(team);
    if(minimumReady&&team.initialMemberCount===0)team.initialMemberCount=team.memberIds.length;
    if(minimumReady&&team.state===TeamState.RECRUITING)team.state=TeamState.RALLYING;
    return {recruited,minimumReady};
  }

  minimumSatisfied(teamOrId){
    const team=typeof teamOrId==='string'?this.team(teamOrId):teamOrId,proto=team?this.prototype(team.prototypeId):null;if(!team||!proto)return false;
    const members=this.members(team);for(const entry of proto.composition||[]){const count=members.filter(e=>e.definitionId===entry.definition).length;if(count<(entry.min??0))return false;}return members.length>0;
  }

  rallySatisfied(teamOrId,radius=null){
    const team=typeof teamOrId==='string'?this.team(teamOrId):teamOrId;if(!team?.rally)return false;const members=this.members(team);if(!members.length)return false;
    const proto=this.prototype(team.prototypeId),r=radius??proto?.rallyRadius??12;return members.every(e=>distance(e,team.rally)<=r);
  }

  activate(teamOrId,tick){const team=typeof teamOrId==='string'?this.team(teamOrId):teamOrId;if(!team||team.state===TeamState.DESTROYED)return false;team.active=true;team.created=true;team.activeTick??=tick;team.state=TeamState.ACTIVE;return true;}
  setObjective(teamOrId,objective){const team=typeof teamOrId==='string'?this.team(teamOrId):teamOrId;if(team)team.objective=objective?clone(objective):null;}

  disband(teamOrId,tick=0){const team=typeof teamOrId==='string'?this.team(teamOrId):teamOrId;if(!team)return false;for(const e of this.members(team,{aliveOnly:false}))if(e.teamId===team.id)e.teamId=null;team.active=false;team.state=TeamState.DISBANDED;team.destroyedTick=tick;return true;}

  step(tick){
    for(const [id,team] of this.teams){
      if([TeamState.DESTROYED,TeamState.DISBANDED].includes(team.state)){
        if(team.destroyedTick!=null&&tick-team.destroyedTick>=this.terminalRetentionTicks)this.teams.delete(id);
        continue;
      }
      const alive=[];for(const memberId of team.memberIds){const e=this.entityLookup(memberId);if(e?.alive&&e.teamId===team.id)alive.push(memberId);}
      team.memberIds=alive;
      if(!alive.length&&team.createdTick<tick){team.active=false;team.state=TeamState.DESTROYED;team.destroyedTick=tick;continue;}
      if(team.state===TeamState.RALLYING&&!this.minimumSatisfied(team)){team.active=false;team.state=TeamState.RECRUITING;team.lastOrderSignature=null;}
    }
  }

  snapshot(){return {serial:this.serial,teams:[...this.teams.values()].map(clone)};}
  restore(state={}){
    this.serial=state.serial??0;this.teams=new Map((state.teams||[]).map(t=>[t.id,clone(t)]));
    for(const e of this.entitiesProvider())if(e.teamId&&!this.teams.has(e.teamId))e.teamId=null;
    for(const team of this.teams.values())for(const id of team.memberIds||[]){const e=this.entityLookup(id);if(e)e.teamId=team.id;}
  }
}
