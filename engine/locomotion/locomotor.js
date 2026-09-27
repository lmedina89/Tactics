const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapPi=(a)=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};
const approach=(current,target,rate,dt)=>current+clamp(target-current,-rate*dt,rate*dt);

function goalInfo(entity){
  const goal=entity.ai?.goal;if(!goal)return null;
  const dx=goal.x-entity.x,dz=goal.z-entity.z,dist=Math.hypot(dx,dz);
  if(dist<1e-6)return {goal,dx,dz,dist,heading:entity.yaw};
  return {goal,dx,dz,dist,heading:Math.atan2(dx,dz)};
}

function chooseDriveDirection(entity,cfg,heading){
  let desiredFacing=heading,direction=1;
  let diff=wrapPi(desiredFacing-entity.yaw);
  const threshold=cfg.reverseThreshold??2.55;
  if(cfg.canMoveBackward&&Math.abs(diff)>threshold){
    direction=-1;
    desiredFacing=wrapPi(heading+Math.PI);
    diff=wrapPi(desiredFacing-entity.yaw);
  }
  return {direction,desiredFacing,diff};
}

function updateGroundHeight(entity,cfg,terrain){
  const ground=terrain.heightAt(entity.x,entity.z);
  entity.y=cfg.kind==='air'?ground+(cfg.preferredHeight??18):ground;
}

function clampToMap(entity,terrain){
  const hw=terrain.map.size.width/2-1,hd=terrain.map.size.depth/2-1;
  entity.x=clamp(entity.x,-hw,hw);entity.z=clamp(entity.z,-hd,hd);
}

function brakeIdle(entity,cfg,dt,terrain){
  entity.speed=approach(entity.speed,0,cfg.braking??10,dt);
  entity.angularSpeed=approach(entity.angularSpeed??0,0,(cfg.angularBraking??8),dt);
  entity.steeringAngle=approach(entity.steeringAngle??0,0,cfg.steeringResponse??6,dt);
  entity.movingBackward=entity.speed<-.02;
  updateGroundHeight(entity,cfg,terrain);
}

function stepTracks(entity,cfg,dt,terrain,info){
  const {direction,diff}=chooseDriveDirection(entity,cfg,info.heading);
  const absDiff=Math.abs(diff);
  const pivotThreshold=cfg.pivotAngleThreshold??0.48;
  const hardPivotThreshold=cfg.hardPivotAngleThreshold??0.95;
  const pivotRate=cfg.pivotTurnRate??cfg.turnRate??2.4;
  const movingRate=cfg.movingTurnRate??cfg.turnRate??1.6;
  const canPivot=cfg.turnInPlace!==false;

  let turnRate=movingRate;
  const reverseFactor=direction<0?(cfg.reverseMaxSpeedFactor??0.45):1;
  let targetSpeed=(cfg.maxSpeed??8)*reverseFactor*direction;
  if(canPivot&&absDiff>pivotThreshold){
    turnRate=pivotRate;
    const crawl=cfg.pivotCrawlSpeedFactor??0.08;
    targetSpeed=(cfg.maxSpeed??8)*crawl*reverseFactor*direction;
    if(absDiff>hardPivotThreshold)targetSpeed=0;
  }else{
    const penalty=cfg.speedTurnPenalty??0.72;
    const alignment=clamp(1-(absDiff/Math.PI)*penalty,0.28,1);
    targetSpeed=(cfg.maxSpeed??8)*alignment*reverseFactor*direction;
  }

  const yawStep=clamp(diff,-turnRate*dt,turnRate*dt);
  entity.yaw=wrapPi(entity.yaw+yawStep);
  entity.angularSpeed=yawStep/dt;
  entity.steeringAngle=0;

  const rate=Math.abs(targetSpeed)>Math.abs(entity.speed)?(cfg.acceleration??6):(cfg.braking??10);
  entity.speed=approach(entity.speed,targetSpeed,rate,dt);
  entity.movingBackward=entity.speed<-.02;
  entity.x+=Math.sin(entity.yaw)*entity.speed*dt;
  entity.z+=Math.cos(entity.yaw)*entity.speed*dt;
  clampToMap(entity,terrain);updateGroundHeight(entity,cfg,terrain);
}

function stepWheels(entity,cfg,dt,terrain,info){
  const {direction,diff}=chooseDriveDirection(entity,cfg,info.heading);
  const maxSteer=Math.max(0.05,cfg.wheelTurnAngle??cfg.maxSteerAngle??0.62);
  // Reverse steering must be inverted because negative velocity reverses yaw response.
  const desiredSteer=clamp(diff*direction,-maxSteer,maxSteer);
  entity.steeringAngle=approach(entity.steeringAngle??0,desiredSteer,cfg.steeringResponse??5.5,dt);

  const steerSeverity=Math.abs(entity.steeringAngle)/maxSteer;
  const speedPenalty=cfg.speedTurnPenalty??0.8;
  let speedFactor=clamp(1-steerSeverity*speedPenalty,cfg.minTurnSpeedFactor??0.28,1);
  if(Math.abs(diff)>(cfg.hardTurnSlowAngle??1.35))speedFactor=Math.min(speedFactor,cfg.hardTurnSpeedFactor??0.34);
  const reverseFactor=direction<0?(cfg.reverseMaxSpeedFactor??0.48):1;
  const targetSpeed=(cfg.maxSpeed??10)*speedFactor*reverseFactor*direction;
  const rate=Math.abs(targetSpeed)>Math.abs(entity.speed)?(cfg.acceleration??7):(cfg.braking??11);
  entity.speed=approach(entity.speed,targetSpeed,rate,dt);
  entity.movingBackward=entity.speed<-.02;

  const wheelbase=Math.max(0.5,cfg.wheelbase??2.7);
  let yawRate=(entity.speed/wheelbase)*Math.tan(entity.steeringAngle);
  const maxRate=cfg.turnRate??2.6;
  yawRate=clamp(yawRate,-maxRate,maxRate);
  entity.yaw=wrapPi(entity.yaw+yawRate*dt);
  entity.angularSpeed=yawRate;

  entity.x+=Math.sin(entity.yaw)*entity.speed*dt;
  entity.z+=Math.cos(entity.yaw)*entity.speed*dt;
  clampToMap(entity,terrain);updateGroundHeight(entity,cfg,terrain);
}

function stepLegs(entity,cfg,dt,terrain,info){
  const diff=wrapPi(info.heading-entity.yaw),turnRate=cfg.turnRate??7;
  const yawStep=clamp(diff,-turnRate*dt,turnRate*dt);
  entity.yaw=wrapPi(entity.yaw+yawStep);entity.angularSpeed=yawStep/dt;entity.steeringAngle=0;entity.movingBackward=false;
  const alignment=clamp(1-Math.abs(diff)/Math.PI*(cfg.speedTurnPenalty??0.2),0.65,1);
  const targetSpeed=(cfg.maxSpeed??5)*alignment;
  const rate=targetSpeed>entity.speed?(cfg.acceleration??12):(cfg.braking??14);
  entity.speed=approach(entity.speed,targetSpeed,rate,dt);
  entity.x+=Math.sin(entity.yaw)*entity.speed*dt;entity.z+=Math.cos(entity.yaw)*entity.speed*dt;
  clampToMap(entity,terrain);updateGroundHeight(entity,cfg,terrain);
}

function stepAir(entity,cfg,dt,terrain,info){
  const {direction,diff}=chooseDriveDirection(entity,{...cfg,canMoveBackward:false},info.heading);
  const turnRate=cfg.turnRate??2.2,yawStep=clamp(diff,-turnRate*dt,turnRate*dt);
  entity.yaw=wrapPi(entity.yaw+yawStep);entity.angularSpeed=yawStep/dt;entity.steeringAngle=0;entity.movingBackward=false;
  const alignment=clamp(1-(Math.abs(diff)/Math.PI)*(cfg.speedTurnPenalty??0.55),0.28,1);
  const targetSpeed=(cfg.maxSpeed??12)*alignment*direction;
  const rate=targetSpeed>entity.speed?(cfg.acceleration??7):(cfg.braking??9);
  entity.speed=approach(entity.speed,targetSpeed,rate,dt);
  entity.x+=Math.sin(entity.yaw)*entity.speed*dt;entity.z+=Math.cos(entity.yaw)*entity.speed*dt;
  clampToMap(entity,terrain);updateGroundHeight(entity,cfg,terrain);
}

export function stepLocomotor(entity,cfg,dt,terrain){
  const info=goalInfo(entity);
  if(!info){brakeIdle(entity,cfg,dt,terrain);return;}
  if(info.dist<0.001){brakeIdle(entity,cfg,dt,terrain);return;}

  const appearance=cfg.appearance||'';
  if(cfg.kind==='air'||appearance==='THRUST'||appearance==='WINGS'){stepAir(entity,cfg,dt,terrain,info);return;}
  if(appearance==='TREADS'||cfg.kind==='tracks'){stepTracks(entity,cfg,dt,terrain,info);return;}
  if(appearance==='FOUR_WHEELS'||appearance==='MOTORCYCLE'||cfg.kind==='wheels'){stepWheels(entity,cfg,dt,terrain,info);return;}
  if(appearance==='TWO_LEGS'||cfg.kind==='legs'){stepLegs(entity,cfg,dt,terrain,info);return;}
  stepLegs(entity,cfg,dt,terrain,info);
}
