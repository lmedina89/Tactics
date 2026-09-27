import {estimateAdjustedDamage} from './damage-system.js';

export function targetDomain(target){return target?.kind==='aircraft'?'AIR':'GROUND';}

export function weaponCanTarget(weapon,target){
  if(!weapon||!target?.alive)return false;
  const domains=weapon.targetDomains||['GROUND'];
  if(!domains.includes(targetDomain(target)))return false;
  const kinds=weapon.targetKinds||[];
  return !kinds.length||kinds.includes(target.kind);
}

export function weaponRuntimeSlots(entity){return entity?.weaponSlots?.slots||[];}

export function chooseBestWeapon(entity,target,registry){
  if(!entity?.alive||!target?.alive||!registry?.weapon)return null;
  let best=null,bestScore=-Infinity;
  for(const slot of weaponRuntimeSlots(entity)){
    const weapon=registry.weapon(slot.weaponId);if(!weapon||!weaponCanTarget(weapon,target))continue;
    const damage=estimateAdjustedDamage(registry,target,weapon);
    const score=damage/Math.max(0.05,weapon.delayBetweenShots??1);
    if(score>bestScore){bestScore=score;best={slot,weapon,estimatedDamage:damage,score};}
  }
  return best;
}

export function engagementProfile(entity,target,registry){
  const best=chooseBestWeapon(entity,target,registry);if(!best)return null;
  return {...best,range:best.weapon.range??0,minimumRange:best.weapon.minimumRange??0};
}
