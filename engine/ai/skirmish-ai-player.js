import {CommandSource,CommandType} from '../commands/command-bus.js';
import {TeamState} from '../teams/team-manager.js';
import {SkirmishEconomyPlanner} from './skirmish-economy-planner.js';
import {TargetEvaluator,aiTargetCategories} from './target-evaluator.js';
import {StrategicAIPlanner} from './strategic-ai-planner.js';
import {EconomicDefenseManager} from './economic-defense-manager.js';

const clone=v=>structuredClone(v);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const roundedPoint=p=>({x:Math.round(p.x*2)/2,z:Math.round(p.z*2)/2});

export class SkirmishAIPlayer{
  constructor({playerId,profile,map,players,relations=null,teamManager,entityLookup,entitiesProvider,commandBus,registry,economy,resources,construction,production}){
    this.playerId=playerId;this.profile=profile;this.entityLookup=entityLookup??(id=>[...entitiesProvider()].find(e=>e.id===id));this.tactical=profile.tactical??{};this.map=map;this.players=players;this.relations=relations;this.teamManager=teamManager;this.entitiesProvider=entitiesProvider;this.commandBus=commandBus;this.registry=registry;
    this.targetEvaluator=new TargetEvaluator({registry});
    const mp=map.players.find(p=>p.id===playerId)??{};this.mapConfig=mp.ai??{};
    this.strategyPlanner=new StrategicAIPlanner({playerId,profile,mapConfig:this.mapConfig,players,registry,entitiesProvider,relations});
    this.economyPlanner=new SkirmishEconomyPlanner({playerId,profile,map,registry,players,relations,teamManager,entitiesProvider,commandBus,economy,resources,construction,production});
    this.economicDefense=new EconomicDefenseManager({playerId,profile,registry,relations,teamManager,entityLookup:this.entityLookup,entitiesProvider,commandBus});
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
  _teamCenter(team){const members=this._teamMembers(team);if(!members.length)return team.rally??team.home??this._baseCenter();return {x:members.reduce((s,e)=>s+e.x,0)/members.length,z:members.reduce((s,e)=>s+e.z,0)/members.length};}

  _acquireEnemy(tick){
    if(tick<this.nextEnemyAcquireTick&&this.currentEnemyPlayerId&&this.relations?.isEnemy(this.playerId,this.currentEnemyPlayerId)&&this._owned(this.currentEnemyPlayerId).length)return this.currentEnemyPlayerId;
    this.nextEnemyAcquireTick=tick+(this.profile.enemyAcquireIntervalTicks??150);const home=this._baseCenter();let best=null,bestScore=Infinity;
    for(const p of this.players.values()){
      if(!this.relations?.isEnemy(this.playerId,p.id)||!this._owned(p.id).length)continue;let score=dist(home,this._baseCenter(p.id));if(score<bestScore||(score===bestScore&&p.id<(best?.id??'~'))){best=p;bestScore=score;}
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
  _prioritySet(team){return this.teamManager.prototype(team.prototypeId)?.attackPrioritySet??null;}

  _findBaseThreat(team){
    const center=this._defensePoint(),radius=(this.profile.baseThreatRadius??110)*(this.strategyPlanner.state.defenseRadiusScale??1),candidates=[...this.entitiesProvider()].filter(e=>e.alive&&this.relations?.isEnemy(this.playerId,e.playerId)&&dist(center,e)<=radius);
    return this.targetEvaluator.choose(candidates,{from:center,prioritySetId:this._prioritySet(team)})?.target??null;
  }

  _findRecentEconomicThreat(tick){
    const recent=this.tactical.economicThreatRecentTicks??180,maxDistance=this.tactical.maxRetaliateDistance??150,protectedCategories=new Set(this.tactical.economicProtectedCategories??['HARVESTER','ECONOMY','BUILDER']);
    let best=null,bestTick=-Infinity;
    for(const victim of this._owned()){
      const categories=aiTargetCategories(this.registry,victim);if(!categories.some(c=>protectedCategories.has(c)))continue;
      if(victim.lastDamagedTick==null||tick-victim.lastDamagedTick>recent||!victim.lastDamagedBy)continue;
      const attacker=this.entityLookup(victim.lastDamagedBy);if(!attacker?.alive||!this.relations?.isEnemy(this.playerId,attacker.playerId))continue;
      if(dist(victim,attacker)>maxDistance)continue;
      if(victim.lastDamagedTick>bestTick||(victim.lastDamagedTick===bestTick&&victim.id<(best?.victim.id??'~'))){best={victim,attacker};bestTick=victim.lastDamagedTick;}
    }
    return best;
  }

  _enemyObjective(team,tick){
    const id=this.currentEnemyPlayerId;if(!id||!this.relations?.isEnemy(this.playerId,id))return null;
    const currentId=team.objective?.type==='ATTACK_PLAYER'?team.objective.targetId:null,current=currentId?this.entityLookup(currentId):null;
    if(current?.alive&&current.playerId===id&&tick<(team.nextTargetEvalTick??0))return {playerId:id,targetId:current.id,position:{x:current.x,z:current.z}};
    const targets=this._owned(id);if(!targets.length)return null;const center=this._teamCenter(team),choice=this.targetEvaluator.choose(targets,{from:center,prioritySetId:this._prioritySet(team)});
    team.nextTargetEvalTick=tick+(this.tactical.targetReassessTicks??90);const target=choice?.target;if(!target)return null;return {playerId:id,targetId:target.id,position:{x:target.x,z:target.z}};
  }

  _startOrRecruitPlan(plan,tick,strategy=this.strategyPlanner.state){
    const existing=[...this.teamManager.teams.values()].find(t=>t.playerId===this.playerId&&t.planId===plan.id&&![TeamState.DESTROYED,TeamState.DISBANDED].includes(t.state));
    const prototypeId=existing?.prototypeId??this.strategyPlanner.prototypeForPlan(plan),proto=this.teamManager.prototype(prototypeId);if(!proto)return null;
    const start=(this.profile.initialDelayTicks??0)+(plan.startDelayTicks??0);if(!existing&&tick<start)return null;
    if(tick<(this.planRetryTicks[plan.id]??0)&&(!existing||[TeamState.RECRUITING,TeamState.REFORMING].includes(existing.state)))return existing??null;
    let team=existing;
    if(!team){
      const live=this.teamManager.instances(this.playerId,prototypeId);if(live.length>=(plan.maxConcurrent??proto.maxInstances??1))return live[0]??null;
      team=this.teamManager.createInactiveTeam(prototypeId,this.playerId,{tick,home:this._baseCenter(),rally:this._rallyPoint(),planId:plan.id});if(!team)return null;
    }
    if([TeamState.RECRUITING,TeamState.REFORMING].includes(team.state)){
      const wasReforming=team.state===TeamState.REFORMING,center=wasReforming?(team.rally||this._rallyPoint()):team.home;
      const result=this.teamManager.recruit(team,{center,radius:proto.recruitRadius??Infinity,tick});
      if(!result.minimumReady){this.planRetryTicks[plan.id]=tick+Math.max(1,Math.round((plan.retryTicks??90)*(strategy.teamIntervalScale??1)));if(!team.memberIds.length&&!wasReforming&&tick-team.createdTick>(proto.recruitTimeoutTicks??300))this.teamManager.disband(team,tick);return team;}
      this._setStance(team,proto.initialStance||'GUARD',tick);
      if(proto.role==='BASE_DEFENSE'&&!wasReforming){
        this.teamManager.activate(team,tick);const p=this._defensePoint();this.teamManager.setObjective(team,{type:'GUARD_POSITION',position:p});this._orderTeam(team,CommandType.GUARD_POSITION,{position:p},`GUARD:${p.x.toFixed(1)},${p.z.toFixed(1)}`,tick,{force:true});
      }else{
        const rally=team.rally||this._rallyPoint();this.teamManager.setObjective(team,{type:'RALLY',position:rally});this._orderTeam(team,CommandType.MOVE,{destination:rally},`RALLY:${rally.x.toFixed(1)},${rally.z.toFixed(1)}`,tick,{force:true});
      }
    }
    return team;
  }

  _updateRallying(team,tick){
    const proto=this.teamManager.prototype(team.prototypeId);if(!proto)return;const timeout=proto.rallyTimeoutTicks??240,start=team.rallyStartedTick??team.createdTick;
    if(this.teamManager.rallySatisfied(team)||tick-start>=timeout){this.teamManager.activate(team,tick);team.lastOrderSignature=null;this._updateActive(team,tick);return;}
    const rally=team.rally||this._rallyPoint();this._orderTeam(team,CommandType.MOVE,{destination:rally},`RALLY:${rally.x.toFixed(1)},${rally.z.toFixed(1)}`,tick);
  }

  _updateBaseDefense(team,tick){
    const economic=this._findRecentEconomicThreat(tick);
    if(economic){team.defenseHoldUntilTick=Math.max(team.defenseHoldUntilTick??0,tick+Math.max(1,Math.round((this.tactical.economicDefenseHoldTicks??180)*(this.strategyPlanner.state.economicDefenseHoldScale??1))));this.teamManager.setObjective(team,{type:'PROTECT_ECONOMY',targetId:economic.victim.id,threatId:economic.attacker.id,position:roundedPoint(economic.victim)});this._orderTeam(team,CommandType.GUARD_OBJECT,{targetId:economic.victim.id},`PROTECT:${economic.victim.id}`,tick);return;}
    if(team.objective?.type==='PROTECT_ECONOMY'&&tick<(team.defenseHoldUntilTick??0)){
      const protectedObj=this.entityLookup(team.objective.targetId);if(protectedObj?.alive){this._orderTeam(team,CommandType.GUARD_OBJECT,{targetId:protectedObj.id},`PROTECT:${protectedObj.id}`,tick);return;}
    }
    const threat=this._findBaseThreat(team);if(threat){const pos=roundedPoint(threat);this.teamManager.setObjective(team,{type:'DEFEND',targetId:threat.id,position:pos});this._orderTeam(team,CommandType.ATTACK_MOVE,{destination:pos},`DEFEND:${threat.id}`,tick);return;}
    const p=this._defensePoint();this.teamManager.setObjective(team,{type:'GUARD_POSITION',position:p});this._orderTeam(team,CommandType.GUARD_POSITION,{position:p},`GUARD:${p.x.toFixed(1)},${p.z.toFixed(1)}`,tick);
  }

  _maybeBeginReform(team,tick){
    const proto=this.teamManager.prototype(team.prototypeId),policy=proto?.reinforcement??{};if(!policy.enabled)return false;
    const ratio=this.teamManager.strengthRatio(team);if(ratio>=(policy.retreatBelowStrength??0))return false;
    this.teamManager.beginReform(team,tick);const rally=team.rally||this._rallyPoint();this.teamManager.setObjective(team,{type:'REFORM',position:rally,strengthRatio:ratio});this._setStance(team,'GUARD',tick);this._orderTeam(team,CommandType.MOVE,{destination:rally},`REFORM:${rally.x.toFixed(1)},${rally.z.toFixed(1)}`,tick,{force:true});return true;
  }

  _updateReforming(team,tick){
    const proto=this.teamManager.prototype(team.prototypeId),policy=proto?.reinforcement??{},start=team.reformStartedTick??tick;
    if(policy.reformTimeoutTicks&&tick-start>=policy.reformTimeoutTicks){this.teamManager.disband(team,tick);return;}
    const rally=team.rally||this._rallyPoint();this.teamManager.setObjective(team,{type:'REFORM',position:rally,strengthRatio:this.teamManager.strengthRatio(team)});this._orderTeam(team,CommandType.MOVE,{destination:rally},`REFORM:${rally.x.toFixed(1)},${rally.z.toFixed(1)}`,tick);
  }

  _updateAssault(team,tick){
    if(this._maybeBeginReform(team,tick))return;
    const objective=this._enemyObjective(team,tick);if(!objective){const p=team.rally||this._rallyPoint();this.teamManager.setObjective(team,{type:'GUARD_POSITION',position:p});this._orderTeam(team,CommandType.GUARD_POSITION,{position:p},`NO_ENEMY:${p.x.toFixed(1)},${p.z.toFixed(1)}`,tick);return;}
    this.teamManager.setObjective(team,{type:'ATTACK_PLAYER',...objective});const p=roundedPoint(objective.position),proto=this.teamManager.prototype(team.prototypeId);
    if(proto?.attackCommonTarget&&objective.targetId)this._orderTeam(team,CommandType.ATTACK,{targetId:objective.targetId},`ATTACK_OBJECT:${objective.targetId}`,tick);
    else this._orderTeam(team,CommandType.ATTACK_MOVE,{destination:p},`ATTACK:${objective.playerId}:${objective.targetId}:${p.x},${p.z}`,tick);
  }

  _updateActive(team,tick){const proto=this.teamManager.prototype(team.prototypeId);if(!proto)return;if(proto.role==='BASE_DEFENSE')this._updateBaseDefense(team,tick);else this._updateAssault(team,tick);}

  update(tick){
    const strategy=this.strategyPlanner.update(tick);
    if(tick<this.nextThinkTick)return;this.nextThinkTick=tick+Math.max(1,Math.round((this.profile.thinkIntervalTicks??15)*(strategy.teamIntervalScale??1)));this._acquireEnemy(tick);
    for(const plan of this.profile.teamPlans||[])this._startOrRecruitPlan(plan,tick,strategy);
    this.economicDefense.update(tick);
    const enemyBase=this.currentEnemyPlayerId?this._baseCenter(this.currentEnemyPlayerId):null;
    const expansionResource=strategy.expansionResourceId?this.entityLookup(strategy.expansionResourceId):null;
    this.economyPlanner.update(tick,{home:this._baseCenter(),defense:this._defensePoint(),enemyBase,strategy,expansionResource});
    for(const team of this.teamManager.teams.values()){
      if(team.playerId!==this.playerId)continue;const proto=this.teamManager.prototype(team.prototypeId);if(proto?.role==='ECONOMIC_DEFENSE'||this.economicDefense.isBorrowedTeam(team.id))continue;if(team.state===TeamState.RALLYING)this._updateRallying(team,tick);else if(team.state===TeamState.REFORMING)this._updateReforming(team,tick);else if(team.state===TeamState.ACTIVE)this._updateActive(team,tick);
    }
  }

  snapshot(){return {playerId:this.playerId,currentEnemyPlayerId:this.currentEnemyPlayerId,nextThinkTick:this.nextThinkTick,nextEnemyAcquireTick:this.nextEnemyAcquireTick,planRetryTicks:clone(this.planRetryTicks),strategyPlanner:this.strategyPlanner.snapshot(),economyPlanner:this.economyPlanner.snapshot(),economicDefense:this.economicDefense.snapshot()};}
  restore(state={}){if('currentEnemyPlayerId' in state)this.currentEnemyPlayerId=state.currentEnemyPlayerId??null;if('nextThinkTick' in state)this.nextThinkTick=state.nextThinkTick??0;if('nextEnemyAcquireTick' in state)this.nextEnemyAcquireTick=state.nextEnemyAcquireTick??0;if('planRetryTicks' in state)this.planRetryTicks=clone(state.planRetryTicks??{});this.strategyPlanner.restore(state.strategyPlanner??{});this.economyPlanner.restore(state.economyPlanner??{});this.economicDefense.restore(state.economicDefense??{});}
}

export class SkirmishAISystem{
  constructor({registry,map,players,relations=null,teamManager,entityLookup,entitiesProvider,commandBus,economy,resources,construction,production}){
    this.controllers=new Map();
    if(typeof registry.aiProfile!=='function')return;
    for(const p of map.players||[]){if(p.isHuman||!p.ai?.profile)continue;const profile=registry.aiProfile(p.ai.profile);if(!profile)throw new Error(`Unknown AI profile ${p.ai.profile} for player ${p.id}`);this.controllers.set(p.id,new SkirmishAIPlayer({playerId:p.id,profile,map,players,relations,teamManager,entityLookup,entitiesProvider,commandBus,registry,economy,resources,construction,production}));}
  }
  update(tick){for(const c of this.controllers.values())c.update(tick);}
  snapshot(){return {controllers:[...this.controllers.values()].map(c=>c.snapshot())};}
  restore(state={}){for(const s of state.controllers||[]){const c=this.controllers.get(s.playerId);if(c)c.restore(s);}}
}
