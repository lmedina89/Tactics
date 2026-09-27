import * as THREE from 'three';

export class InputController{
  constructor({canvas,renderer,sim,onSelection,onStatus}){
    this.canvas=canvas;this.renderer=renderer;this.sim=sim;this.onSelection=onSelection;this.onStatus=onStatus;this.selectedId=null;
    this.raycaster=new THREE.Raycaster();this.ndc=new THREE.Vector2();this.pointers=new Map();this.dragging=false;this.lastPinch=0;this._bind();
  }
  selected(){return this.selectedId?this.sim.entities.get(this.selectedId):null;}
  clear(){this.selectedId=null;this.onSelection(null);}
  _bind(){const c=this.canvas;c.style.touchAction='none';c.addEventListener('pointerdown',e=>this._down(e));c.addEventListener('pointermove',e=>this._move(e));c.addEventListener('pointerup',e=>this._up(e));c.addEventListener('pointercancel',e=>this._up(e));c.addEventListener('wheel',e=>{e.preventDefault();this._zoom(Math.sign(e.deltaY)*12);},{passive:false});}
  _down(e){this.canvas.setPointerCapture?.(e.pointerId);this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()});if(this.pointers.size===2)this.lastPinch=this._pinchDistance();}
  _move(e){const p=this.pointers.get(e.pointerId);if(!p)return;const ox=p.x,oy=p.y;p.x=e.clientX;p.y=e.clientY;if(this.pointers.size===2){const d=this._pinchDistance();if(this.lastPinch)this._zoom((this.lastPinch-d)*.2);this.lastPinch=d;return;}const dist=Math.hypot(p.x-p.sx,p.y-p.sy);if(dist>28){this.dragging=true;this._pan(p.x-ox,p.y-oy);}}
  _up(e){const p=this.pointers.get(e.pointerId);if(!p)return;const dist=Math.hypot(e.clientX-p.sx,e.clientY-p.sy),duration=performance.now()-p.t;this.pointers.delete(e.pointerId);if(this.pointers.size<2)this.lastPinch=0;const wasDrag=this.dragging;if(this.pointers.size===0)this.dragging=false;if(!wasDrag&&dist<32&&duration<700)this._tap(e.clientX,e.clientY);}
  _pinchDistance(){const a=[...this.pointers.values()];return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);}
  _mouseNdc(x,y){const r=this.canvas.getBoundingClientRect();this.ndc.x=((x-r.left)/r.width)*2-1;this.ndc.y=-((y-r.top)/r.height)*2+1;}

  _screenDistance(entity,x,y){const v=this.renderer.entityViews.get(entity.id);if(!v)return Infinity;const p=new THREE.Vector3();v.getWorldPosition(p);p.project(this.renderer.camera);const r=this.canvas.getBoundingClientRect(),sx=r.left+(p.x*.5+.5)*r.width,sy=r.top+(-p.y*.5+.5)*r.height;return Math.hypot(x-sx,y-sy);}
  _pickFriendly(x,y,wide){
    this._mouseNdc(x,y);this.raycaster.setFromCamera(this.ndc,this.renderer.camera);
    const hits=this.raycaster.intersectObjects([...this.renderer.entityViews.values()],true);
    for(const h of hits){let n=h.object,id=null;while(n&&!id){id=n.userData?.entityId;n=n.parent;}const ent=id?this.sim.entities.get(id):null;if(ent?.selectable&&ent.playerId==='player')return ent;}
    let best=null,bestD=Infinity;
    for(const e of this.sim.entities.values()){if(!e.selectable||e.playerId!=='player')continue;const d=this._screenDistance(e,x,y),limit=wide?(e.kind==='infantry'?46:38):(e.kind==='infantry'?18:20);if(d<=limit&&d<bestD){best=e;bestD=d;}}
    return best;
  }

  _tap(x,y){
    const selected=this.selected(),candidate=this._pickFriendly(x,y,!selected);
    if(candidate&&(!selected||candidate.id!==selected.id||this._screenDistance(candidate,x,y)<20)){
      this.selectedId=candidate.id;this.onSelection(candidate);this.onStatus(`SELECTED ${this.renderer.registry.definition(candidate.definitionId).name.toUpperCase()}`);return;
    }
    if(!selected)return;
    this._mouseNdc(x,y);this.raycaster.setFromCamera(this.ndc,this.renderer.camera);
    const hit=this.renderer.ground?this.raycaster.intersectObject(this.renderer.ground,false)[0]:null;
    if(!hit){this.onStatus('NO TERRAIN TARGET');return;}
    const dest={x:hit.point.x,z:hit.point.z};this.sim.issueMove([selected.id],dest);this.renderer.showDestination(dest);this.onStatus('MOVE ORDER');
  }
  stop(){const s=this.selected();if(!s)return;this.sim.issueStop([s.id]);this.onStatus('STOP');}
  _pan(dx,dy){const cam=this.renderer.camera,scale=cam.position.y/620;const fwd=new THREE.Vector3();cam.getWorldDirection(fwd);fwd.y=0;fwd.normalize();const right=new THREE.Vector3().crossVectors(fwd,new THREE.Vector3(0,1,0)).normalize();cam.position.addScaledVector(right,-dx*scale);cam.position.addScaledVector(fwd,dy*scale);this._clampCamera();}
  _zoom(delta){const cam=this.renderer.camera,target=new THREE.Vector3(0,0,0),dir=cam.position.clone().sub(target),next=THREE.MathUtils.clamp(dir.length()+delta,95,430);dir.setLength(next);cam.position.copy(target).add(dir);this._clampCamera();}
  _clampCamera(){const c=this.renderer.camera,hw=this.sim.map.size.width/2-40,hd=this.sim.map.size.depth/2-40;c.position.x=THREE.MathUtils.clamp(c.position.x,-hw,hw);c.position.z=THREE.MathUtils.clamp(c.position.z,-hd,hd);c.position.y=THREE.MathUtils.clamp(c.position.y,75,330);}
}
