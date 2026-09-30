const clone=v=>structuredClone(v);
const sorted=s=>[...s].sort((a,b)=>a.localeCompare(b));

function pointInPolygon(x,z,points=[]){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    const crosses=((a.z>z)!==(b.z>z))&&(x<(b.x-a.x)*(z-a.z)/((b.z-a.z)||Number.EPSILON)+a.x);
    if(crosses)inside=!inside;
  }
  return inside;
}

export function pointInsideTriggerArea(area,x,z){
  if(!area)return false;
  if(area.shape==='circle')return Math.hypot(x-area.x,z-area.z)<=area.radius;
  if(area.shape==='rect'||area.shape==='rectangle'){
    const yaw=area.yaw??0,c=Math.cos(-yaw),s=Math.sin(-yaw),dx=x-area.x,dz=z-area.z;
    const lx=dx*c-dz*s,lz=dx*s+dz*c;
    return Math.abs(lx)<=area.width/2&&Math.abs(lz)<=area.depth/2;
  }
  if(area.shape==='polygon')return pointInPolygon(x,z,area.points||[]);
  return false;
}

export class TriggerAreaSystem{
  constructor({areas=[],entitiesProvider}){
    this.areas=new Map((areas||[]).map(a=>[a.id,clone(a)]));this.entitiesProvider=entitiesProvider;
    this.current=new Map();this.entered=new Map();this.exited=new Map();
    for(const id of this.areas.keys()){this.current.set(id,new Set());this.entered.set(id,new Set());this.exited.set(id,new Set());}
  }
  area(id){return this.areas.get(id)??null;}
  _members(area){
    const out=[];for(const e of this.entitiesProvider()){if(!e?.alive)continue;if(pointInsideTriggerArea(area,e.x,e.z))out.push(e.id);}out.sort((a,b)=>a.localeCompare(b));return new Set(out);
  }
  prime(){for(const [id,a] of this.areas){this.current.set(id,this._members(a));this.entered.set(id,new Set());this.exited.set(id,new Set());}}
  step(){
    for(const [id,a] of this.areas){const prev=this.current.get(id)??new Set(),next=this._members(a),entered=new Set(),exited=new Set();
      for(const entityId of next)if(!prev.has(entityId))entered.add(entityId);
      for(const entityId of prev)if(!next.has(entityId))exited.add(entityId);
      this.current.set(id,next);this.entered.set(id,entered);this.exited.set(id,exited);
    }
  }
  ids(areaId,transition='INSIDE'){
    const t=String(transition||'INSIDE').toUpperCase();
    if(t==='ENTERED')return sorted(this.entered.get(areaId)??new Set());
    if(t==='EXITED')return sorted(this.exited.get(areaId)??new Set());
    return sorted(this.current.get(areaId)??new Set());
  }
  contains(areaId,entityId){return this.current.get(areaId)?.has(entityId)??false;}
  snapshot(){return {areas:[...this.areas.keys()].sort().map(id=>({id,current:sorted(this.current.get(id)??new Set())}))};}
  restore(state={}){
    const byId=new Map((state.areas||[]).map(a=>[a.id,a]));
    for(const id of this.areas.keys()){const saved=byId.get(id);this.current.set(id,new Set(saved?.current||[]));this.entered.set(id,new Set());this.exited.set(id,new Set());}
  }
}
