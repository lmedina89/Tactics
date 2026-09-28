import {collisionShape,overlapMTV} from '../geometry/collision-geometry.js';
export {collisionShape,overlapMTV} from '../geometry/collision-geometry.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dot=(ax,az,bx,bz)=>ax*bx+az*bz;
const EPS=1e-6;

function stableSign(a,b){
  const s=`${a}|${b}`;let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
  return (h>>>0)&1?1:-1;
}

function axes(yaw){
  return {
    forward:{x:Math.sin(yaw),z:Math.cos(yaw)},
    right:{x:Math.cos(yaw),z:-Math.sin(yaw)}
  };
}

function supportRadius(shape,yaw,nx,nz){
  if(shape.type==='CIRCLE'||shape.type==='SPHERE')return shape.radius;
  const a=axes(yaw);
  return Math.abs(dot(nx,nz,a.forward.x,a.forward.z))*shape.halfLength+
         Math.abs(dot(nx,nz,a.right.x,a.right.z))*shape.halfWidth;
}

class SpatialHash{
  constructor(cellSize){this.cellSize=Math.max(1,cellSize);this.cells=new Map();}
  _coord(v){return Math.floor(v/this.cellSize);}
  _key(x,z){return `${x},${z}`;}
  add(e,r){
    const minX=this._coord(e.x-r),maxX=this._coord(e.x+r),minZ=this._coord(e.z-r),maxZ=this._coord(e.z+r);
    for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){const k=this._key(x,z);let list=this.cells.get(k);if(!list)this.cells.set(k,list=[]);list.push(e);}
  }
  pairs(){
    const seen=new Set(),out=[];
    for(const list of this.cells.values())for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
      const a=list[i],b=list[j],ka=a.id<b.id?`${a.id}|${b.id}`:`${b.id}|${a.id}`;if(seen.has(ka))continue;seen.add(ka);out.push(a.id<b.id?[a,b]:[b,a]);
    }
    out.sort((p,q)=>p[0].id.localeCompare(q[0].id)||p[1].id.localeCompare(q[1].id));return out;
  }
}

export class LocalAvoidanceSystem{
  constructor({registry,pathfinder,terrain}){this.registry=registry;this.pathfinder=pathfinder;this.terrain=terrain;this.previous=new Map();this.profiles=new Map();this.constraints=new Map();}

  _profile(e){
    let p=this.profiles.get(e.id);if(p)return p;
    const cfg=this.registry.locomotor(e.locomotorId)||{},shape=collisionShape(e),kind=cfg.kind||'ground';
    p={
      cfg,shape,layer:cfg.collisionLayer??(kind==='air'?'AIR':'GROUND'),dynamicCollision:cfg.dynamicCollision!==false,
      personalSpace:cfg.personalSpace??(kind==='legs'?0.08:0.2),avoidanceBuffer:cfg.avoidanceBuffer??Math.max(1.5,shape.boundingRadius*.65),
      lookAhead:cfg.avoidanceLookAheadSeconds??0.75,maxHeadingOffset:cfg.avoidanceMaxHeadingOffset??(kind==='legs'?0.8:0.45),
      braking:clamp(cfg.avoidanceBraking??0.9,0,1),mass:Math.max(0.05,cfg.collisionMass??Math.max(0.2,shape.boundingRadius*shape.boundingRadius)),
      collisionPadding:Math.max(0,cfg.collisionPadding??0.04),impactSpeedRetention:clamp(cfg.impactSpeedRetention??0.28,0,1)
    };
    this.profiles.set(e.id,p);return p;
  }

  _velocity(e){return {x:Math.sin(e.yaw||0)*(e.speed||0),z:Math.cos(e.yaw||0)*(e.speed||0)};}
  _isReverse(e){return !!e.movingBackward||String(e.locomotionState?.mode||'').includes('REVERSE');}
  _isStationary(e){return Math.abs(e.speed||0)<0.15&&!e.ai?.goal;}

  prepare(entities,dt){
    this.previous.clear();this.profiles.clear();this.constraints.clear();
    const movers=[...entities].filter(e=>e?.alive&&e.locomotorId).sort((a,b)=>a.id.localeCompare(b.id));
    let cell=6;
    const hash=new SpatialHash(cell);
    for(const e of movers){const p=this._profile(e);this.previous.set(e.id,{x:e.x,z:e.z});this.constraints.set(e.id,{speedScale:1,headingOffset:0});if(p.dynamicCollision)hash.add(e,p.shape.boundingRadius+p.avoidanceBuffer+Math.abs(e.speed||0)*p.lookAhead);}
    for(const [a,b] of hash.pairs())this._avoidPair(a,b,dt);
    for(const c of this.constraints.values()){c.speedScale=clamp(c.speedScale,0.05,1);c.headingOffset=clamp(c.headingOffset,-0.9,0.9);}
    return this.constraints;
  }

  _avoidPair(a,b,dt){
    const pa=this._profile(a),pb=this._profile(b);if(!pa.dynamicCollision||!pb.dynamicCollision||pa.layer!==pb.layer)return;
    const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<EPS)return;
    const nx=dx/d,nz=dz/d;
    const supportA=supportRadius(pa.shape,a.yaw||0,nx,nz),supportB=supportRadius(pb.shape,b.yaw||0,nx,nz);
    const desired=supportA+supportB+pa.personalSpace+pb.personalSpace;
    const va=this._velocity(a),vb=this._velocity(b),rvx=va.x-vb.x,rvz=va.z-vb.z,rv2=rvx*rvx+rvz*rvz;
    const horizon=Math.max(pa.lookAhead,pb.lookAhead,dt),t=rv2>EPS?clamp((dx*rvx+dz*rvz)/rv2,0,horizon):horizon;
    const cx=dx-rvx*t,cz=dz-rvz*t,closest=Math.hypot(cx,cz);
    const activation=desired+Math.max(pa.avoidanceBuffer,pb.avoidanceBuffer)+Math.max(Math.abs(a.speed||0),Math.abs(b.speed||0))*Math.max(pa.lookAhead,pb.lookAhead)*0.35;
    if(d>activation&&closest>desired+0.35)return;
    const currentRisk=d<activation?clamp((activation-d)/Math.max(EPS,activation-desired),0,1):0;
    const futureRisk=(t<horizon&&closest<desired+0.35)?clamp(1-t/horizon,0,1)*clamp((desired+0.35-closest)/Math.max(0.35,desired+0.35),0,1):0;
    const overlapRisk=d<desired?1:0,urgency=Math.max(currentRisk,futureRisk,overlapRisk);if(urgency<=0)return;
    const ma=pa.mass*(this._isStationary(a)?2.4:1),mb=pb.mass*(this._isStationary(b)?2.4:1),sum=ma+mb;
    const yieldA=mb/sum,yieldB=ma/sum,ca=this.constraints.get(a.id),cb=this.constraints.get(b.id);
    const af=axes(a.yaw||0).forward,bf=axes(b.yaw||0).forward,aAhead=dot(nx,nz,af.x,af.z),bAhead=dot(-nx,-nz,bf.x,bf.z);
    if(aAhead>-0.15)ca.speedScale=Math.min(ca.speedScale,1-urgency*pa.braking*yieldA);
    if(bAhead>-0.15)cb.speedScale=Math.min(cb.speedScale,1-urgency*pb.braking*yieldB);
    const headingDot=dot(af.x,af.z,bf.x,bf.z),pairSide=stableSign(a.id,b.id);
    if(!this._isReverse(a)&&a.ai?.goal&&aAhead>-0.35&&headingDot<0.82){let side=Math.sign(af.x*nz-af.z*nx);if(!side)side=pairSide;ca.headingOffset+=side*urgency*pa.maxHeadingOffset*yieldA;}
    if(!this._isReverse(b)&&b.ai?.goal&&bAhead>-0.35&&headingDot<0.82){let side=Math.sign(bf.x*(-nz)-bf.z*(-nx));if(!side)side=-pairSide;cb.headingOffset+=side*urgency*pb.maxHeadingOffset*yieldB;}
  }

  _walkable(e,x,z){const p=this._profile(e),cfg=p.cfg;return this.pathfinder.isWalkableWorld(x,z,{clearance:cfg.pathfindRadius??e.radius??0,maxSlopeDeg:cfg.maxSlopeDeg??32,allowWater:cfg.kind==='air'});}
  _setPosition(e,x,z){if(!this._walkable(e,x,z))return false;e.x=x;e.z=z;const cfg=this._profile(e).cfg;e.y=cfg.kind==='air'?this.terrain.heightAt(x,z)+(cfg.preferredHeight??18):this.terrain.heightAt(x,z);return true;}

  resolve(entities,dt){
    const movers=[...entities].filter(e=>e?.alive&&e.locomotorId&&this._profile(e).dynamicCollision).sort((a,b)=>a.id.localeCompare(b.id));
    for(let pass=0;pass<3;pass++){
      const hash=new SpatialHash(6);for(const e of movers)hash.add(e,this._profile(e).shape.boundingRadius+0.25);
      let changed=false;
      for(const [a,b] of hash.pairs())if(this._resolvePair(a,b)){changed=true;}
      if(!changed)break;
    }
  }

  _resolvePair(a,b){
    const pa=this._profile(a),pb=this._profile(b);if(pa.layer!==pb.layer)return false;
    const mtv=overlapMTV(a,pa.shape,b,pb.shape);if(!mtv||mtv.depth<=0.001)return false;
    const padding=pa.collisionPadding+pb.collisionPadding,depth=mtv.depth+padding;
    const ma=pa.mass*(this._isStationary(a)?2.4:1),mb=pb.mass*(this._isStationary(b)?2.4:1),sum=ma+mb;
    let moveA=depth*(mb/sum),moveB=depth*(ma/sum);
    const ax=a.x-mtv.nx*moveA,az=a.z-mtv.nz*moveA,bx=b.x+mtv.nx*moveB,bz=b.z+mtv.nz*moveB;
    const aOk=this._walkable(a,ax,az),bOk=this._walkable(b,bx,bz);let moved=false;
    if(aOk&&bOk){moved=this._setPosition(a,ax,az)||moved;moved=this._setPosition(b,bx,bz)||moved;}
    else if(aOk){moveA=depth;moved=this._setPosition(a,a.x-mtv.nx*moveA,a.z-mtv.nz*moveA)||moved;}
    else if(bOk){moveB=depth;moved=this._setPosition(b,b.x+mtv.nx*moveB,b.z+mtv.nz*moveB)||moved;}
    else{
      const ap=this.previous.get(a.id),bp=this.previous.get(b.id);
      if(ap&&this._walkable(a,ap.x,ap.z))moved=this._setPosition(a,ap.x,ap.z)||moved;
      if(bp&&this._walkable(b,bp.x,bp.z))moved=this._setPosition(b,bp.x,bp.z)||moved;
    }
    if(moved){a.speed=(a.speed||0)*pa.impactSpeedRetention;b.speed=(b.speed||0)*pb.impactSpeedRetention;}
    return moved;
  }
}
