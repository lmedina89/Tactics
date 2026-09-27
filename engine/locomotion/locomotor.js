const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapPi=(a)=>{ while(a>Math.PI)a-=Math.PI*2; while(a<-Math.PI)a+=Math.PI*2; return a; };

export function stepLocomotor(entity, cfg, dt) {
  const move=entity.move;
  if (!move || !move.path?.length) { entity.speed=Math.max(0,entity.speed-cfg.braking*dt); return; }
  const p=move.path[move.pathIndex];
  if (!p) { entity.move=null; entity.speed=0; return; }
  const dx=p.x-entity.x, dz=p.z-entity.z, dist=Math.hypot(dx,dz);
  if (dist <= cfg.arrivalRadius) {
    move.pathIndex++;
    if (move.pathIndex >= move.path.length) { entity.x=move.destination.x; entity.z=move.destination.z; entity.move=null; entity.speed=0; }
    return;
  }
  const desired=Math.atan2(dx,dz);
  const diff=wrapPi(desired-entity.yaw);
  const maxTurn=cfg.turnRate*dt;
  entity.yaw=wrapPi(entity.yaw+clamp(diff,-maxTurn,maxTurn));

  const alignment=Math.max(0.18, 1-Math.abs(diff)/Math.PI);
  const targetSpeed=cfg.maxSpeed*alignment;
  const delta=targetSpeed-entity.speed;
  const rate=delta>=0?cfg.acceleration:cfg.braking;
  entity.speed += clamp(delta,-rate*dt,rate*dt);
  entity.x += Math.sin(entity.yaw)*entity.speed*dt;
  entity.z += Math.cos(entity.yaw)*entity.speed*dt;
}
