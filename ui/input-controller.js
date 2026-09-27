import * as THREE from 'three';
import {GestureResolver,GestureType} from './gesture-resolver.js';

const REASON_LABEL={
  OUT_OF_BUILD_RADIUS:'OUTSIDE BUILD RADIUS',OUT_OF_BOUNDS:'OUT OF BOUNDS',WATER:'CANNOT BUILD IN WATER',TOO_STEEP:'TERRAIN TOO STEEP',HEIGHT_VARIATION:'TERRAIN TOO UNEVEN',BLOCKED_TERRAIN:'BLOCKED TERRAIN',OBJECT_OVERLAP:'OBJECT IN THE WAY',RESOURCE_OVERLAP:'RESOURCE FIELD IN THE WAY',MISSING_PREREQUISITE:'MISSING PREREQUISITE',BUILD_LIMIT:'BUILD LIMIT REACHED',INSUFFICIENT_CREDITS:'INSUFFICIENT CREDITS',INVALID_BUILDER:'INVALID BUILDER',BUILDER_NOT_OPERATIONAL:'BUILDER NOT OPERATIONAL'
};

export class InputController{
  constructor({canvas,renderer,sim,onSelection,onStatus,onPlacementChanged=()=>{}}){
    this.canvas=canvas;this.renderer=renderer;this.sim=sim;this.onSelection=onSelection;this.onStatus=onStatus;this.onPlacementChanged=onPlacementChanged;this.selectedId=null;this.placement=null;
    this.raycaster=new THREE.Raycaster();this.ndc=new THREE.Vector2();
    this.gestures=new GestureResolver({tapMovePx:30,panStartPx:34,longPressMs:520,tapMaxMs:720});
    this._bind();
  }
  selected(){const e=this.selectedId?this.sim.entities.get(this.selectedId):null;if(!e?.alive){this.selectedId=null;return null;}return e;}
  clear(){this.cancelPlacement();this.selectedId=null;this.onSelection(null);}
  isPlacing(){return !!this.placement;}
  _bind(){
    const c=this.canvas;c.style.touchAction='none';
    c.addEventListener('pointerdown',e=>{c.setPointerCapture?.(e.pointerId);if(this.placement)this._updatePlacementPreview(e.clientX,e.clientY);this._consume(this.gestures.down(e.pointerId,e.clientX,e.clientY,performance.now()));});
    c.addEventListener('pointermove',e=>{if(this.placement)this._updatePlacementPreview(e.clientX,e.clientY);this._consume(this.gestures.move(e.pointerId,e.clientX,e.clientY,performance.now()));});
    c.addEventListener('pointerup',e=>this._consume(this.gestures.up(e.pointerId,e.clientX,e.clientY,performance.now())));
    c.addEventListener('pointercancel',e=>this._consume(this.gestures.cancel(e.pointerId)));
    c.addEventListener('wheel',e=>{e.preventDefault();this._zoom(Math.sign(e.deltaY)*12);},{passive:false});
  }
  _consume(events){for(const g of events||[]){
    if(g.type===GestureType.TAP)this._tap(g.x,g.y);
    else if(g.type===GestureType.LONG_PRESS)this.onStatus(this.placement?'BUILD PLACEMENT · TAP TO CONFIRM':'LONG PRESS · RESERVED FOR CONTEXT COMMANDS');
    else if(g.type===GestureType.PAN)this._pan(g.dx,g.dy);
    else if(g.type===GestureType.PINCH)this._zoom(g.delta*.2);
  }}
  _mouseNdc(x,y){const r=this.canvas.getBoundingClientRect();this.ndc.x=((x-r.left)/r.width)*2-1;this.ndc.y=-((y-r.top)/r.height)*2+1;}
  _groundPoint(x,y){this._mouseNdc(x,y);this.raycaster.setFromCamera(this.ndc,this.renderer.camera);const hit=this.renderer.ground?this.raycaster.intersectObject(this.renderer.ground,false)[0]:null;return hit?{x:hit.point.x,z:hit.point.z}:null;}
  _entityFromHitObject(object){let n=object,id=null;while(n&&!id){id=n.userData?.entityId;n=n.parent;}return id?this.sim.entities.get(id):null;}
  _screenDistance(entity,x,y){const v=this.renderer.entityViews.get(entity.id);if(!v)return Infinity;const p=new THREE.Vector3();v.getWorldPosition(p);p.project(this.renderer.camera);const r=this.canvas.getBoundingClientRect(),sx=r.left+(p.x*.5+.5)*r.width,sy=r.top+(-p.y*.5+.5)*r.height;return Math.hypot(x-sx,y-sy);}
  _rayEntity(x,y,predicate){
    this._mouseNdc(x,y);this.raycaster.setFromCamera(this.ndc,this.renderer.camera);
    const hits=this.raycaster.intersectObjects([...this.renderer.entityViews.values()],true);
    for(const h of hits){const e=this._entityFromHitObject(h.object);if(e&&predicate(e))return e;}return null;
  }
  _pickFriendly(x,y,wide){
    const direct=this._rayEntity(x,y,e=>e.alive&&e.selectable&&e.playerId==='player');if(direct)return direct;
    let best=null,bestD=Infinity;
    for(const e of this.sim.entities.values()){if(!e.alive||!e.selectable||e.playerId!=='player')continue;const d=this._screenDistance(e,x,y),limit=wide?(e.kind==='infantry'?46:38):(e.kind==='infantry'?18:20);if(d<=limit&&d<bestD){best=e;bestD=d;}}
    return best;
  }
  _pickResource(x,y){
    const direct=this._rayEntity(x,y,e=>e.alive&&e.kind==='resource'&&(e.resourceRemaining??0)>0);if(direct)return direct;
    let best=null,bestD=Infinity;for(const e of this.sim.entities.values()){if(!e.alive||e.kind!=='resource'||(e.resourceRemaining??0)<=0)continue;const d=this._screenDistance(e,x,y);if(d<=34&&d<bestD){best=e;bestD=d;}}return best;
  }
  _pickHostile(x,y){
    const direct=this._rayEntity(x,y,e=>e.alive&&e.playerId&&e.playerId!=='player');if(direct)return direct;
    let best=null,bestD=Infinity;
    for(const e of this.sim.entities.values()){if(!e.alive||!e.playerId||e.playerId==='player')continue;const d=this._screenDistance(e,x,y),limit=e.kind==='infantry'?26:30;if(d<=limit&&d<bestD){best=e;bestD=d;}}
    return best;
  }

  async beginPlacement(definitionId){
    const source=this.selected();if(!source)return false;const check=this.sim.construction.eligibility(source.id,definitionId);if(!check.ok){this.onStatus(REASON_LABEL[check.reason]||check.reason);return false;}
    this.placement={sourceId:source.id,definitionId,yaw:0,lastPoint:null,lastResult:null};await this.renderer.beginPlacementGhost(definitionId);this.onPlacementChanged(this.placement);this.onStatus(`PLACE ${this.renderer.registry.definition(definitionId).name.toUpperCase()} · TAP TERRAIN`);return true;
  }
  cancelPlacement(){if(!this.placement)return;this.placement=null;this.renderer.endPlacementGhost();this.onPlacementChanged(null);}
  rotatePlacement(){if(!this.placement)return;this.placement.yaw=(this.placement.yaw+Math.PI/2)%(Math.PI*2);if(this.placement.lastPoint)this._updatePlacementAt(this.placement.lastPoint);this.onStatus('BUILD ROTATED 90°');}
  _updatePlacementPreview(x,y){if(!this.placement)return;const p=this._groundPoint(x,y);if(p)this._updatePlacementAt(p);}
  _updatePlacementAt(p){if(!this.placement)return;const result=this.sim.previewBuild(this.placement.sourceId,this.placement.definitionId,{...p,yaw:this.placement.yaw});this.placement.lastPoint=p;this.placement.lastResult=result;this.renderer.updatePlacementGhost(p,this.placement.yaw,result.ok);}
  _confirmPlacement(x,y){
    const p=this._groundPoint(x,y);if(!p){this.onStatus('NO TERRAIN TARGET');return;}this._updatePlacementAt(p);const pl=this.placement;if(!pl?.lastResult?.ok){this.onStatus(REASON_LABEL[pl?.lastResult?.reason]||`INVALID PLACEMENT · ${pl?.lastResult?.reason||'UNKNOWN'}`);return;}
    const name=this.renderer.registry.definition(pl.definitionId).name.toUpperCase();this.sim.issueBuildStructure(pl.sourceId,pl.definitionId,{...p,yaw:pl.yaw});this.onStatus(`CONSTRUCT ${name}`);this.cancelPlacement();
  }

  _tap(x,y){
    if(this.placement){this._confirmPlacement(x,y);return;}
    const selected=this.selected(),candidate=this._pickFriendly(x,y,!selected);
    if(candidate&&(!selected||candidate.id!==selected.id||this._screenDistance(candidate,x,y)<20)){
      this.selectedId=candidate.id;this.onSelection(candidate);this.onStatus(`SELECTED ${this.renderer.registry.definition(candidate.definitionId).name.toUpperCase()}`);return;
    }
    if(!selected)return;
    if(selected.collector){const resource=this._pickResource(x,y);if(resource){this.sim.issueHarvest([selected.id],resource.id);this.renderer.showDestination({x:resource.x,z:resource.z});this.onStatus(`HARVEST · ${this.renderer.registry.definition(resource.definitionId).name.toUpperCase()}`);return;}}
    const hostile=this._pickHostile(x,y);
    if(hostile&&selected.weaponSlots?.slots?.length){this.sim.issueAttack([selected.id],hostile.id);this.renderer.showAttackTarget(hostile);this.onStatus(`ATTACK · ${this.renderer.registry.definition(hostile.definitionId).name.toUpperCase()}`);return;}
    if(!selected.locomotorId){this.onStatus(selected.operational===false?'CONSTRUCTION SITE SELECTED':'STRUCTURE SELECTED · USE COMMAND CONTROLS');return;}
    const dest=this._groundPoint(x,y);if(!dest){this.onStatus('NO TERRAIN TARGET');return;}
    this.sim.issueMove([selected.id],dest);this.renderer.showDestination(dest);this.onStatus('MOVE ORDER');
  }
  stop(){if(this.placement){this.cancelPlacement();this.onStatus('BUILD PLACEMENT CANCELLED');return;}const s=this.selected();if(!s)return;this.sim.issueStop([s.id]);this.onStatus('STOP');}
  _pan(dx,dy){const cam=this.renderer.camera,scale=cam.position.y/620;const fwd=new THREE.Vector3();cam.getWorldDirection(fwd);fwd.y=0;fwd.normalize();const right=new THREE.Vector3().crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();cam.position.addScaledVector(right,-dx*scale);cam.position.addScaledVector(fwd,dy*scale);this._clampCamera();}
  _zoom(delta){const cam=this.renderer.camera,target=new THREE.Vector3(0,0,0),dir=cam.position.clone().sub(target),next=THREE.MathUtils.clamp(dir.length()+delta,95,430);dir.setLength(next);cam.position.copy(target).add(dir);this._clampCamera();}
  _clampCamera(){const c=this.renderer.camera,hw=this.sim.map.size.width/2-40,hd=this.sim.map.size.depth/2-40;c.position.x=THREE.MathUtils.clamp(c.position.x,-hw,hw);c.position.z=THREE.MathUtils.clamp(c.position.z,-hd,hd);c.position.y=THREE.MathUtils.clamp(c.position.y,75,330);}
}
