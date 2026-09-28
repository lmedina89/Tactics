const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dot=(ax,az,bx,bz)=>ax*bx+az*bz;
const EPS=1e-8;

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

export function collisionShape(entity){
  const g=entity?.modules?.Geometry;
  if(g?.shape==='BOX'){
    const halfLength=Math.max(0.05,g.majorRadius??g.halfLength??entity.radius??0.5);
    const halfWidth=Math.max(0.05,g.minorRadius??g.halfWidth??entity.radius??0.5);
    return {type:'BOX',halfLength,halfWidth,height:Math.max(0.05,g.height??1),boundingRadius:Math.hypot(halfLength,halfWidth)};
  }
  if(g?.shape==='SPHERE'){
    const radius=Math.max(0.05,g.majorRadius??g.radius??entity.radius??0.5);
    return {type:'SPHERE',radius,height:radius*2,boundingRadius:radius};
  }
  const radius=Math.max(0.05,g?.majorRadius??g?.radius??entity?.radius??0.5);
  return {type:'CIRCLE',radius,height:Math.max(0.05,g?.height??radius*2),boundingRadius:radius};
}

function boxBoxOverlap(a,sa,b,sb){
  const aa=axes(a.yaw||0),ba=axes(b.yaw||0),dx=b.x-a.x,dz=b.z-a.z;
  const candidates=[aa.forward,aa.right,ba.forward,ba.right];
  let bestDepth=Infinity,best=null;
  for(const axis of candidates){
    const ar=Math.abs(dot(axis.x,axis.z,aa.forward.x,aa.forward.z))*sa.halfLength+Math.abs(dot(axis.x,axis.z,aa.right.x,aa.right.z))*sa.halfWidth;
    const br=Math.abs(dot(axis.x,axis.z,ba.forward.x,ba.forward.z))*sb.halfLength+Math.abs(dot(axis.x,axis.z,ba.right.x,ba.right.z))*sb.halfWidth;
    const signed=dot(dx,dz,axis.x,axis.z),depth=ar+br-Math.abs(signed);
    if(depth<=0)return null;
    if(depth<bestDepth){bestDepth=depth;const sign=Math.abs(signed)>EPS?Math.sign(signed):stableSign(a.id,b.id);best={nx:axis.x*sign,nz:axis.z*sign,depth};}
  }
  return best;
}

function circleCircleOverlap(a,sa,b,sb){
  const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),sum=sa.radius+sb.radius;if(d>=sum)return null;
  if(d<EPS){const sign=stableSign(a.id,b.id);return {nx:sign,nz:0,depth:sum};}
  return {nx:dx/d,nz:dz/d,depth:sum-d};
}

function circleBoxOverlap(circle,sc,box,sb,flip=false){
  const ax=axes(box.yaw||0),dx=circle.x-box.x,dz=circle.z-box.z;
  const lx=dot(dx,dz,ax.right.x,ax.right.z),lz=dot(dx,dz,ax.forward.x,ax.forward.z);
  const qx=clamp(lx,-sb.halfWidth,sb.halfWidth),qz=clamp(lz,-sb.halfLength,sb.halfLength);
  let ox=lx-qx,oz=lz-qz,d=Math.hypot(ox,oz),nx,nz,depth;
  if(d>EPS){
    if(d>=sc.radius)return null;
    nx=(ax.right.x*(ox/d)+ax.forward.x*(oz/d));nz=(ax.right.z*(ox/d)+ax.forward.z*(oz/d));depth=sc.radius-d;
  }else{
    const toSide=sb.halfWidth-Math.abs(lx),toEnd=sb.halfLength-Math.abs(lz);
    if(toSide<toEnd){const sign=Math.abs(lx)>EPS?Math.sign(lx):stableSign(box.id,circle.id);nx=ax.right.x*sign;nz=ax.right.z*sign;depth=sc.radius+toSide;}
    else{const sign=Math.abs(lz)>EPS?Math.sign(lz):stableSign(box.id,circle.id);nx=ax.forward.x*sign;nz=ax.forward.z*sign;depth=sc.radius+toEnd;}
  }
  return flip?{nx,nz,depth}:{nx:-nx,nz:-nz,depth};
}

export function overlapMTV(a,sa,b,sb){
  if(sa.type==='SPHERE')sa={type:'CIRCLE',radius:sa.radius,boundingRadius:sa.radius};
  if(sb.type==='SPHERE')sb={type:'CIRCLE',radius:sb.radius,boundingRadius:sb.radius};
  if(sa.type==='BOX'&&sb.type==='BOX')return boxBoxOverlap(a,sa,b,sb);
  if(sa.type==='CIRCLE'&&sb.type==='CIRCLE')return circleCircleOverlap(a,sa,b,sb);
  if(sa.type==='CIRCLE')return circleBoxOverlap(a,sa,b,sb,false);
  return circleBoxOverlap(b,sb,a,sa,true);
}

function intersectIntervals(a,b){
  const enter=Math.max(a[0],b[0]),exit=Math.min(a[1],b[1]);return enter<=exit?[enter,exit]:null;
}

function slabInterval(start,delta,min,max){
  if(Math.abs(delta)<EPS)return start>=min&&start<=max?[0,1]:null;
  let a=(min-start)/delta,b=(max-start)/delta;if(a>b)[a,b]=[b,a];
  const enter=Math.max(0,a),exit=Math.min(1,b);return enter<=exit?[enter,exit]:null;
}

function verticalInterval(start,end,entity,shape,padding){
  const height=Math.max(0.05,shape.height??entity.modules?.Geometry?.height??1);
  const centered=entity.kind==='aircraft'||entity.modules?.Geometry?.centeredY===true;
  const minY=(centered?(entity.y-height*.5):entity.y)-padding;
  const maxY=(centered?(entity.y+height*.5):entity.y+height)+padding;
  return slabInterval(start.y,end.y-start.y,minY,maxY);
}

function circleHorizontalInterval(start,end,entity,radius){
  const sx=start.x-entity.x,sz=start.z-entity.z,dx=end.x-start.x,dz=end.z-start.z;
  const a=dx*dx+dz*dz,c=sx*sx+sz*sz-radius*radius;
  if(a<EPS)return c<=0?[0,1]:null;
  const b=2*(sx*dx+sz*dz),disc=b*b-4*a*c;if(disc<0)return null;
  const root=Math.sqrt(disc),t0=(-b-root)/(2*a),t1=(-b+root)/(2*a);
  const enter=Math.max(0,Math.min(t0,t1)),exit=Math.min(1,Math.max(t0,t1));return enter<=exit?[enter,exit]:null;
}

function boxHorizontalInterval(start,end,entity,shape,padding){
  const a=axes(entity.yaw||0),sx=start.x-entity.x,sz=start.z-entity.z,ex=end.x-entity.x,ez=end.z-entity.z;
  const sRight=dot(sx,sz,a.right.x,a.right.z),sForward=dot(sx,sz,a.forward.x,a.forward.z);
  const dRight=dot(ex-sx,ez-sz,a.right.x,a.right.z),dForward=dot(ex-sx,ez-sz,a.forward.x,a.forward.z);
  const ri=slabInterval(sRight,dRight,-shape.halfWidth-padding,shape.halfWidth+padding);if(!ri)return null;
  const fi=slabInterval(sForward,dForward,-shape.halfLength-padding,shape.halfLength+padding);if(!fi)return null;
  return intersectIntervals(ri,fi);
}

function sphereInterval(start,end,entity,radius){
  const shape=collisionShape(entity),height=shape.height??radius*2,centered=entity.kind==='aircraft'||entity.modules?.Geometry?.centeredY===true;
  const cy=centered?entity.y:entity.y+height*.5;
  const sx=start.x-entity.x,sy=start.y-cy,sz=start.z-entity.z,dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z;
  const a=dx*dx+dy*dy+dz*dz,c=sx*sx+sy*sy+sz*sz-radius*radius;if(a<EPS)return c<=0?[0,1]:null;
  const b=2*(sx*dx+sy*dy+sz*dz),disc=b*b-4*a*c;if(disc<0)return null;const root=Math.sqrt(disc),t0=(-b-root)/(2*a),t1=(-b+root)/(2*a);
  const enter=Math.max(0,Math.min(t0,t1)),exit=Math.min(1,Math.max(t0,t1));return enter<=exit?[enter,exit]:null;
}

/** Returns earliest normalized segment time [0,1] where a swept projectile sphere intersects entity Geometry, or null. */
export function segmentEntityIntersection(start,end,entity,{projectileRadius=0,padding=0}={}){
  if(!entity?.alive)return null;
  const shape=collisionShape(entity),inflate=Math.max(0,projectileRadius)+Math.max(0,padding);
  let horizontal;
  if(shape.type==='BOX')horizontal=boxHorizontalInterval(start,end,entity,shape,inflate);
  else if(shape.type==='SPHERE')return sphereInterval(start,end,entity,shape.radius+inflate)?.[0]??null;
  else horizontal=circleHorizontalInterval(start,end,entity,shape.radius+inflate);
  if(!horizontal)return null;
  const vertical=verticalInterval(start,end,entity,shape,inflate);if(!vertical)return null;
  return intersectIntervals(horizontal,vertical)?.[0]??null;
}

export function geometryAimPoint(entity,{heightFactor=0.5,heightOffset=null}={}){
  const shape=collisionShape(entity),height=Math.max(0.05,shape.height??1);
  const centered=entity.kind==='aircraft'||entity.modules?.Geometry?.centeredY===true;
  let y;
  if(heightOffset!=null)y=(entity.y??0)+heightOffset;
  else y=centered?(entity.y??0)+(heightFactor-.5)*height:(entity.y??0)+height*heightFactor;
  return {x:entity.x,y,z:entity.z};
}
