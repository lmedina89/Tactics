import {moduleConfig,footprintOf} from '../entities/game-object.js';

const EPS=1e-6;
function obb(x,z,width,depth,yaw=0){
  const c=Math.cos(yaw),s=Math.sin(yaw),hx=width/2,hz=depth/2;
  return {x,z,hx,hz,ux:{x:c,z:-s},uz:{x:s,z:c}};
}
function projectionRadius(r,axis){return r.hx*Math.abs(r.ux.x*axis.x+r.ux.z*axis.z)+r.hz*Math.abs(r.uz.x*axis.x+r.uz.z*axis.z);}
function overlaps(a,b){
  const delta={x:b.x-a.x,z:b.z-a.z},axes=[a.ux,a.uz,b.ux,b.uz];
  for(const axis of axes){const d=Math.abs(delta.x*axis.x+delta.z*axis.z);if(d>projectionRadius(a,axis)+projectionRadius(b,axis)-EPS)return false;}return true;
}
function bounds(r){
  const ex=Math.abs(r.ux.x)*r.hx+Math.abs(r.uz.x)*r.hz,ez=Math.abs(r.ux.z)*r.hx+Math.abs(r.uz.z)*r.hz;
  return {minX:r.x-ex,maxX:r.x+ex,minZ:r.z-ez,maxZ:r.z+ez};
}

export class PlacementValidator{
  constructor({registry,map,terrain,entityLookup,entitiesProvider}){this.registry=registry;this.map=map;this.terrain=terrain;this.entityLookup=entityLookup;this.entitiesProvider=entitiesProvider;}

  validate({playerId,sourceId,definitionId,x,z,yaw=0}){
    const def=this.registry.definition(definitionId),foot=def?footprintOf(def):null,cfg=def?moduleConfig(def,'Construction'):null,source=this.entityLookup(sourceId);
    if(!def||def.kind!=='building'||!foot||!cfg)return {ok:false,reason:'NOT_PLACEABLE'};
    if(!source?.alive||source.playerId!==playerId)return {ok:false,reason:'INVALID_BUILDER'};
    const builder=moduleConfig(this.registry.definition(source.definitionId),'Builder');if(!builder)return {ok:false,reason:'NOT_A_BUILDER'};
    const proposed=obb(x,z,foot.width,foot.depth,yaw),b=bounds(proposed),halfW=this.map.size.width/2,halfD=this.map.size.depth/2,margin=cfg.mapEdgeMargin??4;
    if(b.minX<-halfW+margin||b.maxX>halfW-margin||b.minZ<-halfD+margin||b.maxZ>halfD-margin)return {ok:false,reason:'OUT_OF_BOUNDS'};
    if(builder.style==='yard'&&Number.isFinite(builder.placementRadius)){
      const d=Math.hypot(x-source.x,z-source.z);if(d>builder.placementRadius)return {ok:false,reason:'OUT_OF_BUILD_RADIUS'};
    }

    const samples=[
      {x,z},
      ...[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sz])=>({x:x+proposed.ux.x*proposed.hx*sx+proposed.uz.x*proposed.hz*sz,z:z+proposed.ux.z*proposed.hx*sx+proposed.uz.z*proposed.hz*sz}))
    ];
    let minH=Infinity,maxH=-Infinity,maxSlope=0;
    for(const p of samples){
      if(this.terrain.waterAt(p.x,p.z))return {ok:false,reason:'WATER'};
      const h=this.terrain.heightAt(p.x,p.z);minH=Math.min(minH,h);maxH=Math.max(maxH,h);maxSlope=Math.max(maxSlope,this.terrain.slopeDeg(p.x,p.z,Math.max(2,Math.min(foot.width,foot.depth)*.18)));
    }
    if(maxSlope>(cfg.maxSlopeDeg??12))return {ok:false,reason:'TOO_STEEP',maxSlope};
    if(maxH-minH>(cfg.maxHeightVariation??3.5))return {ok:false,reason:'HEIGHT_VARIATION',variation:maxH-minH};

    const fixed=[...(this.map.staticObstacles||[]),...(this.map.passability?.blockedRects||[])];
    for(const o of fixed)if(overlaps(proposed,obb(o.x,o.z,o.width,o.depth,o.yaw||0)))return {ok:false,reason:'BLOCKED_TERRAIN',blockerId:o.id};

    for(const other of this.entitiesProvider()){
      if(!other.alive)continue;
      const otherDef=this.registry.definition(other.definitionId),otherFoot=otherDef?footprintOf(otherDef):null;
      if(otherFoot&&overlaps(proposed,obb(other.x,other.z,otherFoot.width,otherFoot.depth,other.yaw||0)))return {ok:false,reason:'OBJECT_OVERLAP',blockerId:other.id};
      const blocker=otherDef?moduleConfig(otherDef,'PlacementBlocker'):null;
      if(blocker){const r=Math.max(0,blocker.radius??0),closestX=Math.max(b.minX,Math.min(other.x,b.maxX)),closestZ=Math.max(b.minZ,Math.min(other.z,b.maxZ));if(Math.hypot(other.x-closestX,other.z-closestZ)<r)return {ok:false,reason:'RESOURCE_OVERLAP',blockerId:other.id};}
    }
    return {ok:true,reason:'OK',groundHeight:this.terrain.heightAt(x,z)};
  }
}
