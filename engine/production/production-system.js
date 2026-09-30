import {moduleConfig} from '../entities/game-object.js';
import {assignMoveOrder,clearOrders} from '../ai/unit-ai-update.js';

const clone=v=>structuredClone(v);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

const DEFAULT_CLEAR_STALL_TICKS=90;
const DEFAULT_CLEAR_MAX_TICKS=360;
const DEFAULT_RALLY_STALL_TICKS=300;
const DEFAULT_MAX_RECOVERY_ATTEMPTS=3;

export class ProductionSystem{
  constructor({registry,entityLookup,entitiesProvider,economy,interactions,pathfinder,spawnEntity}){
    this.registry=registry;this.entityLookup=entityLookup;this.entitiesProvider=entitiesProvider;this.economy=economy;this.interactions=interactions;this.pathfinder=pathfinder;this.spawnEntity=spawnEntity;this.serial=0;this.rollouts=new Map();
  }

  _def(e){return this.registry.definition(e.definitionId);}
  _prodCfg(e){return moduleConfig(this._def(e),'Production');}
  _costCfg(def){return moduleConfig(def,'ProductionCost');}
  _pointAround(provider,distance,side=0){const f={x:Math.sin(provider.yaw),z:Math.cos(provider.yaw)},r={x:Math.cos(provider.yaw),z:-Math.sin(provider.yaw)};return {x:provider.x+f.x*distance+r.x*side,z:provider.z+f.z*distance+r.z*side};}

  canQueue(producerId,definitionId){
    const producer=this.entityLookup(producerId),def=this.registry.definition(definitionId);if(!producer?.alive||producer.operational===false||!def||producer.playerId==null)return {ok:false,reason:'INVALID'};
    const cfg=this._prodCfg(producer),cost=this._costCfg(def);if(!cfg||!cost)return {ok:false,reason:'NOT_PRODUCIBLE'};
    if(!(cfg.buildable||[]).includes(definitionId)||cost.queueType!==cfg.queueType)return {ok:false,reason:'NOT_ALLOWED'};
    const queue=producer.production?.queue;if(!queue)return {ok:false,reason:'NO_QUEUE'};
    if(queue.length>=(cfg.queueLimit??5))return {ok:false,reason:'QUEUE_FULL'};
    if(!this.economy.canAfford(producer.playerId,cost.credits??0))return {ok:false,reason:'INSUFFICIENT_CREDITS'};
    return {ok:true,reason:'OK',cost:cost.credits??0};
  }

  queue(producerId,definitionId,tick){
    const check=this.canQueue(producerId,definitionId);if(!check.ok)return check;
    const producer=this.entityLookup(producerId),def=this.registry.definition(definitionId);
    const cost=this._costCfg(def),queue=producer.production.queue;
    if(!this.economy.withdraw(producer.playerId,cost.credits??0))return {ok:false,reason:'INSUFFICIENT_CREDITS'};
    const entry={id:`prod:${producer.id}:${++this.serial}`,definitionId,cost:cost.credits??0,buildTimeTicks:Math.max(1,Math.round((cost.buildTimeSeconds??5)*30)),progressTicks:0,state:'QUEUED',queuedTick:tick,waitingExitSinceTick:null,waitReason:null};queue.push(entry);return {ok:true,entry};
  }

  cancelLast(producerId){
    const producer=this.entityLookup(producerId),q=producer?.production?.queue;if(!q?.length)return false;const entry=q.pop();this.economy.deposit(producer.playerId,entry.cost??0);return true;
  }

  // Only the physical factory-clearing stage owns the exit reservation. A unit
  // already travelling to its rally point must never block the next build.
  _exitReserved(producerId){for(const r of this.rollouts.values())if(r.producerId===producerId&&r.stage==='CLEARING')return true;return false;}

  _profileForDefinition(def){const loco=moduleConfig(def,'Locomotor'),cfg=loco?this.registry.locomotor(loco.locomotor):null;return {clearance:cfg?.pathfindRadius??cfg?.radius??0,maxSlopeDeg:cfg?.maxSlopeDeg??32,allowWater:cfg?.kind==='air'};}
  _locoForDefinition(def){const binding=moduleConfig(def,'Locomotor');return binding?this.registry.locomotor(binding.locomotor):null;}

  _groundSpaceOccupied(point,radius,ignoreIds=new Set()){
    for(const e of this.entitiesProvider()){
      if(!e?.alive||ignoreIds.has(e.id)||!(e.radius>0))continue;
      const loco=e.locomotorId?this.registry.locomotor(e.locomotorId):null;if(loco?.kind==='air')continue;
      if(Math.hypot(e.x-point.x,e.z-point.z)<radius+(e.radius??0)+0.8)return true;
    }
    return false;
  }

  _rolloutOffsets(producer,def,cfg){
    const foot=moduleConfig(this._def(producer),'Footprint'),loco=this._locoForDefinition(def),base=cfg.exitSideOffset??0;
    const step=Math.max(5,(foot?.width??18)*0.24,(loco?.radius??1)*3.2);
    return [base,base+step,base-step,base+step*2,base-step*2];
  }

  _findSpawnPlan(producer,def,cfg){
    const foot=moduleConfig(this._def(producer),'Footprint'),loco=this._locoForDefinition(def),profile=this._profileForDefinition(def);
    const exitDistance=cfg.exitDistance??((foot?.depth??18)/2+(loco?.radius??1)+4),baseClearDistance=Math.max(exitDistance+5,(foot?.depth??18)/2+(loco?.radius??1)+7),baseRallyDistance=Math.max(cfg.rallyDistance??exitDistance+16,baseClearDistance+6);
    const offsets=this._rolloutOffsets(producer,def,cfg),distanceOffsets=[0,4];const seen=new Set();
    for(const extraDistance of distanceOffsets){
      for(const side of offsets){
        const candidateExitDistance=exitDistance+extraDistance,rawExit=this._pointAround(producer,candidateExitDistance,side),exit=this.pathfinder.nearestWalkable(rawExit.x,rawExit.z,profile,8);if(!exit)continue;
        const k=`${exit.x.toFixed(3)},${exit.z.toFixed(3)}`;if(seen.has(k))continue;seen.add(k);
        if(this._groundSpaceOccupied(exit,loco?.radius??1))continue;
        const clearDistance=Math.max(baseClearDistance,candidateExitDistance+5),clearRaw=this._pointAround(producer,clearDistance,side),clear=this.pathfinder.nearestWalkable(clearRaw.x,clearRaw.z,profile,8);if(!clear)continue;
        if(!this.pathfinder.findPath(exit.x,exit.z,clear.x,clear.z,profile).length)continue;
        const rallyDistance=Math.max(baseRallyDistance,clearDistance+6),rallyRaw=this._pointAround(producer,rallyDistance,cfg.rallySideOffset??side),candidateRally=this.pathfinder.nearestWalkable(rallyRaw.x,rallyRaw.z,profile,8);
        const rally=candidateRally&&this.pathfinder.findPath(clear.x,clear.z,candidateRally.x,candidateRally.z,profile).length?candidateRally:clear;
        return {exit,clear,rally,side};
      }
    }
    return null;
  }

  _findRecoveryPlan(producer,unit,cfg,attempt){
    const def=this.registry.definition(unit.definitionId),foot=moduleConfig(this._def(producer),'Footprint'),loco=this._locoForDefinition(def),profile=this._profileForDefinition(def),offsets=this._rolloutOffsets(producer,def,cfg);
    const exitDistance=cfg.exitDistance??((foot?.depth??18)/2+(loco?.radius??1)+4),clearDistance=Math.max(exitDistance+5,(foot?.depth??18)/2+(loco?.radius??1)+7),rallyDistance=Math.max(cfg.rallyDistance??exitDistance+16,clearDistance+6);
    for(let i=0;i<offsets.length;i++){
      const side=offsets[(attempt+i)%offsets.length],clearRaw=this._pointAround(producer,clearDistance+Math.min(attempt,2)*3,side),clear=this.pathfinder.nearestWalkable(clearRaw.x,clearRaw.z,profile,8);if(!clear)continue;
      if(!this.pathfinder.findPath(unit.x,unit.z,clear.x,clear.z,profile).length)continue;
      const rallyRaw=this._pointAround(producer,rallyDistance+Math.min(attempt,2)*3,cfg.rallySideOffset??side),candidateRally=this.pathfinder.nearestWalkable(rallyRaw.x,rallyRaw.z,profile,8);
      const rally=candidateRally&&this.pathfinder.findPath(clear.x,clear.z,candidateRally.x,candidateRally.z,profile).length?candidateRally:clear;
      return {clear,rally};
    }
    return null;
  }

  _spawnCompleted(producer,entry,cfg,tick){
    const def=this.registry.definition(entry.definitionId),plan=this._findSpawnPlan(producer,def,cfg);if(!plan)return {unit:null,reason:'EXIT_BLOCKED'};
    const id=`${producer.playerId}_${entry.definitionId}_${++this.serial}`;const unit=this.spawnEntity({id,definition:entry.definitionId,owner:producer.playerId,x:plan.exit.x,z:plan.exit.z,yaw:producer.yaw,producerId:producer.id});
    let sessionId=null;
    if(cfg.rolloutProtocol){const s=this.interactions.request(cfg.rolloutProtocol,unit.id,producer.id,{productionId:entry.id});sessionId=s.id;this.interactions.advance(s.id,'GRANT_EXIT');this.interactions.advance(s.id,'BEGIN_EXIT');}
    unit.productionExit={producerId:producer.id,sessionId,stage:'CLEARING',clearPoint:plan.clear,rallyPoint:plan.rally};assignMoveOrder(unit,{serial:-(++this.serial),type:'MOVE',destination:plan.clear});
    this.rollouts.set(unit.id,{unitId:unit.id,producerId:producer.id,sessionId,stage:'CLEARING',clearPoint:plan.clear,rallyPoint:plan.rally,startedTick:tick,stageTick:tick,lastProgressTick:tick,lastDistance:dist(unit,plan.clear),recoveryAttempts:0});return {unit,reason:'OK'};
  }

  _advanceInteraction(sessionId,event){
    if(!sessionId)return;const s=this.interactions.sessions.get(sessionId);if(s&&!s.complete)this.interactions.advance(sessionId,event);
  }

  _beginRally(unit,r,tick){
    this._advanceInteraction(r.sessionId,'CLEAR_BUILDING');r.stage='RALLYING';r.stageTick=tick;r.lastProgressTick=tick;r.lastDistance=dist(unit,r.rallyPoint);r.recoveryAttempts=0;
    if(unit.productionExit){unit.productionExit.stage='RALLYING';unit.productionExit.clearPoint=clone(r.clearPoint);unit.productionExit.rallyPoint=clone(r.rallyPoint);}
    this._advanceInteraction(r.sessionId,'RALLY');clearOrders(unit);assignMoveOrder(unit,{serial:-(++this.serial),type:'MOVE',destination:r.rallyPoint});
  }

  _finishRollout(unit,id,r){
    clearOrders(unit);this._advanceInteraction(r.sessionId,'ARRIVE');unit.productionExit=null;this.rollouts.delete(id);
  }

  _abortRollout(unit,id,r,reason){
    // Do not erase a player/AI command that may have intentionally overridden the
    // presentation-only rally move. Negative serials are ProductionSystem orders.
    if((unit.ai?.order?.serial??0)<0)clearOrders(unit);if(r.sessionId){const s=this.interactions.sessions.get(r.sessionId);if(s&&!s.complete)this.interactions.cancel(r.sessionId,reason);}unit.productionExit=null;this.rollouts.delete(id);
  }

  _recordProgress(r,distance,tick){
    if(r.lastDistance==null||distance<r.lastDistance-0.15){r.lastDistance=distance;r.lastProgressTick=tick;return true;}return false;
  }

  _stepRollouts(tick){
    for(const [id,r] of [...this.rollouts]){
      const unit=this.entityLookup(id);if(!unit?.alive){if(r.sessionId)this.interactions.cancel(r.sessionId,'UNIT_LOST');this.rollouts.delete(id);continue;}
      r.startedTick??=tick;r.stageTick??=tick;r.lastProgressTick??=tick;r.recoveryAttempts??=0;
      if(r.stage==='CLEARING'){
        const distance=dist(unit,r.clearPoint);this._recordProgress(r,distance,tick);
        if(distance<=Math.max(2.2,unit.radius+1)){this._beginRally(unit,r,tick);continue;}
        const producer=this.entityLookup(r.producerId),cfg=producer?this._prodCfg(producer):null,stallTicks=cfg?.rolloutClearStallTicks??DEFAULT_CLEAR_STALL_TICKS,maxTicks=cfg?.rolloutClearMaxTicks??DEFAULT_CLEAR_MAX_TICKS,maxAttempts=cfg?.rolloutMaxRecoveryAttempts??DEFAULT_MAX_RECOVERY_ATTEMPTS;
        if(producer&&cfg&&tick-r.lastProgressTick>=stallTicks&&r.recoveryAttempts<maxAttempts){
          const plan=this._findRecoveryPlan(producer,unit,cfg,r.recoveryAttempts+1);r.recoveryAttempts++;r.lastProgressTick=tick;
          if(plan){r.clearPoint=plan.clear;r.rallyPoint=plan.rally;r.lastDistance=dist(unit,r.clearPoint);if(unit.productionExit){unit.productionExit.clearPoint=clone(plan.clear);unit.productionExit.rallyPoint=clone(plan.rally);}clearOrders(unit);assignMoveOrder(unit,{serial:-(++this.serial),type:'MOVE',destination:r.clearPoint});}
        }
        if(tick-r.stageTick>=maxTicks){this._abortRollout(unit,id,r,'EXIT_RECOVERY_TIMEOUT');continue;}
        continue;
      }
      if(r.stage==='RALLYING'){
        const distance=dist(unit,r.rallyPoint);this._recordProgress(r,distance,tick);
        if(distance<=Math.max(2.2,unit.radius+1)){this._finishRollout(unit,id,r);continue;}
        const producer=this.entityLookup(r.producerId),cfg=producer?this._prodCfg(producer):null,stallTicks=cfg?.rolloutRallyStallTicks??DEFAULT_RALLY_STALL_TICKS;
        // Rally movement is presentation/traffic-clearing work, not factory ownership.
        // If it cannot finish, release the produced unit rather than leaking rollout state.
        if(tick-r.lastProgressTick>=stallTicks){this._abortRollout(unit,id,r,'RALLY_RECOVERY_TIMEOUT');continue;}
      }
    }
  }

  step(tick){
    for(const producer of this.entitiesProvider()){
      if(!producer.alive||producer.operational===false||!producer.production?.queue?.length)continue;const cfg=this._prodCfg(producer),entry=producer.production.queue[0];if(!cfg)continue;
      if(entry.progressTicks+1e-6<entry.buildTimeTicks){entry.state='BUILDING';entry.waitReason=null;entry.waitingExitSinceTick=null;entry.progressTicks=Math.min(entry.buildTimeTicks,entry.progressTicks+this.economy.productionRateFactor(producer.playerId));if(entry.progressTicks+1e-6<entry.buildTimeTicks)continue;}
      entry.state='WAITING_EXIT';entry.waitingExitSinceTick??=tick;
      if(this._exitReserved(producer.id)){entry.waitReason='EXIT_RESERVED';continue;}
      const result=this._spawnCompleted(producer,entry,cfg,tick);if(!result.unit){entry.waitReason=result.reason;continue;}producer.production.queue.shift();
    }
    this._stepRollouts(tick);
  }

  snapshot(){return {serial:this.serial,rollouts:[...this.rollouts.values()].map(clone)};}
  restore(state){this.serial=state?.serial??0;this.rollouts=new Map((state?.rollouts||[]).map(r=>[r.unitId,clone(r)]));}
}
