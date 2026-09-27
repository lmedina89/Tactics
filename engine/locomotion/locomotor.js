const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapPi=(a)=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};
const approach=(current,target,rate,dt)=>current+clamp(target-current,-rate*dt,rate*dt);

function headingBetween(ax,az,bx,bz,fallback=0){
  const dx=bx-ax,dz=bz-az;if(Math.hypot(dx,dz)<1e-6)return fallback;return Math.atan2(dx,dz);
}

function terminalPoint(entity,goal){
  if(entity.ai?.adjustedDestination)return entity.ai.adjustedDestination;
  if(entity.ai?.order?.type==='MOVE'&&entity.ai.order.requested)return entity.ai.order.requested;
  return goal;
}

function goalInfo(entity){
  const goal=entity.ai?.goal;if(!goal)return null;
  const dx=goal.x-entity.x,dz=goal.z-entity.z,dist=Math.hypot(dx,dz);
  const terminal=terminalPoint(entity,goal),tdx=terminal.x-entity.x,tdz=terminal.z-entity.z,terminalDist=Math.hypot(tdx,tdz);
  return {
    goal,terminal,dx,dz,dist,terminalDist,
    heading:dist<1e-6?entity.yaw:Math.atan2(dx,dz),
    terminalHeading:terminalDist<1e-6?entity.yaw:Math.atan2(tdx,tdz)
  };
}

function locomotionState(entity){
  return entity.locomotionState ??= {
    mode:'FORWARD',modeTime:0,cooldown:0,
    reverseStartX:entity.x,reverseStartZ:entity.z,
    turnSign:1
  };
}

function enterMode(entity,mode,turnSign=1){
  const s=locomotionState(entity);s.mode=mode;s.modeTime=0;s.reverseStartX=entity.x;s.reverseStartZ=entity.z;s.turnSign=turnSign||1;return s;
}

function reverseTravel(entity){const s=locomotionState(entity);return Math.hypot(entity.x-s.reverseStartX,entity.z-s.reverseStartZ);}

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
  const s=locomotionState(entity);s.mode='FORWARD';s.modeTime=0;s.cooldown=Math.max(0,(s.cooldown??0)-dt);
  updateGroundHeight(entity,cfg,terrain);
}

function chooseTrackDirection(entity,cfg,info){
  const diffForward=wrapPi(info.heading-entity.yaw),terminalDiff=wrapPi(info.terminalHeading-entity.yaw);
  const threshold=cfg.reverseEntryAngle??cfg.reverseThreshold??2.6;
  const maxReverseDistance=cfg.maxReverseDistance??4.5;
  const allowReverse=cfg.canMoveBackward&&info.terminalDist<=maxReverseDistance&&Math.abs(terminalDiff)>threshold;
  if(allowReverse){
    const desiredFacing=wrapPi(info.heading+Math.PI);
    return {direction:-1,desiredFacing,diff:wrapPi(desiredFacing-entity.yaw)};
  }
  return {direction:1,desiredFacing:info.heading,diff:diffForward};
}

function stepTracks(entity,cfg,dt,terrain,info){
  const {direction,diff}=chooseTrackDirection(entity,cfg,info);
  const absDiff=Math.abs(diff),pivotThreshold=cfg.pivotAngleThreshold??0.48,hardPivotThreshold=cfg.hardPivotAngleThreshold??0.95;
  const pivotRate=cfg.pivotTurnRate??cfg.turnRate??2.4,movingRate=cfg.movingTurnRate??cfg.turnRate??1.6,canPivot=cfg.turnInPlace!==false;
  let turnRate=movingRate;
  const reverseFactor=direction<0?(cfg.reverseMaxSpeedFactor??0.45):1;
  let targetSpeed=(cfg.maxSpeed??8)*reverseFactor*direction;
  if(canPivot&&absDiff>pivotThreshold){
    turnRate=pivotRate;const crawl=cfg.pivotCrawlSpeedFactor??0.08;targetSpeed=(cfg.maxSpeed??8)*crawl*reverseFactor*direction;
    if(absDiff>hardPivotThreshold)targetSpeed=0;
  }else{
    const penalty=cfg.speedTurnPenalty??0.72,alignment=clamp(1-(absDiff/Math.PI)*penalty,0.28,1);
    targetSpeed=(cfg.maxSpeed??8)*alignment*reverseFactor*direction;
  }
  const yawStep=clamp(diff,-turnRate*dt,turnRate*dt);entity.yaw=wrapPi(entity.yaw+yawStep);entity.angularSpeed=yawStep/dt;entity.steeringAngle=0;
  const rate=Math.abs(targetSpeed)>Math.abs(entity.speed)?(cfg.acceleration??6):(cfg.braking??10);entity.speed=approach(entity.speed,targetSpeed,rate,dt);entity.movingBackward=entity.speed<-.02;
  const s=locomotionState(entity);s.mode=direction<0?'SHORT_REVERSE':'FORWARD';s.modeTime+=dt;s.cooldown=Math.max(0,(s.cooldown??0)-dt);
  entity.x+=Math.sin(entity.yaw)*entity.speed*dt;entity.z+=Math.cos(entity.yaw)*entity.speed*dt;clampToMap(entity,terrain);updateGroundHeight(entity,cfg,terrain);
}

function chooseWheelMode(entity,cfg,info){
  const s=locomotionState(entity);s.modeTime+=0; // explicit ownership; time advances in stepWheels
  const terminalDiff=wrapPi(info.terminalHeading-entity.yaw),absTerminal=Math.abs(terminalDiff);
  const reverseEntry=cfg.reverseEntryAngle??cfg.reverseThreshold??2.48;
  const reverseExit=cfg.reverseExitAngle??1.35;
  const maxReverseDistance=cfg.maxReverseDistance??5.5;
  const preferForwardDistance=cfg.preferForwardDistance??Math.max(maxReverseDistance+2,11);
  const allowThreePoint=cfg.allowThreePointTurn!==false;

  if((s.cooldown??0)>0)return s;
  if(s.mode==='FORWARD'&&cfg.canMoveBackward&&absTerminal>reverseEntry){
    if(info.terminalDist<=maxReverseDistance){enterMode(entity,'SHORT_REVERSE',Math.sign(terminalDiff)||1);}
    else if(allowThreePoint&&info.terminalDist>=preferForwardDistance){enterMode(entity,'THREE_POINT_REVERSE',Math.sign(terminalDiff)||1);}
  }else if(s.mode==='SHORT_REVERSE'){
    if(absTerminal<reverseExit||info.terminalDist>preferForwardDistance||reverseTravel(entity)>=maxReverseDistance){
      const ns=enterMode(entity,allowThreePoint&&absTerminal>reverseEntry?'THREE_POINT_REVERSE':'FORWARD',Math.sign(terminalDiff)||s.turnSign||1);ns.cooldown=cfg.reverseReentryCooldown??1.2;
    }
  }
  return locomotionState(entity);
}

function wheelKinematics(entity,cfg,dt,desiredSteer,targetSpeed){
  const maxSteer=Math.max(0.05,cfg.wheelTurnAngle??cfg.maxSteerAngle??0.62);
  desiredSteer=clamp(desiredSteer,-maxSteer,maxSteer);
  entity.steeringAngle=approach(entity.steeringAngle??0,desiredSteer,cfg.steeringResponse??5.5,dt);
  const rate=Math.abs(targetSpeed)>Math.abs(entity.speed)?(cfg.acceleration??7):(cfg.braking??11);entity.speed=approach(entity.speed,targetSpeed,rate,dt);entity.movingBackward=entity.speed<-.02;
  const wheelbase=Math.max(0.5,cfg.wheelbase??2.7);let yawRate=(entity.speed/wheelbase)*Math.tan(entity.steeringAngle);yawRate=clamp(yawRate,-(cfg.turnRate??2.6),cfg.turnRate??2.6);
  entity.yaw=wrapPi(entity.yaw+yawRate*dt);entity.angularSpeed=yawRate;
}

function stepWheels(entity,cfg,dt,terrain,info){
  const s=chooseWheelMode(entity,cfg,info);s.modeTime+=dt;s.cooldown=Math.max(0,(s.cooldown??0)-dt);
  const maxSteer=Math.max(0.05,cfg.wheelTurnAngle??cfg.maxSteerAngle??0.62),maxSpeed=cfg.maxSpeed??10;
  const routeDiff=wrapPi(info.heading-entity.yaw),terminalDiff=wrapPi(info.terminalHeading-entity.yaw);
  let desiredSteer=0,targetSpeed=0;

  if(s.mode==='SHORT_REVERSE'){
    const reverseFacing=wrapPi(info.heading+Math.PI),reverseDiff=wrapPi(reverseFacing-entity.yaw);
    desiredSteer=clamp(reverseDiff*-1,-maxSteer,maxSteer);
    const severity=Math.abs(desiredSteer)/maxSteer,speedFactor=clamp(1-severity*(cfg.speedTurnPenalty??0.8),cfg.minTurnSpeedFactor??0.28,1);
    targetSpeed=-maxSpeed*(cfg.reverseMaxSpeedFactor??0.48)*speedFactor;
  }else if(s.mode==='THREE_POINT_REVERSE'){
    // Back away only far enough to create steering room, then commit to forward travel.
    desiredSteer=-s.turnSign*maxSteer*(cfg.threePointReverseSteerFactor??0.92);
    targetSpeed=-maxSpeed*(cfg.threePointReverseSpeedFactor??Math.min(cfg.reverseMaxSpeedFactor??0.48,0.36));
    const enoughDistance=reverseTravel(entity)>=(cfg.threePointReverseDistance??2.8);
    const enoughRotation=Math.abs(terminalDiff)<(cfg.threePointSwitchAngle??2.2);
    if(enoughDistance||enoughRotation||s.modeTime>(cfg.threePointReverseMaxTime??1.5)){
      const ns=enterMode(entity,'THREE_POINT_FORWARD',s.turnSign);ns.cooldown=cfg.reverseReentryCooldown??1.8;
    }
  }else{
    desiredSteer=clamp(routeDiff,-maxSteer,maxSteer);
    const severity=Math.abs(desiredSteer)/maxSteer,speedPenalty=cfg.speedTurnPenalty??0.8;
    let speedFactor=clamp(1-severity*speedPenalty,cfg.minTurnSpeedFactor??0.28,1);
    if(Math.abs(routeDiff)>(cfg.hardTurnSlowAngle??1.35))speedFactor=Math.min(speedFactor,cfg.hardTurnSpeedFactor??0.34);
    targetSpeed=maxSpeed*speedFactor;
    if(s.mode==='THREE_POINT_FORWARD'&&Math.abs(terminalDiff)<(cfg.threePointExitAngle??1.45)){
      const ns=enterMode(entity,'FORWARD',s.turnSign);ns.cooldown=cfg.reverseReentryCooldown??1.8;
    }
  }

  wheelKinematics(entity,cfg,dt,desiredSteer,targetSpeed);
  entity.x+=Math.sin(entity.yaw)*entity.speed*dt;entity.z+=Math.cos(entity.yaw)*entity.speed*dt;clampToMap(entity,terrain);updateGroundHeight(entity,cfg,terrain);
}

function stepLegs(entity,cfg,dt,terrain,info){
  const diff=wrapPi(info.heading-entity.yaw),turnRate=cfg.turnRate??7,yawStep=clamp(diff,-turnRate*dt,turnRate*dt);
  entity.yaw=wrapPi(entity.yaw+yawStep);entity.angularSpeed=yawStep/dt;entity.steeringAngle=0;entity.movingBackward=false;
  const alignment=clamp(1-Math.abs(diff)/Math.PI*(cfg.speedTurnPenalty??0.2),0.65,1),targetSpeed=(cfg.maxSpeed??5)*alignment,rate=targetSpeed>entity.speed?(cfg.acceleration??12):(cfg.braking??14);
  entity.speed=approach(entity.speed,targetSpeed,rate,dt);entity.x+=Math.sin(entity.yaw)*entity.speed*dt;entity.z+=Math.cos(entity.yaw)*entity.speed*dt;clampToMap(entity,terrain);updateGroundHeight(entity,cfg,terrain);
  const s=locomotionState(entity);s.mode='FORWARD';s.modeTime+=dt;s.cooldown=Math.max(0,(s.cooldown??0)-dt);
}

function stepAir(entity,cfg,dt,terrain,info){
  const diff=wrapPi(info.heading-entity.yaw),turnRate=cfg.turnRate??2.2,yawStep=clamp(diff,-turnRate*dt,turnRate*dt);
  entity.yaw=wrapPi(entity.yaw+yawStep);entity.angularSpeed=yawStep/dt;entity.steeringAngle=0;entity.movingBackward=false;
  const alignment=clamp(1-(Math.abs(diff)/Math.PI)*(cfg.speedTurnPenalty??0.55),0.28,1),targetSpeed=(cfg.maxSpeed??12)*alignment,rate=targetSpeed>entity.speed?(cfg.acceleration??7):(cfg.braking??9);
  entity.speed=approach(entity.speed,targetSpeed,rate,dt);entity.x+=Math.sin(entity.yaw)*entity.speed*dt;entity.z+=Math.cos(entity.yaw)*entity.speed*dt;clampToMap(entity,terrain);updateGroundHeight(entity,cfg,terrain);
  const s=locomotionState(entity);s.mode='FORWARD';s.modeTime+=dt;s.cooldown=Math.max(0,(s.cooldown??0)-dt);
}

export function stepLocomotor(entity,cfg,dt,terrain){
  const info=goalInfo(entity);if(!info){brakeIdle(entity,cfg,dt,terrain);return;}if(info.dist<0.001){brakeIdle(entity,cfg,dt,terrain);return;}
  const appearance=cfg.appearance||'';
  if(cfg.kind==='air'||appearance==='THRUST'||appearance==='WINGS'){stepAir(entity,cfg,dt,terrain,info);return;}
  if(appearance==='TREADS'||cfg.kind==='tracks'){stepTracks(entity,cfg,dt,terrain,info);return;}
  if(appearance==='FOUR_WHEELS'||appearance==='MOTORCYCLE'||cfg.kind==='wheels'){stepWheels(entity,cfg,dt,terrain,info);return;}
  if(appearance==='TWO_LEGS'||cfg.kind==='legs'){stepLegs(entity,cfg,dt,terrain,info);return;}
  stepLegs(entity,cfg,dt,terrain,info);
}
