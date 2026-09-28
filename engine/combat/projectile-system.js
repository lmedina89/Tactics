import {geometryAimPoint,segmentEntityIntersection} from '../geometry/collision-geometry.js';

const EPS=1e-8;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

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
  // Deterministic normalized linear blend is adequate at our small fixed timestep and avoids quaternion allocation.
  const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t,z=a.z+(b.z-a.z)*t,m=Math.hypot(x,y,z)||1;
  return {x:x/m*speed,y:y/m*speed,z:z/m*speed};
}

/**
 * Sweep the projectile against a target that moved during this simulation tick.
 * The relative-motion transform makes the target static at its end-of-tick pose while
 * preserving the projectile-vs-target motion over the whole fixed step.
 */
function movingTargetIntersection(start,end,target,dt,options){
  const v=targetVelocity(target),relativeStart={x:start.x+v.x*dt,y:start.y+v.y*dt,z:start.z+v.z*dt};
  return segmentEntityIntersection(relativeStart,end,target,options);
}

export class ProjectileSystem{
  constructor(){this.serial=0;this.projectiles=new Map();}

  spawn({source,target,weapon,start,tick}){
    const pdef=weapon.projectile||{},speed=Math.max(0.01,pdef.speed??80),behavior=pdef.behavior??'DUMB_PROJECTILE';
    const aim=predictedTargetPoint(start,target,pdef,speed),v=velocityToward(start,aim,speed),id=`proj_${++this.serial}`;
    const maxLifetimeSeconds=pdef.maxLifetimeSeconds??Math.max(1,(weapon.range??80)/speed*2.25+0.5);
    const p={
      id,sourceId:source.id,targetId:target.id,weaponId:weapon.id,behavior,
      x:start.x,y:start.y,z:start.z,vx:v.x,vy:v.y,vz:v.z,
      aimX:aim.x,aimY:aim.y,aimZ:aim.z,targetX:aim.x,targetY:aim.y,targetZ:aim.z,
      speed,age:0,maxLifetimeSeconds,
      radius:pdef.radius??0.18,impactPadding:pdef.impactPadding??0.08,
      designatedTargetCollision:pdef.designatedTargetCollision!==false,
      leadTarget:pdef.leadTarget!==false,maxLeadSeconds:pdef.maxLeadSeconds??3,
      guidanceTurnRate:Math.max(0,pdef.guidanceTurnRate??0),
      targetHeightFactor:pdef.targetHeightFactor??0.5,targetHeight:pdef.targetHeight??null,
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

  _finish(id,p,target,hit,onImpact){onImpact?.(p,target,hit);this.projectiles.delete(id);}

  step(dt,{entityLookup,onImpact}){
    for(const [id,p] of [...this.projectiles]){
      p.age=(p.age??0)+dt;const target=entityLookup(p.targetId);
      this._guide(p,target,dt);
      const start={x:p.x,y:p.y,z:p.z},end={x:p.x+p.vx*dt,y:p.y+p.vy*dt,z:p.z+p.vz*dt};
      if(target?.alive&&p.designatedTargetCollision!==false){
        const t=movingTargetIntersection(start,end,target,dt,{projectileRadius:p.radius??0,padding:p.impactPadding??0});
        if(t!=null){p.x=start.x+(end.x-start.x)*t;p.y=start.y+(end.y-start.y)*t;p.z=start.z+(end.z-start.z)*t;this._finish(id,p,target,true,onImpact);continue;}
      }
      p.x=end.x;p.y=end.y;p.z=end.z;
      if(p.age>=(p.maxLifetimeSeconds??3))this._finish(id,p,target,false,onImpact);
    }
  }

  snapshot(){return {serial:this.serial,projectiles:[...this.projectiles.values()].map(p=>structuredClone(p))};}

  restore(state){
    this.serial=state?.serial??0;this.projectiles=new Map();
    for(const raw of state?.projectiles||[]){
      const p=structuredClone(raw);
      p.behavior??='DUMB_PROJECTILE';p.age??=0;p.maxLifetimeSeconds??=4;p.radius??=0.18;p.impactPadding??=Math.max(0,(p.hitRadius??0)-p.radius);p.designatedTargetCollision??=true;p.leadTarget??=false;p.maxLeadSeconds??=3;p.guidanceTurnRate??=0;p.targetHeightFactor??=0.5;p.targetHeight??=null;
      p.aimX??=p.targetX??p.x;p.aimY??=p.targetY??p.y;p.aimZ??=p.targetZ??p.z;p.targetX=p.aimX;p.targetY=p.aimY;p.targetZ=p.aimZ;
      if(!Number.isFinite(p.vx)||!Number.isFinite(p.vy)||!Number.isFinite(p.vz)){const v=velocityToward({x:p.x,y:p.y,z:p.z},{x:p.aimX,y:p.aimY,z:p.aimZ},p.speed??80);p.vx=v.x;p.vy=v.y;p.vz=v.z;}
      this.projectiles.set(p.id,p);
    }
  }
}
