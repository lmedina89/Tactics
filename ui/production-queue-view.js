import {CommandType} from '../engine/commands/command-bus.js';

export function productionQueueLimit(registry,producer){
  if(!producer)return 0;
  const def=registry.definition(producer.definitionId),cfg=def?registry.module(def,'Production'):null;
  return cfg?.queueLimit??5;
}

export function pendingProductionOrders(commandBus,producerId){
  return (commandBus?.queue||[]).filter(c=>c.type===CommandType.PRODUCE&&c.producerId===producerId);
}

export function productionQueueModel({registry,commandBus,producer}){
  const limit=productionQueueLimit(registry,producer),actual=producer?.production?.queue||[],pending=pendingProductionOrders(commandBus,producer?.id);
  const items=[];
  for(let i=0;i<actual.length&&items.length<limit;i++)items.push({kind:'ACTUAL',entry:actual[i],definitionId:actual[i].definitionId});
  for(const command of pending){if(items.length>=limit)break;items.push({kind:'PENDING',command,definitionId:command.definitionId});}
  const slots=Array.from({length:limit},(_,index)=>items[index]||{kind:'EMPTY',definitionId:null});
  let pendingCost=0;
  for(const command of pending){const def=registry.definition(command.definitionId),cost=def?registry.module(def,'ProductionCost'):null;pendingCost+=cost?.credits??0;}
  return {limit,actualCount:actual.length,pendingCount:pending.length,used:Math.min(limit,actual.length+pending.length),slots,pendingCost};
}

export function productionUiEligibility({registry,commandBus,producer,credits,definitionId,baseCheck}){
  if(!baseCheck?.ok)return baseCheck;
  const model=productionQueueModel({registry,commandBus,producer});
  if(model.used>=model.limit)return {ok:false,reason:'QUEUE_FULL'};
  const def=registry.definition(definitionId),cost=def?registry.module(def,'ProductionCost'):null,price=cost?.credits??0;
  if((credits??0)-model.pendingCost<price)return {ok:false,reason:'INSUFFICIENT_CREDITS'};
  return baseCheck;
}

export function productionSlotView(registry,slot,index){
  if(!slot||slot.kind==='EMPTY')return {name:'EMPTY',status:'',progress:null,kind:'EMPTY'};
  const def=registry.definition(slot.definitionId),name=(def?.name||slot.definitionId||'UNKNOWN').toUpperCase();
  if(slot.kind==='PENDING')return {name,status:'ORDER SENT',progress:null,kind:'PENDING'};
  const entry=slot.entry;
  if(index>0)return {name,status:'QUEUED',progress:null,kind:'QUEUED'};
  const pct=Math.min(100,Math.floor((entry?.progressTicks||0)/Math.max(1,entry?.buildTimeTicks||1)*100));
  if(entry?.state==='WAITING_EXIT')return {name,status:entry.waitReason==='EXIT_BLOCKED'?'EXIT BLOCKED':'WAITING EXIT',progress:100,kind:'WAITING'};
  return {name,status:`BUILDING ${pct}%`,progress:pct,kind:'BUILDING'};
}
