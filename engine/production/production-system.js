import {moduleConfig} from '../entities/game-object.js';
import {assignMoveOrder,clearOrders} from '../ai/unit-ai-update.js';

const clone=v=>structuredClone(v);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

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
    const cfg=this._prodCfg(producer),cost=this._costCfg(def),queue=producer.production.queue;
    if(!this.economy.withdraw(producer.playerId,cost.credits??0))return {ok:false,reason:'INSUFFICIENT_CREDITS'};
    const entry={id:`prod:${producer.id}:${++this.serial}`,definitionId,cost:cost.credits??0,buildTimeTicks:Math.max(1,Math.round((cost.buildTimeSeconds??5)*30)),progressTicks:0,state:'QUEUED',queuedTick:tick};queue.push(entry);return {ok:true,entry};
  }

  cancelLast(producerId){
    const producer=this.entityLookup(producerId),q=producer?.production?.queue;if(!q?.length)return false;const entry=q.pop();this.economy.deposit(producer.playerId,entry.cost??0);return true;
  }

  _exitReserved(producerId){for(const r of this.rollouts.values())if(r.producerId===producerId)return true;return false;}

  _profileForDefinition(def){const loco=moduleConfig(def,'Locomotor'),cfg=loco?this.registry.locomotor(loco.locomotor):null;return {clearance:cfg?.pathfindRadius??cfg?.radius??0,maxSlopeDeg:cfg?.maxSlopeDeg??32,allowWater:cfg?.kind==='air'};}

  _spawnCompleted(producer,entry,cfg){
    const def=this.registry.definition(entry.definitionId),foot=moduleConfig(this._def(producer),'Footprint'),locoBinding=moduleConfig(def,'Locomotor'),loco=locoBinding?this.registry.locomotor(locoBinding.locomotor):null;
    const exitDistance=cfg.exitDistance??((foot?.depth??18)/2+(loco?.radius??1)+4),rallyDistance=cfg.rallyDistance??exitDistance+16;
    const rawExit=this._pointAround(producer,exitDistance,cfg.exitSideOffset??0),exit=this.pathfinder.nearestWalkable(rawExit.x,rawExit.z,this._profileForDefinition(def));if(!exit)return null;
    const id=`${producer.playerId}_${entry.definitionId}_${++this.serial}`;const unit=this.spawnEntity({id,definition:entry.definitionId,owner:producer.playerId,x:exit.x,z:exit.z,yaw:producer.yaw,producerId:producer.id});
    const rallyRaw=this._pointAround(producer,rallyDistance,cfg.rallySideOffset??0),rally=this.pathfinder.nearestWalkable(rallyRaw.x,rallyRaw.z,this._profileForDefinition(def))||rallyRaw;
    const clearRaw=this._pointAround(producer,Math.max(exitDistance+5,(foot?.depth??18)/2+(loco?.radius??1)+7),cfg.exitSideOffset??0),clear=this.pathfinder.nearestWalkable(clearRaw.x,clearRaw.z,this._profileForDefinition(def))||clearRaw;
    let sessionId=null;
    if(cfg.rolloutProtocol){const s=this.interactions.request(cfg.rolloutProtocol,unit.id,producer.id,{productionId:entry.id});sessionId=s.id;this.interactions.advance(s.id,'GRANT_EXIT');this.interactions.advance(s.id,'BEGIN_EXIT');}
    unit.productionExit={producerId:producer.id,sessionId,stage:'CLEARING',clearPoint:clear,rallyPoint:rally};assignMoveOrder(unit,{serial:-(++this.serial),type:'MOVE',destination:clear});
    this.rollouts.set(unit.id,{unitId:unit.id,producerId:producer.id,sessionId,stage:'CLEARING',clearPoint:clear,rallyPoint:rally});return unit;
  }

  _stepRollouts(){
    for(const [id,r] of [...this.rollouts]){
      const unit=this.entityLookup(id);if(!unit?.alive){if(r.sessionId)this.interactions.cancel(r.sessionId,'UNIT_LOST');this.rollouts.delete(id);continue;}
      if(r.stage==='CLEARING'){
        if(dist(unit,r.clearPoint)>Math.max(2.2,unit.radius+1))continue;
        clearOrders(unit);if(r.sessionId)this.interactions.advance(r.sessionId,'CLEAR_BUILDING');r.stage='RALLYING';unit.productionExit.stage='RALLYING';if(r.sessionId)this.interactions.advance(r.sessionId,'RALLY');assignMoveOrder(unit,{serial:-(++this.serial),type:'MOVE',destination:r.rallyPoint});continue;
      }
      if(r.stage==='RALLYING'&&dist(unit,r.rallyPoint)<=Math.max(2.2,unit.radius+1)){
        clearOrders(unit);if(r.sessionId){const s=this.interactions.sessions.get(r.sessionId);if(s&&!s.complete)this.interactions.advance(r.sessionId,'ARRIVE');}unit.productionExit=null;this.rollouts.delete(id);
      }
    }
  }

  step(tick){
    for(const producer of this.entitiesProvider()){
      if(!producer.alive||producer.operational===false||!producer.production?.queue?.length)continue;const cfg=this._prodCfg(producer),entry=producer.production.queue[0];if(!cfg)continue;
      entry.state='BUILDING';entry.progressTicks+=this.economy.productionRateFactor(producer.playerId);
      if(entry.progressTicks+1e-6<entry.buildTimeTicks)continue;
      entry.state='WAITING_EXIT';if(this._exitReserved(producer.id))continue;const unit=this._spawnCompleted(producer,entry,cfg);if(!unit)continue;producer.production.queue.shift();
    }
    this._stepRollouts();
  }

  snapshot(){return {serial:this.serial,rollouts:[...this.rollouts.values()].map(clone)};}
  restore(state){this.serial=state?.serial??0;this.rollouts=new Map((state?.rollouts||[]).map(r=>[r.unitId,clone(r)]));}
}
