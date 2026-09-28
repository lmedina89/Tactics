import {CommandSource,CommandType} from '../commands/command-bus.js';
import {TeamState} from '../teams/team-manager.js';
import {aiTargetCategories} from './target-evaluator.js';

const clone=v=>structuredClone(v);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

/**
 * Data-driven emergency defense coordinator for economic assets.
 * Inspired by Generals AIPlayer supply-source attacked/safe + guardSupplyCenter responsibilities,
 * but implemented through ForgeRTS TeamManager + CommandBus only. It never spawns units or mutates
 * combat/economy state directly.
 */
export class EconomicDefenseManager{
  constructor({playerId,profile,registry,relations=null,teamManager,entityLookup,entitiesProvider,commandBus}){
    this.playerId=playerId;this.registry=registry;this.relations=relations;this.teamManager=teamManager;this.entityLookup=entityLookup;this.entitiesProvider=entitiesProvider;this.commandBus=commandBus;
    this.cfg=profile.tactical?.economicDefense??{};
    this.nextScanTick=0;this.activeTeamId=null;this.borrowedTeamIds=[];this.protectedTargetId=null;this.primaryThreatId=null;this.holdUntilTick=0;this.escortUntilTick=0;
    this.lastSeenDamageTick={};this.incidents={};
  }

  _owned(){return [...this.entitiesProvider()].filter(e=>e.alive&&e.playerId===this.playerId);}
  _hostiles(){return [...this.entitiesProvider()].filter(e=>e.alive&&this.relations?.isEnemy(this.playerId,e.playerId));}
  _categories(e){return aiTargetCategories(this.registry,e);}
  _protected(e){const wanted=new Set(this.cfg.protectedCategories??['HARVESTER','ECONOMY','BUILDER']);return this._categories(e).some(c=>wanted.has(c));}
  _team(){const t=this.activeTeamId?this.teamManager.team(this.activeTeamId):null;return t&&!([TeamState.DESTROYED,TeamState.DISBANDED].includes(t.state))?t:null;}
  _issue(type,entityIds,payload={}){if(!entityIds.length)return null;return this.commandBus.issue({type,entityIds:[...entityIds].sort(),issuerPlayerId:this.playerId,commandSource:CommandSource.AI,append:false,...clone(payload)});}

  _recentIncident(tick){
    const recent=Math.max(1,this.cfg.recentDamageTicks??180);let best=null;
    for(const victim of this._owned()){
      if(!this._protected(victim)||victim.lastDamagedTick==null||tick-victim.lastDamagedTick>recent||!victim.lastDamagedBy)continue;
      const attacker=this.entityLookup(victim.lastDamagedBy);if(!attacker?.alive||!this.relations?.isEnemy(this.playerId,attacker.playerId))continue;
      const maxDistance=this.cfg.maxRetaliateDistance??170;if(maxDistance>0&&dist(victim,attacker)>maxDistance)continue;
      if(!best||victim.lastDamagedTick>best.damageTick||(victim.lastDamagedTick===best.damageTick&&victim.id<best.victim.id))best={victim,attacker,damageTick:victim.lastDamagedTick};
    }
    return best;
  }

  _recordIncident(victim,tick,damageTick){
    if((this.lastSeenDamageTick[victim.id]??-1)>=damageTick)return false;
    this.lastSeenDamageTick[victim.id]=damageTick;
    const window=Math.max(1,this.cfg.escortIncidentWindowTicks??900),old=this.incidents[victim.id];
    const count=!old||tick-old.lastTick>window?1:(old.count+1);this.incidents[victim.id]={count,lastTick:tick};
    if(count>=(this.cfg.escortAfterIncidents??2))this.escortUntilTick=Math.max(this.escortUntilTick,tick+Math.max(1,this.cfg.escortDurationTicks??900));
    return true;
  }

  _entityThreatValue(e){
    const weights=this.cfg.threatWeights??{},categories=this._categories(e);let value=this.cfg.defaultThreatValue??1;
    for(const c of categories)if(Number.isFinite(weights[c]))value=Math.max(value,weights[c]);
    return Math.max(0,value);
  }

  _threatPicture(victim,preferredAttacker=null){
    const radius=Math.max(1,this.cfg.threatScanRadius??95),candidates=[];let score=0;
    for(const hostile of this._hostiles()){
      const d=dist(victim,hostile);if(d>radius&&hostile.id!==preferredAttacker?.id)continue;
      const raw=this._entityThreatValue(hostile),weighted=raw*Math.max(.35,1-Math.min(d,radius)/Math.max(radius,1)*.5);
      score+=weighted;candidates.push({entity:hostile,value:weighted,distance:d});
    }
    candidates.sort((a,b)=>b.value-a.value||a.distance-b.distance||a.entity.id.localeCompare(b.entity.id));
    return {score,primary:candidates[0]?.entity??preferredAttacker??null,candidates};
  }

  _responsePrototype(score){
    const bands=[...(this.cfg.responseBands??[])].sort((a,b)=>(a.minThreat??0)-(b.minThreat??0)||String(a.prototype).localeCompare(String(b.prototype)));
    let chosen=bands[0]??null;for(const band of bands)if(score>=(band.minThreat??0))chosen=band;return chosen?.prototype??null;
  }

  isBorrowedTeam(teamId){return this.borrowedTeamIds.includes(teamId);}

  _borrowTeamsIfNeeded(victim,threatScore,emergencyTeam){
    if(this.teamManager.minimumSatisfied(emergencyTeam)||threatScore<(this.cfg.borrowMinThreat??Infinity))return [];
    const allowed=new Set(this.cfg.borrowRoles??[]),radius=this.cfg.borrowRadius??Infinity,maxTeams=Math.max(0,this.cfg.maxBorrowedTeams??1);if(!allowed.size||!maxTeams)return [];
    this.borrowedTeamIds=this.borrowedTeamIds.filter(id=>{const t=this.teamManager.team(id);return t&&t.playerId===this.playerId&&t.state===TeamState.ACTIVE;});
    const existing=new Set(this.borrowedTeamIds),candidates=[];
    for(const sourceTeam of this.teamManager.teams.values()){
      if(sourceTeam.id===emergencyTeam?.id||sourceTeam.playerId!==this.playerId||existing.has(sourceTeam.id)||!allowed.has(sourceTeam.role)||sourceTeam.state!==TeamState.ACTIVE)continue;
      const members=this.teamManager.members(sourceTeam);if(!members.length)continue;
      const nearest=Math.min(...members.map(entity=>dist(entity,victim)));if(nearest>radius)continue;
      candidates.push({team:sourceTeam,distance:nearest});
    }
    candidates.sort((a,b)=>a.distance-b.distance||a.team.id.localeCompare(b.team.id));
    for(const c of candidates){if(this.borrowedTeamIds.length>=maxTeams)break;this.borrowedTeamIds.push(c.team.id);c.team.lastOrderSignature=null;}
    return this.borrowedTeamIds.map(id=>this.teamManager.team(id)).filter(Boolean);
  }

  _releaseBorrowed(){
    for(const id of this.borrowedTeamIds){const team=this.teamManager.team(id);if(!team)continue;team.lastOrderSignature=null;team.lastOrderTick=-Infinity;team.objective=null;}
    this.borrowedTeamIds=[];
  }

  _ensureTeam(prototypeId,victim,tick,threatScore=0){
    let team=this._team();
    if(team&&team.prototypeId!==prototypeId){this.teamManager.disband(team,tick);team=null;this.activeTeamId=null;}
    if(!team&&prototypeId){team=this.teamManager.createInactiveTeam(prototypeId,this.playerId,{tick,home:{x:victim.x,z:victim.z},rally:{x:victim.x,z:victim.z},planId:'economic_defense'});if(team)this.activeTeamId=team.id;}
    if(!team)return null;
    team.home={x:victim.x,z:victim.z};team.rally={x:victim.x,z:victim.z};
    const proto=this.teamManager.prototype(team.prototypeId),result=this.teamManager.recruit(team,{center:victim,radius:proto?.recruitRadius??Infinity,tick});
    if(!result.minimumReady)this._borrowTeamsIfNeeded(victim,threatScore,team);
    if(result.minimumReady||this.teamManager.minimumSatisfied(team)){if(team.state!==TeamState.ACTIVE)this.teamManager.activate(team,tick);this._releaseBorrowed();}
    return team;
  }

  _driveOne(team,victim,threat,tick){
    const members=this.teamManager.members(team);if(!members.length)return;
    const stance=this.teamManager.prototype(team.prototypeId)?.initialStance??'GUARD';
    if(team.lastEconomicDefenseStance!==stance){this._issue(CommandType.SET_STANCE,members.map(e=>e.id),{stance});team.lastEconomicDefenseStance=stance;}
    const leash=Math.max(1,this.cfg.responseLeashDistance??110);
    if(threat?.alive&&dist(victim,threat)<=leash){
      this.teamManager.setObjective(team,{type:'ECONOMIC_INTERCEPT',targetId:threat.id,protectedTargetId:victim.id,position:{x:threat.x,z:threat.z}});
      const sig=`ECON_ATTACK:${threat.id}`;if(team.lastOrderSignature!==sig||tick-team.lastOrderTick>=(this.cfg.orderRefreshTicks??90)){this._issue(CommandType.ATTACK,members.map(e=>e.id),{targetId:threat.id});team.lastOrderSignature=sig;team.lastOrderTick=tick;}
    }else{
      this.teamManager.setObjective(team,{type:'ECONOMIC_ESCORT',targetId:victim.id,position:{x:victim.x,z:victim.z}});
      const sig=`ECON_GUARD:${victim.id}`;if(team.lastOrderSignature!==sig||tick-team.lastOrderTick>=(this.cfg.orderRefreshTicks??90)){this._issue(CommandType.GUARD_OBJECT,members.map(e=>e.id),{targetId:victim.id});team.lastOrderSignature=sig;team.lastOrderTick=tick;}
    }
  }

  _drive(team,victim,threat,tick){
    if(team)this._driveOne(team,victim,threat,tick);
    for(const id of this.borrowedTeamIds){const borrowed=this.teamManager.team(id);if(borrowed?.state===TeamState.ACTIVE)this._driveOne(borrowed,victim,threat,tick);}
  }

  _release(tick){const team=this._team();if(team)this.teamManager.disband(team,tick);this._releaseBorrowed();this.activeTeamId=null;this.protectedTargetId=null;this.primaryThreatId=null;this.holdUntilTick=0;this.escortUntilTick=0;}

  update(tick){
    if(this.cfg.enabled===false)return;
    const interval=Math.max(1,this.cfg.scanIntervalTicks??15);if(tick<this.nextScanTick)return;this.nextScanTick=tick+interval;
    const incident=this._recentIncident(tick);
    if(incident){
      this._recordIncident(incident.victim,tick,incident.damageTick);const picture=this._threatPicture(incident.victim,incident.attacker),prototypeId=this._responsePrototype(picture.score);
      this.protectedTargetId=incident.victim.id;this.primaryThreatId=picture.primary?.id??incident.attacker.id;
      this.holdUntilTick=Math.max(this.holdUntilTick,tick+Math.max(1,this.cfg.holdTicks??240));
      const team=this._ensureTeam(prototypeId,incident.victim,tick,picture.score);if(team)this._drive(team,incident.victim,picture.primary,tick);return;
    }

    const team=this._team();if(!team&&this.borrowedTeamIds.length===0){this.activeTeamId=null;return;}
    let victim=this.protectedTargetId?this.entityLookup(this.protectedTargetId):null;
    if(!victim?.alive||!this._protected(victim)){victim=this._owned().filter(e=>this._protected(e)).sort((a,b)=>a.id.localeCompare(b.id))[0]??null;if(victim)this.protectedTargetId=victim.id;}
    if(!victim){this._release(tick);return;}
    const picture=this._threatPicture(victim,this.primaryThreatId?this.entityLookup(this.primaryThreatId):null),liveThreat=picture.primary&&picture.score>0;
    const keep=tick<this.holdUntilTick||tick<this.escortUntilTick||liveThreat;
    if(!keep){this._release(tick);return;}
    if(liveThreat){this.primaryThreatId=picture.primary.id;this.holdUntilTick=Math.max(this.holdUntilTick,tick+Math.max(1,this.cfg.holdTicks??240));}
    const desired=this._responsePrototype(picture.score||0),fallbackPrototype=team?.prototypeId??desired,ensured=this._ensureTeam(desired||fallbackPrototype,victim,tick,picture.score||0)??team;this._drive(ensured,victim,liveThreat?picture.primary:null,tick);
  }

  snapshot(){return clone({nextScanTick:this.nextScanTick,activeTeamId:this.activeTeamId,borrowedTeamIds:this.borrowedTeamIds,protectedTargetId:this.protectedTargetId,primaryThreatId:this.primaryThreatId,holdUntilTick:this.holdUntilTick,escortUntilTick:this.escortUntilTick,lastSeenDamageTick:this.lastSeenDamageTick,incidents:this.incidents});}
  restore(state={}){this.nextScanTick=state.nextScanTick??0;this.activeTeamId=state.activeTeamId??null;this.borrowedTeamIds=clone(state.borrowedTeamIds??[]);this.protectedTargetId=state.protectedTargetId??null;this.primaryThreatId=state.primaryThreatId??null;this.holdUntilTick=state.holdUntilTick??0;this.escortUntilTick=state.escortUntilTick??0;this.lastSeenDamageTick=clone(state.lastSeenDamageTick??{});this.incidents=clone(state.incidents??{});}
}
