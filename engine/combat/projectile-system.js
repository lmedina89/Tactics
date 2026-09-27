export class ProjectileSystem{
  constructor(){this.serial=0;this.projectiles=new Map();}
  spawn({source,target,weapon,start,tick}){
    const pdef=weapon.projectile||{};
    const id=`proj_${++this.serial}`;
    const targetPoint={x:target.x,y:(target.y??0)+(pdef.targetHeight??0.8),z:target.z};
    const p={id,sourceId:source.id,targetId:target.id,weaponId:weapon.id,x:start.x,y:start.y,z:start.z,targetX:targetPoint.x,targetY:targetPoint.y,targetZ:targetPoint.z,speed:pdef.speed??80,hitRadius:pdef.hitRadius??1.5,radius:pdef.radius??0.18,color:pdef.color??'#ffd27a',spawnTick:tick};
    this.projectiles.set(id,p);return p;
  }
  step(dt,{entityLookup,onImpact}){
    for(const [id,p] of [...this.projectiles]){
      const dx=p.targetX-p.x,dy=p.targetY-p.y,dz=p.targetZ-p.z,d=Math.hypot(dx,dy,dz);
      const step=Math.max(0,p.speed*dt);
      if(d<=Math.max(step,0.001)){
        p.x=p.targetX;p.y=p.targetY;p.z=p.targetZ;
        const target=entityLookup(p.targetId);
        let hit=false;
        if(target?.alive){const td=Math.hypot(target.x-p.x,(target.z-p.z));hit=td<=(p.hitRadius+(target.radius??0));}
        onImpact?.(p,target,hit);this.projectiles.delete(id);continue;
      }
      p.x+=dx/d*step;p.y+=dy/d*step;p.z+=dz/d*step;
    }
  }
  snapshot(){return {serial:this.serial,projectiles:[...this.projectiles.values()].map(p=>structuredClone(p))};}
  restore(state){this.serial=state?.serial??0;this.projectiles=new Map((state?.projectiles||[]).map(p=>[p.id,structuredClone(p)]));}
}
