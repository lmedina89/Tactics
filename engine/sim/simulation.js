import {CommandType} from '../commands/command-bus.js';
import {GridPathfinder} from '../pathfinding/grid-pathfinder.js';
import {stepLocomotor} from '../locomotion/locomotor.js';
import {SeededRng} from './rng.js';
import {TerrainSampler} from '../maps/terrain-sampler.js';
import {assignMoveOrder,assignAttackOrder,clearOrders,stepUnitAI} from '../ai/unit-ai-update.js';
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
    this.tick=0;this.entities=new Map();this.players=new Map();this.rng=new SeededRng(map.seed??1);this.lastCommandResult=null;
    for(const p of map.players||[])this.players.set(p.id,{id:p.id,factionId:p.faction,isHuman:!!p.isHuman,credits:p.startingCredits??0,powerProduced:0,powerUsed:0,lowPower:false});
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

  issueMove(entityIds,destination){return this.commandBus.issue({type:CommandType.MOVE,entityIds,destination});}
  issueStop(entityIds){return this.commandBus.issue({type:CommandType.STOP,entityIds});}
  issueAttack(entityIds,targetId){return this.commandBus.issue({type:CommandType.ATTACK,entityIds,targetId});}
  issueHarvest(entityIds,resourceId){return this.commandBus.issue({type:CommandType.HARVEST,entityIds,resourceId});}
  issueReturnCargo(entityIds){return this.commandBus.issue({type:CommandType.RETURN_CARGO,entityIds});}
  issueProduce(producerId,definitionId){return this.commandBus.issue({type:CommandType.PRODUCE,producerId,definitionId});}
  issueCancelProduction(producerId){return this.commandBus.issue({type:CommandType.CANCEL_PRODUCTION,producerId});}
  issueBuildStructure(sourceId,definitionId,{x,z,yaw=0}){return this.commandBus.issue({type:CommandType.BUILD_STRUCTURE,sourceId,definitionId,x,z,yaw});}
  issueCancelConstruction(siteId){return this.commandBus.issue({type:CommandType.CANCEL_CONSTRUCTION,siteId});}
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
      if(e.modules?.UnitAIUpdate)stepUnitAI(e,cfg,this.pathfinder,this.tick,{registry:this.registry,entityLookup:id=>this.entities.get(id)});
      stepLocomotor(e,cfg,dt,this.terrain);
    }
    this._separateFriendlies();
    this.combat.step(dt,this.tick);
    this.tick++;
  }

  _apply(c){
    if(c.type===CommandType.STOP){for(const id of c.entityIds||[]){const e=this.entities.get(id);if(e?.alive&&e.locomotorId){this.resources.cancel(e,'STOP');clearOrders(e);}}return;}
    if(c.type===CommandType.MOVE){for(const id of c.entityIds||[]){const e=this.entities.get(id);if(e?.alive&&e.locomotorId){this.resources.cancel(e,'MOVE');assignMoveOrder(e,c);}}return;}
    if(c.type===CommandType.ATTACK){
      const target=this.entities.get(c.targetId);if(!target?.alive)return;
      for(const id of c.entityIds||[]){const e=this.entities.get(id);if(e?.alive&&e.locomotorId&&e.weaponSlots?.slots?.length&&e.playerId&&target.playerId&&e.playerId!==target.playerId){this.resources.cancel(e,'ATTACK');assignAttackOrder(e,c);}}return;
    }
    if(c.type===CommandType.HARVEST){const resource=this.entities.get(c.resourceId);for(const id of c.entityIds||[]){const e=this.entities.get(id);if(e?.alive&&e.collector)this.resources.issueHarvest(e,resource);}return;}
    if(c.type===CommandType.RETURN_CARGO){for(const id of c.entityIds||[]){const e=this.entities.get(id);if(e?.alive&&e.collector)this.resources.issueReturn(e);}return;}
    if(c.type===CommandType.PRODUCE){this.lastCommandResult={serial:c.serial,type:c.type,...this.production.queue(c.producerId,c.definitionId,this.tick)};return;}
    if(c.type===CommandType.CANCEL_PRODUCTION){this.lastCommandResult={serial:c.serial,type:c.type,ok:this.production.cancelLast(c.producerId)};return;}
    if(c.type===CommandType.BUILD_STRUCTURE){this.lastCommandResult={serial:c.serial,type:c.type,...this.construction.begin(c,this.tick)};return;}
    if(c.type===CommandType.CANCEL_CONSTRUCTION){const site=this.entities.get(c.siteId);this.lastCommandResult={serial:c.serial,type:c.type,...this.construction.cancel(c.siteId,site?.playerId)};return;}
  }

  _separateFriendlies(){
    const movers=[...this.entities.values()].filter(e=>e.alive&&e.locomotorId&&e.playerId);
    for(let i=0;i<movers.length;i++)for(let j=i+1;j<movers.length;j++){
      const a=movers[i],b=movers[j];if(a.playerId!==b.playerId)continue;
      const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||0.001,min=(a.radius+b.radius)*0.82;
      if(d>=min)continue;
      const push=Math.min((min-d)*0.5,0.35),nx=dx/d,nz=dz/d;
      a.x-=nx*push;a.z-=nz*push;b.x+=nx*push;b.z+=nz*push;
      const acfg=this.registry.locomotor(a.locomotorId),bcfg=this.registry.locomotor(b.locomotorId);
      a.y=acfg.kind==='air'?this.terrain.heightAt(a.x,a.z)+(acfg.preferredHeight??18):this.terrain.heightAt(a.x,a.z);
      b.y=bcfg.kind==='air'?this.terrain.heightAt(b.x,b.z)+(bcfg.preferredHeight??18):this.terrain.heightAt(b.x,b.z);
    }
  }

  snapshot(){
    return {
      version:8,tick:this.tick,rngState:this.rng.snapshot(),commandBus:this.commandBus.snapshot(),interactions:this.interactions.snapshot(),projectiles:this.projectiles.snapshot(),combat:this.combat.snapshot(),resources:this.resources.snapshot(),productionSystem:this.production.snapshot(),constructionSystem:this.construction.snapshot(),
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
    if((snapshot?.version??0)!==8)throw new Error('Unsupported ForgeRTS snapshot version');
    this.tick=snapshot.tick??0;this.rng.restore(snapshot.rngState??1);this.commandBus.restore(snapshot.commandBus??{});
    this.players=new Map((snapshot.players||[]).map(p=>[p.id,structuredClone(p)]));this.economy.players=this.players;this.construction.techTree.economy=this.economy;
    this.regionStates=new Map((snapshot.regionStates||[]).map(r=>[r.id,structuredClone(r)]));
    const snapshotIds=new Set((snapshot.entities||[]).map(e=>e.id));for(const id of [...this.entities.keys()])if(!snapshotIds.has(id))this.entities.delete(id);
    for(const s of snapshot.entities||[]){let e=this.entities.get(s.id);if(!e){const def=this.registry.definition(s.definitionId);const player=s.playerId?this.players.get(s.playerId):null;e=createGameObjectRuntime({definition:def,spawn:{id:s.id,definition:s.definitionId,owner:s.playerId,x:s.x,z:s.z,yaw:s.yaw,construction:s.construction},player,registry:this.registry,terrain:this.terrain});this.entities.set(s.id,e);}Object.assign(e,structuredClone(s));}
    this._rebuildDynamicObstacles();
    this.interactions.restore(snapshot.interactions??{});this.projectiles.restore(snapshot.projectiles??{});this.combat.restore(snapshot.combat??{});this.resources.restore(snapshot.resources??{});this.production.restore(snapshot.productionSystem??{});this.construction.restore(snapshot.constructionSystem??{});this.economy.recalculatePower();
  }
}
