import {CommandType} from '../commands/command-bus.js';
import {GridPathfinder} from '../pathfinding/grid-pathfinder.js';
import {stepLocomotor} from '../locomotion/locomotor.js';
import {SeededRng} from './rng.js';
import {TerrainSampler} from '../maps/terrain-sampler.js';
import {assignMoveOrder,clearOrders,stepUnitAI} from '../ai/unit-ai-update.js';
import {createGameObjectRuntime,footprintOf} from '../entities/game-object.js';
import {InteractionManager} from '../interactions/interaction-protocol.js';

export const FIXED_DT=1/30;

export class Simulation{
  constructor({registry,map,commandBus}){
    this.registry=registry;this.map=map;this.commandBus=commandBus;
    this.tick=0;this.entities=new Map();this.players=new Map();this.rng=new SeededRng(map.seed??1);
    for(const p of map.players||[])this.players.set(p.id,{id:p.id,factionId:p.faction,isHuman:!!p.isHuman,credits:0,powerProduced:0,powerUsed:0});
    this.regionStates=new Map();
    const region=map.region||{id:map.id};
    this.regionStates.set(region.id,{id:region.id,owner:region.strategic?.owner??null,threat:region.strategic?.threat??0,resourceValue:region.strategic?.resourceValue??0,aiActivity:region.strategic?.aiActivity??0,discoveredBy:[...(region.strategic?.discoveredBy||[])]});
    this.terrain=new TerrainSampler(map);
    this.navigationMap=this._buildNavigationMap(map);
    this.pathfinder=new GridPathfinder(this.navigationMap,this.terrain,map.navigation?.cellSize??4);
    this._spawnMap();
    this.interactions=new InteractionManager({registry:this.registry,entityLookup:id=>this.entities.get(id)});
  }

  _buildNavigationMap(map){
    const nav=structuredClone(map);nav.staticObstacles=[...(map.staticObstacles||[])];
    for(const o of map.objects||[]){
      const def=this.registry.definition(o.definition),footprint=def?footprintOf(def):null;if(!footprint)continue;
      nav.staticObstacles.push({id:`building:${o.id}`,x:o.x,z:o.z,width:footprint.width,depth:footprint.depth});
    }
    return nav;
  }

  _spawnMap(){
    for(const o of this.map.objects||[])this._spawnEntity(o);
    for(const r of this.map.resourceFields||[])this._spawnEntity({id:r.id,definition:r.definition,owner:null,x:r.x,z:r.z,yaw:r.yaw||0,resourceRemaining:r.capacity});
  }

  _spawnEntity(o){
    const def=this.registry.definition(o.definition);if(!def)throw new Error(`Unknown definition ${o.definition}`);
    const player=o.owner?this.players.get(o.owner):null;
    this.entities.set(o.id,createGameObjectRuntime({definition:def,spawn:o,player,registry:this.registry,terrain:this.terrain}));
  }

  issueMove(entityIds,destination){return this.commandBus.issue({type:CommandType.MOVE,entityIds,destination});}
  issueStop(entityIds){return this.commandBus.issue({type:CommandType.STOP,entityIds});}

  step(dt=FIXED_DT){
    for(const c of this.commandBus.drain())this._apply(c);
    for(const e of this.entities.values()){
      if(!e.locomotorId)continue;
      const cfg=this.registry.locomotor(e.locomotorId);
      if(e.modules?.UnitAIUpdate)stepUnitAI(e,cfg,this.pathfinder,this.tick);
      stepLocomotor(e,cfg,dt,this.terrain);
    }
    this._separateFriendlies();
    this.tick++;
  }

  _apply(c){
    if(c.type===CommandType.STOP){for(const id of c.entityIds||[]){const e=this.entities.get(id);if(e?.locomotorId)clearOrders(e);}return;}
    if(c.type===CommandType.MOVE){for(const id of c.entityIds||[]){const e=this.entities.get(id);if(e?.locomotorId)assignMoveOrder(e,c);}return;}
  }

  _separateFriendlies(){
    const movers=[...this.entities.values()].filter(e=>e.locomotorId&&e.playerId);
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
      version:4,tick:this.tick,rngState:this.rng.snapshot(),commandBus:this.commandBus.snapshot(),interactions:this.interactions.snapshot(),
      players:[...this.players.values()].map(p=>structuredClone(p)),regionStates:[...this.regionStates.values()].map(r=>structuredClone(r)),
      entities:[...this.entities.values()].map(e=>({
        id:e.id,definitionId:e.definitionId,playerId:e.playerId,factionId:e.factionId,kind:e.kind,
        x:e.x,y:e.y,z:e.z,yaw:e.yaw,speed:e.speed,angularSpeed:e.angularSpeed??0,steeringAngle:e.steeringAngle??0,movingBackward:!!e.movingBackward,health:e.health,maxHealth:e.maxHealth,
        resourceRemaining:e.resourceRemaining,ai:e.ai?structuredClone(e.ai):null,modules:structuredClone(e.modules||{})
      }))
    };
  }

  restore(snapshot){
    if((snapshot?.version??0)!==4)throw new Error('Unsupported ForgeRTS snapshot version');
    this.tick=snapshot.tick??0;this.rng.restore(snapshot.rngState??1);this.commandBus.restore(snapshot.commandBus??{});
    this.players=new Map((snapshot.players||[]).map(p=>[p.id,structuredClone(p)]));
    this.regionStates=new Map((snapshot.regionStates||[]).map(r=>[r.id,structuredClone(r)]));
    for(const s of snapshot.entities||[]){const e=this.entities.get(s.id);if(!e)continue;Object.assign(e,structuredClone(s));}
    this.interactions.restore(snapshot.interactions??{});
  }
}
