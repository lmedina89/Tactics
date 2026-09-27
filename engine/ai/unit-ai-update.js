import {engagementProfile} from '../combat/targeting.js';

export const UnitAIState=Object.freeze({IDLE:'IDLE',MOVING:'MOVING',ATTACKING:'ATTACKING',BLOCKED:'BLOCKED'});

export function createUnitAIState(){
  return {state:UnitAIState.IDLE,order:null,route:null,routeIndex:0,goal:null,adjustedDestination:null,lastProgressTick:0,lastProgressDistance:Infinity,nextRepathTick:0,attackTargetLast:null};
}

function resetRoute(ai){ai.route=null;ai.routeIndex=0;ai.goal=null;ai.adjustedDestination=null;ai.lastProgressDistance=Infinity;ai.lastProgressTick=0;ai.nextRepathTick=0;}

export function assignMoveOrder(entity,command){
  entity.ai ??= createUnitAIState();
  entity.ai.order={type:'MOVE',serial:command.serial,requested:{x:command.destination.x,z:command.destination.z}};
  entity.ai.state=UnitAIState.MOVING;entity.ai.attackTargetLast=null;resetRoute(entity.ai);
}

export function assignAttackOrder(entity,command){
  entity.ai ??= createUnitAIState();
  entity.ai.order={type:'ATTACK',serial:command.serial,targetId:command.targetId};
  entity.ai.state=UnitAIState.MOVING;entity.ai.attackTargetLast=null;resetRoute(entity.ai);
}

export function clearOrders(entity){
  entity.ai ??= createUnitAIState();entity.ai.state=UnitAIState.IDLE;entity.ai.order=null;entity.ai.attackTargetLast=null;resetRoute(entity.ai);
  entity.speed=0;entity.angularSpeed=0;entity.steeringAngle=0;entity.movingBackward=false;
  if(entity.combat)entity.combat.manualTargetId=null;
}

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

function profileFor(entity,locomotor){return {clearance:locomotor.pathfindRadius??entity.radius??0,maxSlopeDeg:locomotor.maxSlopeDeg??32,allowWater:locomotor.kind==='air'};}

function buildRoute(entity,requested,locomotor,pathfinder,tick){
  const ai=entity.ai,profile=profileFor(entity,locomotor);
  const destination=pathfinder.nearestWalkable(requested.x,requested.z,profile);
  const route=destination?pathfinder.findPath(entity.x,entity.z,destination.x,destination.z,profile):[];
  if(!route.length){ai.state=UnitAIState.BLOCKED;ai.goal=null;ai.nextRepathTick=tick+24;return false;}
  ai.route=route;ai.routeIndex=route.length>1?1:0;ai.adjustedDestination=destination;ai.state=UnitAIState.MOVING;
  ai.lastProgressDistance=Infinity;ai.lastProgressTick=tick;return true;
}

function followRoute(entity,locomotor,tick,terminalPoint,onArrive){
  const ai=entity.ai;if(!ai.route?.length)return;
  let goal=ai.route[ai.routeIndex];if(!goal){onArrive();return;}
  const reach=Math.max(locomotor.arrivalRadius??0.6,(entity.radius??0)*0.35);
  if(Math.hypot(goal.x-entity.x,goal.z-entity.z)<=reach){
    ai.routeIndex++;
    if(ai.routeIndex>=ai.route.length){onArrive();return;}
    goal=ai.route[ai.routeIndex];
  }
  ai.goal=goal;
  const remaining=dist(entity,terminalPoint);
  if(remaining<=reach*1.15){onArrive();return;}
  if(tick-ai.lastProgressTick>=15){
    const progress=ai.lastProgressDistance-remaining;
    if(ai.lastProgressDistance<Infinity&&progress<0.12&&tick>=ai.nextRepathTick){ai.route=null;ai.goal=null;ai.nextRepathTick=tick+24;ai.state=UnitAIState.MOVING;}
    ai.lastProgressDistance=remaining;ai.lastProgressTick=tick;
  }
}

function stepMove(entity,locomotor,pathfinder,tick){
  const ai=entity.ai,requested=ai.order.requested;
  if(!ai.route&&tick>=ai.nextRepathTick)buildRoute(entity,requested,locomotor,pathfinder,tick);
  if(!ai.route?.length)return;
  followRoute(entity,locomotor,tick,ai.adjustedDestination??requested,()=>clearOrders(entity));
}

function attackApproachPoint(entity,target,range,minimumRange){
  const dx=entity.x-target.x,dz=entity.z-target.z,d=Math.hypot(dx,dz)||1;
  let desired=Math.max(minimumRange*1.25,range*0.82);
  if(d<minimumRange*1.05)desired=Math.max(minimumRange*1.35,range*0.18);
  return {x:target.x+dx/d*desired,z:target.z+dz/d*desired};
}

function stepAttack(entity,locomotor,pathfinder,tick,context){
  const ai=entity.ai,target=context?.entityLookup?.(ai.order.targetId);
  if(!target?.alive||!target.playerId||target.playerId===entity.playerId){clearOrders(entity);return;}
  const engagement=engagementProfile(entity,target,context.registry);
  if(!engagement){ai.state=UnitAIState.BLOCKED;ai.goal=null;return;}
  if(entity.combat)entity.combat.manualTargetId=target.id;
  const distance=dist(entity,target),maxRange=engagement.range,minRange=engagement.minimumRange;
  if(distance<=maxRange*0.98&&distance>=minRange){ai.state=UnitAIState.ATTACKING;ai.route=null;ai.routeIndex=0;ai.goal=null;ai.adjustedDestination=null;entity.speed=0;return;}

  const moved=ai.attackTargetLast?Math.hypot(target.x-ai.attackTargetLast.x,target.z-ai.attackTargetLast.z):Infinity;
  if((!ai.route||moved>4)&&tick>=ai.nextRepathTick){
    const approach=attackApproachPoint(entity,target,maxRange,minRange),ok=buildRoute(entity,approach,locomotor,pathfinder,tick);
    ai.attackTargetLast={x:target.x,z:target.z};ai.nextRepathTick=tick+15;
    if(!ok)return;
  }
  if(!ai.route?.length)return;
  const terminal=ai.adjustedDestination??attackApproachPoint(entity,target,maxRange,minRange);
  followRoute(entity,locomotor,tick,terminal,()=>{ai.route=null;ai.goal=null;ai.state=UnitAIState.ATTACKING;entity.speed=0;});
}

export function stepUnitAI(entity,locomotor,pathfinder,tick,context={}){
  const ai=entity.ai ??= createUnitAIState();
  if(!entity.alive){clearOrders(entity);return;}
  if(!ai.order){ai.state=UnitAIState.IDLE;ai.goal=null;return;}
  if(ai.order.type==='MOVE'){stepMove(entity,locomotor,pathfinder,tick);return;}
  if(ai.order.type==='ATTACK'){stepAttack(entity,locomotor,pathfinder,tick,context);return;}
}
