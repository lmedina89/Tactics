const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapPi=(a)=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};

export function stepLocomotor(entity,cfg,dt,terrain){
  const goal=entity.ai?.goal;
  if(!goal){entity.speed=Math.max(0,entity.speed-(cfg.braking??10)*dt);if(cfg.kind!=='air')entity.y=terrain.heightAt(entity.x,entity.z);return;}
  const dx=goal.x-entity.x,dz=goal.z-entity.z,dist=Math.hypot(dx,dz);
  if(dist<0.001)return;
  let desired=Math.atan2(dx,dz),diff=wrapPi(desired-entity.yaw),direction=1;

  if(cfg.canMoveBackward && Math.abs(diff)>2.55){direction=-1;desired=wrapPi(desired+Math.PI);diff=wrapPi(desired-entity.yaw);}
  const maxTurn=(cfg.turnRate??3)*dt;
  entity.yaw=wrapPi(entity.yaw+clamp(diff,-maxTurn,maxTurn));

  const penalty=cfg.speedTurnPenalty??0.7;
  const alignment=clamp(1-(Math.abs(diff)/Math.PI)*penalty, cfg.turnInPlace?0.08:0.18,1);
  let target=(cfg.maxSpeed??8)*alignment*direction;
  if(!cfg.turnInPlace && Math.abs(diff)>1.35)target*=0.35;
  const delta=target-entity.speed,rate=Math.abs(target)>Math.abs(entity.speed)?(cfg.acceleration??8):(cfg.braking??10);
  entity.speed+=clamp(delta,-rate*dt,rate*dt);
  entity.x+=Math.sin(entity.yaw)*entity.speed*dt;entity.z+=Math.cos(entity.yaw)*entity.speed*dt;
  const hw=terrain.map.size.width/2-1,hd=terrain.map.size.depth/2-1;entity.x=clamp(entity.x,-hw,hw);entity.z=clamp(entity.z,-hd,hd);
  const ground=terrain.heightAt(entity.x,entity.z);entity.y=cfg.kind==='air'?ground+(cfg.preferredHeight??18):ground;
}
