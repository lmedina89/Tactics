import {applyDamage} from './damage-system.js';
import {chooseBestWeapon,weaponCanTarget} from './targeting.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapPi=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};
const headingTo=(a,b)=>Math.atan2(b.x-a.x,b.z-a.z);
const ticks=(seconds)=>Math.max(0,Math.ceil((seconds??0)*30));

export class CombatSystem{
  constructor({registry,entityLookup,projectiles}){
    this.registry=registry;this.entityLookup=entityLookup;this.projectiles=projectiles;this.events=[];this.eventSerial=0;
  }
  _emit(event){this.events.push({serial:++this.eventSerial,...event});if(this.events.length>128)this.events.shift();}
  _enemy(a,b){return !!(a?.playerId&&b?.playerId&&a.playerId!==b.playerId&&b.alive);}
  _targetValid(source,target,weapon=null){return this._enemy(source,target)&&(!weapon||weaponCanTarget(weapon,target));}
  _nearestAutoTarget(source,range){
    let best=null,bestD=Infinity;
    for(const target of this._allEntities()){
      if(!this._enemy(source,target))continue;const choice=chooseBestWeapon(source,target,this.registry);if(!choice)continue;
      const d=Math.hypot(target.x-source.x,target.z-source.z);if(d<=range&&d<bestD){best=target;bestD=d;}
    }
    return best;
  }
  _allEntities(){return this._entitiesProvider?this._entitiesProvider():[];}
  bindEntitiesProvider(fn){this._entitiesProvider=fn;return this;}
  targetFor(entity,tick){
    const explicitId=entity.ai?.order?.type==='ATTACK'?entity.ai.order.targetId:null;
    if(explicitId){const t=this.entityLookup(explicitId);if(t?.alive&&this._enemy(entity,t))return t;}
    const turret=entity.modules?.TurretAI;
    if(!turret?.autoAcquire)return null;
    entity.combat ??= {};
    let current=entity.combat.autoTargetId?this.entityLookup(entity.combat.autoTargetId):null;
    const acquireRange=turret.acquisitionRange??entity.modules?.Vision?.range??70;
    if(current&&(!this._enemy(entity,current)||Math.hypot(current.x-entity.x,current.z-entity.z)>acquireRange*1.15))current=null;
    if(!current && tick>=(entity.combat.nextScanTick??0)){
      current=this._nearestAutoTarget(entity,acquireRange);entity.combat.nextScanTick=tick+(turret.scanIntervalTicks??8);entity.combat.autoTargetId=current?.id??null;
    }
    return current;
  }
  _turnAim(entity,target,dt){
    const desired=headingTo(entity,target),turret=entity.modules?.TurretAI,bodyAim=entity.modules?.BodyAim;
    if(turret){
      const diff=wrapPi(desired-(entity.turretYaw??entity.yaw)),max=(turret.turnRate??2)*dt,step=clamp(diff,-max,max);
      entity.turretYaw=wrapPi((entity.turretYaw??entity.yaw)+step);entity.turretAngularSpeed=dt>0?step/dt:0;return Math.abs(wrapPi(desired-entity.turretYaw));
    }
    if(bodyAim && Math.abs(entity.speed??0)<0.6){
      const diff=wrapPi(desired-entity.yaw),max=(bodyAim.turnRate??7)*dt,step=clamp(diff,-max,max);
      entity.yaw=wrapPi(entity.yaw+step);entity.angularSpeed=dt>0?step/dt:0;return Math.abs(wrapPi(desired-entity.yaw));
    }
    return Math.abs(wrapPi(desired-entity.yaw));
  }
  _muzzlePoint(entity,weapon){
    const yaw=entity.modules?.TurretAI?(entity.turretYaw??entity.yaw):entity.yaw;
    const forward=weapon.muzzleForwardOffset??0,height=weapon.muzzleHeight??1;
    return {x:entity.x+Math.sin(yaw)*forward,y:(entity.y??0)+height,z:entity.z+Math.cos(yaw)*forward};
  }
  _updateReload(slot,weapon,tick){
    const clip=Math.max(1,weapon.clipSize??1);
    if(slot.ammoInClip==null)slot.ammoInClip=clip;
    if(slot.ammoInClip<=0 && tick>=(slot.reloadUntilTick??0)){slot.ammoInClip=clip;slot.reloadUntilTick=0;}
  }
  _canFireSlot(slot,weapon,target,tick,aimError,distance){
    this._updateReload(slot,weapon,tick);
    if(slot.ammoInClip<=0)return false;
    if(tick<(slot.nextFireTick??0)||tick<(slot.reloadUntilTick??0))return false;
    if(distance<(weapon.minimumRange??0)||distance>(weapon.range??0))return false;
    if(aimError>(weapon.aimTolerance??0.14))return false;
    if(slot.targetId!==target.id){slot.targetId=target.id;slot.prefireUntilTick=tick+ticks(weapon.prefireDelay??0);return false;}
    if(tick<(slot.prefireUntilTick??0))return false;
    return true;
  }
  _fire(entity,target,choice,tick){
    const {slot,weapon}=choice,start=this._muzzlePoint(entity,weapon);
    slot.ammoInClip=Math.max(0,(slot.ammoInClip??Math.max(1,weapon.clipSize??1))-1);
    slot.nextFireTick=tick+ticks(weapon.delayBetweenShots??0.2);
    if(slot.ammoInClip<=0)slot.reloadUntilTick=tick+ticks(weapon.clipReloadTime??weapon.delayBetweenShots??0.2);
    if(weapon.delivery==='PROJECTILE'){
      const p=this.projectiles.spawn({source:entity,target,weapon,start,tick});
      this._emit({type:'PROJECTILE_FIRED',sourceId:entity.id,targetId:target.id,weaponId:weapon.id,projectileId:p.id,start,point:{x:target.x,y:target.y,z:target.z}});
    }else{
      const result=applyDamage({registry:this.registry,target,weapon,sourceId:entity.id,tick});
      this._emit({type:'HITSCAN',sourceId:entity.id,targetId:target.id,weaponId:weapon.id,start,end:{x:target.x,y:(target.y??0)+0.9,z:target.z},color:weapon.tracerColor??'#ffd98a',damage:result.applied,destroyed:result.destroyed});
      if(result.destroyed)this._emit({type:'DESTROYED',sourceId:entity.id,targetId:target.id,weaponId:weapon.id});
    }
  }
  step(dt,tick){
    for(const entity of this._allEntities()){
      if(!entity.alive||!entity.weaponSlots?.slots?.length)continue;
      const target=this.targetFor(entity,tick);entity.combat.activeTargetId=target?.id??null;if(!target)continue;
      const choice=chooseBestWeapon(entity,target,this.registry);if(!choice)continue;
      const distance=Math.hypot(target.x-entity.x,target.z-entity.z),aimError=this._turnAim(entity,target,dt);
      if(this._canFireSlot(choice.slot,choice.weapon,target,tick,aimError,distance))this._fire(entity,target,choice,tick);
    }
    this.projectiles.step(dt,{entityLookup:this.entityLookup,onImpact:(p,target,hit)=>{
      const weapon=this.registry.weapon(p.weaponId);let result={applied:0,destroyed:false};
      if(hit&&target?.alive)result=applyDamage({registry:this.registry,target,weapon,sourceId:p.sourceId,tick});
      this._emit({type:'PROJECTILE_IMPACT',sourceId:p.sourceId,targetId:p.targetId,weaponId:p.weaponId,projectileId:p.id,x:p.x,y:p.y,z:p.z,hit,damage:result.applied,destroyed:result.destroyed});
      if(result.destroyed)this._emit({type:'DESTROYED',sourceId:p.sourceId,targetId:p.targetId,weaponId:p.weaponId});
    }});
  }
  snapshot(){return {eventSerial:this.eventSerial};}
  restore(state){this.eventSerial=state?.eventSerial??0;this.events=[];}
}
