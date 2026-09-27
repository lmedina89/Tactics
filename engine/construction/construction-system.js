import {moduleConfig,footprintOf} from '../entities/game-object.js';
import {assignMoveOrder,clearOrders} from '../ai/unit-ai-update.js';
import {TechTreeSystem} from './tech-tree.js';
import {PlacementValidator} from './placement-validator.js';

const clone=v=>structuredClone(v);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export class ConstructionSystem{
  constructor({registry,map,terrain,economy,entityLookup,entitiesProvider,pathfinder,spawnEntity,removeEntity}){
    this.registry=registry;this.map=map;this.terrain=terrain;this.economy=economy;this.entityLookup=entityLookup;this.entitiesProvider=entitiesProvider;this.pathfinder=pathfinder;this.spawnEntity=spawnEntity;this.removeEntity=removeEntity;this.serial=0;
    this.techTree=new TechTreeSystem({registry,economy,entityLookup,entitiesProvider});
    this.placement=new PlacementValidator({registry,map,terrain,entityLookup,entitiesProvider});
  }

  eligibility(sourceId,definitionId,playerId=null){const source=this.entityLookup(sourceId);return this.techTree.status({playerId:playerId??source?.playerId,sourceId,definitionId});}
  validatePlacement(sourceId,definitionId,x,z,yaw=0,playerId=null){
    const source=this.entityLookup(sourceId),pid=playerId??source?.playerId,tech=this.techTree.status({playerId:pid,sourceId,definitionId});if(!tech.ok)return tech;
    return this.placement.validate({playerId:pid,sourceId,definitionId,x,z,yaw});
  }

  begin({sourceId,definitionId,x,z,yaw=0},tick){
    const source=this.entityLookup(sourceId),playerId=source?.playerId,tech=this.techTree.status({playerId,sourceId,definitionId});if(!tech.ok)return tech;
    const place=this.placement.validate({playerId,sourceId,definitionId,x,z,yaw});if(!place.ok)return place;
    const def=this.registry.definition(definitionId),cfg=moduleConfig(def,'Construction'),cost=Math.max(0,cfg.credits??0);if(!this.economy.withdraw(playerId,cost))return {ok:false,reason:'INSUFFICIENT_CREDITS'};
    const id=`${playerId}_${definitionId}_site_${++this.serial}`;
    const buildTimeTicks=Math.max(1,Math.round((cfg.buildTimeSeconds??8)*30));
    const site=this.spawnEntity({id,definition:definitionId,owner:playerId,x,z,yaw,construction:{state:'FOUNDATION',sourceId,cost,buildTimeTicks,progressTicks:0,previousProgress:0,startedTick:tick,refundFraction:cfg.refundFraction??0.75,socketIndex:null}});
    site.operational=false;site.construction=site.construction||{state:'FOUNDATION',sourceId,cost,buildTimeTicks,progressTicks:0,previousProgress:0,startedTick:tick,refundFraction:cfg.refundFraction??0.75,socketIndex:null};
    const startFraction=Math.max(.02,Math.min(.5,cfg.startHealthFraction??.08));site.health=Math.max(1,site.maxHealth*startFraction);site.construction.startHealth=site.health;site.construction.lastHealthCap=site.health;
    return {ok:true,site};
  }

  cancel(siteId,playerId){
    const site=this.entityLookup(siteId);if(!site?.alive||site.playerId!==playerId||site.operational!==false||!site.construction)return {ok:false,reason:'NOT_CONSTRUCTION_SITE'};
    const refund=Math.round((site.construction.cost??0)*(site.construction.refundFraction??.75));this.economy.deposit(playerId,refund);this.removeEntity(site.id);return {ok:true,refund};
  }

  _worldSockets(site,cfg){
    const sockets=cfg.sockets?.length?cfg.sockets:[{x:0,z:-(footprintOf(this.registry.definition(site.definitionId))?.depth??12)/2-4}];
    const c=Math.cos(site.yaw),s=Math.sin(site.yaw);return sockets.map((p,i)=>({i,x:site.x+p.x*c+p.z*s,z:site.z-p.x*s+p.z*c}));
  }

  _mobileBuilderReady(source,site,cfg){
    const sockets=this._worldSockets(site,cfg);let socket=null;
    if(site.construction.socketIndex!=null)socket=sockets.find(s=>s.i===site.construction.socketIndex)||null;
    if(!socket){socket=sockets.sort((a,b)=>dist(source,a)-dist(source,b))[0];site.construction.socketIndex=socket?.i??0;}
    if(!socket)return false;
    const tolerance=cfg.socketTolerance??Math.max(2.5,source.radius+1.2);
    if(dist(source,socket)<=tolerance){clearOrders(source);return true;}
    const order=source.ai?.order?.requested;if(!order||Math.hypot(order.x-socket.x,order.z-socket.z)>1.2)assignMoveOrder(source,{serial:-(++this.serial),type:'MOVE',destination:{x:socket.x,z:socket.z}});
    return false;
  }

  _advanceHealth(site,cfg,progressRatio){
    const start=site.construction.startHealth??site.maxHealth*(cfg.startHealthFraction??.08),cap=start+(site.maxHealth-start)*progressRatio,old=site.construction.lastHealthCap??start;
    if(cap>old)site.health=Math.min(site.maxHealth,site.health+(cap-old));site.construction.lastHealthCap=cap;
  }

  step(tick){
    for(const site of this.entitiesProvider()){
      if(!site.alive||site.operational!==false||!site.construction)continue;const def=this.registry.definition(site.definitionId),cfg=def?moduleConfig(def,'Construction'):null;if(!cfg)continue;
      const source=this.entityLookup(site.construction.sourceId),sourceDef=source?this.registry.definition(source.definitionId):null,builder=sourceDef?moduleConfig(sourceDef,'Builder'):null;
      if(!source?.alive||source.playerId!==site.playerId||source.operational===false||!builder){site.construction.state='PAUSED_NO_BUILDER';continue;}
      let ready=true;if(builder.style==='mobile')ready=this._mobileBuilderReady(source,site,cfg);if(!ready){site.construction.state='WAITING_BUILDER';continue;}
      site.construction.state='CONSTRUCTING';const rate=Math.max(.01,builder.buildRate??1);site.construction.progressTicks=Math.min(site.construction.buildTimeTicks,site.construction.progressTicks+rate);
      const ratio=site.construction.progressTicks/site.construction.buildTimeTicks;this._advanceHealth(site,cfg,ratio);
      if(ratio<1)continue;
      site.operational=true;site.construction.state='COMPLETE';site.construction.completedTick=tick;site.health=Math.min(site.maxHealth,site.health);
      if(builder.style==='mobile')clearOrders(source);
    }
  }

  snapshot(){return {serial:this.serial};}
  restore(state){this.serial=state?.serial??0;}
}
