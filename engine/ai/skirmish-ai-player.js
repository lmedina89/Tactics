import {CommandSource,CommandType} from '../commands/command-bus.js';
import {TeamState} from '../teams/team-manager.js';
import {SkirmishEconomyPlanner} from './skirmish-economy-planner.js';

const clone=v=>structuredClone(v);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const roundedPoint=p=>({x:Math.round(p.x*2)/2,z:Math.round(p.z*2)/2});

export class SkirmishAIPlayer{
  constructor({playerId,profile,map,players,teamManager,entitiesProvider,commandBus,registry,economy,construction,production}){
    this.playerId=playerId;this.profile=profile;this.map=map;this.players=players;this.teamManager=teamManager;this.entitiesProvider=entitiesProvider;this.commandBus=commandBus;this.registry=registry;
    this.economyPlanner=new SkirmishEconomyPlanner({playerId,profile,map,registry,players,teamManager,entitiesProvider,commandBus,economy,construction,production});
    const mp=map.players.find(p=>p.id===playerId)??{};this.mapConfig=mp.ai??{};
    this.currentEnemyPlayerId=null;this.nextThinkTick=this.profile.initialDelayTicks??0;this.nextEnemyAcquireTick=0;this.planRetryTicks={};
  }

  _waypoint(id){return id?(this.map.waypoints||[]).find(w=>w.id===id)??null:null;}
  _anchor(id){return id?(this.map.aiAnchors||[]).find(a=>a.id===id)??null:null;}
  _owned(playerId=this.playerId){return [...this.entitiesProvider()].filter(e=>e.alive&&e.playerId===playerId);}
  _baseCenter(playerId=this.playerId){
    const mp=this.map.players.find(p=>p.id===playerId);if(playerId===this.playerId){const home=this._waypoint(this.mapConfig.homeWaypoint||mp?.startWaypoint);if(home)return {x:home.x,z:home.z};}
    const buildings=this._owned(playerId).filter(e=>e.kind==='building');const list=buildings.length?buildings:this._owned(playerId);if(list.length)return {x:list.reduce((s,e)=>s+e.x,0)/list.length,z:list.reduce((s,e)=>s+e.z,0)/list.length};
    const start=this._waypoint(mp?.startWaypoint);return start?{x:start.x,z:start.z}:{x:0,z:0};
  }
  _rallyPoint(){const p=this._waypoint(this.mapConfig.rallyWaypoint);return p?{x:p.x,z:p.z}:this._baseCenter();}
  _defensePoint(){const a=this._anchor(this.mapConfig.defenseAnchor);return a?{x:a.x,z:a.z}:this._baseCenter();}

  _acquireEnemy(tick){
    if(tick<this.nextEnemyAcquireTick&&this.currentEnemyPlayerId&&this._owned(this.currentEnemyPlayerId).length)return this.currentEnemyPlayerId;
    this.nextEnemyAcquireTick=tick+(this.profile.enemyAcquireIntervalTicks??150);const home=this._baseCenter();let best=null,bestScore=Infinity;
    for(const p of this.players.values()){
      if(p.id===this.playerId||!this._owned(p.id).length)continue;let score=dist(home,this._baseCenter(p.id));if(score<bestScore||(score===bestScore&&p.id<(best?.id??'~'))){best=p;bestScore=score;}
    }
    this.currentEnemyPlayerId=best?.id??null;return this.currentEnemyPlayerId;
  }

  _issue(type,entityIds,payload={}){if(!entityIds.length)return null;return this.commandBus.issue({type,entityIds:[...entityIds].sort(),issuerPlayerId:this.playerId,commandSource:CommandSource.AI,append:false,...clone(payload)});}
  _teamMembers(team){return this.teamManager.members(team);}
  _orderTeam(team,type,payload,signature,tick,{force=false}={}){
    const members=this._teamMembers(team);if(!members.length)return false;
    if(!force&&team.lastOrderSignature===signature&&tick===team.lastOrderTick)return false;
    const refresh=this.profile.orderRefreshTicks??90,allIdle=members.every(e=>!e.ai?.order);
    if(!force&&team.lastOrderSignature===signature&&!allIdle&&tick-team.lastOrderTick<refresh)return false;
    this._issue(type,members.map(e=>e.id),payload);team.lastOrderSignature=signature;team.lastOrderTick=tick;return true;
  }
  _setStance(team,stance,tick){if(!stance)return;const members=this._teamMembers(team);if(!members.length)return;this._issue(CommandType.SET_STANCE,members.map(e=>e.id),{stance});team.stance=stance;team.lastStanceTick=tick;}

  _findBaseThreat(){
    const center=this._defensePoint(),radius=this.profile.baseThreatRadius??110;let best=null,bestD=Infinity;
    for(const e of this.entitiesProvider()){
      if(!e.alive||!e.playerId||e.playerId===this.playerId)continue;const d=dist(center,e);if(d>radius)continue;
      const threatBias=e.weaponSlots?.slots?.length?0:(e.kind==='building'?25:12),score=d+threatBias;if(score<bestD||(score===bestD&&e.id<(best?.id??'~'))){best=e;bestD=score;}
    }
    return best;
  }

  _enemyObjective(){const id=this.currentEnemyPlayerId;if(!id)return null;const buildings=this._owned(id).filter(e=>e.kind==='building');const targets=buildings.length?buildings:this._owned(id);if(!targets.length)return null;const own=this._baseCenter(),target=targets.slice().sort((a,b)=>dist(own,a)-dist(own,b)||a.id.localeCompare(b.id))[0];return {playerId:id,targetId:target.id,position:{x:target.x,z:target.z}};}

  _startOrRecruitPlan(plan,tick){
    const proto=this.teamManager.prototype(plan.prototype);if(!proto)return null;
    const existing=[...this.teamManager.teams.values()].find(t=>t.playerId===this.playerId&&t.planId===plan.id&&![TeamState.DESTROYED,TeamState.DISBANDED].includes(t.state));
    const start=(this.profile.initialDelayTicks??0)+(plan.startDelayTicks??0);if(!existing&&tick<start)return null;
    if(tick<(this.planRetryTicks[plan.id]??0)&&( !existing || existing.state===TeamState.RECRUITING))return existing??null;
    let team=existing;
    if(!team){
      const live=this.teamManager.instances(this.playerId,plan.prototype);if(live.length>=(plan.maxConcurrent??proto.maxInstances??1))return live[0]??null;
      team=this.teamManager.createInactiveTeam(plan.prototype,this.playerId,{tick,home:this._baseCenter(),rally:this._rallyPoint(),planId:plan.id});if(!team)return null;
    }
    if(team.state===TeamState.RECRUITING){
      const result=this.teamManager.recruit(team,{center:team.home,radius:proto.recruitRadius??Infinity});
      if(!result.minimumReady){this.planRetryTicks[plan.id]=tick+(plan.retryTicks??90);if(!team.memberIds.length&&tick-team.createdTick>(proto.recruitTimeoutTicks??300))this.teamManager.disband(team,tick);return team;}
      this._setStance(team,proto.initialStance||'GUARD',tick);
      if(proto.role==='BASE_DEFENSE'){
        this.teamManager.activate(team,tick);const p=this._defensePoint();this.teamManager.setObjective(team,{type:'GUARD_POSITION',position:p});this._orderTeam(team,CommandType.GUARD_POSITION,{position:p},`GUARD:${p.x.toFixed(1)},${p.z.toFixed(1)}`,tick,{force:true});
      }else{
        const rally=team.rally||this._rallyPoint();this.teamManager.setObjective(team,{type:'RALLY',position:rally});this._orderTeam(team,CommandType.MOVE,{destination:rally},`RALLY:${rally.x.toFixed(1)},${rally.z.toFixed(1)}`,tick,{force:true});
      }
    }
    return team;
  }

  _updateRallying(team,tick){
    const proto=this.teamManager.prototype(team.prototypeId);if(!proto)return;const timeout=proto.rallyTimeoutTicks??240;
    if(this.teamManager.rallySatisfied(team)||tick-team.createdTick>=timeout){this.teamManager.activate(team,tick);team.lastOrderSignature=null;this._updateActive(team,tick);return;}
    const rally=team.rally||this._rallyPoint();this._orderTeam(team,CommandType.MOVE,{destination:rally},`RALLY:${rally.x.toFixed(1)},${rally.z.toFixed(1)}`,tick);
  }

  _updateBaseDefense(team,tick){
    const threat=this._findBaseThreat();if(threat){const pos=roundedPoint(threat);this.teamManager.setObjective(team,{type:'DEFEND',targetId:threat.id,position:pos});this._orderTeam(team,CommandType.ATTACK_MOVE,{destination:pos},`DEFEND:${threat.id}`,tick);return;}
    const p=this._defensePoint();this.teamManager.setObjective(team,{type:'GUARD_POSITION',position:p});this._orderTeam(team,CommandType.GUARD_POSITION,{position:p},`GUARD:${p.x.toFixed(1)},${p.z.toFixed(1)}`,tick);
  }

  _updateAssault(team,tick){
    const objective=this._enemyObjective();if(!objective){const p=team.rally||this._rallyPoint();this.teamManager.setObjective(team,{type:'GUARD_POSITION',position:p});this._orderTeam(team,CommandType.GUARD_POSITION,{position:p},`NO_ENEMY:${p.x.toFixed(1)},${p.z.toFixed(1)}`,tick);return;}
    this.teamManager.setObjective(team,{type:'ATTACK_PLAYER',...objective});const p=roundedPoint(objective.position);this._orderTeam(team,CommandType.ATTACK_MOVE,{destination:p},`ATTACK:${objective.playerId}:${objective.targetId}:${p.x},${p.z}`,tick);
  }

  _updateActive(team,tick){const proto=this.teamManager.prototype(team.prototypeId);if(!proto)return;if(proto.role==='BASE_DEFENSE')this._updateBaseDefense(team,tick);else this._updateAssault(team,tick);}

  update(tick){
    if(tick<this.nextThinkTick)return;this.nextThinkTick=tick+(this.profile.thinkIntervalTicks??15);this._acquireEnemy(tick);
    for(const plan of this.profile.teamPlans||[])this._startOrRecruitPlan(plan,tick);
    const enemyBase=this.currentEnemyPlayerId?this._baseCenter(this.currentEnemyPlayerId):null;
    this.economyPlanner.update(tick,{home:this._baseCenter(),defense:this._defensePoint(),enemyBase});
    for(const team of this.teamManager.teams.values()){
      if(team.playerId!==this.playerId)continue;if(team.state===TeamState.RALLYING)this._updateRallying(team,tick);else if(team.state===TeamState.ACTIVE)this._updateActive(team,tick);
    }
  }

  snapshot(){return {playerId:this.playerId,currentEnemyPlayerId:this.currentEnemyPlayerId,nextThinkTick:this.nextThinkTick,nextEnemyAcquireTick:this.nextEnemyAcquireTick,planRetryTicks:clone(this.planRetryTicks),economyPlanner:this.economyPlanner.snapshot()};}
  restore(state={}){if('currentEnemyPlayerId' in state)this.currentEnemyPlayerId=state.currentEnemyPlayerId??null;if('nextThinkTick' in state)this.nextThinkTick=state.nextThinkTick??0;if('nextEnemyAcquireTick' in state)this.nextEnemyAcquireTick=state.nextEnemyAcquireTick??0;if('planRetryTicks' in state)this.planRetryTicks=clone(state.planRetryTicks??{});this.economyPlanner.restore(state.economyPlanner??{});}
}

export class SkirmishAISystem{
  constructor({registry,map,players,teamManager,entitiesProvider,commandBus,economy,construction,production}){
    this.controllers=new Map();
    if(typeof registry.aiProfile!=='function')return;
    for(const p of map.players||[]){if(p.isHuman||!p.ai?.profile)continue;const profile=registry.aiProfile(p.ai.profile);if(!profile)throw new Error(`Unknown AI profile ${p.ai.profile} for player ${p.id}`);this.controllers.set(p.id,new SkirmishAIPlayer({playerId:p.id,profile,map,players,teamManager,entitiesProvider,commandBus,registry,economy,construction,production}));}
  }
  update(tick){for(const c of this.controllers.values())c.update(tick);}
  snapshot(){return {controllers:[...this.controllers.values()].map(c=>c.snapshot())};}
  restore(state={}){for(const s of state.controllers||[]){const c=this.controllers.get(s.playerId);if(c)c.restore(s);}}
}
