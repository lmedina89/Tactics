export const DamageState=Object.freeze({PRISTINE:'PRISTINE',DAMAGED:'DAMAGED',CRITICAL:'CRITICAL',DESTROYED:'DESTROYED'});

export function armorMultiplier(registry,target,damageType){
  const armor=target?.armorId&&registry?.armor?registry.armor(target.armorId):null;
  return armor?.multipliers?.[damageType] ?? armor?.defaultMultiplier ?? 1;
}

export function estimateAdjustedDamage(registry,target,weapon){
  if(!target||!weapon)return 0;
  return Math.max(0,(weapon.damage??0)*armorMultiplier(registry,target,weapon.damageType));
}

export function healthDamageState(target){
  if(!target?.alive||target.health<=0)return DamageState.DESTROYED;
  const ratio=target.maxHealth>0?target.health/target.maxHealth:0;
  if(ratio<=0.33)return DamageState.CRITICAL;
  if(ratio<=0.66)return DamageState.DAMAGED;
  return DamageState.PRISTINE;
}

export function applyDamage({registry,target,weapon,sourceId,tick}){
  if(!target?.alive||!weapon)return {applied:0,destroyed:false};
  const applied=estimateAdjustedDamage(registry,target,weapon);
  if(applied<=0)return {applied:0,destroyed:false};
  target.health=Math.max(0,target.health-applied);
  target.lastDamagedBy=sourceId??null;
  target.lastDamagedTick=tick;
  target.damageState=healthDamageState(target);
  let destroyed=false;
  if(target.health<=0){
    destroyed=true;target.alive=false;target.selectable=false;target.destroyedTick=tick;
    target.speed=0;target.angularSpeed=0;target.steeringAngle=0;target.movingBackward=false;
    if(target.ai){target.ai.state='IDLE';target.ai.order=null;target.ai.route=null;target.ai.goal=null;target.ai.routeIndex=0;}
    if(target.combat){target.combat.manualTargetId=null;target.combat.autoTargetId=null;target.combat.activeTargetId=null;}
  }
  return {applied,destroyed,multiplier:armorMultiplier(registry,target,weapon.damageType)};
}
