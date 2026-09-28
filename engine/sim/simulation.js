import {CommandType,CommandSource} from '../commands/command-bus.js';
import {GridPathfinder} from '../pathfinding/grid-pathfinder.js';
import {stepLocomotor} from '../locomotion/locomotor.js';
import {SeededRng} from './rng.js';
import {TerrainSampler} from '../maps/terrain-sampler.js';
import {assignMoveOrder,assignAttackOrder,assignAttackMoveOrder,assignGuardPositionOrder,assignGuardObjectOrder,setUnitStance,clearOrders,stepUnitAI} from '../ai/unit-ai-update.js';
import {createGameObjectRuntime,footprintOf} from '../entities/game-object.js';
import {InteractionManager} from '../interactions/interaction-protocol.js';
import {ProjectileSystem} from '../combat/projectile-system.js';
import {CombatSystem} from '../combat/weapon-system.js';
import {FactionEconomySystem} from '../economy/faction-economy.js';
import {ResourceSystem} from '../economy/resource-system.js';
import {ProductionSystem} from '../production/production-system.js';
import {ConstructionSystem} from '../construction/construction-system.js';

export const FIXED_DT=1/30;

export class Simulation{
  constructor({registry,map,commandBus}){
    this.registry=registry;this.map=map;this.commandBus=commandBus;
    this.tick=0;this.entities=new Map();this.players=new Map();this.rng=new SeededRng(map.seed??1);this.lastCommandResult=null;this.defaultIssuerPlayerId=map.players?.find(p=>p.isHuman)?.id??map.players?.[0]?.id??null;
    for(const p of map.players||[])this.players.set(p.id,{id:p.id,factionId:p.faction,isHuman:!!p.isHuman,credits:p.startingCredits??0,powerProduced:0,powerUsed:0,lowPower:false,resourcesHarvested:{}});
    this.regionStates=new Map();
    const region=map.region||{id:map.id};
    this.regionStates.set(region.id,{id:region.id,owner:region.strategic?.owner??null,threat:region.strategic?.threat??0,resourceValue:region.strategic?.resourceValue??0,aiActivity:region.strategic?.aiActivity??0,discoveredBy:[...(region.strategic?.discoveredBy||[])]});
    this.terrain=new TerrainSampler(map);
    this.navigationMap=this._buildNavigationMap(map);
    this.pathfinder=new GridPathfinder(this.navigationMap,this.terrain,map.navigation?.cellSize??4);
    this._spawnMap();
    this.interactions=new InteractionManager({registry:this.registry,entityLookup:id=>this.entities.get(id)});
    this.projectiles=new ProjectileSystem();
    this.combat=new CombatSystem({registry:this.registry,entityLookup:id=>this.entities.get(id),projectiles:this.projectiles}).bindEntitiesProvider(()=>this.entities.values());
    this.economy=new FactionEconomySystem({registry:this.registry,players:this.players,entitiesProvider:()=>this.entities.values()});
    this.resources=new ResourceSystem({registry:this.registry,entityLookup:id=>this.entities.get(id),entitiesProvider:()=>this.entities.values(),interactions:this.interactions,economy:this.economy,pathfinder:this.pathfinder});
    this.production=new ProductionSystem({registry:this.registry,entityLookup:id=>this.entities.get(id),entitiesProvider:()=>this.entities.values(),economy:this.economy,interactions:this.interactions,pathfinder:this.pathfinder,spawnEntity:o=>this._spawnEntity(o)});
    this.construction=new ConstructionSystem({registry:this.registry,map:this.map,terrain:this.terrain,economy:this.economy,entityLookup:id=>this.entities.get(id),entitiesProvider:()=>this.entities.values(),pathfinder:this.pathfinder,spawnEntity:o=>this._spawnEntity(o),removeEntity:id=>this._removeEntity(id)});
  }

  _buildNavigationMap(map){const nav=structuredClone(map);nav.staticObstacles=[...(map.staticObstacles||[])];return nav;}

  _spawnMap(){
    for(const o of this.map.objects||[])this._spawnEntity(o);
    for(const r of this.map.resourceFields||[])this._spawnEntity({id:r.id,definition:r.definition,owner:null,x:r.x,z:r.z,yaw:r.yaw||0,resourceRemaining:r.capacity});
  }

  _registerObstacle(entity){
    const def=this.registry.definition(entity.definitionId),foot=def?footprintOf(def):null;if(!foot||entity.kind!=='building')return;
    this.pathfinder.addDynamicObstacle(entity.id,{x:entity.x,z:entity.z,width:foot.width,depth:foot.depth,yaw:entity.yaw||0});
  }

  _spawnEntity(o){
    const def=this.registry.definition(o.definition);if(!def)throw new Error(`Unknown definition ${o.definition}`);
    const player=o.owner?this.players.get(o.owner):null;
    const entity=createGameObjectRuntime({definition:def,spawn:o,player,registry:this.registry,terrain:this.terrain});this.entities.set(o.id,entity);this._registerObstacle(entity);return entity;
  }

  _removeEntity(id){const e=this.entities.get(id);if(!e)return false;this.pathfinder.removeDynamicObstacle(id);this.entities.delete(id);return true;}
  _rebuildDynamicObstacles(){this.pathfinder.clearDynamicObstacles();for(const e of this.entities.values())this._registerObstacle(e);}

  _commandMeta(options={}){return {issuerPlayerId:options.issuerPlayerId??this.defaultIssuerPlayerId,commandSource:options.commandSource??CommandSource.PLAYER,append:!!options.append};}
  issueMove(entityIds,destination,options={}){return this.commandBus.issue({type:CommandType.MOVE,entityIds,destination,...this._commandMeta(options)});}
  issueStop(entityIds,options={}){return this.commandBus.issue({type:CommandType.STOP,entityIds,...this._commandMeta(options),append:false});}
  issueAttack(entityIds,targetId,options={}){return this.commandBus.issue({type:CommandType.ATTACK,entityIds,targetId,...this._commandMeta(options)});}
  issueAttackMove(entityIds,destination,options={}){return this.commandBus.issue({type:CommandType.ATTACK_MOVE,entityIds,destination,...this._commandMeta(options)});}
  issueGuardPosition(entityIds,position,options={}){return this.commandBus.issue({type:CommandType.GUARD_POSITION,entityIds,position,...this._commandMeta(options)});}
  issueGuardObject(entityIds,targetId,options={}){return this.commandBus.issue({type:CommandType.GUARD_OBJECT,entityIds,targetId,...this._commandMeta(options)});}
  issueSetStance(entityIds,stance,options={}){return this.commandBus.issue({type:CommandType.SET_STANCE,entityIds,stance,...this._commandMeta(options),append:false});}
  issueHarvest(entityIds,resourceId,options={}){return this.commandBus.issue({type:CommandType.HARVEST,entityIds,resourceId,...this._commandMeta(options),append:false});}
  issueReturnCargo(entityIds,options={}){return this.commandBus.issue({type:CommandType.RETURN_CARGO,entityIds,...this._commandMeta(options),append:false});}
  issueProduce(producerId,definitionId,options={}){return this.commandBus.issue({type:CommandType.PRODUCE,producerId,definitionId,...this._commandMeta(options),append:false});}
  issueCancelProduction(producerId,options={}){return this.commandBus.issue({type:CommandType.CANCEL_PRODUCTION,producerId,...this._commandMeta(options),append:false});}
  issueBuildStructure(sourceId,definitionId,{x,z,yaw=0,issuerPlayerId=this.defaultIssuerPlayerId,commandSource=CommandSource.PLAYER}={}){return this.commandBus.issue({type:CommandType.BUILD_STRUCTURE,sourceId,definitionId,x,z,yaw,issuerPlayerId,commandSource,append:false});}
  issueCancelConstruction(siteId,options={}){return this.commandBus.issue({type:CommandType.CANCEL_CONSTRUCTION,siteId,...this._commandMeta(options),append:false});}
  previewBuild(sourceId,definitionId,{x,z,yaw=0}){return this.construction.validatePlacement(sourceId,definitionId,x,z,yaw);}

  step(dt=FIXED_DT){
    for(const c of this.commandBus.drain())this._apply(c);
    this.construction.step(this.tick);
    this.economy.recalculatePower();
    this.resources.step(dt,this.tick);
    this.production.step(this.tick);
    for(const e of this.entities.values()){
      if(!e.alive||!e.locomotorId)continue;
      const cfg=this.registry.locomotor(e.locomotorId);
      if(e.modules?.UnitAIUpdate)stepUnitAI(e,cfg,this.pathfinder,this.tick,{registry:this.registry,entityLookup:id=>this.entities.get(id),entitiesProvider:()=>this.entities.values()});
      stepLocomotor(e,cfg,dt,this.terrain);
    }
    this._separateFriendlies();
    this.combat.step(dt,this.tick);
    this.interactions.pruneCompleted?.(64);
    this.tick++;
  }

  _authorized(c,entity){
    if(!entity)return false;
    if(c.commandSource===CommandSource.SYSTEM)return true;
    if(c.commandSource===CommandSource.SCRIPT&&c.issuerPlayerId==null)return true;
    return c.issuerPlayerId!=null&&entity.playerId===c.issuerPlayerId;
  }

  _finishCommand(c,{applied=0,rejected=[],reason=null,...extra}={}){
    const ok=applied>0||extra.ok===true;const result={serial:c.serial,type:c.type,ok,applied,rejected,...extra};
    if(reason)result.reason=reason;else if(!ok)result.reason=rejected[0]?.reason||'NO_VALID_TARGETS';else result.reason=rejected.length?'PARTIAL':'OK';
    this.lastCommandResult=result;return result;
  }

  _applyUnitGroup(c,predicate,apply){
    let applied=0;const rejected=[];for(const id of c.entityIds||[]){const e=this.entities.get(id);if(!e?.alive){rejected.push({id,reason:'INVALID_ENTITY'});continue;}if(!this._authorized(c,e)){rejected.push({id,reason:'NOT_AUTHORIZED'});continue;}if(!predicate(e)){rejected.push({id,reason:'UNSUPPORTED'});continue;}apply(e);applied++;}return this._finishCommand(c,{applied,rejected});
  }

  _apply(c){
    if(c.type===CommandType.STOP)return this._applyUnitGroup(c,e=>!!e.locomotorId,e=>{this.resources.cancel(e,'STOP');clearOrders(e);});
    if(c.type===CommandType.MOVE)return this._applyUnitGroup(c,e=>!!e.locomotorId,e=>{this.resources.cancel(e,'MOVE');assignMoveOrder(e,c);});
    if(c.type===CommandType.ATTACK){
      const target=this.entities.get(c.targetId);if(!target?.alive)return this._finishCommand(c,{reason:'INVALID_TARGET'});
      return this._applyUnitGroup(c,e=>!!e.locomotorId&&!!e.weaponSlots?.slots?.length&&!!e.playerId&&!!target.playerId&&e.playerId!==target.playerId,e=>{this.resources.cancel(e,'ATTACK');assignAttackOrder(e,c);});
    }
    if(c.type===CommandType.ATTACK_MOVE)return this._applyUnitGroup(c,e=>!!e.locomotorId&&!!e.weaponSlots?.slots?.length,e=>{this.resources.cancel(e,'ATTACK_MOVE');assignAttackMoveOrder(e,c);});
    if(c.type===CommandType.GUARD_POSITION)return this._applyUnitGroup(c,e=>!!e.locomotorId&&!!e.weaponSlots?.slots?.length,e=>{this.resources.cancel(e,'GUARD');assignGuardPositionOrder(e,c);});
    if(c.type===CommandType.GUARD_OBJECT){
      const target=this.entities.get(c.targetId);if(!target?.alive||!target.playerId||!this._authorized(c,target))return this._finishCommand(c,{reason:'INVALID_GUARD_TARGET'});
      return this._applyUnitGroup(c,e=>!!e.locomotorId&&!!e.weaponSlots?.slots?.length&&e.id!==target.id,e=>{this.resources.cancel(e,'GUARD');assignGuardObjectOrder(e,c);});
    }
    if(c.type===CommandType.SET_STANCE)return this._applyUnitGroup(c,e=>!!e.modules?.UnitAIUpdate&&!!e.weaponSlots?.slots?.length,e=>setUnitStance(e,c.stance));
    if(c.type===CommandType.HARVEST){const resource=this.entities.get(c.resourceId);if(!resource?.alive||resource.kind!=='resource')return this._finishCommand(c,{reason:'INVALID_RESOURCE'});return this._applyUnitGroup(c,e=>!!e.collector,e=>this.resources.issueHarvest(e,resource));}
    if(c.type===CommandType.RETURN_CARGO)return this._applyUnitGroup(c,e=>!!e.collector,e=>this.resources.issueReturn(e));
    if(c.type===CommandType.PRODUCE){const producer=this.entities.get(c.producerId);if(!this._authorized(c,producer))return this._finishCommand(c,{reason:'NOT_AUTHORIZED'});const r=this.production.queue(c.producerId,c.definitionId,this.tick);return this._finishCommand(c,{applied:r.ok?1:0,reason:r.ok?null:r.reason,...r});}
    if(c.type===CommandType.CANCEL_PRODUCTION){const producer=this.entities.get(c.producerId);if(!this._authorized(c,producer))return this._finishCommand(c,{reason:'NOT_AUTHORIZED'});const ok=this.production.cancelLast(c.producerId);return this._finishCommand(c,{applied:ok?1:0,reason:ok?null:'NOTHING_TO_CANCEL'});}
    if(c.type===CommandType.BUILD_STRUCTURE){const source=this.entities.get(c.sourceId);if(!this._authorized(c,source))return this._finishCommand(c,{reason:'NOT_AUTHORIZED'});const r=this.construction.begin(c,this.tick);return this._finishCommand(c,{applied:r.ok?1:0,reason:r.ok?null:r.reason,...r});}
    if(c.type===CommandType.CANCEL_CONSTRUCTION){const site=this.entities.get(c.siteId);if(!this._authorized(c,site))return this._finishCommand(c,{reason:'NOT_AUTHORIZED'});const r=this.construction.cancel(c.siteId,site?.playerId);return this._finishCommand(c,{applied:r.ok?1:0,reason:r.ok?null:r.reason,...r});}
    return this._finishCommand(c,{reason:'UNKNOWN_COMMAND'});
  }

  _separationProfile(e){const cfg=this.registry.locomotor(e.locomotorId);return {clearance:cfg?.pathfindRadius??e.radius??0,maxSlopeDeg:cfg?.maxSlopeDeg??32,allowWater:cfg?.kind==='air'};}
  _applySeparatedPosition(e,x,z){const cfg=this.registry.locomotor(e.locomotorId);if(!this.pathfinder.isWalkableWorld(x,z,this._separationProfile(e)))return false;e.x=x;e.z=z;e.y=cfg.kind==='air'?this.terrain.heightAt(x,z)+(cfg.preferredHeight??18):this.terrain.heightAt(x,z);return true;}
  _separateFriendlies(){
    const movers=[...this.entities.values()].filter(e=>e.alive&&e.locomotorId&&e.playerId);
    for(let i=0;i<movers.length;i++)for(let j=i+1;j<movers.length;j++){
      const a=movers[i],b=movers[j];if(a.playerId!==b.playerId)continue;const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||0.001,min=(a.radius+b.radius)*0.82;if(d>=min)continue;
      const total=Math.min(min-d,0.7),half=total*.5,nx=dx/d,nz=dz/d;const ax=a.x-nx*half,az=a.z-nz*half,bx=b.x+nx*half,bz=b.z+nz*half;const aOk=this.pathfinder.isWalkableWorld(ax,az,this._separationProfile(a)),bOk=this.pathfinder.isWalkableWorld(bx,bz,this._separationProfile(b));
      if(aOk)this._applySeparatedPosition(a,ax,az);if(bOk)this._applySeparatedPosition(b,bx,bz);if(!aOk&&bOk)this._applySeparatedPosition(b,b.x+nx*half,b.z+nz*half);else if(aOk&&!bOk)this._applySeparatedPosition(a,a.x-nx*half,a.z-nz*half);
    }
  }

  snapshot(){
    return {
      version:9,tick:this.tick,rngState:this.rng.snapshot(),commandBus:this.commandBus.snapshot(),interactions:this.interactions.snapshot(),projectiles:this.projectiles.snapshot(),combat:this.combat.snapshot(),resources:this.resources.snapshot(),productionSystem:this.production.snapshot(),constructionSystem:this.construction.snapshot(),
      players:[...this.players.values()].map(p=>structuredClone(p)),regionStates:[...this.regionStates.values()].map(r=>structuredClone(r)),
      entities:[...this.entities.values()].map(e=>({
        id:e.id,definitionId:e.definitionId,playerId:e.playerId,factionId:e.factionId,kind:e.kind,
        x:e.x,y:e.y,z:e.z,yaw:e.yaw,speed:e.speed,angularSpeed:e.angularSpeed??0,steeringAngle:e.steeringAngle??0,movingBackward:!!e.movingBackward,locomotionState:structuredClone(e.locomotionState||null),
        health:e.health,maxHealth:e.maxHealth,alive:e.alive,operational:e.operational!==false,construction:structuredClone(e.construction),damageState:e.damageState,destroyedTick:e.destroyedTick,lastDamagedBy:e.lastDamagedBy,lastDamagedTick:e.lastDamagedTick,
        armorId:e.armorId,weaponSlots:structuredClone(e.weaponSlots),turretYaw:e.turretYaw,turretAngularSpeed:e.turretAngularSpeed??0,combat:structuredClone(e.combat),
        selectable:e.selectable,resourceRemaining:e.resourceRemaining,initialResourceCapacity:e.initialResourceCapacity,collector:structuredClone(e.collector),production:structuredClone(e.production),productionExit:structuredClone(e.productionExit),ai:e.ai?structuredClone(e.ai):null,modules:structuredClone(e.modules||{})
      }))
    };
  }

  restore(snapshot){
    if(![8,9].includes(snapshot?.version??0))throw new Error('Unsupported ForgeRTS snapshot version');
    this.tick=snapshot.tick??0;this.rng.restore(snapshot.rngState??1);this.commandBus.restore(snapshot.commandBus??{});
    this.players=new Map((snapshot.players||[]).map(p=>[p.id,{...structuredClone(p),resourcesHarvested:structuredClone(p.resourcesHarvested||{})}]));this.economy.players=this.players;this.construction.techTree.economy=this.economy;
    this.regionStates=new Map((snapshot.regionStates||[]).map(r=>[r.id,structuredClone(r)]));
    const snapshotIds=new Set((snapshot.entities||[]).map(e=>e.id));for(const id of [...this.entities.keys()])if(!snapshotIds.has(id))this.entities.delete(id);
    for(const s of snapshot.entities||[]){let e=this.entities.get(s.id);if(!e){const def=this.registry.definition(s.definitionId);const player=s.playerId?this.players.get(s.playerId):null;e=createGameObjectRuntime({definition:def,spawn:{id:s.id,definition:s.definitionId,owner:s.playerId,x:s.x,z:s.z,yaw:s.yaw,construction:s.construction},player,registry:this.registry,terrain:this.terrain});this.entities.set(s.id,e);}Object.assign(e,structuredClone(s));}
    this._rebuildDynamicObstacles();
    this.interactions.restore(snapshot.interactions??{});this.projectiles.restore(snapshot.projectiles??{});this.combat.restore(snapshot.combat??{});this.resources.restore(snapshot.resources??{});this.production.restore(snapshot.productionSystem??{});this.construction.restore(snapshot.constructionSystem??{});this.economy.recalculatePower();
  }
}
