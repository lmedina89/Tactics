import {engagementProfile} from '../combat/targeting.js';

export const UnitAIState=Object.freeze({IDLE:'IDLE',MOVING:'MOVING',ATTACKING:'ATTACKING',GUARDING:'GUARDING',BLOCKED:'BLOCKED'});
export const UnitStance=Object.freeze({GUARD:'GUARD',AGGRESSIVE:'AGGRESSIVE',HOLD_POSITION:'HOLD_POSITION'});

export function createUnitAIState(config={}){
  return {
    state:UnitAIState.IDLE,order:null,orderQueue:[],stance:config.defaultStance||UnitStance.GUARD,
    route:null,routeIndex:0,goal:null,adjustedDestination:null,lastProgressTick:0,lastProgressDistance:Infinity,nextRepathTick:0,attackTargetLast:null,
    engagementTargetId:null,engagementOrigin:null,nextEnemyScanTick:0
  };
}

function ensureUnitAIState(entity){
  const defaults=createUnitAIState(entity.modules?.UnitAIUpdate||{}),current=entity.ai;if(!current){entity.ai=defaults;return entity.ai;}
  entity.ai={...defaults,...current,orderQueue:Array.isArray(current.orderQueue)?current.orderQueue:[]};return entity.ai;
}

function resetRoute(ai){ai.route=null;ai.routeIndex=0;ai.goal=null;ai.adjustedDestination=null;ai.lastProgressDistance=Infinity;ai.lastProgressTick=0;ai.nextRepathTick=0;ai.attackTargetLast=null;}
function resetEngagement(ai){ai.engagementTargetId=null;ai.engagementOrigin=null;ai.attackTargetLast=null;}
function stopMotion(entity){entity.speed=0;entity.angularSpeed=0;entity.steeringAngle=0;entity.movingBackward=false;if(entity.locomotionState){entity.locomotionState.mode='FORWARD';entity.locomotionState.modeTime=0;entity.locomotionState.cooldown=0;entity.locomotionState.reverseStartX=entity.x;entity.locomotionState.reverseStartZ=entity.z;}}
function activateOrder(entity,order){const ai=entity.ai;ai.order=order;ai.state=order?.type?.startsWith('GUARD')?UnitAIState.GUARDING:(order?UnitAIState.MOVING:UnitAIState.IDLE);resetRoute(ai);resetEngagement(ai);if(entity.combat)entity.combat.manualTargetId=null;}
function enqueueOrder(entity,order,append=false){const ai=ensureUnitAIState(entity);if(append&&ai.order){ai.orderQueue.push(order);return;}ai.orderQueue=[];activateOrder(entity,order);}
function completeOrder(entity){const ai=entity.ai;if(ai.orderQueue?.length){activateOrder(entity,ai.orderQueue.shift());return;}activateOrder(entity,null);stopMotion(entity);}

export function assignMoveOrder(entity,command){enqueueOrder(entity,{type:'MOVE',serial:command.serial,requested:{x:command.destination.x,z:command.destination.z}},!!command.append);}
export function assignAttackOrder(entity,command){enqueueOrder(entity,{type:'ATTACK',serial:command.serial,targetId:command.targetId},!!command.append);}
export function assignAttackMoveOrder(entity,command){enqueueOrder(entity,{type:'ATTACK_MOVE',serial:command.serial,requested:{x:command.destination.x,z:command.destination.z}},!!command.append);}
export function assignGuardPositionOrder(entity,command){enqueueOrder(entity,{type:'GUARD_POSITION',serial:command.serial,position:{x:command.position.x,z:command.position.z}},!!command.append);}
export function assignGuardObjectOrder(entity,command){enqueueOrder(entity,{type:'GUARD_OBJECT',serial:command.serial,targetId:command.targetId},!!command.append);}
export function setUnitStance(entity,stance){ensureUnitAIState(entity);if(!Object.values(UnitStance).includes(stance))return false;entity.ai.stance=stance;resetEngagement(entity.ai);return true;}

export function clearOrders(entity,{keepQueue=false}={}){
  ensureUnitAIState(entity);const q=keepQueue?entity.ai.orderQueue:[];entity.ai.orderQueue=q;activateOrder(entity,null);if(keepQueue&&q.length)activateOrder(entity,q.shift());
  stopMotion(entity);
}

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function profileFor(entity,locomotor){return {clearance:locomotor.pathfindRadius??entity.radius??0,maxSlopeDeg:locomotor.maxSlopeDeg??32,allowWater:locomotor.kind==='air'};}
function aiConfig(entity){return entity.modules?.UnitAIUpdate||{};}

function buildRoute(entity,requested,locomotor,pathfinder,tick){
  const ai=entity.ai,profile=profileFor(entity,locomotor);const destination=pathfinder.nearestWalkable(requested.x,requested.z,profile);const route=destination?pathfinder.findPath(entity.x,entity.z,destination.x,destination.z,profile):[];
  if(!route.length){ai.state=UnitAIState.BLOCKED;ai.goal=null;ai.nextRepathTick=tick+24;return false;}
  ai.route=route;ai.routeIndex=route.length>1?1:0;ai.adjustedDestination=destination;ai.state=UnitAIState.MOVING;ai.lastProgressDistance=Infinity;ai.lastProgressTick=tick;return true;
}

function followRoute(entity,locomotor,tick,terminalPoint,onArrive){
  const ai=entity.ai;if(!ai.route?.length)return;let goal=ai.route[ai.routeIndex];if(!goal){onArrive();return;}
  const reach=Math.max(locomotor.arrivalRadius??0.6,(entity.radius??0)*0.35);
  if(Math.hypot(goal.x-entity.x,goal.z-entity.z)<=reach){ai.routeIndex++;if(ai.routeIndex>=ai.route.length){onArrive();return;}goal=ai.route[ai.routeIndex];}
  ai.goal=goal;const remaining=dist(entity,terminalPoint);if(remaining<=reach*1.15){onArrive();return;}
  if(tick-ai.lastProgressTick>=15){const maneuver=entity.locomotionState?.mode;if(maneuver==='THREE_POINT_REVERSE'||maneuver==='THREE_POINT_FORWARD'){ai.lastProgressDistance=remaining;ai.lastProgressTick=tick;return;}const progress=ai.lastProgressDistance-remaining;if(ai.lastProgressDistance<Infinity&&progress<0.12&&tick>=ai.nextRepathTick){ai.route=null;ai.goal=null;ai.nextRepathTick=tick+24;ai.state=UnitAIState.MOVING;}ai.lastProgressDistance=remaining;ai.lastProgressTick=tick;}
}

function stepMoveTo(entity,requested,locomotor,pathfinder,tick,onArrive){const ai=entity.ai;if(!ai.route&&tick>=ai.nextRepathTick)buildRoute(entity,requested,locomotor,pathfinder,tick);if(!ai.route?.length)return;followRoute(entity,locomotor,tick,ai.adjustedDestination??requested,onArrive);}
function stepMove(entity,locomotor,pathfinder,tick){stepMoveTo(entity,entity.ai.order.requested,locomotor,pathfinder,tick,()=>completeOrder(entity));}

function attackApproachPoint(entity,target,range,minimumRange){const dx=entity.x-target.x,dz=entity.z-target.z,d=Math.hypot(dx,dz)||1;let desired=Math.max(minimumRange*1.25,range*0.82);if(d<minimumRange*1.05)desired=Math.max(minimumRange*1.35,range*0.18);return {x:target.x+dx/d*desired,z:target.z+dz/d*desired};}

function nearestEnemy(entity,context,range,{center=null,centerRange=Infinity,requireInWeaponRange=false}={}){
  let best=null,bestD=Infinity;for(const target of context?.entitiesProvider?.()||[]){if(!target?.alive||!target.playerId||target.playerId===entity.playerId)continue;const engagement=engagementProfile(entity,target,context.registry);if(!engagement)continue;const d=dist(entity,target);if(d>range)continue;if(center&&dist(center,target)>centerRange)continue;if(requireInWeaponRange&&(d>engagement.range||d<engagement.minimumRange))continue;if(d<bestD){best=target;bestD=d;}}
  return best;
}

function beginEngagement(entity,target){const ai=entity.ai;ai.engagementTargetId=target.id;ai.engagementOrigin={x:entity.x,z:entity.z};resetRoute(ai);}
function dropEngagement(entity){resetEngagement(entity.ai);resetRoute(entity.ai);if(entity.combat)entity.combat.manualTargetId=null;}

function stepEngagement(entity,target,locomotor,pathfinder,tick,context,{chaseOrigin=null,chaseDistance=Infinity,holdPosition=false,onLost=()=>{}}={}){
  const ai=entity.ai;if(!target?.alive||!target.playerId||target.playerId===entity.playerId){dropEngagement(entity);onLost();return;}
  if(chaseOrigin&&dist(chaseOrigin,target)>chaseDistance){dropEngagement(entity);onLost();return;}
  const engagement=engagementProfile(entity,target,context.registry);if(!engagement){dropEngagement(entity);onLost();return;}
  ai.engagementTargetId=target.id;if(entity.combat)entity.combat.manualTargetId=target.id;
  const distance=dist(entity,target),maxRange=engagement.range,minRange=engagement.minimumRange,enterRange=maxRange*0.96,holdRange=maxRange*1.06,minHold=Math.max(0,minRange*0.94);
  const inStableRange=(ai.state===UnitAIState.ATTACKING?distance<=holdRange:distance<=enterRange)&&distance>=minHold;
  if(inStableRange){ai.state=UnitAIState.ATTACKING;ai.route=null;ai.routeIndex=0;ai.goal=null;ai.adjustedDestination=null;entity.speed=0;return;}
  if(holdPosition){ai.state=UnitAIState.GUARDING;entity.speed=0;dropEngagement(entity);onLost();return;}
  const moved=ai.attackTargetLast?Math.hypot(target.x-ai.attackTargetLast.x,target.z-ai.attackTargetLast.z):Infinity;
  if((!ai.route||moved>4)&&tick>=ai.nextRepathTick){const approach=attackApproachPoint(entity,target,maxRange,minRange),ok=buildRoute(entity,approach,locomotor,pathfinder,tick);ai.attackTargetLast={x:target.x,z:target.z};ai.nextRepathTick=tick+15;if(!ok)return;}
  if(!ai.route?.length)return;const terminal=ai.adjustedDestination??attackApproachPoint(entity,target,maxRange,minRange);followRoute(entity,locomotor,tick,terminal,()=>{ai.route=null;ai.goal=null;ai.state=UnitAIState.ATTACKING;entity.speed=0;});
}

function stepAttack(entity,locomotor,pathfinder,tick,context){const target=context?.entityLookup?.(entity.ai.order.targetId);stepEngagement(entity,target,locomotor,pathfinder,tick,context,{onLost:()=>completeOrder(entity)});}

function scanForOrderTarget(entity,tick,context,center,range,scanInterval){const ai=entity.ai;if(ai.engagementTargetId)return context.entityLookup(ai.engagementTargetId);if(tick<(ai.nextEnemyScanTick??0))return null;ai.nextEnemyScanTick=tick+scanInterval;const t=nearestEnemy(entity,context,range,{center,centerRange:range});if(t)beginEngagement(entity,t);return t;}

function stepAttackMove(entity,locomotor,pathfinder,tick,context){
  const ai=entity.ai,cfg=aiConfig(entity),dest=ai.order.requested;let target=ai.engagementTargetId?context.entityLookup(ai.engagementTargetId):null;
  if(!target?.alive)target=scanForOrderTarget(entity,tick,context,null,cfg.attackMoveAcquisitionRange??cfg.acquisitionRange??entity.modules?.Vision?.range??70,cfg.attackMoveScanIntervalTicks??6);
  if(target){const origin=ai.engagementOrigin||{x:entity.x,z:entity.z};stepEngagement(entity,target,locomotor,pathfinder,tick,context,{chaseOrigin:origin,chaseDistance:cfg.attackMoveChaseDistance??110,onLost:()=>{}});return;}
  ai.state=UnitAIState.MOVING;stepMoveTo(entity,dest,locomotor,pathfinder,tick,()=>completeOrder(entity));
}

function guardAnchor(entity,context){const o=entity.ai.order;if(o.type==='GUARD_POSITION')return o.position;const target=context.entityLookup(o.targetId);return target?.alive?{x:target.x,z:target.z}:null;}
function stepGuard(entity,locomotor,pathfinder,tick,context){
  const ai=entity.ai,cfg=aiConfig(entity),anchor=guardAnchor(entity,context);if(!anchor){completeOrder(entity);return;}let target=ai.engagementTargetId?context.entityLookup(ai.engagementTargetId):null;
  if(!target?.alive)target=scanForOrderTarget(entity,tick,context,anchor,cfg.guardRange??cfg.acquisitionRange??entity.modules?.Vision?.range??70,cfg.guardScanIntervalTicks??8);
  if(target){stepEngagement(entity,target,locomotor,pathfinder,tick,context,{chaseOrigin:anchor,chaseDistance:cfg.guardChaseDistance??95,onLost:()=>{ai.state=UnitAIState.GUARDING;}});return;}
  ai.state=UnitAIState.GUARDING;const returnRadius=cfg.guardReturnRadius??10;if(dist(entity,anchor)>returnRadius)stepMoveTo(entity,anchor,locomotor,pathfinder,tick,()=>{resetRoute(ai);ai.state=UnitAIState.GUARDING;stopMotion(entity);});else{resetRoute(ai);stopMotion(entity);}
}

function stepIdleAutoAcquire(entity,locomotor,pathfinder,tick,context){
  const ai=entity.ai,cfg=aiConfig(entity);if(!cfg.autoAcquireEnemiesWhenIdle||!entity.weaponSlots?.slots?.length)return false;
  let target=ai.engagementTargetId?context.entityLookup(ai.engagementTargetId):null;if(!target?.alive&&tick>=(ai.nextEnemyScanTick??0)){
    ai.nextEnemyScanTick=tick+(cfg.idleScanIntervalTicks??10);const base=cfg.acquisitionRange??entity.modules?.Vision?.range??70,aggressive=ai.stance===UnitStance.AGGRESSIVE?(cfg.aggressiveRangeMultiplier??1.25):1;
    target=nearestEnemy(entity,context,base*aggressive,{requireInWeaponRange:ai.stance===UnitStance.HOLD_POSITION});if(target)beginEngagement(entity,target);
  }
  if(!target)return false;const hold=ai.stance===UnitStance.HOLD_POSITION,origin=ai.engagementOrigin||{x:entity.x,z:entity.z},chase=ai.stance===UnitStance.AGGRESSIVE?(cfg.aggressiveChaseDistance??140):(cfg.idleChaseDistance??85);
  stepEngagement(entity,target,locomotor,pathfinder,tick,context,{chaseOrigin:origin,chaseDistance:chase,holdPosition:hold,onLost:()=>{ai.state=UnitAIState.IDLE;}});return true;
}

export function stepUnitAI(entity,locomotor,pathfinder,tick,context={}){
  const ai=ensureUnitAIState(entity);if(!entity.alive){clearOrders(entity);return;}
  if(!ai.order){if(stepIdleAutoAcquire(entity,locomotor,pathfinder,tick,context))return;ai.state=UnitAIState.IDLE;ai.goal=null;return;}
  if(ai.order.type==='MOVE'){stepMove(entity,locomotor,pathfinder,tick);return;}
  if(ai.order.type==='ATTACK'){stepAttack(entity,locomotor,pathfinder,tick,context);return;}
  if(ai.order.type==='ATTACK_MOVE'){stepAttackMove(entity,locomotor,pathfinder,tick,context);return;}
  if(ai.order.type==='GUARD_POSITION'||ai.order.type==='GUARD_OBJECT'){stepGuard(entity,locomotor,pathfinder,tick,context);return;}
}
