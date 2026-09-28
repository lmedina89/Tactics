import {moduleConfig} from '../entities/game-object.js';
import {assignMoveOrder,clearOrders} from '../ai/unit-ai-update.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const clone=v=>structuredClone(v);

export class ResourceSystem{
  constructor({registry,entityLookup,entitiesProvider,interactions,economy,pathfinder}){
    this.registry=registry;this.entityLookup=entityLookup;this.entitiesProvider=entitiesProvider;this.interactions=interactions;this.economy=economy;this.pathfinder=pathfinder;this.serial=0;
  }

  _move(entity,destination){assignMoveOrder(entity,{serial:-(++this.serial),type:'MOVE',destination});}
  _def(entity){return this.registry.definition(entity.definitionId);}
  _collectorCfg(entity){return moduleConfig(this._def(entity),'ResourceCollector');}
  _resourceCfg(entity){return moduleConfig(this._def(entity),'Resource');}
  _dockCfg(entity){return moduleConfig(this._def(entity),'DockingProvider');}
  _pathProfile(entity){const loco=this.registry.locomotor?.(entity?.locomotorId);return {clearance:loco?.pathfindRadius??entity?.radius??0,maxSlopeDeg:loco?.maxSlopeDeg??32,allowWater:loco?.kind==='air'};}

  findHarvestApproach(entity,resource){
    if(!entity?.alive||!entity.collector||!resource?.alive||resource.resourceRemaining<=0)return null;
    const cfg=this._collectorCfg(entity),res=this._resourceCfg(resource);if(!cfg||!res||!(cfg.resourceTypes||[]).includes(res.resourceType))return null;
    const radius=cfg.harvestRadius??5.5,profile=this._pathProfile(entity),loco=this.registry.locomotor?.(entity.locomotorId),reach=Math.max(loco?.arrivalRadius??0.6,(entity.radius??0)*0.35),safeRadius=Math.max(radius*0.35,radius-reach*1.2),base=Math.atan2(entity.x-resource.x,entity.z-resource.z),rings=[0,safeRadius*0.45,safeRadius*0.72,safeRadius],steps=16;
    let best=null,bestScore=Infinity;const seen=new Set();
    for(const r of rings){for(let i=0;i<(r===0?1:steps);i++){const offset=i===0?0:((i+1)>>1)*(i%2?1:-1),a=base+offset*(Math.PI*2/steps),candidate={x:resource.x+Math.sin(a)*r,z:resource.z+Math.cos(a)*r};
      if(!this.pathfinder.isWalkableWorld(candidate.x,candidate.z,profile))continue;
      const snapped=this.pathfinder.nearestWalkable(candidate.x,candidate.z,profile,0);if(!snapped||dist(snapped,resource)>safeRadius+1e-6)continue;const k=`${snapped.x.toFixed(3)},${snapped.z.toFixed(3)}`;if(seen.has(k))continue;seen.add(k);
      const route=this.pathfinder.findPath(entity.x,entity.z,snapped.x,snapped.z,profile);if(!route.length)continue;let routeLength=0;for(let n=1;n<route.length;n++)routeLength+=dist(route[n-1],route[n]);const score=routeLength+dist(snapped,resource)*0.05;
      if(score<bestScore-1e-9||(Math.abs(score-bestScore)<=1e-9&&(snapped.x<(best?.x??Infinity)||(snapped.x===best?.x&&snapped.z<(best?.z??Infinity))))){best=snapped;bestScore=score;}
    }}
    return best;
  }

  cancel(entity,reason='MANUAL_ORDER'){
    const c=entity?.collector;if(!c)return;
    if(c.sessionId)this.interactions.cancel(c.sessionId,reason);
    c.state='IDLE';c.targetResourceId=null;c.targetRefineryId=null;c.sessionId=null;c.resumeResourceId=null;c.harvestApproach=null;c.approachResourceId=null;c.nextApproachRetryTick=0;
  }

  issueHarvest(entity,resource){
    if(!entity?.alive||!entity.collector||!resource?.alive||resource.resourceRemaining<=0)return false;
    const cfg=this._collectorCfg(entity),res=this._resourceCfg(resource);if(!cfg||!res||!(cfg.resourceTypes||[]).includes(res.resourceType))return false;
    const approach=this.findHarvestApproach(entity,resource);if(!approach)return false;
    if(entity.collector.sessionId)this.interactions.cancel(entity.collector.sessionId,'RETARGETED');
    entity.collector.targetResourceId=resource.id;entity.collector.resumeResourceId=resource.id;entity.collector.targetRefineryId=null;entity.collector.sessionId=null;
    entity.collector.harvestApproach=clone(approach);entity.collector.approachResourceId=resource.id;entity.collector.nextApproachRetryTick=0;
    entity.collector.state=entity.collector.cargo>=entity.collector.cargoCapacity-0.001?'RETURNING':'TO_RESOURCE';
    return true;
  }

  issueReturn(entity){if(!entity?.alive||!entity.collector||entity.collector.cargo<=0)return false;entity.collector.state='RETURNING';entity.collector.targetRefineryId=null;return true;}

  _nearestOwnedRefinery(entity){
    let best=null,bestD=Infinity;
    for(const other of this.entitiesProvider()){
      if(!other.alive||other.operational===false||other.playerId!==entity.playerId)continue;const cfg=this._dockCfg(other);if(!cfg)continue;
      const d=dist(entity,other);if(d<bestD){bestD=d;best=other;}
    }
    return best;
  }

  _providerBusy(providerId,exceptSessionId=null){
    const provider=this.entityLookup(providerId),capacity=Math.max(1,this._dockCfg(provider)?.capacity??1);let active=0;
    for(const s of this.interactions.sessions.values())if(!s.complete&&s.providerId===providerId&&s.id!==exceptSessionId)active++;
    return active>=capacity;
  }

  _pointAround(provider,distance,side=0){
    const f={x:Math.sin(provider.yaw),z:Math.cos(provider.yaw)},r={x:Math.cos(provider.yaw),z:-Math.sin(provider.yaw)};
    return {x:provider.x+f.x*distance+r.x*side,z:provider.z+f.z*distance+r.z*side};
  }

  _ensureMove(entity,destination){
    const order=entity.ai?.order,requested=order?.requested;
    if(order?.type==='MOVE'&&requested&&Math.hypot(requested.x-destination.x,requested.z-destination.z)<1.2)return;
    this._move(entity,destination);
  }

  _startReturn(entity){entity.collector.state='RETURNING';entity.collector.targetRefineryId=null;clearOrders(entity);}

  step(dt,tick){
    for(const entity of this.entitiesProvider()){
      if(!entity.alive||!entity.collector)continue;const c=entity.collector,cfg=this._collectorCfg(entity);if(!cfg)continue;
      const full=c.cargo>=c.cargoCapacity-0.001;
      if(c.state==='IDLE')continue;

      if(c.state==='TO_RESOURCE'){
        if(full){this._startReturn(entity);continue;}
        const resource=this.entityLookup(c.targetResourceId);
        if(!resource?.alive||resource.resourceRemaining<=0){c.state='IDLE';c.targetResourceId=null;clearOrders(entity);continue;}
        const radius=cfg.harvestRadius??5.5;
        if(dist(entity,resource)<=radius){clearOrders(entity);c.state='HARVESTING';continue;}
        let approach=c.approachResourceId===resource.id?c.harvestApproach:null;
        const blocked=entity.ai?.state==='BLOCKED';
        if(!approach||(blocked&&tick>=(c.nextApproachRetryTick??0))){approach=this.findHarvestApproach(entity,resource);c.nextApproachRetryTick=tick+30;if(!approach){c.state='IDLE';c.targetResourceId=null;c.harvestApproach=null;c.approachResourceId=null;clearOrders(entity);continue;}c.harvestApproach=clone(approach);c.approachResourceId=resource.id;}
        this._ensureMove(entity,approach);continue;
      }

      if(c.state==='HARVESTING'){
        const resource=this.entityLookup(c.targetResourceId);
        if(!resource?.alive||resource.resourceRemaining<=0){this._startReturn(entity);continue;}
        if(dist(entity,resource)>(cfg.harvestRadius??5.5)*1.35){c.state='TO_RESOURCE';continue;}
        const amount=Math.min((cfg.harvestRatePerSecond??120)*dt,c.cargoCapacity-c.cargo,resource.resourceRemaining);
        c.cargo+=amount;resource.resourceRemaining=Math.max(0,resource.resourceRemaining-amount);
        const player=this.economy.players.get(entity.playerId),resCfg=this._resourceCfg(resource);if(player&&amount>0){player.resourcesHarvested??={};const type=resCfg?.resourceType||'generic';player.resourcesHarvested[type]=(player.resourcesHarvested[type]||0)+amount;}
        if(c.cargo>=c.cargoCapacity-0.001||resource.resourceRemaining<=0)this._startReturn(entity);
        continue;
      }

      if(c.state==='RETURNING'||c.state==='WAIT_DOCK'){
        let refinery=this.entityLookup(c.targetRefineryId);if(!refinery?.alive||refinery.operational===false){refinery=this._nearestOwnedRefinery(entity);c.targetRefineryId=refinery?.id??null;}
        if(!refinery){c.state='IDLE';clearOrders(entity);continue;}
        const dock=this._dockCfg(refinery),foot=moduleConfig(this._def(refinery),'Footprint');
        const approachDistance=dock?.approachDistance??((foot?.depth??18)/2+8),approach=this._pointAround(refinery,approachDistance,dock?.approachSideOffset??0);
        if(this._providerBusy(refinery.id,c.sessionId)){c.state='WAIT_DOCK';this._ensureMove(entity,this._pointAround(refinery,approachDistance+8,8));continue;}
        if(!c.sessionId){
          const s=this.interactions.request(dock.protocol,entity.id,refinery.id,{kind:'resource_unload'});c.sessionId=s.id;
          this.interactions.advance(s.id,'GRANT');this.interactions.advance(s.id,'APPROACH');c.state='RETURNING';
        }
        if(dist(entity,approach)<=Math.max(dock?.approachTolerance??6.5,entity.radius+1)){
          clearOrders(entity);this.interactions.advance(c.sessionId,'ARRIVE');this.interactions.advance(c.sessionId,'BEGIN_UNLOAD');c.state='UNLOADING';continue;
        }
        this._ensureMove(entity,approach);continue;
      }

      if(c.state==='UNLOADING'){
        const refinery=this.entityLookup(c.targetRefineryId),dock=refinery?this._dockCfg(refinery):null;if(!refinery?.alive||refinery.operational===false||!dock){if(c.sessionId)this.interactions.cancel(c.sessionId,'PROVIDER_LOST');c.sessionId=null;this._startReturn(entity);continue;}
        const amount=Math.min(c.cargo,(dock.unloadRatePerSecond??300)*dt);c.cargo-=amount;this.economy.deposit(entity.playerId,amount*(dock.creditPerUnit??1));
        if(c.cargo<=0.001){
          c.cargo=0;this.interactions.advance(c.sessionId,'UNLOAD_COMPLETE');this.interactions.advance(c.sessionId,'EXIT');c.state='EXITING';
          const foot=moduleConfig(this._def(refinery),'Footprint'),exitDistance=dock.exitDistance??((foot?.depth??18)/2+14);c.exitPoint=this._pointAround(refinery,exitDistance,dock.exitSideOffset??-6);this._ensureMove(entity,c.exitPoint);
        }
        continue;
      }

      if(c.state==='EXITING'){
        const refinery=this.entityLookup(c.targetRefineryId),dock=refinery?this._dockCfg(refinery):null;const p=c.exitPoint;if(p&&dist(entity,p)>Math.max(dock?.exitTolerance??6.5,entity.radius+1)){this._ensureMove(entity,p);continue;}
        clearOrders(entity);if(c.sessionId){const s=this.interactions.sessions.get(c.sessionId);if(s&&!s.complete)this.interactions.advance(c.sessionId,'CLEAR');}
        c.sessionId=null;c.targetRefineryId=null;c.exitPoint=null;
        const resource=this.entityLookup(c.resumeResourceId);
        if(resource?.alive&&resource.resourceRemaining>0){c.targetResourceId=resource.id;c.state='TO_RESOURCE';}
        else {c.targetResourceId=null;c.resumeResourceId=null;c.harvestApproach=null;c.approachResourceId=null;c.state='IDLE';}
      }
    }
  }

  snapshot(){return {serial:this.serial};}
  restore(state){this.serial=state?.serial??0;}
}
