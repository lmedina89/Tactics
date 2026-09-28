import {collisionShape,geometryAimPoint,segmentEntityIntersection} from '../geometry/collision-geometry.js';

const EPS=1e-8;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const clone=v=>structuredClone(v);

function targetVelocity(target){
  if(Number.isFinite(target?.motionVX)&&Number.isFinite(target?.motionVZ))return {x:target.motionVX,y:target.motionVY??0,z:target.motionVZ};
  const speed=target?.speed??0,yaw=target?.yaw??0;return {x:Math.sin(yaw)*speed,y:0,z:Math.cos(yaw)*speed};
}

function interceptTime(start,targetPoint,velocity,projectileSpeed,maxLeadSeconds=3){
  const rx=targetPoint.x-start.x,ry=targetPoint.y-start.y,rz=targetPoint.z-start.z;
  const vx=velocity.x??0,vy=velocity.y??0,vz=velocity.z??0,s=Math.max(EPS,projectileSpeed);
  const a=vx*vx+vy*vy+vz*vz-s*s,b=2*(rx*vx+ry*vy+rz*vz),c=rx*rx+ry*ry+rz*rz;
  let t=null;
  if(Math.abs(a)<EPS){if(Math.abs(b)>EPS){const q=-c/b;if(q>0)t=q;}}
  else{
    const disc=b*b-4*a*c;
    if(disc>=0){const root=Math.sqrt(disc),t0=(-b-root)/(2*a),t1=(-b+root)/(2*a);for(const q of [t0,t1].sort((m,n)=>m-n))if(q>0){t=q;break;}}
  }
  if(t==null||!Number.isFinite(t))t=Math.sqrt(c)/s;
  return clamp(t,0,Math.max(0,maxLeadSeconds));
}

function predictedTargetPoint(start,target,pdef,speed){
  const base=geometryAimPoint(target,{heightFactor:pdef.targetHeightFactor??0.5,heightOffset:pdef.targetHeight??null});
  if(pdef.leadTarget===false)return base;
  const v=targetVelocity(target),t=interceptTime(start,base,v,speed,pdef.maxLeadSeconds??3);
  return {x:base.x+v.x*t,y:base.y+v.y*t,z:base.z+v.z*t};
}

function velocityToward(start,target,speed){
  const dx=target.x-start.x,dy=target.y-start.y,dz=target.z-start.z,d=Math.hypot(dx,dy,dz)||1;
  return {x:dx/d*speed,y:dy/d*speed,z:dz/d*speed};
}

function rotateVelocityToward(v,desired,speed,maxAngle){
  const vm=Math.hypot(v.x,v.y,v.z)||1,dm=Math.hypot(desired.x,desired.y,desired.z)||1;
  const a={x:v.x/vm,y:v.y/vm,z:v.z/vm},b={x:desired.x/dm,y:desired.y/dm,z:desired.z/dm};
  const dot=clamp(a.x*b.x+a.y*b.y+a.z*b.z,-1,1),angle=Math.acos(dot);
  if(angle<=maxAngle||angle<EPS)return {x:b.x*speed,y:b.y*speed,z:b.z*speed};
  const t=maxAngle/angle;
  const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t,m=Math.hypot(x,y,z)||1;
  return {x:x/m*speed,y:y/m*speed,z:z/m*speed};
}

/**
 * Sweep projectile against an entity that moved during this simulation tick.
 * The target pose is the end-of-tick pose; relative motion reconstructs the swept interval.
 */
function movingTargetIntersection(start,end,target,dt,options){
  const v=targetVelocity(target),relativeStart={x:start.x+v.x*dt,y:start.y+v.y*dt,z:start.z+v.z*dt};
  return segmentEntityIntersection(relativeStart,end,target,options);
}

function terrainClearance(point,terrain,radius){return point.y-Math.max(0,radius)-(terrain?.heightAt?.(point.x,point.z)??-Infinity);}

/** Earliest normalized segment time where the swept projectile sphere meets terrain, or null. */
function segmentTerrainIntersection(start,end,terrain,{projectileRadius=0,sampleStep=2.5,binaryIterations=8}={}){
  if(!terrain?.heightAt)return null;
  const dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z,horizontal=Math.hypot(dx,dz);
  const steps=Math.max(1,Math.min(96,Math.ceil(horizontal/Math.max(.5,sampleStep))));
  let t0=0,c0=terrainClearance(start,terrain,projectileRadius);if(c0<=0)return 0;
  for(let i=1;i<=steps;i++){
    const t1=i/steps,p={x:start.x+dx*t1,y:start.y+dy*t1,z:start.z+dz*t1},c1=terrainClearance(p,terrain,projectileRadius);
    if(c1<=0){let lo=t0,hi=t1;for(let j=0;j<binaryIterations;j++){const mid=(lo+hi)*.5,m={x:start.x+dx*mid,y:start.y+dy*mid,z:start.z+dz*mid};if(terrainClearance(m,terrain,projectileRadius)<=0)hi=mid;else lo=mid;}return hi;}
    t0=t1;c0=c1;
  }
  return null;
}

function relationToProjectile(p,entity){if(entity.playerId==null)return 'NEUTRAL';if(entity.playerId===p.sourcePlayerId)return 'ALLY';return 'ENEMY';}
function collisionKind(entity){if(entity.kind==='building')return 'building';if(entity.kind==='resource')return 'resource';return 'unit';}

function broadphaseSegmentEntity(start,end,entity,dt,radius=0){
  const shape=collisionShape(entity),r=(shape.boundingRadius??shape.radius??.5)+Math.max(0,radius),v=targetVelocity(entity);
  // entity pose is end-of-tick; include its reconstructed start pose so a fast mover
  // cannot cross a shell segment and escape the cheap broadphase before swept narrowphase.
  const ex0=entity.x-v.x*dt,ez0=entity.z-v.z*dt,entityMinX=Math.min(ex0,entity.x)-r,entityMaxX=Math.max(ex0,entity.x)+r,entityMinZ=Math.min(ez0,entity.z)-r,entityMaxZ=Math.max(ez0,entity.z)+r;
  const segMinX=Math.min(start.x,end.x),segMaxX=Math.max(start.x,end.x),segMinZ=Math.min(start.z,end.z),segMaxZ=Math.max(start.z,end.z);
  return entityMaxX>=segMinX&&entityMinX<=segMaxX&&entityMaxZ>=segMinZ&&entityMinZ<=segMaxZ;
}

function worldCollisionAllows(p,entity){
  const cfg=p.worldCollision;if(!cfg?.enabled||!entity?.alive||entity.id===p.sourceId||entity.id===p.targetId)return false;
  const relations=cfg.relations??['ENEMY'],kinds=cfg.kinds??['unit','building'];
  return relations.includes(relationToProjectile(p,entity))&&kinds.includes(collisionKind(entity));
}

export class ProjectileSystem{
  constructor(){this.serial=0;this.projectiles=new Map();}

  spawn({source,target,weapon,start,tick}){
    const pdef=weapon.projectile||{},speed=Math.max(0.01,pdef.speed??80),behavior=pdef.behavior??'DUMB_PROJECTILE';
    const aim=predictedTargetPoint(start,target,pdef,speed),v=velocityToward(start,aim,speed),id=`proj_${++this.serial}`;
    const maxLifetimeSeconds=pdef.maxLifetimeSeconds??Math.max(1,(weapon.range??80)/speed*2.25+0.5);
    const worldCollision={enabled:pdef.worldCollision?.enabled===true,relations:[...(pdef.worldCollision?.relations??['ENEMY'])],kinds:[...(pdef.worldCollision?.kinds??['unit','building'])],terrain:pdef.worldCollision?.terrain===true,terrainSampleStep:pdef.worldCollision?.terrainSampleStep??2.5};
    const p={
      id,sourceId:source.id,sourcePlayerId:source.playerId??null,targetId:target.id,weaponId:weapon.id,behavior,
      x:start.x,y:start.y,z:start.z,vx:v.x,vy:v.y,vz:v.z,
      aimX:aim.x,aimY:aim.y,aimZ:aim.z,targetX:aim.x,targetY:aim.y,targetZ:aim.z,
      speed,age:0,maxLifetimeSeconds,
      radius:pdef.radius??0.18,impactPadding:pdef.impactPadding??0.08,
      designatedTargetCollision:pdef.designatedTargetCollision!==false,
      leadTarget:pdef.leadTarget!==false,maxLeadSeconds:pdef.maxLeadSeconds??3,
      guidanceTurnRate:Math.max(0,pdef.guidanceTurnRate??0),
      targetHeightFactor:pdef.targetHeightFactor??0.5,targetHeight:pdef.targetHeight??null,
      worldCollision,
      color:pdef.color??'#ffd27a',spawnTick:tick
    };
    this.projectiles.set(id,p);return p;
  }

  _guide(p,target,dt){
    if(p.behavior!=='GUIDED_PROJECTILE'||!target?.alive||!(p.guidanceTurnRate>0))return;
    const pdef={leadTarget:p.leadTarget,maxLeadSeconds:p.maxLeadSeconds,targetHeightFactor:p.targetHeightFactor,targetHeight:p.targetHeight};
    const aim=predictedTargetPoint({x:p.x,y:p.y,z:p.z},target,pdef,p.speed),desired=velocityToward({x:p.x,y:p.y,z:p.z},aim,p.speed);
    const next=rotateVelocityToward({x:p.vx,y:p.vy,z:p.vz},desired,p.speed,p.guidanceTurnRate*dt);
    p.vx=next.x;p.vy=next.y;p.vz=next.z;p.aimX=aim.x;p.aimY=aim.y;p.aimZ=aim.z;p.targetX=aim.x;p.targetY=aim.y;p.targetZ=aim.z;
  }

  _finish(id,p,target,hit,onImpact,info={}){onImpact?.(p,target,hit,info);this.projectiles.delete(id);}

  _earliestCollision(p,start,end,dt,{entityLookup,entitiesProvider,terrain}){
    let best=null;const consider=(t,target,type)=>{if(t==null||t<0||t>1)return;const key=target?.id??type;if(!best||t<best.t-EPS||(Math.abs(t-best.t)<=EPS&&String(key)<String(best.key))){best={t,target:type==='TERRAIN'?null:target,type,key};}};
    const designated=entityLookup(p.targetId);
    if(designated?.alive&&p.designatedTargetCollision!==false){
      consider(movingTargetIntersection(start,end,designated,dt,{projectileRadius:p.radius??0,padding:p.impactPadding??0}),designated,'DESIGNATED_TARGET');
    }
    if(p.worldCollision?.enabled&&entitiesProvider){
      for(const entity of entitiesProvider()){
        if(!worldCollisionAllows(p,entity)||!broadphaseSegmentEntity(start,end,entity,dt,(p.radius??0)+(p.impactPadding??0)))continue;
        consider(movingTargetIntersection(start,end,entity,dt,{projectileRadius:p.radius??0,padding:p.impactPadding??0}),entity,'WORLD_ENTITY');
      }
    }
    if(p.worldCollision?.terrain&&terrain){
      consider(segmentTerrainIntersection(start,end,terrain,{projectileRadius:p.radius??0,sampleStep:p.worldCollision.terrainSampleStep??2.5}),null,'TERRAIN');
    }
    return best;
  }

  step(dt,{entityLookup,entitiesProvider=null,terrain=null,onImpact}){
    for(const [id,p] of [...this.projectiles]){
      p.age=(p.age??0)+dt;const target=entityLookup(p.targetId);this._guide(p,target,dt);
      const start={x:p.x,y:p.y,z:p.z},end={x:p.x+p.vx*dt,y:p.y+p.vy*dt,z:p.z+p.vz*dt},collision=this._earliestCollision(p,start,end,dt,{entityLookup,entitiesProvider,terrain});
      if(collision){p.x=start.x+(end.x-start.x)*collision.t;p.y=start.y+(end.y-start.y)*collision.t;p.z=start.z+(end.z-start.z)*collision.t;this._finish(id,p,collision.target,true,onImpact,{type:collision.type,intendedTargetId:p.targetId});continue;}
      p.x=end.x;p.y=end.y;p.z=end.z;
      if(p.age>=(p.maxLifetimeSeconds??3))this._finish(id,p,target,false,onImpact,{type:'EXPIRED',intendedTargetId:p.targetId});
    }
  }

  snapshot(){return {serial:this.serial,projectiles:[...this.projectiles.values()].map(p=>clone(p))};}

  restore(state){
    this.serial=state?.serial??0;this.projectiles=new Map();
    for(const raw of state?.projectiles||[]){
      const p=clone(raw);
      p.behavior??='DUMB_PROJECTILE';p.age??=0;p.maxLifetimeSeconds??=4;p.radius??=0.18;p.impactPadding??=Math.max(0,(p.hitRadius??0)-p.radius);p.designatedTargetCollision??=true;p.leadTarget??=false;p.maxLeadSeconds??=3;p.guidanceTurnRate??=0;p.targetHeightFactor??=0.5;p.targetHeight??=null;p.sourcePlayerId??=null;
      p.worldCollision??={enabled:false,relations:['ENEMY'],kinds:['unit','building'],terrain:false,terrainSampleStep:2.5};
      p.aimX??=p.targetX??p.x;p.aimY??=p.targetY??p.y;p.aimZ??=p.targetZ??p.z;p.targetX=p.aimX;p.targetY=p.aimY;p.targetZ=p.aimZ;
      if(!Number.isFinite(p.vx)||!Number.isFinite(p.vy)||!Number.isFinite(p.vz)){const v=velocityToward({x:p.x,y:p.y,z:p.z},{x:p.aimX,y:p.aimY,z:p.aimZ},p.speed??80);p.vx=v.x;p.vy=v.y;p.vz=v.z;}
      this.projectiles.set(p.id,p);
    }
  }
}
