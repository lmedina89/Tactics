import { CommandType } from '../commands/command-bus.js';
import { GridPathfinder } from '../pathfinding/grid-pathfinder.js';
import { stepLocomotor } from '../locomotion/locomotor.js';
import { SeededRng } from './rng.js';

export const FIXED_DT = 1/30;

export class Simulation {
  constructor({registry, map, commandBus}) {
    this.registry=registry; this.map=map; this.commandBus=commandBus;
    this.tick=0; this.entities=new Map(); this.players=new Map();
    this.rng=new SeededRng(map.seed ?? 1);
    for (const p of map.players || []) this.players.set(p.id,{id:p.id,factionId:p.faction,credits:0,powerProduced:0,powerUsed:0});
    this.navigationMap=this._buildNavigationMap(map);
    this.pathfinder=new GridPathfinder(this.navigationMap,4);
    this._spawnMap();
  }

  _buildNavigationMap(map) {
    const nav=structuredClone(map);
    nav.staticObstacles=[...(map.staticObstacles||[])];
    for (const o of map.objects || []) {
      const def=this.registry.definition(o.definition);
      if (def?.kind!=='building' || !def.footprint) continue;
      nav.staticObstacles.push({
        id:`building:${o.id}`,x:o.x,z:o.z,
        width:def.footprint.width,depth:def.footprint.depth
      });
    }
    return nav;
  }

  _spawnMap() {
    for (const o of this.map.objects) {
      const def=this.registry.definition(o.definition);
      if (!def) throw new Error(`Unknown definition ${o.definition}`);
      const loc=def.locomotor ? this.registry.locomotor(def.locomotor) : null;
      this.entities.set(o.id,{
        id:o.id,definitionId:o.definition,factionId:o.faction,kind:def.kind,
        x:o.x,z:o.z,y:0,yaw:o.yaw||0,speed:0,
        health:def.maxHealth ?? 1,maxHealth:def.maxHealth ?? 1,
        selectable:!!def.selectable,locomotorId:def.locomotor||null,
        radius:loc?.radius ?? 0,move:null
      });
    }
  }
  issueMove(entityIds,destination) { return this.commandBus.issue({type:CommandType.MOVE,entityIds,destination}); }
  issueStop(entityIds) { return this.commandBus.issue({type:CommandType.STOP,entityIds}); }
  step(dt=FIXED_DT) {
    for (const c of this.commandBus.drain()) this._apply(c);
    for (const e of this.entities.values()) {
      if (!e.locomotorId) continue;
      const cfg=this.registry.locomotor(e.locomotorId);
      stepLocomotor(e,cfg,dt);
    }
    this._separateFriendlies();
    this.tick++;
  }
  _apply(c) {
    if (c.type===CommandType.STOP) {
      for(const id of c.entityIds||[]) { const e=this.entities.get(id); if(e){ e.move=null; e.speed=0; } }
      return;
    }
    if (c.type===CommandType.MOVE) {
      for(const id of c.entityIds||[]) {
        const e=this.entities.get(id); if(!e?.locomotorId) continue;
        const adjusted=this.pathfinder.nearestWalkable(c.destination.x,c.destination.z);
        if(!adjusted) continue;
        const path=this.pathfinder.findPath(e.x,e.z,adjusted.x,adjusted.z);
        if(!path.length) continue;
        e.move={type:'MOVE',requested:{...c.destination},destination:adjusted,path,pathIndex:Math.min(1,path.length-1),issuedSerial:c.serial};
      }
    }
  }
  _separateFriendlies() {
    const movers=[...this.entities.values()].filter(e=>e.locomotorId);
    for(let i=0;i<movers.length;i++) for(let j=i+1;j<movers.length;j++) {
      const a=movers[i],b=movers[j]; if(a.factionId!==b.factionId) continue;
      const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz)||0.001;
      const min=(a.radius+b.radius)*0.86;
      if(d>=min) continue;
      const push=(min-d)*0.5, nx=dx/d,nz=dz/d;
      a.x-=nx*push; a.z-=nz*push; b.x+=nx*push; b.z+=nz*push;
    }
  }
  snapshot() {
    return {
      tick:this.tick,
      rngState:this.rng.snapshot(),
      players:[...this.players.values()].map(p=>({...p})),
      entities:[...this.entities.values()].map(e=>({id:e.id,definitionId:e.definitionId,factionId:e.factionId,x:e.x,z:e.z,yaw:e.yaw,health:e.health,move:e.move?{type:e.move.type,destination:e.move.destination}:null}))
    };
  }
}
