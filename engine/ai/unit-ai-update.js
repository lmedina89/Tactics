export const UnitAIState=Object.freeze({IDLE:'IDLE',MOVING:'MOVING',BLOCKED:'BLOCKED'});

export function createUnitAIState(){
  return {state:UnitAIState.IDLE,order:null,route:null,routeIndex:0,goal:null,lastProgressTick:0,lastProgressDistance:Infinity,nextRepathTick:0};
}

export function assignMoveOrder(entity,command){
  entity.ai ??= createUnitAIState();
  entity.ai.order={type:'MOVE',serial:command.serial,requested:{x:command.destination.x,z:command.destination.z}};
  entity.ai.state=UnitAIState.MOVING;entity.ai.route=null;entity.ai.routeIndex=0;entity.ai.goal=null;
  entity.ai.lastProgressDistance=Infinity;entity.ai.lastProgressTick=0;entity.ai.nextRepathTick=0;
}

export function clearOrders(entity){
  entity.ai ??= createUnitAIState();entity.ai.state=UnitAIState.IDLE;entity.ai.order=null;entity.ai.route=null;entity.ai.routeIndex=0;entity.ai.goal=null;entity.speed=0;entity.angularSpeed=0;entity.steeringAngle=0;entity.movingBackward=false;
}

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function stepUnitAI(entity,locomotor,pathfinder,tick){
  const ai=entity.ai ??= createUnitAIState();
  if(!ai.order){ai.state=UnitAIState.IDLE;ai.goal=null;return;}
  if(ai.order.type!=='MOVE')return;

  const profile={clearance:locomotor.pathfindRadius??entity.radius??0,maxSlopeDeg:locomotor.maxSlopeDeg??32,allowWater:locomotor.kind==='air'};
  const requested=ai.order.requested;
  if(!ai.route && tick>=ai.nextRepathTick){
    const destination=pathfinder.nearestWalkable(requested.x,requested.z,profile);
    const route=destination?pathfinder.findPath(entity.x,entity.z,destination.x,destination.z,profile):[];
    if(!route.length){ai.state=UnitAIState.BLOCKED;ai.goal=null;ai.nextRepathTick=tick+24;return;}
    ai.route=route;ai.routeIndex=route.length>1?1:0;ai.adjustedDestination=destination;ai.state=UnitAIState.MOVING;
    ai.lastProgressDistance=Infinity;ai.lastProgressTick=tick;
  }
  if(!ai.route?.length)return;

  let goal=ai.route[ai.routeIndex];
  if(!goal){clearOrders(entity);return;}
  const reach=Math.max(locomotor.arrivalRadius??0.6,(entity.radius??0)*0.35);
  if(Math.hypot(goal.x-entity.x,goal.z-entity.z)<=reach){
    ai.routeIndex++;
    if(ai.routeIndex>=ai.route.length){clearOrders(entity);return;}
    goal=ai.route[ai.routeIndex];
  }
  ai.goal=goal;

  const remaining=dist(entity,ai.adjustedDestination??requested);
  if(remaining<=(locomotor.arrivalRadius??0.6)*1.15){clearOrders(entity);return;}

  if(tick-ai.lastProgressTick>=15){
    const progress=ai.lastProgressDistance-remaining;
    if(ai.lastProgressDistance<Infinity && progress<0.12 && tick>=ai.nextRepathTick){
      ai.route=null;ai.goal=null;ai.nextRepathTick=tick+24;ai.state=UnitAIState.MOVING;
    }
    ai.lastProgressDistance=remaining;ai.lastProgressTick=tick;
  }
}
