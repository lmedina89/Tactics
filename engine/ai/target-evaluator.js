import {moduleConfig} from '../entities/game-object.js';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function aiTargetCategories(registry,entity){
  const def=entity&&registry?.definition?.(entity.definitionId),cfg=def?moduleConfig(def,'AITargetable'):null;
  if(cfg?.categories?.length)return [...cfg.categories];
  const out=[];
  if(entity?.kind)out.push(String(entity.kind).toUpperCase());
  if(entity?.weaponSlots?.slots?.length)out.push('COMBAT');
  return out;
}

export class TargetEvaluator{
  constructor({registry}){this.registry=registry;}
  set(id){return id&&this.registry?.targetPrioritySet?.(id)||null;}
  score(target,{from,prioritySetId,recentAttackerId=null}={}){
    if(!target?.alive||!target.playerId)return -Infinity;
    const set=this.set(prioritySetId);if(!set)return -(from?dist(from,target):0);
    const def=this.registry.definition?.(target.definitionId),targetCfg=def?moduleConfig(def,'AITargetable'):null;
    if(set.ignoreInsignificant&&targetCfg?.significant===false)return -Infinity;
    const categories=aiTargetCategories(this.registry,target);
    let priority=set.defaultPriority??0;
    for(const c of categories)priority=Math.max(priority,set.priorities?.[c]??-Infinity);
    if(target.id===recentAttackerId)priority+=set.recentAttackerBonus??0;
    const distancePenalty=from&&set.distanceModifier>0?dist(from,target)/set.distanceModifier:0;
    return priority-distancePenalty;
  }
  choose(candidates,{from,prioritySetId,recentAttackerId=null,filter=null}={}){
    let best=null,bestScore=-Infinity,bestDistance=Infinity;
    for(const target of candidates||[]){if(filter&&!filter(target))continue;const score=this.score(target,{from,prioritySetId,recentAttackerId});if(!Number.isFinite(score))continue;const d=from?dist(from,target):0;
      if(score>bestScore+1e-9||(Math.abs(score-bestScore)<=1e-9&&(d<bestDistance-1e-9||(Math.abs(d-bestDistance)<=1e-9&&target.id<(best?.id??'~'))))){best=target;bestScore=score;bestDistance=d;}
    }
    return best?{target:best,score:bestScore,distance:bestDistance}:null;
  }
}
